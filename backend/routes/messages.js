// ==========================================================================
// routes/messages.js
//   Phase 1 scope: public contact form + student/teacher -> admin messages.
//   Full student<->teacher in-site chat with admin visibility is Phase 3.
// ==========================================================================

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { verifyToken } = require("../middleware/auth");
const { encrypt, decrypt } = require("../utils/crypto");
const { translateText } = require("../utils/translate");

const router = express.Router();

router.post("/contact", (req, res) => {
  const { name, phone, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: "Ad, e-poçt və mesaj sahələri tələb olunur." });
  db.insert("messages", {
    id: uuidv4(), type: "contact", name, phone: phone || "", email, subject: subject || "Ümumi sual",
    message, senderId: null, recipientId: null, read: false, adminReply: null, createdAt: new Date().toISOString()
  });
  res.status(201).json({ message: "Mesajınız göndərildi." });
});

router.post("/to-admin", verifyToken, (req, res) => {
  const { subject, message, taggedTeacherId } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: "Mesaj mətni boş ola bilməz." });

  db.insert("messages", {
    id: uuidv4(),
    type: req.user.role === "teacher" ? "teacher" : "student",
    name: req.user.name,
    email: req.user.email,
    phone: "",
    subject: subject || "İstifadəçidən mesaj",
    message: message.trim(),
    senderId: req.user.id,
    recipientId: null,
    taggedTeacherId: taggedTeacherId || null,
    read: false,
    adminReply: null,
    createdAt: new Date().toISOString()
  });
  res.status(201).json({ message: "Mesajınız admin-ə göndərildi." });
});

router.get("/mine", verifyToken, (req, res) => {
  const list = db.findMany("messages", (m) =>
    (m.type === "teacher" || m.type === "student") &&
    (m.senderId === req.user.id || (m.senderId === null && m.recipientId === req.user.id))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ messages: list });
});

// ---- Direct messaging (student <-> teacher) ---------------------------
// Every direct message carries a conversationId = the two user ids, sorted
// and joined, so a thread between the same two people is always easy to
// find regardless of who sent the last message.

function conversationIdFor(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join("_");
}

// POST /api/messages/direct — { recipientId, message }
router.post("/direct", verifyToken, (req, res) => {
  const { recipientId, message } = req.body;
  if (!recipientId || !message || !message.trim()) {
    return res.status(400).json({ error: "Alıcı ve mesaj metni zorunludur." });
  }
  if (recipientId === req.user.id) {
    return res.status(400).json({ error: "Kendinize mesaj gönderemezsiniz." });
  }
  const recipient = db.findById("users", recipientId);
  if (!recipient) return res.status(404).json({ error: "Alıcı bulunamadı." });

  // Only student<->teacher direct messaging is allowed.
  const rolesOk = (req.user.role === "student" && recipient.role === "teacher") ||
                   (req.user.role === "teacher" && recipient.role === "student");
  if (!rolesOk) return res.status(403).json({ error: "Sadece öğrenci ve öğretmenler birbirine mesaj yazabilir." });

  const record = {
    id: uuidv4(),
    type: "direct",
    conversationId: conversationIdFor(req.user.id, recipientId),
    senderId: req.user.id,
    senderName: req.user.name,
    recipientId: recipientId,
    recipientName: recipient.name,
    message: encrypt(message.trim()),
    readByRecipient: false,
    createdAt: new Date().toISOString()
  };
  db.insert("messages", record);
  res.status(201).json({ message: { ...record, message: message.trim() } });
});

// GET /api/messages/conversations — list of threads for the logged-in user,
// newest activity first, with the other party's info + last message preview.
router.get("/conversations", verifyToken, (req, res) => {
  const all = db.findMany("messages", (m) => m.type === "direct" && (m.senderId === req.user.id || m.recipientId === req.user.id));
  const byConversation = {};
  all.forEach((m) => {
    if (!byConversation[m.conversationId] || new Date(m.createdAt) > new Date(byConversation[m.conversationId].createdAt)) {
      byConversation[m.conversationId] = m;
    }
  });

  const threads = Object.values(byConversation).map((last) => {
    const otherId = last.senderId === req.user.id ? last.recipientId : last.senderId;
    const otherName = last.senderId === req.user.id ? last.recipientName : last.senderName;
    const otherUser = db.findById("users", otherId);
    let otherAvatar = null;
    if (otherUser && otherUser.role === "teacher") {
      const teacherProfile = db.findOne("teachers", (t) => t.userId === otherId);
      otherAvatar = teacherProfile ? teacherProfile.avatar : null;
    }
    const unread = all.filter((m) => m.conversationId === last.conversationId && m.recipientId === req.user.id && !m.readByRecipient).length;
    return {
      conversationId: last.conversationId,
      otherUserId: otherId,
      otherUserName: otherName,
      otherUserRole: otherUser ? otherUser.role : null,
      otherUserAvatar: otherAvatar,
      lastMessage: decrypt(last.message),
      lastMessageAt: last.createdAt,
      lastMessageFromMe: last.senderId === req.user.id,
      unreadCount: unread
    };
  }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

  res.json({ conversations: threads });
});

// GET /api/messages/conversations/:otherUserId — full thread with one person.
// Marks their messages to me as read.
router.get("/conversations/:otherUserId", verifyToken, async (req, res) => {
  const convId = conversationIdFor(req.user.id, req.params.otherUserId);
  const thread = db.findMany("messages", (m) => m.type === "direct" && m.conversationId === convId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const db2 = db.readDB();
  let changed = false;
  db2.messages.forEach((m) => {
    if (m.type === "direct" && m.conversationId === convId && m.recipientId === req.user.id && !m.readByRecipient) {
      m.readByRecipient = true;
      changed = true;
    }
  });
  if (changed) db.writeDB(db2);

  const otherUser = db.findById("users", req.params.otherUserId);
  const me = db.findById("users", req.user.id);
  const myLang = (me && me.language) || "tr";

  const decryptedThread = await Promise.all(thread.map(async (m) => {
    const plainText = decrypt(m.message);
    // Only translate messages FROM the other person, and only if translation is configured.
    let translatedMessage = null;
    if (m.senderId !== req.user.id) {
      translatedMessage = await translateText(plainText, myLang).catch(() => null);
    }
    return { ...m, message: plainText, translatedMessage };
  }));

  res.json({ messages: decryptedThread, otherUser: otherUser ? { id: otherUser.id, name: otherUser.name, role: otherUser.role } : null });
});

module.exports = router;
