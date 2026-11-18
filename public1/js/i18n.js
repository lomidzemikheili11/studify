// ==========================================================================
// i18n.js — lightweight translation engine.
// Usage: add data-i18n="key" to any element's text, or data-i18n-placeholder
// for input placeholders. Language is stored in localStorage and applied on
// every page load before content is shown.
// ==========================================================================

var SUPPORTED_LANGS = [
  { code: "tr", label: "Türkçe" },
  { code: "az", label: "Azərbaycan" },
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "ka", label: "ქართული" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "zh", label: "中文" },
  { code: "de", label: "Deutsch" }
];
var DEFAULT_LANG = "tr";
var LANG_KEY = "studifyLang";
var i18nDict = {};
var i18nReadyResolve;
var i18nReady = new Promise(function (resolve) { i18nReadyResolve = resolve; });

function getCurrentLang() {
  return localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
}

function setCurrentLang(code) {
  localStorage.setItem(LANG_KEY, code);
}

async function loadLocale(code) {
  try {
    var res = await fetch("locales/" + code + ".json");
    if (!res.ok) throw new Error("locale not found");
    i18nDict = await res.json();
  } catch (e) {
    if (code !== DEFAULT_LANG) {
      var res2 = await fetch("locales/" + DEFAULT_LANG + ".json");
      i18nDict = await res2.json();
    }
  }
}

function t(key) {
  return i18nDict[key] || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    if (i18nDict[key] !== undefined) el.textContent = i18nDict[key];
  });
  document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
    var key = el.getAttribute("data-i18n-html");
    if (i18nDict[key] !== undefined) el.innerHTML = i18nDict[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
    var key = el.getAttribute("data-i18n-placeholder");
    if (i18nDict[key] !== undefined) el.placeholder = i18nDict[key];
  });
  document.documentElement.setAttribute("lang", getCurrentLang());
}

async function initI18n() {
  var lang = getCurrentLang();
  await loadLocale(lang);
  applyTranslations();
  renderLangSwitcher();
  i18nReadyResolve();
}

function renderLangSwitcher() {
  document.querySelectorAll(".lang-switcher").forEach(function (box) {
    var current = SUPPORTED_LANGS.find(function (l) { return l.code === getCurrentLang(); }) || SUPPORTED_LANGS[0];
    box.innerHTML =
      '<button class="pill-select" id="langSwitcherBtn_' + box.dataset.id + '">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></svg>' +
        current.code.toUpperCase() +
      '</button>' +
      '<div class="lang-dropdown" id="langDropdown_' + box.dataset.id + '"></div>';

    var dropdown = document.getElementById("langDropdown_" + box.dataset.id);
    dropdown.innerHTML = SUPPORTED_LANGS.map(function (l) {
      return '<div class="lang-option" data-code="' + l.code + '">' + l.label + '</div>';
    }).join("");

    document.getElementById("langSwitcherBtn_" + box.dataset.id).addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("open");
    });
    dropdown.querySelectorAll(".lang-option").forEach(function (opt) {
      opt.addEventListener("click", async function () {
        var code = opt.getAttribute("data-code");
        setCurrentLang(code);
        dropdown.classList.remove("open");
        await loadLocale(code);
        applyTranslations();
        renderLangSwitcher();
        if (typeof getToken === "function" && getToken()) {
          try { await apiFetch("/auth/language", { method: "PUT", body: { language: code } }); } catch (e) {}
        }
      });
    });
  });

  document.addEventListener("click", function () {
    document.querySelectorAll(".lang-dropdown.open").forEach(function (d) { d.classList.remove("open"); });
  });
}
