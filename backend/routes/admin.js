// ==========================================================================
// routes/admin.js — admin-only backend operations
// ==========================================================================

const express = require("express");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { verifyToken, requireRole, JWT_SECRET } = require("../middleware/auth");
const { decrypt, decryptBuffer } = require("../utils/crypto");
const { sendApplicationResultEmail } = require("../utils/mailer");

const router = express.Router();
router.use(verifyToken, requireRole("admin"));

router.get("/stats", (req, res) => {
  const teachers = db.all("teachers");
  const users = db.all("users");
  const messages = db.all("messages");
  const reviews = db.all("reviews");
  const complaints = db.all("complaints");

  res.json({
    teachers: {
      total: teachers.length,
      approved: teachers.filter((t) => t.status === "approved").length,
      pending: teachers.filter((t) => t.status === "pending").length,
      rejected: teachers.filter((t) => t.status === "rejected").length
    },
    users: {
      total: users.length,
      students: users.filter((u) => u.role === "student").length,
      teachers: users.filter((u) => u.role === "teacher").length,
      blocked: users.filter((u) => u.status === "blocked").length
    },
    messages: { total: messages.length, unread: messages.filter((m) => !m.read).length },
    reviews: { total: reviews.length },
    complaints: { total: complaints.length, open: complaints.filter((c) => c.status === "open").length }
  });
});

router.get("/teachers", (req, res) => {
  const status = req.query.status;
  let list = db.all("teachers");
  if (status && status !== "all") list = list.filter((t) => t.status === status);
  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const withContact = list.map((t) => {
    const user = db.findById("users", t.userId);
    return { ...t, email: user ? user.email : null, phone: user ? user.phone : null, userStatus: user ? user.status : null };
  });
  res.json({ teachers: withContact });
});

router.put("/teachers/:id/approve", async (req, res) => {
  const updated = db.updateById("teachers", req.params.id, { status: "approved" });
  if (!updated) return res.status(404).json({ error: "Müəllim tapılmadı." });
  const owner = db.findById("users", updated.userId);
  if (owner) sendApplicationResultEmail(owner.email, owner.language, true).catch(() => {});
  res.json({ teacher: updated });
});

router.put("/teachers/:id/reject", async (req, res) => {
  const updated = db.updateById("teachers", req.params.id, { status: "rejected", rejectionReason: req.body.reason || "" });
  if (!updated) return res.status(404).json({ error: "Müəllim tapılmadı." });
  const owner = db.findById("users", updated.userId);
  if (owner) sendApplicationResultEmail(owner.email, owner.language, false).catch(() => {});
  res.json({ teacher: updated });
});

router.put("/teachers/:id/super", (req, res) => {
  const updated = db.updateById("teachers", req.params.id, { isSuperTeacher: !!req.body.isSuperTeacher });
  if (!updated) return res.status(404).json({ error: "Müəllim tapılmadı." });
  res.json({ teacher: updated });
});

router.delete("/teachers/:id", (req, res) => {
  const ok = db.removeById("teachers", req.params.id);
  if (!ok) return res.status(404).json({ error: "Müəllim tapılmadı." });
  res.json({ success: true });
});

router.get("/users", (req, res) => {
  res.json({ users: db.all("users").map(({ passwordHash, ...rest }) => rest) });
});

router.put("/users/:id/block", (req, res) => {
  const user = db.findById("users", req.params.id);
  if (!user) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
  if (user.role === "admin") return res.status(400).json({ error: "Admin hesabı bloklana bilməz." });
  const updated = db.updateById("users", req.params.id, { status: "blocked" });
  const { passwordHash, ...rest } = updated;
  res.json({ user: rest });
});

router.put("/users/:id/unblock", (req, res) => {
  const updated = db.updateById("users", req.params.id, { status: "active" });
  if (!updated) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
  const { passwordHash, ...rest } = updated;
  res.json({ user: rest });
});

router.delete("/users/:id", (req, res) => {
  const user = db.findById("users", req.params.id);
  if (!user) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
  if (user.role === "admin") return res.status(400).json({ error: "Admin hesabı silinə bilməz." });
  const teacher = db.findOne("teachers", (t) => t.userId === user.id);
  if (teacher) db.removeById("teachers", teacher.id);
  db.removeById("users", user.id);
  res.json({ success: true });
});

router.post("/users/:id/impersonate", (req, res) => {
  const user = db.findById("users", req.params.id);
  if (!user) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name, impersonatedBy: req.user.id },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  const db2 = db.readDB();
  db2.auditLog = db2.auditLog || [];
  db2.auditLog.push({ id: uuidv4(), action: "impersonate", adminId: req.user.id, targetUserId: user.id, targetUserName: user.name, createdAt: new Date().toISOString() });
  db.writeDB(db2);

  res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
});

router.get("/messages", (req, res) => {
  const type = req.query.type;
  let list = db.all("messages");
  if (type) list = list.filter((m) => m.type === type);
  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ messages: list });
});

router.put("/messages/:id/read", (req, res) => {
  const updated = db.updateById("messages", req.params.id, { read: true });
  if (!updated) return res.status(404).json({ error: "Mesaj tapılmadı." });
  res.json({ message: updated });
});

