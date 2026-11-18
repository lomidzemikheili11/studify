// ==========================================================================
// teacher-profile.js — teacher-profile.html?id=...
// ==========================================================================

function avatarUrlP(t) {
  return t.avatar || ("https://ui-avatars.com/api/?background=eaf1ff&color=1a56db&bold=true&size=200&name=" + encodeURIComponent(t.name));
}
function starsDisplay(rating) {
  var full = Math.round(rating), out = "";
  for (var i = 1; i <= 5; i++) out += i <= full ? "★" : "☆";
  return out;
}
function timeAgo(iso) {
  var days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "bugün";
  if (days === 1) return "dün";
  if (days < 30) return days + " gün önce";
  return Math.floor(days / 30) + " ay önce";
}

function renderReviewCard(r) {
  return (
    '<div style="border:1px solid var(--gray-200); border-radius:12px; padding:16px 18px; margin-bottom:12px;">' +
      '<div style="display:flex; justify-content:space-between; margin-bottom:6px;"><b style="color:var(--navy); font-size:13px;">' + r.userName + '</b><span style="font-size:11px; color:var(--gray-500);">' + timeAgo(r.createdAt) + '</span></div>' +
      '<div style="color:var(--yellow); font-size:13px;">' + starsDisplay(r.rating) + '</div>' +
      '<p style="font-size:13px; color:var(--gray-700); line-height:1.6; margin:6px 0 0;">' + r.comment.replace(/</g, "&lt;") + '</p>' +
    '</div>'
  );
}

function renderProfile(tch, reviews) {
  var container = document.getElementById("profileContainer");
  var langsHTML = tch.langs.map(function (l) { return '<span style="background:var(--gray-100); padding:3px 9px; border-radius:6px; font-size:11.5px; font-weight:600; margin-right:4px;">' + l.toUpperCase() + '</span>'; }).join("");
  var hasDiscount = tch.priceMonthlyOriginal && tch.priceMonthlyOriginal > tch.priceMonthly;
  var location = tch.city ? (tch.city + (tch.country ? ", " + tch.country : "")) : (tch.country || "Yalnızca online");
  var hourlyApprox = approxConvertedPrice(tch.priceHourly);
  var monthlyApprox = tch.priceMonthly ? approxConvertedPrice(tch.priceMonthly) : null;
  var localTime = tch.country ? approxLocalTime(tch.country) : null;

  container.innerHTML =
    '<div class="profile-grid">' +
      '<div class="profile-card">' +
        (tch.isSuperTeacher ? '<div class="super-badge" style="display:inline-flex; margin-bottom:10px;">⭐ SUPER TEACHER</div>' : '') +
        '<div class="profile-avatar"><img src="' + avatarUrlP(tch) + '" alt="' + tch.name + '"></div>' +
        '<div class="profile-name">' + tch.name + '</div>' +
        '<div class="profile-subject">' + tch.subject + '</div>' +
        '<div style="font-size:13px; color:var(--gray-700); margin-bottom:14px;">⭐ ' + (tch.rating ? tch.rating.toFixed(1) : "Yeni") + (tch.reviews ? ' · ' + tch.reviews + ' değerlendirme' : '') + '</div>' +
        '<div class="profile-price-box">' +
          '<div class="profile-price-row"><span>Saatlik</span><b>$' + tch.priceHourly + (hourlyApprox ? ' <span style="font-weight:500; color:var(--gray-500); font-size:11.5px;">(' + hourlyApprox + ')</span>' : '') + '</b></div>' +
          (tch.priceMonthly ? '<div class="profile-price-row"><span>Aylık</span><b>' + (hasDiscount ? '<span style="text-decoration:line-through; color:var(--gray-500); font-weight:500;">$' + tch.priceMonthlyOriginal + '</span> ' : '') + '$' + tch.priceMonthly + (monthlyApprox ? ' <span style="font-weight:500; color:var(--gray-500); font-size:11.5px;">(' + monthlyApprox + ')</span>' : '') + '</b></div>' : '') +
        '</div>' +
        '<div style="text-align:left; font-size:13px; color:var(--gray-700); margin-bottom:18px;">' +
          '<div style="margin-bottom:8px;">' + (tch.online ? "💻 Online" : "") + (tch.online && tch.offline ? " / " : "") + (tch.offline ? "📍 Yüz yüze" : "") + '</div>' +
          '<div style="margin-bottom:8px;">🌍 ' + location + (localTime ? ' <span style="color:var(--gray-500);">· Yerel saat: ' + localTime + '</span>' : '') + '</div>' +
          '<div style="margin-bottom:8px;">🕒 ' + tch.experience + ' yıl deneyim</div>' +
          '<div>' + langsHTML + '</div>' +
        '</div>' +
        '<button class="btn btn-primary btn-block btn-lg" id="contactBtn">Öğretmene Mesaj Gönder</button>' +
        (currentUser && currentUser.role === "student" ? '<button class="btn btn-outline btn-block" id="reportBtn" style="margin-top:8px; color:var(--red); border-color:var(--red);">Şikayet Et</button>' : '') +
      '</div>' +
      '<div>' +
        '<h3 style="color:var(--navy); font-size:18px; margin:0 0 12px;">Hakkında</h3>' +
        '<p style="font-size:14px; color:var(--gray-700); line-height:1.8; margin-bottom:30px;">' + (tch.bio ? tch.bio.replace(/</g, "&lt;") : "Bu öğretmen henüz kendisi hakkında bilgi eklememiş.") + '</p>' +
        '<h3 style="color:var(--navy); font-size:18px; margin:0 0 12px;">Uygun Ders Saatleri</h3>' +
        '<div id="slotsList" style="margin-bottom:30px;"><p style="color:var(--gray-500); font-size:14px;">Yükleniyor...</p></div>' +
        '<h3 style="color:var(--navy); font-size:18px; margin:0 0 12px;">Değerlendirmeler (' + reviews.length + ')</h3>' +
        '<div id="reviewsList">' + (reviews.length ? reviews.map(renderReviewCard).join("") : '<p style="color:var(--gray-500); font-size:14px;">Henüz değerlendirme yok.</p>') + '</div>' +
      '</div>' +
    '</div>' +
    '<div id="reportModal" style="display:none; position:fixed; inset:0; background:rgba(13,27,62,0.5); align-items:center; justify-content:center; z-index:500; padding:20px;">' +
      '<div style="background:var(--surface); border-radius:16px; padding:24px; max-width:420px; width:100%;">' +
        '<h3 style="margin:0 0 14px; color:var(--navy);">Bu öğretmeni şikayet et</h3>' +
        '<div class="form-group"><label>Sebep</label><select id="reportReason"><option>Uygunsuz davranış</option><option>Profesyonel olmayan tutum</option><option>Dolandırıcılık</option><option>Diğer</option></select></div>' +
        '<div class="form-group"><label>Açıklama</label><textarea id="reportExplanation" rows="4"></textarea></div>' +
        '<p class="error-box" id="reportError"></p>' +
        '<div style="display:flex; gap:10px;"><button class="btn btn-outline btn-block" id="reportCancel">İptal</button><button class="btn btn-primary btn-block" id="reportSubmit">Gönder</button></div>' +
      '</div>' +
    '</div>';

  document.getElementById("contactBtn").addEventListener("click", function () {
    if (!currentUser) { window.location.href = "login.html"; return; }
    if (currentUser.role !== "student") { alert("Yalnızca öğrenci hesapları öğretmenlere mesaj gönderebilir."); return; }
    window.location.href = "messages.html?with=" + tch.userId;
  });

  var reportBtn = document.getElementById("reportBtn");
  if (reportBtn) {
    reportBtn.addEventListener("click", function () { document.getElementById("reportModal").style.display = "flex"; });
    document.getElementById("reportCancel").addEventListener("click", function () { document.getElementById("reportModal").style.display = "none"; });
    document.getElementById("reportSubmit").addEventListener("click", async function () {
      var errBox = document.getElementById("reportError");
      errBox.style.display = "none";
      var explanation = document.getElementById("reportExplanation").value.trim();
      if (!explanation) { errBox.textContent = "Lütfen sorunu açıklayın."; errBox.style.display = "block"; return; }
      try {
        await apiFetch("/complaints", { method: "POST", body: { teacherId: tch.id, reason: document.getElementById("reportReason").value, explanation: explanation } });
        document.getElementById("reportModal").style.display = "none";
        alert("Şikayetiniz ekibimize iletildi.");
      } catch (err) {
        errBox.textContent = err.message;
        errBox.style.display = "block";
      }
    });
  }
}

