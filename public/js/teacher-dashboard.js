// ==========================================================================
// teacher-dashboard.js — teacher-dashboard.html
// ==========================================================================

var myTeacherProfile = null;

function statusBannerHTML(status, reason) {
  if (status === "approved") return '<div class="status-banner approved">✓ Profiliniz onaylandı ve sitede görünüyor.</div>';
  if (status === "rejected") return '<div class="status-banner rejected">✕ Profiliniz reddedildi' + (reason ? (": " + reason) : ".") + ' Bilgilerinizi güncelleyip tekrar gönderebilirsiniz.</div>';
  return '<div class="status-banner pending">⏳ Profiliniz admin tarafından inceleniyor. Onaylanana kadar sitede görünmeyecek.</div>';
}

function fillProfileForm(tch) {
  document.getElementById("dSubject").value = tch.subject;
  document.getElementById("dPriceHourly").value = tch.priceHourly || "";
  document.getElementById("dPriceMonthly").value = tch.priceMonthly || "";
  var hasDiscount = !!(tch.priceMonthlyOriginal && tch.priceMonthlyOriginal > tch.priceMonthly);
  document.getElementById("dDiscountToggle").checked = hasDiscount;
  document.getElementById("dPriceMonthlyOriginal").value = tch.priceMonthlyOriginal || "";
  document.getElementById("dDiscountGroup").style.display = hasDiscount ? "block" : "none";
  document.getElementById("dExperience").value = tch.experience || "";
  document.getElementById("dOnline").checked = !!tch.online;
  document.getElementById("dOffline").checked = !!tch.offline;
  document.getElementById("dCountry").value = tch.country || "";
  document.getElementById("dCity").value = tch.city || "";
  document.getElementById("dStreet").value = tch.street || "";
  document.getElementById("dStreetGroup").style.display = tch.offline ? "block" : "none";
  document.getElementById("dNationality").value = tch.nationality || "";
  document.getElementById("dWhatsapp").value = tch.whatsapp || "";
  document.getElementById("dUniversity").value = tch.university || "";
  document.getElementById("dBio").value = tch.bio || "";
  document.querySelectorAll(".dLangCheck").forEach(function (cb) { cb.checked = (tch.langs || []).indexOf(cb.value) !== -1; });
  document.getElementById("dashAvatarPreview").src = tch.avatar || ("https://ui-avatars.com/api/?background=eaf1ff&color=1a56db&size=200&name=" + encodeURIComponent(tch.name));
}

async function loadProfile() {
  try {
    var data = await apiFetch("/teachers/me/profile");
    myTeacherProfile = data.teacher;
    document.getElementById("statusBanner").innerHTML = statusBannerHTML(myTeacherProfile.status, myTeacherProfile.rejectionReason);
    fillProfileForm(myTeacherProfile);
  } catch (err) {
    document.getElementById("statusBanner").innerHTML = '<div class="status-banner rejected">Profil yüklenemedi: ' + err.message + '</div>';
  }
}

async function loadMyReviews() {
  var box = document.getElementById("myReviewsList");
  if (!myTeacherProfile) return;
  try {
    var data = await apiFetch("/teachers/" + myTeacherProfile.id + "/reviews");
    if (data.reviews.length === 0) { box.innerHTML = '<p style="color:var(--gray-500); font-size:13.5px;">Henüz değerlendirmeniz yok.</p>'; return; }
    box.innerHTML = data.reviews.map(function (r) {
      var stars = ""; for (var i = 1; i <= 5; i++) stars += i <= r.rating ? "★" : "☆";
      return '<div style="border:1px solid var(--gray-200); border-radius:10px; padding:14px 16px; margin-bottom:10px;">' +
        '<div style="display:flex; justify-content:space-between;"><b style="font-size:13px;">' + r.userName + '</b><span style="font-size:11px; color:var(--gray-500);">' + new Date(r.createdAt).toLocaleDateString("tr-TR") + '</span></div>' +
        '<div style="color:var(--yellow);">' + stars + '</div>' +
        '<p style="font-size:13px; color:var(--gray-700); margin:6px 0 0;">' + r.comment.replace(/</g, "&lt;") + '</p>' +
      '</div>';
    }).join("");
  } catch (err) { box.innerHTML = '<p style="color:var(--red); font-size:13.5px;">Değerlendirmeler yüklenemedi.</p>'; }
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
        // Admin started this conversation.
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

async function loadSlots() {
  var box = document.getElementById("slotsList");
  box.innerHTML = '<p style="color:var(--gray-500); font-size:13.5px;">Yükleniyor...</p>';
  try {
    var data = await apiFetch("/availability/mine");
    if (data.slots.length === 0) { box.innerHTML = '<p style="color:var(--gray-500); font-size:13.5px;">Henüz müsaitlik eklemediniz.</p>'; return; }
    box.innerHTML = data.slots.map(function (s) {
      var dateLabel = new Date(s.date + "T" + s.startTime).toLocaleDateString("tr-TR", { weekday: "short", day: "2-digit", month: "short" });
      var statusPill = s.status === "booked"
        ? '<span style="background:var(--blue-pale); color:var(--blue); font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px;">Rezerve: ' + adminEscapeLite(s.bookedByStudentName) + '</span>'
        : '<span style="background:var(--gray-100); color:var(--gray-700); font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px;">Müsait</span>';
      return '<div style="display:flex; align-items:center; justify-content:space-between; border:1px solid var(--gray-200); border-radius:10px; padding:12px 14px; margin-bottom:8px;">' +
        '<div><b style="font-size:13px; color:var(--navy);">' + dateLabel + ', ' + s.startTime + '</b> <span style="font-size:12px; color:var(--gray-500);">(' + s.duration + ' dk)</span><div style="margin-top:4px;">' + statusPill + '</div></div>' +
        '<button class="btn btn-outline a-btn-sm" style="padding:6px 12px; font-size:12px; color:var(--red); border-color:var(--red);" data-remove-slot="' + s.id + '">Sil</button>' +
      '</div>';
    }).join("");
    box.querySelectorAll("[data-remove-slot]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!confirm("Bu ders saatini silmek istediğinize emin misiniz?")) return;
        try { await apiFetch("/availability/" + btn.getAttribute("data-remove-slot"), { method: "DELETE" }); loadSlots(); }
        catch (err) { alert(err.message); }
      });
    });
  } catch (err) { box.innerHTML = '<p style="color:var(--red); font-size:13.5px;">Yüklenemedi: ' + err.message + '</p>'; }
}

