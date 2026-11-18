// ==========================================================================
// routes/availability.js — teacher availability + student booking
// ==========================================================================

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// POST /api/availability — teacher adds one or more open slots
router.post("/", verifyToken, (req, res) => {
  if (req.user.role !== "teacher") return res.status(403).json({ error: "Yalnızca öğretmenler müsaitlik ekleyebilir." });
  const teacher = db.findOne("teachers", (t) => t.userId === req.user.id);
  if (!teacher) return res.status(404).json({ error: "Öğretmen profili bulunamadı." });

  const { date, startTime, duration } = req.body;
  if (!date || !startTime) return res.status(400).json({ error: "Tarih ve saat zorunludur." });
  const dur = Number(duration) || 60;

  const slotDateTime = new Date(date + "T" + startTime + ":00");
  if (isNaN(slotDateTime.getTime()) || slotDateTime < new Date()) {
    return res.status(400).json({ error: "Geçmiş bir tarih/saat seçilemez." });
  }

  const slot = {
    id: uuidv4(),
    teacherId: teacher.id,
    teacherUserId: teacher.userId,
    teacherName: teacher.name,
    date, startTime, duration: dur,
    status: "open",
    bookedByStudentId: null,
    bookedByStudentName: null,
    createdAt: new Date().toISOString()
  };
  db.insert("availability", slot);
  res.status(201).json({ slot });
});

// GET /api/availability/mine — teacher's own slots (open + booked)
router.get("/mine", verifyToken, (req, res) => {
  if (req.user.role !== "teacher") return res.status(403).json({ error: "Yalnızca öğretmenler için." });
  const teacher = db.findOne("teachers", (t) => t.userId === req.user.id);
  if (!teacher) return res.status(404).json({ error: "Öğretmen profili bulunamadı." });
  const slots = db.findMany("availability", (s) => s.teacherId === teacher.id)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  res.json({ slots });
});

// GET /api/availability/teacher/:teacherId — public, only OPEN future slots
router.get("/teacher/:teacherId", (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const slots = db.findMany("availability", (s) => s.teacherId === req.params.teacherId && s.status === "open" && s.date >= today)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  res.json({ slots });
});

// POST /api/availability/:id/book — student books an open slot
router.post("/:id/book", verifyToken, (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Yalnızca öğrenciler rezervasyon yapabilir." });
  const slot = db.findById("availability", req.params.id);
  if (!slot) return res.status(404).json({ error: "Bu ders saati bulunamadı." });
  if (slot.status !== "open") return res.status(409).json({ error: "Bu ders saati artık müsait değil." });

  const updated = db.updateById("availability", slot.id, {
    status: "booked",
    bookedByStudentId: req.user.id,
    bookedByStudentName: req.user.name
  });
  res.json({ slot: updated });
});

// GET /api/availability/bookings/mine — student's own booked lessons
router.get("/bookings/mine", verifyToken, (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Yalnızca öğrenciler için." });
  const today = new Date().toISOString().slice(0, 10);
  const slots = db.findMany("availability", (s) => s.bookedByStudentId === req.user.id && s.date >= today)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  res.json({ slots });
});

// DELETE /api/availability/:id — teacher removes an open slot, or either
// party cancels a booked one (reverts to deleted; a simple model without a
// separate notification pipeline).
router.delete("/:id", verifyToken, (req, res) => {
  const slot = db.findById("availability", req.params.id);
  if (!slot) return res.status(404).json({ error: "Ders saati bulunamadı." });

  const isOwnerTeacher = req.user.role === "teacher" && slot.teacherUserId === req.user.id;
  const isBookedStudent = req.user.role === "student" && slot.bookedByStudentId === req.user.id;
  if (!isOwnerTeacher && !isBookedStudent) return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });

  db.removeById("availability", slot.id);
  res.json({ success: true });
});

module.exports = router;