router.post("/messages/:id/reply", (req, res) => {
  const { reply } = req.body;
  if (!reply || !reply.trim()) return res.status(400).json({ error: "Cavab mətni boş ola bilməz." });
  const updated = db.updateById("messages", req.params.id, { adminReply: reply.trim(), read: true, repliedAt: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: "Mesaj tapılmadı." });
  res.json({ message: updated });
});

// POST /api/admin/messages/to-user — admin starts a NEW conversation with a
// specific teacher or student (rather than only replying to incoming ones).
router.post("/messages/to-user", (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message || !message.trim()) return res.status(400).json({ error: "Kullanıcı ve mesaj metni zorunludur." });
  const targetUser = db.findById("users", userId);
  if (!targetUser) return res.status(404).json({ error: "Kullanıcı bulunamadı." });
  if (targetUser.role !== "teacher" && targetUser.role !== "student") {
    return res.status(400).json({ error: "Yalnızca öğretmen veya öğrencilere mesaj gönderilebilir." });
  }

  const record = {
    id: uuidv4(),
    type: targetUser.role,
    name: "Studify Admin",
    email: "",
    subject: "Admin'den mesaj",
    message: message.trim(),
    senderId: null,
    recipientId: targetUser.id,
    read: true,
    adminReply: null,
    createdAt: new Date().toISOString()
  };
  db.insert("messages", record);
  res.status(201).json({ message: record });
});

router.delete("/messages/:id", (req, res) => {
  const ok = db.removeById("messages", req.params.id);
  if (!ok) return res.status(404).json({ error: "Mesaj tapılmadı." });
  res.json({ success: true });
});

router.get("/complaints", (req, res) => {
  const list = [...db.all("complaints")].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ complaints: list });
});

router.put("/complaints/:id/resolve", (req, res) => {
  const updated = db.updateById("complaints", req.params.id, { status: "resolved", resolvedAt: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: "Şikayət tapılmadı." });
  res.json({ complaint: updated });
});

router.get("/reviews", (req, res) => {
  const reviews = [...db.all("reviews")].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const withTeacherName = reviews.map((r) => {
    const teacher = db.findById("teachers", r.teacherId);
    return { ...r, teacherName: teacher ? teacher.name : "(silinmiş profil)" };
  });
  res.json({ reviews: withTeacherName });
});

router.delete("/reviews/:id", (req, res) => {
  const ok = db.removeById("reviews", req.params.id);
  if (!ok) return res.status(404).json({ error: "Rəy tapılmadı." });
  res.json({ success: true });
});

router.get("/audit-log", (req, res) => {
  const db2 = db.readDB();
  const list = [...(db2.auditLog || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ log: list });
});

// ---- Conversations (full admin visibility into student<->teacher chat) ---

router.get("/conversations", (req, res) => {
  const all = db.findMany("messages", (m) => m.type === "direct");
  const byConversation = {};
  all.forEach((m) => {
    if (!byConversation[m.conversationId] || new Date(m.createdAt) > new Date(byConversation[m.conversationId].createdAt)) {
      byConversation[m.conversationId] = m;
    }
  });
  const threads = Object.values(byConversation).map((last) => ({
    conversationId: last.conversationId,
    participantAName: last.senderName,
    participantAId: last.senderId,
    participantBName: last.recipientName,
    participantBId: last.recipientId,
    lastMessage: decrypt(last.message),
    lastMessageAt: last.createdAt,
    messageCount: all.filter((m) => m.conversationId === last.conversationId).length
  })).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  res.json({ conversations: threads });
});

router.get("/conversations/:conversationId", (req, res) => {
  const thread = db.findMany("messages", (m) => m.type === "direct" && m.conversationId === req.params.conversationId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (thread.length === 0) return res.status(404).json({ error: "Yazışma bulunamadı." });
  const decryptedThread = thread.map((m) => ({ ...m, message: decrypt(m.message) }));
  res.json({ messages: decryptedThread });
});

// GET /api/admin/documents/:teacherId/:type — decrypts and serves an
// uploaded ID/diploma document (files are encrypted at rest on disk).
router.get("/documents/:teacherId/:type", (req, res) => {
  const teacher = db.findById("teachers", req.params.teacherId);
  if (!teacher) return res.status(404).json({ error: "Öğretmen bulunamadı." });

  const type = req.params.type === "diploma" ? "diploma" : "idDocument";
  const filePath = teacher[type];
  const mime = teacher[type + "Mime"] || "application/octet-stream";
  if (!filePath) return res.status(404).json({ error: "Belge bulunamadı." });

  const fullPath = path.join(__dirname, "..", filePath.replace(/^\//, ""));
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "Dosya bulunamadı." });

  try {
    const encryptedBuffer = fs.readFileSync(fullPath);
    const plainBuffer = decryptBuffer(encryptedBuffer);
    res.setHeader("Content-Type", mime);
    res.send(plainBuffer);
  } catch (e) {
    res.status(500).json({ error: "Belge çözülemedi." });
  }
});

module.exports = router;
