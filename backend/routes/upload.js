// ==========================================================================
// routes/upload.js — teacher profile photo + document upload
// ==========================================================================

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { verifyToken } = require("../middleware/auth");
const { encryptBuffer } = require("../utils/crypto");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname).toLowerCase())
});
const allowedTypes = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) return cb(new Error("Dəstəklənməyən fayl formatı."));
    cb(null, true);
  }
});

router.post("/avatar", verifyToken, (req, res) => {
  if (req.user.role !== "teacher") return res.status(403).json({ error: "Yalnız müəllim hesabları şəkil yükləyə bilər." });
  upload.single("avatar")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Şəkil yüklənə bilmədi." });
    if (!req.file) return res.status(400).json({ error: "Şəkil seçilməyib." });

    const teacher = db.findOne("teachers", (t) => t.userId === req.user.id);
    if (!teacher) return res.status(404).json({ error: "Profil tapılmadı." });

    if (teacher.avatar) {
      const oldPath = path.join(__dirname, "..", teacher.avatar.replace(/^\//, ""));
      fs.unlink(oldPath, () => {});
    }
    const publicPath = "/uploads/avatars/" + req.file.filename;
    const updated = db.updateById("teachers", teacher.id, { avatar: publicPath });
    res.json({ avatar: publicPath, teacher: updated });
  });
});

// POST /api/upload/document — field "docType" = idDocument | diploma
// Encrypted at rest: the file on disk is unreadable without ENCRYPTION_KEY.
// It can only be viewed again through the admin-only decrypt-and-serve
// route in routes/admin.js.
router.post("/document", verifyToken, (req, res) => {
  if (req.user.role !== "teacher") return res.status(403).json({ error: "Yalnız müəllim hesabları sənəd yükləyə bilər." });
  upload.single("document")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Sənəd yüklənə bilmədi." });
    if (!req.file) return res.status(400).json({ error: "Sənəd seçilməyib." });

    const teacher = db.findOne("teachers", (t) => t.userId === req.user.id);
    if (!teacher) return res.status(404).json({ error: "Profil tapılmadı." });

    // Encrypt the file on disk in place.
    const fullPath = req.file.path;
    const plainBuffer = fs.readFileSync(fullPath);
    const encryptedBuffer = encryptBuffer(plainBuffer);
    fs.writeFileSync(fullPath, encryptedBuffer);

    const docType = req.body.docType === "diploma" ? "diploma" : "idDocument";
    const publicPath = "/uploads/avatars/" + req.file.filename;
    const patch = {};
    patch[docType] = publicPath;
    patch[docType + "Mime"] = req.file.mimetype;
    const updated = db.updateById("teachers", teacher.id, patch);
    res.json({ path: publicPath, teacher: updated });
  });
});

module.exports = router;
