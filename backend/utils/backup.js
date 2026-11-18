// ==========================================================================
// utils/backup.js — automatic daily backups of data/db.json.
// Keeps the last 30 days so a crash or bad edit never means total data loss.
// ==========================================================================

const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");
const BACKUP_DIR = path.join(__dirname, "..", "backups");
const MAX_BACKUPS = 30;

function runBackup() {
  if (!fs.existsSync(DB_FILE)) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(BACKUP_DIR, `db-${timestamp}.json`);
  fs.copyFileSync(DB_FILE, dest);

  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith("db-")).sort();
  while (files.length > MAX_BACKUPS) {
    fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
  }
  console.log("Yedekleme tamamlandı:", dest);
}

function startAutoBackup() {
  runBackup();
  setInterval(runBackup, 24 * 60 * 60 * 1000);
}

if (require.main === module) runBackup();

module.exports = { runBackup, startAutoBackup };
