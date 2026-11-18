// ==========================================================================
// utils/db.js — Lightweight file-based JSON "database".
// ==========================================================================

const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "data", "db.json");

function defaultData() {
  return {
    users: [],
    teachers: [],
    messages: [],
    favorites: [],
    reviews: [],
    complaints: [],
    availability: [],
    articles: []
  };
}

function ensureFile() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData(), null, 2));
  }
}

function readDB() {
  ensureFile();
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return { ...defaultData(), ...parsed };
  } catch (e) {
    return defaultData();
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function all(collection) {
  const db = readDB();
  return db[collection] || [];
}

function findById(collection, id) {
  return all(collection).find((item) => item.id === id) || null;
}

function findOne(collection, predicate) {
  return all(collection).find(predicate) || null;
}

function findMany(collection, predicate) {
  return all(collection).filter(predicate);
}

function insert(collection, item) {
  const db = readDB();
  db[collection].push(item);
  writeDB(db);
  return item;
}

function updateById(collection, id, patch) {
  const db = readDB();
  const idx = db[collection].findIndex((item) => item.id === id);
  if (idx === -1) return null;
  db[collection][idx] = { ...db[collection][idx], ...patch };
  writeDB(db);
  return db[collection][idx];
}

function removeById(collection, id) {
  const db = readDB();
  const before = db[collection].length;
  db[collection] = db[collection].filter((item) => item.id !== id);
  writeDB(db);
  return db[collection].length < before;
}

module.exports = { readDB, writeDB, all, findById, findOne, findMany, insert, updateById, removeById };
