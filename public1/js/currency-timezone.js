// ==========================================================================
// currency-timezone.js — approximate currency conversion + local time
// display. Both are self-contained (no external API, no API key needed):
//   - Currency: a static USD conversion table, refreshed occasionally by
//     hand. Rates are APPROXIMATE and clearly labeled "≈" — good enough to
//     give a student a rough sense of cost, not for exact billing.
//   - Timezone: a country -> IANA timezone lookup, used with the browser's
//     built-in Intl API to show "the teacher's local time right now".
//     Large countries spanning multiple zones (US, Russia, Brazil...) use
//     their single most common/capital zone as a reasonable approximation.
// ==========================================================================

// ---- Currency ----------------------------------------------------------

var CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£", TRY: "₺", AZN: "₼", GEL: "₾", RUB: "₽",
  CNY: "¥", INR: "₹", JPY: "¥"
};

// Approximate USD conversion rates (update occasionally by hand).
var CURRENCY_RATES_FROM_USD = {
  USD: 1, EUR: 0.92, GBP: 0.79, TRY: 34.5, AZN: 1.7, GEL: 2.7, RUB: 92,
  CNY: 7.25, INR: 83.3, JPY: 151
};

// Which currency to show alongside USD, based on the site's current UI
// language (reuses the existing 9-language i18n system instead of asking
// the visitor anything new).
var LANG_TO_CURRENCY = {
  tr: "TRY", az: "AZN", ru: "RUB", ka: "GEL", es: "EUR", fr: "EUR",
  de: "EUR", zh: "CNY", en: "USD"
};

function approxConvertedPrice(usdAmount) {
  var lang = (typeof getCurrentLang === "function") ? getCurrentLang() : "tr";
  var currency = LANG_TO_CURRENCY[lang] || "USD";
  if (currency === "USD") return null; // no second currency needed
  var rate = CURRENCY_RATES_FROM_USD[currency];
  var symbol = CURRENCY_SYMBOLS[currency] || "";
  var converted = Math.round(usdAmount * rate);
  return "≈ " + symbol + converted.toLocaleString("tr-TR");
}

// ---- Timezone / local time ----------------------------------------------

