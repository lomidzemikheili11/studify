// ==========================================================================
// admin-api.js — API client + session/shell helpers for the admin panel.
// Uses a SEPARATE localStorage key from the public site.
// ==========================================================================

const ADMIN_API_BASE = "/api";
const ADMIN_TOKEN_KEY = "studifyAdminToken";

function adminGetToken() { return localStorage.getItem(ADMIN_TOKEN_KEY); }
function adminSetToken(token) { localStorage.setItem(ADMIN_TOKEN_KEY, token); }
function adminClearToken() { localStorage.removeItem(ADMIN_TOKEN_KEY); }

async function adminFetch(path, options) {
  options = options || {};
  var headers = options.headers || {};
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  var token = adminGetToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  var res = await fetch(ADMIN_API_BASE + path, {
    method: options.method || "GET",
    headers: headers,
    body: options.body ? (options.body instanceof FormData ? options.body : JSON.stringify(options.body)) : undefined
  });

  var data = null;
  try { data = await res.json(); } catch (e) { data = null; }

  if (res.status === 401 || res.status === 403) {
    adminClearToken();
    if (!window.location.pathname.endsWith("/login.html")) window.location.href = "login.html";
    throw new Error((data && data.error) || "Oturum sona erdi.");
  }
  if (!res.ok) throw new Error((data && data.error) || "Bir hata oluştu.");
  return data;
}

var adminCurrentUser = null;

async function adminRequireAuth() {
  var token = adminGetToken();
  if (!token) { window.location.href = "login.html"; return null; }
  try {
    var data = await adminFetch("/auth/me");
    if (data.user.role !== "admin") { adminClearToken(); window.location.href = "login.html"; return null; }
    adminCurrentUser = data.user;

    var onSetupPage = window.location.pathname.endsWith("/setup-2fa.html");
    if (!data.user.twoFactorEnabled && !onSetupPage) {
      window.location.href = "setup-2fa.html";
      return null;
    }
    return adminCurrentUser;
  } catch (e) {
    adminClearToken();
    window.location.href = "login.html";
    return null;
  }
}

function adminLogout() { adminClearToken(); window.location.href = "login.html"; }

function adminInitials(name) {
  return (name || "").split(" ").filter(Boolean).map(function (p) { return p.charAt(0).toUpperCase(); }).slice(0, 2).join("");
}

