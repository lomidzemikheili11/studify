// ==========================================================================
// routes/auth.js — register / login / me
// ==========================================================================

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticator } = require("otplib");
// Allow a wider time window (±90s instead of the ±30s default) so small
// clock differences between the server and the person's phone don't cause
// a correct code to be rejected — this is the #1 real-world cause of "my
// code doesn't work" reports for TOTP-based 2FA.
authenticator.options = { window: 3 };
const qrcode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { JWT_SECRET, verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
}

function signPendingToken(user) {
  return jwt.sign({ id: user.id, pending2FA: true }, JWT_SECRET, { expiresIn: "5m" });
}

function publicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { firstName, lastName, email, phone, password, role, parentPhone } = req.body;

  if (!firstName || !lastName || !email || !password || !phone) {
    return res.status(400).json({ error: "Bütün tələb olunan sahələri doldurun (telefon nömrəsi daxil)." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Şifrə ən azı 8 simvol olmalıdır." });
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: "Şifrədə həm hərf, həm rəqəm olmalıdır." });
  }

  const userRole = role === "teacher" ? "teacher" : "student";

  if (userRole === "student" && !parentPhone) {
    return res.status(400).json({ error: "Valideyn/qəyyum telefon nömrəsi tələb olunur." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.findOne("users", (u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) return res.status(409).json({ error: "Bu e-poçt ünvanı ilə artıq hesab mövcuddur." });

  const user = {
    id: uuidv4(),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: normalizedEmail,
    passwordHash: bcrypt.hashSync(password, 10),
    phone: phone || "",
    parentPhone: userRole === "student" ? (parentPhone || "") : "",
    role: userRole,
    language: req.body.language || "tr",
    status: "active",
    emailVerified: false,
    createdAt: new Date().toISOString()
  };
  db.insert("users", user);

  if (userRole === "teacher") {
    db.insert("teachers", {
      id: uuidv4(),
      userId: user.id,
      name: user.name,
      subject: req.body.subject || "Digər",
      bio: req.body.bio || "",
      online: req.body.online !== undefined ? !!req.body.online : true,
      offline: req.body.offline !== undefined ? !!req.body.offline : false,
      country: req.body.country || "",
      city: req.body.city || "",
      nationality: req.body.nationality || "",
      street: req.body.street || "",
      priceHourly: Number(req.body.priceHourly) || 0,
      priceMonthly: Number(req.body.priceMonthly) || 0,
      priceMonthlyOriginal: Number(req.body.priceMonthlyOriginal) || 0,
      experience: Number(req.body.experience) || 0,
      hasStudents: req.body.hasStudents || "",
      studentCount: req.body.studentCount || "",
      teachingMethod: req.body.teachingMethod || "",
      university: req.body.university || "",
      langs: Array.isArray(req.body.langs) ? req.body.langs : ["tr"],
      whatsapp: req.body.whatsapp || phone || "",
      avatar: null,
      idDocument: null,
      diploma: null,
      applicationAnswers: Array.isArray(req.body.applicationAnswers) ? req.body.applicationAnswers : [],
      rating: 0,
      reviews: 0,
      isSuperTeacher: false,
      status: "approved", // auto-approved at signup — admin can still block/delete afterward
      createdAt: new Date().toISOString()
    });
  }

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "E-poçt və şifrə tələb olunur." });

  const normalizedEmail = email.trim().toLowerCase();
  const user = db.findOne("users", (u) => u.email.toLowerCase() === normalizedEmail);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "E-poçt və ya şifrə yanlışdır." });
  }
  if (user.status === "blocked") {
    return res.status(403).json({ error: "Hesabınız bloklanıb. Ətraflı məlumat üçün admin ilə əlaqə saxlayın." });
  }

  // Admin accounts with 2FA enabled must complete a second step before
  // receiving a real session token.
  if (user.role === "admin" && user.twoFactorEnabled) {
    return res.json({ requires2FA: true, pendingToken: signPendingToken(user) });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/verify-2fa — body: { pendingToken, code }
router.post("/verify-2fa", (req, res) => {
  const { pendingToken, code } = req.body;
  if (!pendingToken || !code) return res.status(400).json({ error: "Doğrulama kodu tələb olunur." });

  let payload;
  try {
    payload = jwt.verify(pendingToken, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: "Oturum süresi doldu, tekrar giriş yapın." });
  }
  if (!payload.pending2FA) return res.status(400).json({ error: "Geçersiz istek." });

  const user = db.findById("users", payload.id);
  if (!user || !user.twoFactorSecret) return res.status(400).json({ error: "2FA yapılandırılmamış." });

  const valid = authenticator.verify({ token: String(code).trim(), secret: user.twoFactorSecret });
  if (!valid) return res.status(401).json({ error: "Doğrulama kodu yanlış." });

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me
router.get("/me", verifyToken, (req, res) => {
  const user = db.findById("users", req.user.id);
  if (!user) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
  res.json({ user: publicUser(user) });
});

// PUT /api/auth/language
router.put("/language", verifyToken, (req, res) => {
  const { language } = req.body;
  if (!language) return res.status(400).json({ error: "Dil kodu tələb olunur." });
  const updated = db.updateById("users", req.user.id, { language });
  res.json({ user: publicUser(updated) });
});

// ---- Admin 2FA setup ----------------------------------------------------

// GET /api/auth/2fa/setup — generates a new secret + QR code to scan.
// The secret is NOT activated until /2fa/confirm succeeds.
router.get("/2fa/setup", verifyToken, requireRole("admin"), async (req, res) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(req.user.email, "Studify Admin", secret);
  db.updateById("users", req.user.id, { twoFactorPendingSecret: secret });
  try {
    const qrDataUrl = await qrcode.toDataURL(otpauth);
    res.json({ secret, qrDataUrl });
  } catch (e) {
    res.status(500).json({ error: "QR kod oluşturulamadı." });
  }
});

// POST /api/auth/2fa/confirm — body: { code } — activates 2FA permanently.
router.post("/2fa/confirm", verifyToken, requireRole("admin"), (req, res) => {
  const { code } = req.body;
  const user = db.findById("users", req.user.id);
  if (!user || !user.twoFactorPendingSecret) return res.status(400).json({ error: "Önce kurulum başlatılmalı." });

  const valid = authenticator.verify({ token: String(code || "").trim(), secret: user.twoFactorPendingSecret });
  if (!valid) return res.status(401).json({ error: "Doğrulama kodu yanlış. Tekrar deneyin." });

  const updated = db.updateById("users", req.user.id, {
    twoFactorSecret: user.twoFactorPendingSecret,
    twoFactorPendingSecret: null,
    twoFactorEnabled: true
  });
  res.json({ user: publicUser(updated) });
});

// POST /api/auth/2fa/disable — body: { password } — requires re-entering the password.
router.post("/2fa/disable", verifyToken, requireRole("admin"), (req, res) => {
  const { password } = req.body;
  const user = db.findById("users", req.user.id);
  if (!user || !bcrypt.compareSync(password || "", user.passwordHash)) {
    return res.status(401).json({ error: "Şifrə yanlışdır." });
  }
  const updated = db.updateById("users", req.user.id, { twoFactorEnabled: false, twoFactorSecret: null, twoFactorPendingSecret: null });
  res.json({ user: publicUser(updated) });
});

// DELETE /api/auth/me — user deletes their own account (requires password
// confirmation). Supports the GDPR "right to erasure" commitment made in
// the Privacy Policy.
router.delete("/me", verifyToken, (req, res) => {
  const { password } = req.body;
  const user = db.findById("users", req.user.id);
  if (!user || !bcrypt.compareSync(password || "", user.passwordHash)) {
    return res.status(401).json({ error: "Şifrə yanlışdır." });
  }
  if (user.role === "admin") return res.status(400).json({ error: "Admin hesapları bu şekilde silinemez." });

  const teacher = db.findOne("teachers", (t) => t.userId === user.id);
  if (teacher) db.removeById("teachers", teacher.id);
  db.removeById("users", user.id);
  res.json({ success: true });
});

module.exports = router;
