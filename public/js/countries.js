// ==========================================================================
// countries.js — country + nationality reference data.
//
// NOTE ON CITIES: rather than hard-coding a fixed list of "every city in the
// world" (which would be enormous and still incomplete), city is a free-text
// field. This means literally any city can be entered/searched — it just
// isn't offered as a fixed dropdown. Country and nationality use fixed lists
// since those sets are stable and small enough to select from.
// ==========================================================================

var COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina",
  "Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Chad","Chile",
  "China","Colombia","Costa Rica","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Estonia","Ethiopia","Fiji","Finland","France","Gabon","Georgia","Germany",
  "Ghana","Greece","Guatemala","Guinea","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq",
  "Ireland","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kosovo","Kuwait",
  "Kyrgyzstan","Laos","Latvia","Lebanon","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar",
  "Malawi","Malaysia","Maldives","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Monaco","Mongolia",
  "Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger",
  "Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Panama","Papua New Guinea","Paraguay",
  "Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia",
  "Singapore","Slovakia","Slovenia","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka",
  "Sudan","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo","Tunisia","Turkey",
  "Turkmenistan","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

var NATIONALITIES = [
  "Afghan","Albanian","Algerian","American","Argentine","Armenian","Australian","Austrian","Azerbaijani",
  "Bangladeshi","Belarusian","Belgian","Bolivian","Bosnian","Brazilian","British","Bulgarian","Cambodian",
  "Cameroonian","Canadian","Chilean","Chinese","Colombian","Croatian","Cuban","Cypriot","Czech","Danish",
  "Dominican","Dutch","Ecuadorian","Egyptian","Emirati","English","Estonian","Ethiopian","Filipino","Finnish",
  "French","Georgian","German","Ghanaian","Greek","Guatemalan","Haitian","Honduran","Hungarian","Icelandic",
  "Indian","Indonesian","Iranian","Iraqi","Irish","Israeli","Italian","Ivorian","Jamaican","Japanese","Jordanian",
  "Kazakh","Kenyan","Korean","Kurdish","Kuwaiti","Kyrgyz","Lao","Latvian","Lebanese","Libyan","Lithuanian",
  "Macedonian","Malaysian","Malian","Maltese","Mexican","Moldovan","Mongolian","Montenegrin","Moroccan",
  "Mozambican","Namibian","Nepalese","New Zealander","Nicaraguan","Nigerian","Norwegian","Omani","Pakistani",
  "Panamanian","Paraguayan","Peruvian","Polish","Portuguese","Qatari","Romanian","Russian","Rwandan","Saudi",
  "Scottish","Senegalese","Serbian","Singaporean","Slovak","Slovenian","Somali","South African","Spanish",
  "Sri Lankan","Sudanese","Swedish","Swiss","Syrian","Taiwanese","Tajik","Tanzanian","Thai","Tunisian","Turkish",
  "Turkmen","Ugandan","Ukrainian","Uruguayan","Uzbek","Venezuelan","Vietnamese","Welsh","Yemeni","Zambian",
  "Zimbabwean"
];

var SUBJECTS = [
  "English", "Turkish", "Russian", "Arabic", "German", "French", "Spanish", "Chinese", "Georgian", "Azerbaijani",
  "Mathematics", "Physics", "Chemistry", "Biology", "History", "Geography", "Computer Science", "Music", "Art", "Other"
];

var TEACHING_LANGUAGES = [
  { code: "tr", label: "Türkçe" }, { code: "az", label: "Azərbaycan" }, { code: "en", label: "English" },
  { code: "ru", label: "Русский" }, { code: "ka", label: "ქართული" }, { code: "es", label: "Español" },
  { code: "fr", label: "Français" }, { code: "zh", label: "中文" }, { code: "de", label: "Deutsch" },
  { code: "ar", label: "العربية" }
];

function populateSelect(select, items, placeholder) {
  var html = placeholder ? '<option value="">' + placeholder + '</option>' : "";
  html += items.map(function (item) {
    if (typeof item === "string") return '<option value="' + item + '">' + item + '</option>';
    return '<option value="' + item.code + '">' + item.label + '</option>';
  }).join("");
  select.innerHTML = html;
}