async function loadAndRender() {
  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");
  var container = document.getElementById("profileContainer");
  if (!id) { container.innerHTML = '<p style="text-align:center; padding:60px 0;">Öğretmen kimliği belirtilmedi.</p>'; return; }

  try {
    var teacherData = await apiFetch("/teachers/" + id);
    var reviewsData = await apiFetch("/teachers/" + id + "/reviews");
    document.title = teacherData.teacher.name + " — Studify";
    renderProfile(teacherData.teacher, reviewsData.reviews);
    loadSlots(teacherData.teacher.id);
  } catch (err) {
    container.innerHTML = '<p style="text-align:center; color:var(--red); padding:60px 0;">Öğretmen bulunamadı.</p>';
  }
}

async function loadSlots(teacherId) {
  var box = document.getElementById("slotsList");
  if (!box) return;
  try {
    var data = await apiFetch("/availability/teacher/" + teacherId);
    if (data.slots.length === 0) { box.innerHTML = '<p style="color:var(--gray-500); font-size:14px;">Şu anda müsait ders saati bulunmuyor.</p>'; return; }
    box.innerHTML = '<div style="display:flex; flex-wrap:wrap; gap:10px;">' + data.slots.map(function (s) {
      var d = new Date(s.date + "T" + s.startTime);
      var label = d.toLocaleDateString("tr-TR", { weekday: "short", day: "2-digit", month: "short" }) + ", " + s.startTime;
      return '<button class="btn btn-outline" style="font-size:12.5px; padding:9px 14px;" data-book-slot="' + s.id + '">' + label + ' (' + s.duration + ' dk)</button>';
    }).join("") + '</div>';

    box.querySelectorAll("[data-book-slot]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!currentUser) { window.location.href = "login.html"; return; }
        if (currentUser.role !== "student") { alert("Yalnızca öğrenci hesapları rezervasyon yapabilir."); return; }
        if (!confirm("Bu ders saatini rezerve etmek istediğinize emin misiniz?")) return;
        try {
          await apiFetch("/availability/" + btn.getAttribute("data-book-slot") + "/book", { method: "POST" });
          alert("Rezervasyonunuz alındı! Öğretmen ile mesajlaşarak detayları netleştirebilirsiniz.");
          loadSlots(teacherId);
        } catch (err) { alert(err.message); }
      });
    });
  } catch (err) { box.innerHTML = ""; }
}

document.addEventListener("DOMContentLoaded", async function () {
  await i18nReady;
  loadAndRender();
});