var COUNTRY_TIMEZONES = {
  "Afghanistan": "Asia/Kabul", "Albania": "Europe/Tirane", "Algeria": "Africa/Algiers",
  "Andorra": "Europe/Andorra", "Angola": "Africa/Luanda", "Argentina": "America/Argentina/Buenos_Aires",
  "Armenia": "Asia/Yerevan", "Australia": "Australia/Sydney", "Austria": "Europe/Vienna",
  "Azerbaijan": "Asia/Baku", "Bahamas": "America/Nassau", "Bahrain": "Asia/Bahrain",
  "Bangladesh": "Asia/Dhaka", "Belarus": "Europe/Minsk", "Belgium": "Europe/Brussels",
  "Belize": "America/Belize", "Benin": "Africa/Porto-Novo", "Bhutan": "Asia/Thimphu",
  "Bolivia": "America/La_Paz", "Bosnia and Herzegovina": "Europe/Sarajevo", "Botswana": "Africa/Gaborone",
  "Brazil": "America/Sao_Paulo", "Brunei": "Asia/Brunei", "Bulgaria": "Europe/Sofia",
  "Burkina Faso": "Africa/Ouagadougou", "Burundi": "Africa/Bujumbura", "Cambodia": "Asia/Phnom_Penh",
  "Cameroon": "Africa/Douala", "Canada": "America/Toronto", "Chad": "Africa/Ndjamena",
  "Chile": "America/Santiago", "China": "Asia/Shanghai", "Colombia": "America/Bogota",
  "Costa Rica": "America/Costa_Rica", "Croatia": "Europe/Zagreb", "Cuba": "America/Havana",
  "Cyprus": "Asia/Nicosia", "Czechia": "Europe/Prague", "Denmark": "Europe/Copenhagen",
  "Djibouti": "Africa/Djibouti", "Dominican Republic": "America/Santo_Domingo", "Ecuador": "America/Guayaquil",
  "Egypt": "Africa/Cairo", "El Salvador": "America/El_Salvador", "Estonia": "Europe/Tallinn",
  "Ethiopia": "Africa/Addis_Ababa", "Fiji": "Pacific/Fiji", "Finland": "Europe/Helsinki",
  "France": "Europe/Paris", "Gabon": "Africa/Libreville", "Georgia": "Asia/Tbilisi",
  "Germany": "Europe/Berlin", "Ghana": "Africa/Accra", "Greece": "Europe/Athens",
  "Guatemala": "America/Guatemala", "Guinea": "Africa/Conakry", "Haiti": "America/Port-au-Prince",
  "Honduras": "America/Tegucigalpa", "Hungary": "Europe/Budapest", "Iceland": "Atlantic/Reykjavik",
  "India": "Asia/Kolkata", "Indonesia": "Asia/Jakarta", "Iran": "Asia/Tehran", "Iraq": "Asia/Baghdad",
  "Ireland": "Europe/Dublin", "Israel": "Asia/Jerusalem", "Italy": "Europe/Rome", "Ivory Coast": "Africa/Abidjan",
  "Jamaica": "America/Jamaica", "Japan": "Asia/Tokyo", "Jordan": "Asia/Amman", "Kazakhstan": "Asia/Almaty",
  "Kenya": "Africa/Nairobi", "Kosovo": "Europe/Belgrade", "Kuwait": "Asia/Kuwait", "Kyrgyzstan": "Asia/Bishkek",
  "Laos": "Asia/Vientiane", "Latvia": "Europe/Riga", "Lebanon": "Asia/Beirut", "Liberia": "Africa/Monrovia",
  "Libya": "Africa/Tripoli", "Liechtenstein": "Europe/Vaduz", "Lithuania": "Europe/Vilnius",
  "Luxembourg": "Europe/Luxembourg", "Madagascar": "Indian/Antananarivo", "Malawi": "Africa/Blantyre",
  "Malaysia": "Asia/Kuala_Lumpur", "Maldives": "Indian/Maldives", "Mali": "Africa/Bamako",
  "Malta": "Europe/Malta", "Mauritania": "Africa/Nouakchott", "Mauritius": "Indian/Mauritius",
  "Mexico": "America/Mexico_City", "Moldova": "Europe/Chisinau", "Monaco": "Europe/Monaco",
  "Mongolia": "Asia/Ulaanbaatar", "Montenegro": "Europe/Podgorica", "Morocco": "Africa/Casablanca",
  "Mozambique": "Africa/Maputo", "Myanmar": "Asia/Yangon", "Namibia": "Africa/Windhoek",
  "Nepal": "Asia/Kathmandu", "Netherlands": "Europe/Amsterdam", "New Zealand": "Pacific/Auckland",
  "Nicaragua": "America/Managua", "Niger": "Africa/Niamey", "Nigeria": "Africa/Lagos",
  "North Korea": "Asia/Pyongyang", "North Macedonia": "Europe/Skopje", "Norway": "Europe/Oslo",
  "Oman": "Asia/Muscat", "Pakistan": "Asia/Karachi", "Panama": "America/Panama",
  "Papua New Guinea": "Pacific/Port_Moresby", "Paraguay": "America/Asuncion", "Peru": "America/Lima",
  "Philippines": "Asia/Manila", "Poland": "Europe/Warsaw", "Portugal": "Europe/Lisbon",
  "Qatar": "Asia/Qatar", "Romania": "Europe/Bucharest", "Russia": "Europe/Moscow",
  "Rwanda": "Africa/Kigali", "Saudi Arabia": "Asia/Riyadh", "Senegal": "Africa/Dakar",
  "Serbia": "Europe/Belgrade", "Singapore": "Asia/Singapore", "Slovakia": "Europe/Bratislava",
  "Slovenia": "Europe/Ljubljana", "Somalia": "Africa/Mogadishu", "South Africa": "Africa/Johannesburg",
  "South Korea": "Asia/Seoul", "South Sudan": "Africa/Juba", "Spain": "Europe/Madrid",
  "Sri Lanka": "Asia/Colombo", "Sudan": "Africa/Khartoum", "Sweden": "Europe/Stockholm",
  "Switzerland": "Europe/Zurich", "Syria": "Asia/Damascus", "Taiwan": "Asia/Taipei",
  "Tajikistan": "Asia/Dushanbe", "Tanzania": "Africa/Dar_es_Salaam", "Thailand": "Asia/Bangkok",
  "Togo": "Africa/Lome", "Tunisia": "Africa/Tunis", "Turkey": "Europe/Istanbul",
  "Turkmenistan": "Asia/Ashgabat", "Uganda": "Africa/Kampala", "Ukraine": "Europe/Kyiv",
  "United Arab Emirates": "Asia/Dubai", "United Kingdom": "Europe/London", "United States": "America/New_York",
  "Uruguay": "America/Montevideo", "Uzbekistan": "Asia/Tashkent", "Venezuela": "America/Caracas",
  "Vietnam": "Asia/Ho_Chi_Minh", "Yemen": "Asia/Aden", "Zambia": "Africa/Lusaka", "Zimbabwe": "Africa/Harare"
};

// Returns "HH:MM" in the teacher's country's local time right now, or null
// if the country isn't in the lookup (falls back gracefully — this is a
// nice-to-have, never blocks anything).
function approxLocalTime(countryName) {
  var zone = COUNTRY_TIMEZONES[countryName];
  if (!zone) return null;
  try {
    return new Date().toLocaleTimeString("tr-TR", { timeZone: zone, hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return null;
  }
}
