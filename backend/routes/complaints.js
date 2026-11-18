// ==========================================================================
// routes/complaints.js — student -> teacher complaint (separate from messages)
// ==========================================================================

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.post("/", verifyToken, (req, res) => {
  if (req.user.role !== "student") return res.status(403).json({ error: "Yalnız şagird hesabları şikayət yaza bilər." });
  const { teacherId, reason, explanation } = req.body;
  if (!teacherId || !explanation || !explanation.trim()) {
    return res.status(400).json({ error: "Müəllim və izahat sahələri tələb olunur." });
  }
  const teacher = db.findById("teachers", teacherId);
  if (!teacher) return res.status(404).json({ error: "Müəllim tapılmadı." });

  const complaint = {
    id: uuidv4(),
    studentId: req.user.id,
    studentName: req.user.name,
    teacherId,
    teacherName: teacher.name,
    reason: reason || "Digər",
    explanation: explanation.trim(),
    status: "open",
    createdAt: new Date().toISOString()
  };
  db.insert("complaints", complaint);
  res.status(201).json({ complaint });
});

module.exports = router;
