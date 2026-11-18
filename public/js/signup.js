// ==========================================================================
// signup.js — signup.html: role toggle, registration + document upload.
// (The 15-question application test was removed — teachers are now
// auto-approved on signup and go live immediately.)
// ==========================================================================

var currentRole = "student";
var currentWizardStep = "step1";

function showStep(id) {
  document.querySelectorAll(".wizard-step").forEach(function (s) { s.classList.remove("active"); });
  document.getElementById(id).classList.add("active");
  currentWizardStep = id;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", async function () {
  await i18nReady;

  populateSelect(document.getElementById("tSubject"), SUBJECTS);
  populateSelect(document.getElementById("tCountry"), COUNTRIES);
  populateSelect(document.getElementById("tNationality"), NATIONALITIES);
  document.getElementById("tLangs").innerHTML = TEACHING_LANGUAGES.map(function (l) {
    return '<label><input type="checkbox" class="tLangCheck" value="' + l.code + '"' + (l.code === "en" ? " checked" : "") + '> ' + l.label + '</label>';
  }).join("");

  document.querySelectorAll("#roleToggle button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#roleToggle button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentRole = btn.getAttribute("data-role");
      document.getElementById("teacherBasicFields").style.display = currentRole === "teacher" ? "block" : "none";
      document.getElementById("parentPhoneGroup").style.display = currentRole === "student" ? "block" : "none";
      document.getElementById("sParentPhone").required = currentRole === "student";
    });
  });
  document.getElementById("parentPhoneGroup").style.display = "block";
  document.getElementById("sParentPhone").required = true;

  document.getElementById("tOffline").addEventListener("change", function () {
    document.getElementById("tStreetGroup").style.display = this.checked ? "block" : "none";
  });

  document.getElementById("toStep2Btn").addEventListener("click", function () {
    var errorBox = document.getElementById("step1Error");
    errorBox.style.display = "none";
    if (!document.getElementById("sFirstName").value || !document.getElementById("sLastName").value ||
        !document.getElementById("sEmail").value || !document.getElementById("sPhone").value ||
        document.getElementById("sPassword").value.length < 8) {
      errorBox.textContent = "Lütfen tüm zorunlu alanları doldurun (şifre: en az 8 karakter).";
      errorBox.style.display = "block";
      return;
    }
    if (currentRole === "student" && !document.getElementById("sParentPhone").value) {
      errorBox.textContent = "Veli/Vasi telefon numarası zorunludur.";
      errorBox.style.display = "block";
      return;
    }
    if (currentRole === "teacher") {
      if (!document.getElementById("tCity").value.trim()) {
        errorBox.textContent = "Şehir bilgisi zorunludur.";
        errorBox.style.display = "block";
        return;
      }
      if (!(Number(document.getElementById("tPriceHourly").value) > 0)) {
        errorBox.textContent = "Saatlik ücret zorunludur ve 0'dan büyük olmalıdır.";
        errorBox.style.display = "block";
        return;
      }
      if (document.getElementById("tExperience").value === "") {
        errorBox.textContent = "Deneyim (yıl) alanı zorunludur.";
        errorBox.style.display = "block";
        return;
      }
      var langs = document.querySelectorAll(".tLangCheck:checked");
      if (langs.length === 0) {
        errorBox.textContent = "En az bir öğretim dili seçin.";
        errorBox.style.display = "block";
        return;
      }
      var online = document.getElementById("tOnline").checked;
      var offline = document.getElementById("tOffline").checked;
      if (!online && !offline) {
        errorBox.textContent = "En az bir ders şekli seçin (Online veya Yüz yüze).";
        errorBox.style.display = "block";
        return;
      }
      showStep("step3");
    } else {
      showStep("studentFinal");
    }
  });

  document.getElementById("backToStep1FromDocsBtn").addEventListener("click", function () { showStep("step1"); });
  document.getElementById("backToStep1FromStudentBtn").addEventListener("click", function () { showStep("step1"); });

  document.getElementById("signupForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var isTeacher = currentRole === "teacher";
    var errorBox = document.getElementById(isTeacher ? "step3Error" : "studentError");
    errorBox.style.display = "none";

    if (isTeacher) {
      var idFile = document.getElementById("tIdDoc").files[0];
      if (!idFile) { errorBox.textContent = "Kimlik belgesi zorunludur."; errorBox.style.display = "block"; return; }
      if (!document.getElementById("tBio").value.trim()) {
        errorBox.textContent = "\"Kendiniz Hakkında\" alanı zorunludur.";
        errorBox.style.display = "block";
        return;
      }
      if (!document.getElementById("signupTerms").checked) {
        errorBox.textContent = "Devam etmek için Kullanım Şartları'nı kabul etmelisiniz.";
        errorBox.style.display = "block";
        return;
      }
    } else {
      if (!document.getElementById("signupTermsStudent").checked) {
        errorBox.textContent = "Devam etmek için Kullanım Şartları'nı kabul etmelisiniz.";
        errorBox.style.display = "block";
        return;
      }
    }

    var payload = {
      firstName: document.getElementById("sFirstName").value.trim(),
      lastName: document.getElementById("sLastName").value.trim(),
      email: document.getElementById("sEmail").value.trim(),
      phone: document.getElementById("sPhone").value.trim(),
      password: document.getElementById("sPassword").value,
      role: currentRole,
      language: getCurrentLang()
    };
    if (!isTeacher) payload.parentPhone = document.getElementById("sParentPhone").value.trim();

    if (isTeacher) {
      var langs2 = Array.from(document.querySelectorAll(".tLangCheck:checked")).map(function (c) { return c.value; });
      payload.subject = document.getElementById("tSubject").value;
      payload.priceHourly = Number(document.getElementById("tPriceHourly").value) || 0;
      payload.priceMonthly = Number(document.getElementById("tPriceMonthly").value) || 0;
      payload.experience = Number(document.getElementById("tExperience").value) || 0;
      payload.online = document.getElementById("tOnline").checked;
      payload.offline = document.getElementById("tOffline").checked;
      payload.country = document.getElementById("tCountry").value;
      payload.city = document.getElementById("tCity").value.trim();
      payload.street = payload.offline ? document.getElementById("tStreet").value.trim() : "";
      payload.nationality = document.getElementById("tNationality").value;
      payload.langs = langs2;
      payload.whatsapp = document.getElementById("tWhatsapp").value.trim() || payload.phone;
      payload.university = document.getElementById("tUniversity").value.trim();
      payload.bio = document.getElementById("tBio").value.trim();
    }

    var submitBtn = document.getElementById(isTeacher ? "submitBtn" : "studentSubmitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "...";

    try {
      var data = await apiFetch("/auth/register", { method: "POST", body: payload });
      setToken(data.token);

      if (isTeacher) {
        var idFile2 = document.getElementById("tIdDoc").files[0];
        var diplomaFile = document.getElementById("tDiploma").files[0];
        if (idFile2) {
          var fd1 = new FormData(); fd1.append("document", idFile2); fd1.append("docType", "idDocument");
          try { await apiFetch("/upload/document", { method: "POST", body: fd1 }); } catch (e) {}
        }
        if (diplomaFile) {
          var fd2 = new FormData(); fd2.append("document", diplomaFile); fd2.append("docType", "diploma");
          try { await apiFetch("/upload/document", { method: "POST", body: fd2 }); } catch (e) {}
        }
        window.location.href = "teacher-dashboard.html";
      } else {
        window.location.href = "student-dashboard.html";
      }
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = t("auth_signup_btn");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
});
