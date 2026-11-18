// ==========================================================================
// teachers.js — teachers.html: full filtered search (country/city/nationality/
// subject/mode/lang), reading initial values from the URL query string.
// ==========================================================================

document.addEventListener("DOMContentLoaded", async function () {
  var grid = document.getElementById("teacherGrid");
  if (!grid) return;
  await i18nReady;

  var form = document.getElementById("filterForm");
  populateSelect(document.getElementById("fCountry"), COUNTRIES, t("search_all"));
  populateSelect(document.getElementById("fNationality"), NATIONALITIES, t("search_all"));
  populateSelect(document.getElementById("fSubject"), SUBJECTS, t("search_all"));
  populateSelect(document.getElementById("fLang"), TEACHING_LANGUAGES, t("search_all"));

  var params = new URLSearchParams(window.location.search);
  form.querySelectorAll("[name]").forEach(function (el) {
    var v = params.get(el.name);
    if (v) el.value = v;
  });

  var favoriteIds = [];
  if (currentUser) {
    try {
      var favData = await apiFetch("/teachers/favorites/mine");
      favoriteIds = favData.teachers.map(function (x) { return x.id; });
    } catch (e) {}
  }

  async function search() {
    grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--gray-500); padding:60px 0;">' + t("common_loading") + '</p>';
    var qs = buildFilterQuery(form);
    try {
      var data = await apiFetch("/teachers" + qs);
      document.getElementById("badgeCount").textContent = data.total + " " + t("results_count");
      if (data.teachers.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--gray-500); padding:60px 0;">' + t("empty_teachers") + '</p>';
        return;
      }
      grid.innerHTML = data.teachers.map(function (x) { return renderTeacherCard(x, favoriteIds); }).join("");
      grid.querySelectorAll(".fav-btn").forEach(function (btn) {
        btn.addEventListener("click", async function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (!currentUser) { window.location.href = "login.html"; return; }
          try {
            var res = await apiFetch("/teachers/" + btn.getAttribute("data-id") + "/favorite", { method: "POST" });
            btn.classList.toggle("active", res.favorited);
            btn.innerHTML = heartSVG(res.favorited);
            if (res.favorited) favoriteIds.push(btn.getAttribute("data-id"));
            else favoriteIds = favoriteIds.filter(function (id) { return id !== btn.getAttribute("data-id"); });
          } catch (err) { alert(err.message); }
        });
      });
    } catch (err) {
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--red); padding:60px 0;">' + err.message + '</p>';
    }
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); search(); });
  search();
});
