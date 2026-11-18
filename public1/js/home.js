// ==========================================================================
// home.js — index.html logic
// ==========================================================================

function tcAvatarUrl(t) {
  return t.avatar || ("https://ui-avatars.com/api/?background=eaf1ff&color=1a56db&bold=true&name=" + encodeURIComponent(t.name));
}
function heartSVG(active) {
  return active
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="#ea4c66"><path d="M12 21s-6.7-4.3-9.3-8.1C1.1 10.7 1.6 7.7 4 6.1c2.1-1.4 4.7-.9 6.2.9L12 8.9l1.8-1.9c1.5-1.8 4.1-2.3 6.2-.9 2.4 1.6 2.9 4.6 1.3 6.8C18.7 16.7 12 21 12 21z"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-6.7-4.3-9.3-8.1C1.1 10.7 1.6 7.7 4 6.1c2.1-1.4 4.7-.9 6.2.9L12 8.9l1.8-1.9c1.5-1.8 4.1-2.3 6.2-.9 2.4 1.6 2.9 4.6 1.3 6.8C18.7 16.7 12 21 12 21z"/></svg>';
}
function checkSVG() {
  return '<svg width="13" height="13" viewBox="0 0 24 24" fill="#1a56db"><path d="M12 2l2.4 2.2 3.2-.6 1 3.1 3.1 1-.6 3.2L23 12l-2.2 2.4.6 3.2-3.1 1-1 3.1-3.2-.6L12 23l-2.4-2.2-3.2.6-1-3.1-3.1-1 .6-3.2L1 12l2.2-2.4-.6-3.2 3.1-1 1-3.1 3.2.6z"/><path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" fill="none"/></svg>';
}
function whatsappSVG() {
  return '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.4c1.4.8 3 1.2 4.8 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>';
}

function renderTeacherCard(tch, favoriteIds) {
  var isFav = (favoriteIds || []).indexOf(tch.id) !== -1;
  var hasDiscount = tch.priceMonthlyOriginal && tch.priceMonthlyOriginal > tch.priceMonthly;
  var location = tch.city ? (tch.city + (tch.country ? ", " + tch.country : "")) : (tch.country || "");
  var approx = approxConvertedPrice(tch.priceHourly);

  return (
    '<a href="teacher-profile.html?id=' + tch.id + '" class="teacher-card" style="text-decoration:none; color:inherit;">' +
      '<div class="tc-photo-frame">' +
        '<img src="' + tcAvatarUrl(tch) + '" alt="' + tch.name + '">' +
        '<span class="tc-status-overlay"><span class="status-pill ' + (tch.online ? "status-online" : "status-offline") + '">' + (tch.online ? t("search_online") : t("search_offline")) + '</span></span>' +
        (tch.isSuperTeacher ? '<span class="tc-super-overlay"><span class="super-badge">⭐ SUPER</span></span>' : '') +
        '<button class="fav-btn' + (isFav ? " active" : "") + '" data-id="' + tch.id + '">' + heartSVG(isFav) + '</button>' +
      '</div>' +
      '<div class="tc-body">' +
        '<div class="tc-name">' + tch.name + ' ' + checkSVG() + '</div>' +
        '<div class="tc-subject">' + tch.subject + '</div>' +
        (location ? '<div class="tc-location">📍 ' + location + '</div>' : '') +
        '<div class="tc-rating-row"><span class="stars">★ ' + (tch.rating ? tch.rating.toFixed(1) : t("teacher_new")) + '</span>' + (tch.reviews ? '<span class="count">(' + tch.reviews + ')</span>' : '') + '</div>' +
        '<div class="tc-price">' +
          (hasDiscount ? '<span class="tc-price-old">$' + tch.priceMonthlyOriginal + '</span>' : '') +
          '$' + tch.priceHourly + ' <span>/ ' + t("teacher_hourly") + (approx ? ' · ' + approx : '') + '</span>' +
        '</div>' +
      '</div>' +
    '</a>'
  );
}

document.addEventListener("DOMContentLoaded", async function () {
  await i18nReady;

  var countrySelect = document.getElementById("fCountry");
  var subjectSelect = document.getElementById("fSubject");
  var langSelect = document.getElementById("fLang");
  if (countrySelect) populateSelect(countrySelect, COUNTRIES, t("search_all"));
  if (subjectSelect) populateSelect(subjectSelect, SUBJECTS, t("search_all"));
  if (langSelect) populateSelect(langSelect, TEACHING_LANGUAGES, t("search_all"));

  try {
    var data = await apiFetch("/teachers?sort=rating");
    var top = data.teachers.slice(0, 8);
    document.getElementById("homeBadgeCount").textContent = data.total + " " + t("results_count");

    var favoriteIds = [];
    if (currentUser) {
      try {
        var favData = await apiFetch("/teachers/favorites/mine");
        favoriteIds = favData.teachers.map(function (x) { return x.id; });
      } catch (e) {}
    }

    var grid = document.getElementById("homeTeacherGrid");
    if (top.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--gray-500); padding:40px 0;">' + t("empty_teachers") + '<br><br><a href="signup.html" style="color:var(--blue); font-weight:700;">' + t("cta_become_teacher") + '</a></p>';
    } else {
      grid.innerHTML = top.map(function (x) { return renderTeacherCard(x, favoriteIds); }).join("");
      grid.querySelectorAll(".fav-btn").forEach(function (btn) {
        btn.addEventListener("click", async function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (!currentUser) { window.location.href = "login.html"; return; }
          try {
            var res = await apiFetch("/teachers/" + btn.getAttribute("data-id") + "/favorite", { method: "POST" });
            btn.classList.toggle("active", res.favorited);
            btn.innerHTML = heartSVG(res.favorited);
          } catch (err) { alert(err.message); }
        });
      });
    }

    try {
      var stats = await apiFetch("/teachers/meta/stats");
      document.getElementById("statTeachers").textContent = stats.teacherCount;
      document.getElementById("statCountries").textContent = stats.countryCount;
      document.getElementById("statStudents").textContent = stats.studentCount;
      document.getElementById("statRating").textContent = stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—";
    } catch (e) {}
  } catch (err) {
    document.getElementById("homeTeacherGrid").innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--red); padding:40px 0;">' + err.message + '</p>';
  }

  var heroForm = document.getElementById("heroSearchForm");
  if (heroForm) {
    heroForm.addEventListener("submit", function (e) {
      e.preventDefault();
      window.location.href = "teachers.html" + buildFilterQuery(heroForm);
    });
  }
});
