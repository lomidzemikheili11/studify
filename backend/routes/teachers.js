// ==========================================================================
// routes/teachers.js — public teacher listing/search, profile, favorites
// ==========================================================================

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

function withReviewSummary(teacher) {
  const reviews = db.findMany("reviews", (r) => r.teacherId === teacher.id);
  const avg = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0;
  return { ...teacher, rating: avg, reviews: reviews.length };
}

function isPubliclyVisible(teacher) {
  if (teacher.status !== "approved") return false;
  const owner = db.findById("users", teacher.userId);
  return !owner || owner.status !== "blocked";
}

// GET /api/teachers/meta/stats — public, real platform-wide counts (no fake numbers)
router.get("/meta/stats", (req, res) => {
  const approved = db.all("teachers").filter(isPubliclyVisible);
  const countries = new Set(approved.map((t) => t.country).filter(Boolean));
  const students = db.findMany("users", (u) => u.role === "student");
  const reviews = db.all("reviews");
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0;
  res.json({
    teacherCount: approved.length,
    studentCount: students.length,
    countryCount: countries.size,
    avgRating: avgRating
  });
});

// GET /api/teachers?country=&city=&nationality=&mode=&subject=&lang=&sort=
router.get("/", (req, res) => {
  const { country, city, nationality, mode, subject, lang, sort } = req.query;

  let list = db.all("teachers").filter(isPubliclyVisible).map(withReviewSummary);

  if (country) list = list.filter((t) => t.country === country);
  if (mode === "offline") {
    if (city) list = list.filter((t) => t.offline && t.city === city);
    else list = list.filter((t) => t.offline);
  } else if (mode === "online") {
    list = list.filter((t) => t.online);
  }
  if (nationality) list = list.filter((t) => t.nationality === nationality);
  if (subject && subject !== "all") list = list.filter((t) => t.subject === subject);
  if (lang) list = list.filter((t) => t.langs.includes(lang));

  if (sort === "price_asc") list = [...list].sort((a, b) => a.priceHourly - b.priceHourly);
  else if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
  else list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ teachers: list, total: list.length });
});

// GET /api/teachers/me/profile
router.get("/me/profile", verifyToken, (req, res) => {
  if (req.user.role !== "teacher") return res.status(403).json({ error: "Yalnız müəllimlər üçün əlçatandır." });
  const teacher = db.findOne("teachers", (t) => t.userId === req.user.id);
  if (!teacher) return res.status(404).json({ error: "Profil tapılmadı." });
  res.json({ teacher: withReviewSummary(teacher) });
});

// PUT /api/teachers/me/profile
router.put("/me/profile", verifyToken, (req, res) => {
  if (req.user.role !== "teacher") return res.status(403).json({ error: "Yalnız müəllimlər üçün əlçatandır." });
  const teacher = db.findOne("teachers", (t) => t.userId === req.user.id);
  if (!teacher) return res.status(404).json({ error: "Profil tapılmadı." });

  const allowed = [
    "subject", "bio", "online", "offline", "country", "city", "nationality", "street",
    "priceHourly", "priceMonthly", "priceMonthlyOriginal", "experience", "langs", "whatsapp",
    "hasStudents", "studentCount", "teachingMethod", "university"
  ];
  const patch = {};
  allowed.forEach((key) => { if (req.body[key] !== undefined) patch[key] = req.body[key]; });
  // No approval gate anymore — profile edits stay visible immediately.

  const updated = db.updateById("teachers", teacher.id, patch);
  res.json({ teacher: updated });
});

router.get("/favorites/mine", verifyToken, (req, res) => {
  const favs = db.findMany("favorites", (f) => f.userId === req.user.id);
  const ids = favs.map((f) => f.teacherId);
  res.json({ teachers: db.findMany("teachers", (t) => ids.includes(t.id)).map(withReviewSummary) });
});

router.post("/:id/favorite", verifyToken, (req, res) => {
  const existing = db.findOne("favorites", (f) => f.userId === req.user.id && f.teacherId === req.params.id);
  if (existing) { db.removeById("favorites", existing.id); return res.json({ favorited: false }); }
  db.insert("favorites", { id: uuidv4(), userId: req.user.id, teacherId: req.params.id });
  res.json({ favorited: true });
});

router.get("/:id/reviews", (req, res) => {
  const list = db.findMany("reviews", (r) => r.teacherId === req.params.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ reviews: list });
});

router.post("/:id/reviews", verifyToken, (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Yalnız şagird hesabları rəy yaza bilər." });
  const teacher = db.findById("teachers", req.params.id);
  if (!teacher || teacher.status !== "approved") return res.status(404).json({ error: "Müəllim tapılmadı." });

  const { rating, comment } = req.body;
  const numericRating = Number(rating);
  if (!numericRating || numericRating < 1 || numericRating > 5) return res.status(400).json({ error: "Reytinq 1-5 arasında olmalıdır." });
  if (!comment || !comment.trim()) return res.status(400).json({ error: "Rəy mətni boş ola bilməz." });

  const existing = db.findOne("reviews", (r) => r.teacherId === teacher.id && r.userId === req.user.id);
  if (existing) return res.status(409).json({ error: "Siz artıq bu müəllimə rəy yazmısınız." });

  const hasContact = db.findOne("messages", (m) =>
    m.type === "direct" &&
    ((m.senderId === req.user.id && m.recipientId === teacher.userId) ||
     (m.senderId === teacher.userId && m.recipientId === req.user.id))
  );
  if (!hasContact) return res.status(403).json({ error: "Rəy yazmaq üçün əvvəlcə bu müəllimlə əlaqə saxlamalısınız." });

  const review = { id: uuidv4(), teacherId: teacher.id, userId: req.user.id, userName: req.user.name, rating: numericRating, comment: comment.trim(), createdAt: new Date().toISOString() };
  db.insert("reviews", review);
  res.status(201).json({ review });
});

router.get("/:id", (req, res) => {
  const teacher = db.findById("teachers", req.params.id);
  if (!teacher || !isPubliclyVisible(teacher)) return res.status(404).json({ error: "Müəllim tapılmadı." });
  res.json({ teacher: withReviewSummary(teacher) });
});

module.exports = router;
