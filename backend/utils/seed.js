// ==========================================================================
// utils/seed.js — Creates the first admin account on first run only.
// ==========================================================================

const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { readDB, writeDB } = require("./db");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@studify.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";

function seed() {
  const db = readDB();
  const alreadyHasAdmin = db.users.some((u) => u.role === "admin");
  if (alreadyHasAdmin) {
    console.log("Seed skipped: an admin account already exists.");
    return;
  }

  db.users.push({
    id: uuidv4(),
    firstName: "Admin",
    lastName: "",
    name: "Admin",
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    phone: "",
    role: "admin",
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorPendingSecret: null,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  console.log("Seed complete — admin account created.");
  console.log("  Login:    " + ADMIN_EMAIL);
  console.log("  Password: " + ADMIN_PASSWORD);
  console.log("  IMPORTANT: change this password before going live.");
  console.log("  IMPORTANT: set up 2FA on first login for full account security.");
}

if (require.main === module) seed();
module.exports = seed;
