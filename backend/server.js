// ==========================================================================
// server.js — Studify backend entry point
// ==========================================================================

require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const teacherRoutes = require("./routes/teachers");
const messageRoutes = require("./routes/messages");
const adminRoutes = require("./routes/admin");
const uploadRoutes = require("./routes/upload");
const complaintRoutes = require("./routes/complaints");
const availabilityRoutes = require("./routes/availability");
const articleRoutes = require("./routes/articles");

const dbFile = path.join(__dirname, "data", "db.json");
if (!fs.existsSync(dbFile)) require("./utils/seed")();

// Automatic daily backups of data/db.json (kept for the last 30 days), so a
// server crash or a bad edit never means total data loss. Runs once on
// startup, then every 24h for as long as the process stays alive.
require("./utils/backup").startAutoBackup();

const app = express();
const PORT = process.env.PORT || 4000;

// ---- Security headers ------------------------------------------------------
// Content-Security-Policy is disabled here because the admin panel and parts
// of the public site use inline <script>/<style> for simplicity. Every other
// helmet protection (clickjacking prevention, MIME-sniffing prevention,
// HSTS, etc.) stays on. Tightening this further would mean moving all inline
// scripts into external files — worth doing before a large-scale launch.
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Brute-force protection on login ---------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin." }
});
// Separate, more generous limiter for the 2FA code step — this is a normal
// part of every single login once 2FA is on, and legitimate users may
// mistype a 6-digit code once or twice, so it must not share a budget with
// the password step above.
const twoFaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Çok fazla başarısız doğrulama denemesi. Lütfen 15 dakika sonra tekrar deneyin." }
});
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/verify-2fa", twoFaLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/articles", articleRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/admin-panel", express.static(path.join(__dirname, "..", "admin-panel")));

app.get(/^(?!\/api|\/admin-panel|\/uploads).*/, (req, res, next) => {
  if (req.method !== "GET") return next();
  const requested = path.join(__dirname, "..", "public", req.path);
  if (req.path !== "/" && fs.existsSync(requested) && fs.statSync(requested).isFile()) {
    return res.sendFile(requested);
  }
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server xətası baş verdi." });
});

app.listen(PORT, () => {
  console.log(`Studify backend http://localhost:${PORT} ünvanında işləyir`);
  console.log(`Sayt:        http://localhost:${PORT}/`);
  console.log(`Admin panel: http://localhost:${PORT}/admin-panel/`);
});
