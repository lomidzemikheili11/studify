// ==========================================================================
// utils/crypto.js — AES-256-GCM encryption for sensitive data at rest.
// Used for private message content, so that even direct access to the
// database file does not expose conversation text without the key in .env.
// ==========================================================================

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const secret = process.env.ENCRYPTION_KEY || "dev-only-insecure-key-change-me!!";
  // Derive a stable 32-byte key regardless of the .env string's length.
  return crypto.createHash("sha256").update(secret).digest();
}

// Returns a single string ("iv:authTag:ciphertext", all hex) so it drops
// into a normal JSON string field without any schema changes.
function encrypt(plainText) {
  if (plainText === null || plainText === undefined) return plainText;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(payload) {
  if (!payload || typeof payload !== "string" || payload.indexOf(":") === -1) return payload;
  try {
    const [ivHex, authTagHex, dataHex] = payload.split(":");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (e) {
    return payload; // not encrypted (e.g. legacy/plain data) — return as-is
  }
}

// ---- Binary (file) variants — used for uploaded ID/diploma documents ----
// Format on disk: [12-byte IV][16-byte authTag][ciphertext bytes]

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

function decryptBuffer(buffer) {
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const data = buffer.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

module.exports = { encrypt, decrypt, encryptBuffer, decryptBuffer };