var ADMIN_NAV = [
  { key: "dashboard", href: "index.html", label: "Dashboard", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { key: "teachers", href: "teachers.html", label: "Öğretmenler", icon: "M12 2l9 4.5v6c0 5-3.8 9.4-9 10.5-5.2-1.1-9-5.5-9-10.5v-6z" },
  { key: "users", href: "users.html", label: "Kullanıcılar", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" },
  { key: "messages", href: "messages.html", label: "Mesajlar", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  { key: "conversations", href: "conversations.html", label: "Tüm Yazışmalar", icon: "M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a1.994 1.994 0 0 1-1.414-.586M7 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1M3 12l3 3 3-3M6 15V3" },
  { key: "complaints", href: "complaints.html", label: "Şikayetler", icon: "M12 9v4M12 17h.01M10.3 3.9L2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" },
  { key: "reviews", href: "reviews.html", label: "Değerlendirmeler", icon: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" },
  { key: "blog", href: "blog.html", label: "Blog", icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" },
  { key: "audit", href: "audit.html", label: "İşlem Kayıtları", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { key: "security", href: "setup-2fa.html", label: "Güvenlik", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }
];

async function initAdminShell(activeKey) {
  var user = await adminRequireAuth();
  if (!user) return null;

  var shell = document.getElementById("adminShell");
  if (!shell) return user;

  var navHTML = ADMIN_NAV.map(function (item) {
    return '<a href="' + item.href + '" class="' + (item.key === activeKey ? "active" : "") + '" data-nav-key="' + item.key + '">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="' + item.icon + '"/></svg>' +
      '<span>' + item.label + '</span>' +
      '<span class="badge" id="navBadge-' + item.key + '" style="display:none;"></span>' +
    '</a>';
  }).join("");

  shell.innerHTML =
    '<div class="admin-shell">' +
      '<aside class="admin-sidebar" id="adminSidebar">' +
        '<div class="admin-sidebar-logo">' +
          '<img src="/images/logo.png" onerror="this.style.display=\'none\'" alt="">' +
          '<div><b>STUDIFY</b><span>Admin Panel</span></div>' +
        '</div>' +
        '<nav class="admin-nav">' + navHTML + '</nav>' +
        '<div class="admin-sidebar-footer">' +
          '<div class="admin-user-chip"><span class="avatar">' + adminInitials(user.name) + '</span><div><div class="name">' + user.name + '</div><div class="email">' + user.email + '</div></div></div>' +
          '<button class="a-btn a-btn-outline a-btn-block a-btn-sm" id="adminLogoutBtn">Çıkış</button>' +
        '</div>' +
      '</aside>' +
      '<div class="admin-main">' +
        '<div class="admin-topbar"><div style="display:flex; align-items:center; gap:12px;"><button class="burger-admin" id="adminBurger"><span></span><span></span><span></span></button><h1 id="adminPageTitle"></h1></div></div>' +
        '<div class="admin-content" id="adminContentSlot"></div>' +
      '</div>' +
    '</div>' +
    '<div class="a-toast" id="adminToast"></div>';

  var pageContent = document.getElementById("adminPageContent");
  if (pageContent) { document.getElementById("adminContentSlot").appendChild(pageContent); pageContent.style.display = "block"; }

  document.getElementById("adminLogoutBtn").addEventListener("click", adminLogout);
  document.getElementById("adminBurger").addEventListener("click", function () {
    document.getElementById("adminSidebar").classList.toggle("open");
  });

  try {
    var stats = await adminFetch("/admin/stats");
    if (stats.teachers.pending > 0) {
      var b1 = document.getElementById("navBadge-teachers"); b1.textContent = stats.teachers.pending; b1.style.display = "inline-block";
    }
    if (stats.messages.unread > 0) {
      var b2 = document.getElementById("navBadge-messages"); b2.textContent = stats.messages.unread; b2.style.display = "inline-block";
    }
    if (stats.complaints.open > 0) {
      var b3 = document.getElementById("navBadge-complaints"); b3.textContent = stats.complaints.open; b3.style.display = "inline-block";
    }
  } catch (e) {}

  return user;
}

function adminToast(message, isError) {
  var toast = document.getElementById("adminToast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = "a-toast show" + (isError ? " error" : "");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.className = "a-toast"; }, 3500);
}

function adminEscape(str) {
  return (str || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function adminTimeAgo(iso) {
  var diff = Date.now() - new Date(iso).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + " dk önce";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + " sa önce";
  return Math.floor(hours / 24) + " gün önce";
}

// Shared "write a message" modal, used from both teachers.html and users.html
// so an admin can start a new conversation with any teacher or student.
function adminOpenComposeModal(userId, userName) {
  var existing = document.getElementById("adminComposeModal");
  if (existing) existing.remove();

  var overlay = document.createElement("div");
  overlay.className = "a-modal-overlay open";
  overlay.id = "adminComposeModal";
  overlay.innerHTML =
    '<div class="a-modal" style="max-width:440px;">' +
      '<span class="a-modal-close" id="adminComposeClose">✕</span>' +
      '<h3>' + adminEscape(userName) + ' kişisine mesaj yaz</h3>' +
      '<div class="a-form-group"><textarea id="adminComposeText" rows="4" placeholder="Mesajınızı yazın..."></textarea></div>' +
      '<p class="a-error" id="adminComposeError"></p>' +
      '<button class="a-btn a-btn-primary a-btn-block" id="adminComposeSend">Gönder</button>' +
    '</div>';
  document.body.appendChild(overlay);

  document.getElementById("adminComposeClose").addEventListener("click", function () { overlay.remove(); });
  overlay.addEventListener("click", function (e) { if (e.target === overlay) overlay.remove(); });

  document.getElementById("adminComposeSend").addEventListener("click", async function () {
    var errorBox = document.getElementById("adminComposeError");
    errorBox.style.display = "none";
    var text = document.getElementById("adminComposeText").value.trim();
    if (!text) { errorBox.textContent = "Mesaj boş olamaz."; errorBox.style.display = "block"; return; }
    try {
      await adminFetch("/admin/messages/to-user", { method: "POST", body: { userId: userId, message: text } });
      overlay.remove();
      adminToast("Mesaj gönderildi.");
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = "block";
    }
  });
}
