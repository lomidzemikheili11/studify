// ==========================================================================
// script.js — shared UI behaviour for every public page.
// Requires api.js and i18n.js to be loaded first.
// ==========================================================================

document.addEventListener("DOMContentLoaded", async function () {
  await initI18n();
  await loadSession();
  renderAuthArea();
  initCookieBanner();
  initThemeToggle();

  var burger = document.querySelector(".burger");
  var mobileNav = document.querySelector(".mobile-nav");
  if (burger && mobileNav) {
    burger.addEventListener("click", function () { mobileNav.classList.toggle("open"); });
  }

  var searchForm = document.querySelector(".search-bar");
  var onTeachersPage = !!document.getElementById("teacherGrid");
  if (searchForm && !onTeachersPage) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      window.location.href = "teachers.html" + buildFilterQuery(searchForm);
    });
  }

  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var errorBox = document.getElementById("contactError");
      var successBox = document.getElementById("contactSuccess");
      errorBox.style.display = "none";
      try {
        await apiFetch("/messages/contact", {
          method: "POST",
          body: {
            name: document.getElementById("cName").value.trim(),
            phone: document.getElementById("cPhone").value.trim(),
            email: document.getElementById("cEmail").value.trim(),
            subject: document.getElementById("cSubject").value,
            message: document.getElementById("cMessage").value.trim()
          }
        });
        successBox.style.display = "block";
        contactForm.reset();
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = "block";
      }
    });
  }

  var current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a, .mobile-nav a").forEach(function (link) {
    if (link.getAttribute("href") === current) link.classList.add("active");
  });
});

function buildFilterQuery(form) {
  var params = new URLSearchParams();
  form.querySelectorAll("[name]").forEach(function (el) {
    if (el.value) params.set(el.name, el.value);
  });
  var qs = params.toString();
  return qs ? "?" + qs : "";
}

function initThemeToggle() {
  var btn = document.getElementById("themeToggleBtn");
  if (!btn) return;

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function updateIcon() {
    btn.textContent = currentTheme() === "dark" ? "☀️" : "🌙";
  }
  updateIcon();

  btn.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try { localStorage.setItem("studifyTheme", next); } catch (e) {}
    updateIcon();
  });
}

function initCookieBanner() {
  if (localStorage.getItem("studifyCookieConsent")) return;
  var banner = document.createElement("div");
  banner.style.cssText = "position:fixed; bottom:0; left:0; right:0; background:#0d1b3e; color:#fff; padding:14px 20px; display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; z-index:1000; font-size:12.5px;";
  banner.innerHTML =
    '<span>Bu site, oturumunuzu ve dil tercihinizi hatırlamak için tarayıcı depolamasını kullanır. <a href="privacy.html" style="color:#8ec1ff; text-decoration:underline;">Gizlilik Politikası</a></span>' +
    '<button id="cookieAcceptBtn" style="background:#1a56db; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-weight:700; font-size:12.5px; cursor:pointer; white-space:nowrap;">Tamam</button>';
  document.body.appendChild(banner);
  document.getElementById("cookieAcceptBtn").addEventListener("click", function () {
    localStorage.setItem("studifyCookieConsent", "1");
    banner.remove();
  });
}