function adminEscapeLite(str) { return (str || "").replace(/[<>]/g, function (c) { return c === "<" ? "&lt;" : "&gt;"; }); }

document.addEventListener("DOMContentLoaded", async function () {
  var user = await requireAuth(["teacher"]);
  if (!user) return;
  renderAuthArea();

  populateSelect(document.getElementById("dSubject"), SUBJECTS);
  populateSelect(document.getElementById("dCountry"), COUNTRIES);
  populateSelect(document.getElementById("dNationality"), NATIONALITIES);
  document.getElementById("dLangs").innerHTML = TEACHING_LANGUAGES.map(function (l) {
    return '<label><input type="checkbox" class="dLangCheck" value="' + l.code + '"> ' + l.label + '</label>';
  }).join("");

  await loadProfile();

  document.querySelectorAll(".dash-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".dash-tab").forEach(function (dt) { dt.classList.remove("active"); });
      document.querySelectorAll(".dash-panel").forEach(function (p) { p.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById("panel-" + tab.getAttribute("data-tab")).classList.add("active");
      if (tab.getAttribute("data-tab") === "reviews") loadMyReviews();
      if (tab.getAttribute("data-tab") === "messages") loadMessages();
      if (tab.getAttribute("data-tab") === "calendar") loadSlots();
    });
  });

  document.getElementById("dashAvatarInput").addEventListener("change", async function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var fd = new FormData(); fd.append("avatar", file);
    try {
      var res = await apiFetch("/upload/avatar", { method: "POST", body: fd });
      document.getElementById("dashAvatarPreview").src = res.avatar;
    } catch (err) { alert(err.message); }
  });

  document.getElementById("dDiscountToggle").addEventListener("change", function () {
    document.getElementById("dDiscountGroup").style.display = this.checked ? "block" : "none";
    if (!this.checked) document.getElementById("dPriceMonthlyOriginal").value = "";
  });
  document.getElementById("dOffline").addEventListener("change", function () {
    document.getElementById("dStreetGroup").style.display = this.checked ? "block" : "none";
  });

  document.getElementById("profileForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var errorBox = document.getElementById("profileError");
    var successBox = document.getElementById("profileSuccess");
    errorBox.style.display = "none"; successBox.style.display = "none";

    var langs = Array.from(document.querySelectorAll(".dLangCheck:checked")).map(function (c) { return c.value; });
    if (langs.length === 0) { errorBox.textContent = "En az bir dil seçin."; errorBox.style.display = "block"; return; }
    var online = document.getElementById("dOnline").checked;
    var offline = document.getElementById("dOffline").checked;
    if (!online && !offline) { errorBox.textContent = "En az bir ders şekli seçin."; errorBox.style.display = "block"; return; }

    var discountOn = document.getElementById("dDiscountToggle").checked;
    var priceMonthly = Number(document.getElementById("dPriceMonthly").value) || 0;
    var priceMonthlyOriginal = discountOn ? (Number(document.getElementById("dPriceMonthlyOriginal").value) || 0) : 0;
    if (discountOn && priceMonthlyOriginal <= priceMonthly) {
      errorBox.textContent = "Önceki ücret, şimdiki ücretten yüksek olmalıdır.";
      errorBox.style.display = "block";
      return;
    }

    var payload = {
      subject: document.getElementById("dSubject").value,
      priceHourly: Number(document.getElementById("dPriceHourly").value) || 0,
      priceMonthly: priceMonthly,
      priceMonthlyOriginal: priceMonthlyOriginal,
      experience: Number(document.getElementById("dExperience").value) || 0,
      online: online,
      offline: offline,
      country: document.getElementById("dCountry").value,
      city: document.getElementById("dCity").value.trim(),
      street: offline ? document.getElementById("dStreet").value.trim() : "",
      nationality: document.getElementById("dNationality").value,
      langs: langs,
      whatsapp: document.getElementById("dWhatsapp").value.trim(),
      university: document.getElementById("dUniversity").value.trim(),
      bio: document.getElementById("dBio").value.trim()
    };

    try {
      var data = await apiFetch("/teachers/me/profile", { method: "PUT", body: payload });
      myTeacherProfile = data.teacher;
      document.getElementById("statusBanner").innerHTML = statusBannerHTML(myTeacherProfile.status);
      successBox.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = "block";
    }
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

  document.getElementById("addSlotBtn").addEventListener("click", async function () {
    var errorBox = document.getElementById("slotError");
    errorBox.style.display = "none";
    var date = document.getElementById("slotDate").value;
    var time = document.getElementById("slotTime").value;
    var duration = document.getElementById("slotDuration").value;
    if (!date || !time) { errorBox.textContent = "Tarih ve saat seçin."; errorBox.style.display = "block"; return; }
    try {
      await apiFetch("/availability", { method: "POST", body: { date: date, startTime: time, duration: duration } });
      document.getElementById("slotDate").value = "";
      document.getElementById("slotTime").value = "";
      loadSlots();
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
});
