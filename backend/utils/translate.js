// ==========================================================================
// utils/translate.js — automatic message translation via LibreTranslate.
//
// LibreTranslate is open-source and can be:
//   (a) Self-hosted for completely free, unlimited use (see README), or
//   (b) Used via a paid hosted API (e.g. portal.libretranslate.com) if you
//       don't want to run your own server.
//
// If TRANSLATE_API_URL is not set in .env, translateText() returns the
// original text unchanged — chat keeps working normally, just without
// automatic translation, until this is configured.
// ==========================================================================

function isConfigured() {
  return !!process.env.TRANSLATE_API_URL;
}

// Maps our site's 9 language codes to ISO codes LibreTranslate expects.
// (Our codes already match ISO 639-1 for all nine, so this is an identity
// map today — kept as a lookup table in case that ever changes.)
const LANG_MAP = { tr: "tr", az: "az", en: "en", ru: "ru", ka: "ka", es: "es", fr: "fr", zh: "zh", de: "de" };

async function translateText(text, targetLang, sourceLang) {
  if (!isConfigured() || !text || !text.trim()) return null;
  const target = LANG_MAP[targetLang];
  if (!target || target === sourceLang) return null;

  try {
    const body = { q: text, source: sourceLang ? LANG_MAP[sourceLang] || "auto" : "auto", target, format: "text" };
    if (process.env.TRANSLATE_API_KEY) body.api_key = process.env.TRANSLATE_API_KEY;

    const res = await fetch(process.env.TRANSLATE_API_URL.replace(/\/$/, "") + "/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.translatedText || null;
  } catch (e) {
    console.error("[translate] Çeviri hatası:", e.message);
    return null;
  }
}

module.exports = { translateText, isConfigured };
