// ==========================================================================
// student-dashboard.js — student-dashboard.html
// ==========================================================================

function favTeacherCard(tch) {
  var avatarUrl = tch.avatar || ("https://ui-avatars.com/api/?background=eaf1ff&color=1a56db&name=" + encodeURIComponent(tch.name));
  var location = tch.city ? (tch.city + (tch.country ? ", " + tch.country : "")) : (tch.country || "");
  return (
    '<a href="teacher-profile.html?id=' + tch.id + '" class="fav-card" style="text-decoration:none; color:inherit;">' +
      '<img src="' + avatarUrl + '" alt="' + tch.name + '">' +
      '<div style="flex:1;">' +
        '<div style="font-weight:700; color:var(--navy); font-size:14px;">' + tch.name + '</div>' +
        '<div style="font-size:12px; color:var(--blue);">' + tch.subject + '</div>' +
        '<div style="font-size:11.5px; color:var(--gray-500);">' + (location || "Online") + '</div>' +
      '</div>' +
      '<div style="font-weight:700; color:var(--navy);">$' + tch.priceHourly + '</div>' +
    '</a>'
  );
}

async function loadFavorites() {
  var box = document.getElementById("favoritesList");
  try {
    var data = await apiFetch("/teachers/favorites/mine");
    if (data.teachers.length === 0) {
      box.innerHTML = '<p style="color:var(--gray-500); font-size:13.5px;">Henüz favori öğretmeniniz yok. <a href="teachers.html" style="color:var(--blue); font-weight:700;">Öğretmenlere göz atın →</a></p>';
      return;
    }
    box.innerHTML = data.teachers.map(favTeacherCard).join("");
  } catch (err) {
    box.innerHTML = '<p style="color:var(--red); font-size:13.5px;">Favoriler yüklenemedi.</p>';
  }
}

async function loadMessages() {
  var thread = document.getElementById("msgThread");
  thread.innerHTML = '<p style="color:var(--gray-500); font-size:13.5px;">Yükleniyor...</p>';
  try {
    var data = await apiFetch("/messages/mine");
    if (data.messages.length === 0) { thread.innerHTML = '<p style="color:var(--gray-500); font-size:13.5px;">Henüz admin\'e mesaj göndermediniz.</p>'; return; }
    var ordered = data.messages.slice().reverse();
    thread.innerHTML = ordered.map(function (m) {
      if (m.senderId === null) {
        return '<div style="background:var(--gray-100); border-radius:10px; padding:12px 14px; align-self:flex-start; max-width:80%; font-size:13px;">' + m.message.replace(/</g, "&lt;") +
          '<div style="font-size:10.5px; color:var(--gray-500); margin-top:4px;">Admin · ' + new Date(m.createdAt).toLocaleString("tr-TR") + '</div></div>';
      }
      var mine = '<div style="background:var(--blue-pale); border-radius:10px; padding:12px 14px; align-self:flex-end; max-width:80%; font-size:13px;">' + m.message.replace(/</g, "&lt;") +
        '<div style="font-size:10.5px; color:var(--gray-500); margin-top:4px;">Siz · ' + new Date(m.createdAt).toLocaleString("tr-TR") + '</div></div>';
      var reply = m.adminReply
        ? '<div style="background:var(--gray-100); border-radius:10px; padding:12px 14px; align-self:flex-start; max-width:80%; font-size:13px;">' + m.adminReply.replace(/</g, "&lt;") +
          '<div style="font-size:10.5px; color:var(--gray-500); margin-top:4px;">Admin · ' + new Date(m.repliedAt).toLocaleString("tr-TR") + '</div></div>'
        : "";
      return mine + reply;
    }).join("");
  } catch (err) { thread.innerHTML = '<p style="color:var(--red); font-size:13.5px;">Mesajlar yüklenemedi.</p>'; }
}

async function loadLessons() {
  var box = document.getElementById("lessonsList");
  box.innerHTML = '<p style="color:var(--gray-500); font-size:13.5px;">Yükleniyor...</p>';
  try {
    var data = await apiFetch("/availability/bookings/mine");
    if (data.slots.length === 0) { box.innerHTML = '<p style="color:var(--gray-500); font-size:13.5px;">Henüz rezerve edilmiş bir dersiniz yok.</p>'; return; }
    box.innerHTML = data.slots.map(function (s) {
      var d = new Date(s.date + "T" + s.startTime);
      var label = d.toLocaleDateString("tr-TR", { weekday: "long", day: "2-digit", month: "long" }) + ", " + s.startTime;
      return '<div style="display:flex; align-items:center; justify-content:space-between; border:1px solid var(--gray-200); border-radius:10px; padding:14px 16px; margin-bottom:10px;">' +
        '<div><b style="font-size:13.5px; color:var(--navy);">' + label + '</b><div style="font-size:12px; color:var(--gray-500); margin-top:3px;">' + s.teacherName + ' · ' + s.duration + ' dakika</div></div>' +
        '<button class="btn btn-outline" style="font-size:12px; padding:6px 12px; color:var(--red); border-color:var(--red);" data-cancel-lesson="' + s.id + '">İptal Et</button>' +
      '</div>';
    }).join("");
    box.querySelectorAll("[data-cancel-lesson]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Bu dersi iptal etmek istediğinize emin misiniz?")) return;
        try { await apiFetch("/availability/" + btn.getAttribute("data-cancel-lesson"), { method: "DELETE" }); loadLessons(); }
        catch (err) { alert(err.message); }
      });
    });
  } catch (err) { box.innerHTML = '<p style="color:var(--red); font-size:13.5px;">Yüklenemedi.</p>'; }
}

document.addEventListener("DOMContentLoaded", async function () {
  var user = await requireAuth(["student"]);
  if (!user) return;
  renderAuthArea();

  await loadFavorites();

  document.querySelectorAll(".dash-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".dash-tab").forEach(function (dt) { dt.classList.remove("active"); });
      document.querySelectorAll(".dash-panel").forEach(function (p) { p.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById("panel-" + tab.getAttribute("data-tab")).classList.add("active");
      if (tab.getAttribute("data-tab") === "messages") loadMessages();
      if (tab.getAttribute("data-tab") === "lessons") loadLessons();
    });
  });

  document.getElementById("sendMsgBtn").addEventListener("click", async function () {
    var errorBox = document.getElementById("msgError");
    errorBox.style.display = "none";
    var text = document.getElementById("newMsgText").value.trim();
    if (!text) { errorBox.textContent = "Mesaj boş olamaz."; errorBox.style.display = "block"; return; }
    try {
      await apiFetch("/messages/to-admin", { method: "POST", body: { message: text } });
      document.getElementById("newMsgText").value = "";
      loadMessages();
    } catch (err) { errorBox.textContent = err.message; errorBox.style.display = "block"; }
  });

  document.getElementById("deleteAccountBtn").addEventListener("click", async function () {
    if (!confirm("Hesabınızı ve tüm verilerinizi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    var password = prompt("Onaylamak için şifrenizi girin:");
    if (!password) return;
    try {
      await apiFetch("/auth/me", { method: "DELETE", body: { password: password } });
      logout();
    } catch (err) { alert(err.message); }
  });

  // Support deep-link ?tab=favorites from the header dropdown.
  var params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "messages") document.querySelector('.dash-tab[data-tab="messages"]').click();
});
