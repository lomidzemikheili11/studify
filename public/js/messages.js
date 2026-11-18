// ==========================================================================
// messages.js — messages.html: conversation list + active thread + polling.
// URL param ?with=<userId> opens/starts a specific conversation directly
// (used when arriving from a teacher's profile "Message" button).
// ==========================================================================

var conversations = [];
var activeOtherUserId = null;
var pollTimer = null;

function convAvatarUrl(c) {
  return c.otherUserAvatar || ("https://ui-avatars.com/api/?background=eaf1ff&color=1a56db&name=" + encodeURIComponent(c.otherUserName));
}

function formatTime(iso) {
  var d = new Date(iso);
  var now = new Date();
  var sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function renderConversationList() {
  var box = document.getElementById("conversationList");
  if (conversations.length === 0) {
    box.innerHTML = '<p style="padding:20px; color:var(--gray-500); font-size:13px;">Henüz mesajlaşmanız yok.' +
      (currentUser.role === "student" ? ' <a href="teachers.html" style="color:var(--blue); font-weight:700;">Öğretmenlere göz atın →</a>' : '') + '</p>';
    return;
  }
  box.innerHTML = conversations.map(function (c) {
    var preview = (c.lastMessageFromMe ? "Siz: " : "") + c.lastMessage;
    return '<div class="conv-item' + (c.otherUserId === activeOtherUserId ? " active" : "") + '" data-user="' + c.otherUserId + '">' +
      '<img class="conv-avatar" src="' + convAvatarUrl(c) + '" alt="">' +
      '<div style="flex:1; min-width:0;">' +
        '<div class="conv-name">' + adminEscapeLite(c.otherUserName) + '</div>' +
        '<div class="conv-preview">' + adminEscapeLite(preview) + '</div>' +
      '</div>' +
      (c.unreadCount > 0 ? '<span class="conv-badge">' + c.unreadCount + '</span>' : '') +
    '</div>';
  }).join("");

  box.querySelectorAll(".conv-item").forEach(function (el) {
    el.addEventListener("click", function () { openConversation(el.getAttribute("data-user")); });
  });
}

function adminEscapeLite(str) {
  return (str || "").replace(/[<>]/g, function (c) { return c === "<" ? "&lt;" : "&gt;"; });
}

async function loadConversations() {
  try {
    var data = await apiFetch("/messages/conversations");
    conversations = data.conversations;
    renderConversationList();
  } catch (err) {
    document.getElementById("conversationList").innerHTML = '<p style="padding:20px; color:var(--red); font-size:13px;">' + err.message + '</p>';
  }
}

function renderThread(messages, otherUserName) {
  var box = document.getElementById("threadMessages");
  box.innerHTML = messages.map(function (m) {
    var mine = m.senderId === currentUser.id;
    var mainText = m.translatedMessage ? m.translatedMessage : m.message;
    var translationNote = m.translatedMessage
      ? '<div class="translation-toggle" data-original="' + adminEscapeLite(m.message).replace(/"/g, "&quot;") + '">🌐 Çevrildi · orijinali gör</div>'
      : "";
    return '<div class="bubble ' + (mine ? "mine" : "theirs") + '">' + adminEscapeLite(mainText) +
      translationNote +
      '<div class="time">' + formatTime(m.createdAt) + '</div></div>';
  }).join("");
  box.querySelectorAll(".translation-toggle").forEach(function (el) {
    el.addEventListener("click", function () {
      var bubble = el.closest(".bubble");
      var timeEl = bubble.querySelector(".time");
      var showingOriginal = el.getAttribute("data-showing-original") === "1";
      if (showingOriginal) {
        location.reload(); // simplest reliable way back to translated view
      } else {
        bubble.firstChild.textContent = el.getAttribute("data-original");
        el.textContent = "🌐 Orijinal gösteriliyor";
        el.setAttribute("data-showing-original", "1");
      }
    });
  });
  box.scrollTop = box.scrollHeight;
}

async function openConversation(otherUserId) {
  activeOtherUserId = otherUserId;
  document.getElementById("emptyState").style.display = "none";
  document.getElementById("activeThread").style.display = "flex";
  document.getElementById("msgSidebar").classList.add("hide-mobile");
  document.getElementById("msgMain").classList.remove("hide-mobile");

  renderConversationList(); // refresh highlight state

  try {
    var data = await apiFetch("/messages/conversations/" + otherUserId);
    var other = data.otherUser;
    document.getElementById("threadName").textContent = other ? other.name : "";
    document.getElementById("threadRole").textContent = other ? (other.role === "teacher" ? "Öğretmen" : "Öğrenci") : "";
    var convMeta = conversations.find(function (c) { return c.otherUserId === otherUserId; });
    document.getElementById("threadAvatar").src = convMeta ? convAvatarUrl(convMeta) : "https://ui-avatars.com/api/?name=?";
    renderThread(data.messages, other ? other.name : "");
    loadConversations(); // refresh unread badges
  } catch (err) {
    document.getElementById("threadMessages").innerHTML = '<p style="color:var(--red); text-align:center;">' + err.message + '</p>';
  }
}

async function sendMessage() {
  var input = document.getElementById("msgInput");
  var text = input.value.trim();
  if (!text || !activeOtherUserId) return;
  input.value = "";
  try {
    await apiFetch("/messages/direct", { method: "POST", body: { recipientId: activeOtherUserId, message: text } });
    openConversation(activeOtherUserId);
  } catch (err) {
    alert(err.message);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  var user = await requireAuth(["student", "teacher"]);
  if (!user) return;
  renderAuthArea();

  document.getElementById("sidebarTitle").textContent = user.role === "teacher" ? "Sınıfım" : "Öğretmenlerim";

  await loadConversations();

  var params = new URLSearchParams(window.location.search);
  var withUser = params.get("with");
  if (withUser) {
    openConversation(withUser);
  } else if (conversations.length > 0 && window.innerWidth > 800) {
    openConversation(conversations[0].otherUserId);
  }

  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("msgInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById("backBtn").addEventListener("click", function () {
    document.getElementById("msgSidebar").classList.remove("hide-mobile");
    document.getElementById("msgMain").classList.add("hide-mobile");
  });

  // Lightweight polling so new messages show up without a manual refresh.
  pollTimer = setInterval(function () {
    loadConversations();
    if (activeOtherUserId) {
      apiFetch("/messages/conversations/" + activeOtherUserId).then(function (data) {
        renderThread(data.messages);
      }).catch(function () {});
    }
  }, 5000);
});

window.addEventListener("beforeunload", function () { if (pollTimer) clearInterval(pollTimer); });
