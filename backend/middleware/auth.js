// ==========================================================================
// middleware/auth.js — JWT verification + role guards
// ==========================================================================

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Giriş tələb olunur." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Sessiya etibarsızdır və ya vaxtı bitib." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Bu əməliyyat üçün icazəniz yoxdur." });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole, JWT_SECRET };
