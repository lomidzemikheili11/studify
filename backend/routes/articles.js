// ==========================================================================
// routes/articles.js — blog/articles: public read, admin-only write
// ==========================================================================

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../utils/db");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^\w\sğüşıöçİĞÜŞÖÇ-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

// GET /api/articles — public, published only
router.get("/", (req, res) => {
  const list = db.findMany("articles", (a) => a.status === "published")
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  res.json({ articles: list });
});

// GET /api/articles/:slug — public, single article
router.get("/:slug", (req, res) => {
  const article = db.findOne("articles", (a) => a.slug === req.params.slug && a.status === "published");
  if (!article) return res.status(404).json({ error: "Makale bulunamadı." });
  res.json({ article });
});

// ---- Admin-only management ------------------------------------------------

router.get("/admin/all", verifyToken, requireRole("admin"), (req, res) => {
  const list = [...db.all("articles")].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ articles: list });
});

router.post("/admin/create", verifyToken, requireRole("admin"), (req, res) => {
  const { title, summary, content, coverEmoji, status } = req.body;
  if (!title || !content) return res.status(400).json({ error: "Başlık ve içerik zorunludur." });

  let slug = slugify(title);
  let suffix = 1;
  while (db.findOne("articles", (a) => a.slug === slug)) { slug = slugify(title) + "-" + suffix; suffix++; }

  const article = {
    id: uuidv4(),
    slug, title,
    summary: summary || "",
    content,
    coverEmoji: coverEmoji || "📘",
    status: status === "draft" ? "draft" : "published",
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  db.insert("articles", article);
  res.status(201).json({ article });
});

router.put("/admin/:id", verifyToken, requireRole("admin"), (req, res) => {
  const allowed = ["title", "summary", "content", "coverEmoji", "status"];
  const patch = {};
  allowed.forEach((key) => { if (req.body[key] !== undefined) patch[key] = req.body[key]; });
  const updated = db.updateById("articles", req.params.id, patch);
  if (!updated) return res.status(404).json({ error: "Makale bulunamadı." });
  res.json({ article: updated });
});

router.delete("/admin/:id", verifyToken, requireRole("admin"), (req, res) => {
  const ok = db.removeById("articles", req.params.id);
  if (!ok) return res.status(404).json({ error: "Makale bulunamadı." });
  res.json({ success: true });
});

module.exports = router;
