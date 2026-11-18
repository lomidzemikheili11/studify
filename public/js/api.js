// ==========================================================================
// api.js — talks to the backend. Loaded on every public page.
// ==========================================================================

const API_BASE = "/api";
const AUTH_TOKEN_KEY = "studifyToken";

function getToken() { return localStorage.getItem(AUTH_TOKEN_KEY); }
function setToken(token) { localStorage.setItem(AUTH_TOKEN_KEY, token); }
function clearToken() { localStorage.removeItem(AUTH_TOKEN_KEY); }

async function apiFetch(path, options) {
  options = options || {};
  var headers = options.headers || {};
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  var token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  var res = await fetch(API_BASE + path, {
    method: options.method || "GET",
    headers: headers,
    body: options.body ? (options.body instanceof FormData ? options.body : JSON.stringify(options.body)) : undefined
  });

  var data = null;
  try { data = await res.json(); } catch (e) { data = null; }

  if (!res.ok) throw new Error((data && data.error) || "Xəta baş verdi. Yenidən cəhd edin.");
  return data;
}

var currentUser = null;

async function loadSession() {
  var token = getToken();
  if (!token) { currentUser = null; return null; }
  try {
    var data = await apiFetch("/auth/me");
    currentUser = data.user;
    return currentUser;
  } catch (e) {
    clearToken();
    currentUser = null;
    return null;
  }
}

function logout() {
  clearToken();
  currentUser = null;
  window.location.href = "index.html";
}

function initials(name) {
  return (name || "").split(" ").filter(Boolean).map(function (p) { return p.charAt(0).toUpperCase(); }).slice(0, 2).join("");
}

function renderAuthArea() {
  var box = document.getElementById("authArea");
  var mobileBox = document.getElementById("authAreaMobile");
  if (!box && !mobileBox) return;

  if (!currentUser) return;

  var panelHref = currentUser.role === "teacher" ? "teacher-dashboard.html" : "student-dashboard.html";

  if (box) {
    box.innerHTML =
      '<div class="user-menu">' +
        '<button class="user-chip-btn" id="userMenuBtn">' +
          '<span class="user-avatar-sm">' + initials(currentUser.name) + '</span>' +
        '</button>' +
        '<div class="user-dropdown" id="userDropdown">' +
          '<div class="user-dropdown-head">' +
            '<span class="user-avatar-sm">' + initials(currentUser.name) + '</span>' +
            '<div><div style="font-weight:700; font-size:13px; color:var(--navy);">' + currentUser.name + '</div><div style="font-size:11px; color:var(--gray-500);">' + currentUser.email + '</div></div>' +
          '</div>' +
          '<a href="' + panelHref + '" class="user-dropdown-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/></svg>Panelim</a>' +
          '<a href="messages.html" class="user-dropdown-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Mesajlarım</a>' +
          (currentUser.role === "student" ? '<a href="student-dashboard.html?tab=favorites" class="user-dropdown-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-6.7-4.3-9.3-8.1C1.1 10.7 1.6 7.7 4 6.1c2.1-1.4 4.7-.9 6.2.9L12 8.9l1.8-1.9c1.5-1.8 4.1-2.3 6.2-.9 2.4 1.6 2.9 4.6 1.3 6.8C18.7 16.7 12 21 12 21z"/></svg>Favorilerim</a>' : '') +
          '<a href="contact.html" class="user-dropdown-item"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01"/></svg>Yardım Al</a>' +
          '<div class="user-dropdown-item" id="logoutBtn" style="color:var(--red); cursor:pointer;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>Çıkış</div>' +
        '</div>' +
      '</div>';

    document.getElementById("userMenuBtn").addEventListener("click", function (e) {
      e.stopPropagation();
      document.getElementById("userDropdown").classList.toggle("open");
    });
    document.getElementById("logoutBtn").addEventListener("click", logout);
    document.addEventListener("click", function () {
      var d = document.getElementById("userDropdown");
      if (d) d.classList.remove("open");
    });
  }

  if (mobileBox) {
    mobileBox.innerHTML =
      '<div style="display:flex; align-items:center; gap:10px; padding:10px 0;">' +
        '<span class="user-avatar-sm">' + initials(currentUser.name) + '</span>' +
        '<span style="font-weight:700; font-size:13px;">' + currentUser.name + '</span>' +
      '</div>' +
      '<a href="' + panelHref + '" class="btn btn-outline btn-block" style="margin-bottom:8px;">Panelim</a>' +
      '<a href="messages.html" class="btn btn-outline btn-block" style="margin-bottom:8px;">Mesajlarım</a>' +
      '<button class="btn btn-outline btn-block" id="logoutBtnMobile">Çıkış</button>';
    document.getElementById("logoutBtnMobile").addEventListener("click", logout);
  }
}

async function requireAuth(allowedRoles) {
  var user = await loadSession();
  if (!user) { window.location.href = "login.html"; return null; }
  if (allowedRoles && allowedRoles.indexOf(user.role) === -1) { window.location.href = "index.html"; return null; }
  return user;
}
