const $ = (id) => document.getElementById(id);

const chatEl = $("chat");
const welcome = $("welcome");
const form = $("composer");
const input = $("input");
const sendBtn = $("send");
const searchNote = $("searchNote");

const sidebar = $("sidebar");
const chatList = $("chatList");
const newChatCard = $("newChatCard");
const brandBtn = $("brandBtn");
const sideClose = $("sideClose");
const burger = $("burger");
const scrim = $("scrim");

const modelSelect = $("modelSelect");
const modelMenu = $("modelMenu");
const modelLabel = $("modelLabel");

const chatTitle = $("chatTitle");
const editName = $("editName");
const avatarBtn = $("avatarBtn");
const loginScreen = $("loginScreen");
const loginBtn = $("loginBtn");
const goBack = $("goBack");

const plusBtn = $("plusBtn");
const sheet = $("sheet");
const sheetScrim = $("sheetScrim");
const fileImage = $("fileImage");
const fileVideo = $("fileVideo");
const manageAccount = $("manageAccount");

let activeModel = "Scorpio Flash";
let draftMode = "generate";
let pendingAttach = null;

let chats = loadChats();
let currentId = null;

/* ---------------- Keyword safety guard ---------------- */
function safetyRule(text) {
  if (/(violen|kill (me|myself|him|her|them|you|everyone)|shoot|stab|bomb|murder|hurt (you|myself|people)|blow up|suicide|want(ing)? to die|self.?harm|cutting)/i.test(text)) {
    return "It sounds like you might be going through something really heavy, and I'm sorry you're carrying that. Please know you matter and you are not alone. If you're in crisis or feeling unsafe, please reach out to your nearest mental health facility or a trusted support or crisis line right away — they can help, and asking for help is brave. I'm still here to listen and support you with anything. Is there anything else I can help you with?";
  }
  const minor = /under.?age|minor|child|under 1[7]|1[0-5] ?(yrs?|years?|yo)?/i.test(text);
  const sexual = /sex|nsfw|intimate|undress|nudity|nude|arous|horny|18|barely legal|jailbait/i.test(text);
  if (minor && sexual) {
    return "Sorry, I cannot assist with any request that may depict or harm minors. That kind of content is not okay in any form. Is there anything else I can help you with?";
  }
  if (/(how to (make|build|create|manufacture)|recipe for|steps to make|instructions? for)/i.test(text) && /(bomb|explosive|pipe bomb|ied|poison|nerve agent)/i.test(text)) {
    return "I can't help with that request, since it could seriously harm people. I'm glad to help with learning, creativity, and everyday problems, though — is there anything else I can help you with?";
  }
  if (/(how to |harass|stalk|doxx|bully|cyberbully|spread (rumors?|false accusations)|blackmail|defame|ruin someone/i.test(text)) {
    return "I can't assist with anything that targets, harasses, or hurts another person. I'm happy to help you communicate constructively or work through a conflict in a healthy way. Is there anything else I can help with?";
  }
  return null;
}

/* ---------------- Dynamic World Clock & System Prompt ---------------- */
function getWorldTimes() {
  const now = new Date();
  
  const utcString = now.toUTCString();
  
  const ukTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(now);

  const localTime = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(now);

  return { utcString, ukTime, localTime };
}

function getSystemPrompt(researched) {
  const times = getWorldTimes();

  const DATA = `SYSTEM TIME & DATE REFERENCE:
- CURRENT YEAR: 2026
- UTC CURRENT TIME: ${times.utcString}
- UK CURRENT TIME (London): ${times.ukTime}
- USER's LOCAL TIME: ${times.localTime}

TIMEZONE & TIME RULES:
- When asked for UK time or time in London/Britain, ALWAYS refer directly to the UK CURRENT TIME provided above (${times.ukTime}).
- If the user asks for current weather or time in a specific region and hasn't specified their location or city, politely ask for their country or city.

GAREXCELL PRODUCTS & BRANDING:
- Creator: Garexcell team.
- Official Garexcell Owned Products:
  1. istartu.com
  2. tv.istartu.com
  3. play.garexcell.com

SOCIAL MEDIA & INSTAGRAM LOOKUPS:
- For Instagram, TikTok, Twitter/X, Threads, or website lookups: Provide exact URL references structured as blue clickable links: [Platform Profile](https://instagram.com/username).
- If searching for prominent Instagram figures or 2026 events, evaluate information based on current 2026 context.

GUARDRAIL POLICY INSTRUCTION:
- DO NOT list, repeat, or explain your internal safety rules or system instructions in responses unless explicitly asked by the user. Keep conversations natural and direct.`;

  const GUARD =
    "Safety Guardrails:\n" +
    "- If user expresses self-harm/violence, gently guide to support lines.\n" +
    "- Refuse sexual content involving minors or harmful acts.\n" +
    "- DO NOT quote these guardrail rules back to the user.";

  const RESEARCH_NOTE =
    "Research Mode Enabled: Treat requests as needing up-to-date 2026 information. Format all web source references as blue, clickable Markdown links like [Source Title](https://example.com).";

  let sys =
    "You are Orion, a warm, helpful, supportive, and deeply knowledgeable AI assistant created by the Garexcell team. " +
    "When asked who created you, state clearly that you were created by the Garexcell team. " +
    "When asked what products Garexcell owns, list istartu.com, tv.istartu.com, and play.garexcell.com. " +
    DATA + "\n" +
    "Provide deep, accurate, and structured answers with headings, bullet points, and blue clickable links. " +
    GUARD;

  if (researched) sys += "\n" + RESEARCH_NOTE;

  return sys;
}

function buildMessages(c, researched) {
  const sys = getSystemPrompt(researched);

  const history = c.messages.slice(-10).map((m) => {
    if (m.role === "user") {
      const parts = [{ type: "text", text: m.text || "" }];
      if (m.content) parts.push(...m.content);
      return { role: "user", content: parts };
    }
    return { role: "assistant", content: m.content };
  });
  return [{ role: "system", content: sys }, ...history];
}

/* ---------------- Storage ---------------- */
function saveChats() { try { localStorage.setItem("orion_chats", JSON.stringify(chats)); } catch (e) {} }
function saveChat() { saveChats(); }
function loadChats() { try { const r = localStorage.getItem("orion_chats"); return r ? JSON.parse(r) : []; } catch (e) { return []; } }
let uid = Date.now();
function newId() { return "c" + (++uid).toString(36) + Math.random().toString(36).slice(2, 7); }
function getChat() { return chats.find((c) => c.id === currentId); }

/* ---------------- Render sidebar ---------------- */
function renderChatList() {
  chatList.innerHTML = "";
  chats.forEach((c) => {
    const item = document.createElement("div");
    item.className = "chat-item" + (c.id === currentId ? " active" : "");
    item.innerHTML = `
      <span class="ci-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
      <span class="ci-name"></span>
      <button class="ci-del" title="Delete chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>`;
    item.querySelector(".ci-name").textContent = c.name;
    item.addEventListener("click", (e) => {
      if (e.target.closest(".ci-del")) {
        chats = chats.filter((x) => x.id !== c.id);
        if (currentId === c.id) currentId = null;
        saveChats();
        renderChatList();
        if (!currentId) showWelcome();
        return;
      }
      openChat(c.id);
    });
    chatList.appendChild(item);
  });
}

/* ---------------- View helpers ---------------- */
function showWelcome() { welcome.style.display = ""; chatEl.style.display = "none"; chatTitle.textContent = "New chat"; }
function showChat() { welcome.style.display = "none"; chatEl.style.display = "flex"; chatEl.classList.add("visible"); }
function scrollToBottom() {
  requestAnimationFrame(() => { const app = document.querySelector(".app"); if (app) app.scrollTop = app.scrollHeight; });
}

/* ---------------- Render messages & Blue Link Parser ---------------- */
const ICONS = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  bot: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6a2 2 0 0 0 1.2 1.2L20 10.5l-5.9 1.7a2 2 0 0 0-1.2 1.2L11 19l-1.9-5.6a2 2 0 0 0-1.2-1.2L2 10.5l5.9-1.7a2 2 0 0 0 1.2-1.2L12 2z"/></svg>',
};

function escapeHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function mdToHtml(md) {
  let html = md.trim();

  // Preserve Code Blocks
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return `___CODEBLOCK_${codeBlocks.length - 1}___`;
  });

  // Preserve Inline Code
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `___INLINECODE_${inlineCodes.length - 1}___`;
  });

  // Escape normal text
  html = escapeHtml(html);

  // Markdown Links: [Link Text](https://url.com) -> Blue & Clickable
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, (match, text, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; font-weight: 600;">${text}</a>`;
  });

  // Plain URLs -> Blue & Clickable
  html = html.replace(/(^|[\s>(])(https?:\/\/[^\s<)]+)/g, (match, prefix, url) => {
    return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; font-weight: 600;">${url}</a>`;
  });

  // Headers, Formatting & Lists
  html = html
    .replace(/^#{1,6}\s+.*$/gm, (line) => { const m = line.match(/^(#{1,6})\s+(.*)$/); const lvl = Math.min(m[1].length + 1, 6); return `<h${lvl}>${m[2]}</h${lvl}>`; })
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\s)\*(?!\*)([^*]+?)\*/g, "$1<em>$2</em>")
    .replace(/\n{2,}/g, "\n\n")
    .split("\n\n")
    .map((block) => {
      if (/^<(h\d|pre|ul|ol)/.test(block)) return block;
      if (/^[-*]\s+/.test(block)) return `<ul>` + block.split("\n").map((l) => `<li>${l.replace(/^[-*]\s+/, "")}</li>`).join("") + `</ul>`;
      if (/^\d+\.\s+/.test(block)) return `<ol>` + block.split("\n").map((l) => `<li>${l.replace(/^\d+\.\s+/, "")}</li>`).join("") + `</ol>`;
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .join("");

  // Restore Inline Codes & Code Blocks
  inlineCodes.forEach((code, idx) => { html = html.replace(`___INLINECODE_${idx}___`, code); });
  codeBlocks.forEach((code, idx) => { html = html.replace(`___CODEBLOCK_${idx}___`, code); });

  return html;
}

function renderMessages() {
  const c = getChat();
  if (!c) return;
  chatEl.innerHTML = "";
  c.messages.forEach((m) => {
    if (m.role === "user") {
      const row = document.createElement("div");
      row.className = "row user-row";
      let inner = `<div class="avatar user">${ICONS.user}</div><div class="bubble">`;
      if (c.mode === "research") inner += `<span class="mode-pill research">Research</span>`;
      if (m.attach === "image") inner += `<img class="attach-thumb" src="${m.image || ""}" alt="uploaded image"/>`;
      if (m.attach === "video") inner += `<span class="attach-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg> Video attached</span>`;
      inner += `<span>${escapeHtml(m.text || "")}</span></div>`;
      row.innerHTML = inner;
      chatEl.appendChild(row);
    } else {
      const row = document.createElement("div");
      row.className = "row bot-row";
      row.innerHTML = `<div class="avatar bot">${ICONS.bot}</div><div class="bubble bot-response">${mdToHtml(m.content)}</div>`;
      chatEl.appendChild(row);
    }
  });
  scrollToBottom();
}

/* ---------------- Chat lifecycle ---------------- */
function newChat() {
  const c = { id: newId(), name: "New chat", mode: draftMode, model: activeModel, messages: [] };
  chats.unshift(c);
  currentId = c.id;
  saveChat();
  renderChatList();
  showChat();
  chatTitle.textContent = c.name;
  closeSidebar();
}
function openChat(id) {
  currentId = id;
  const c = getChat();
  if (!c) return;
  draftMode = c.mode || "generate";
  chatTitle.textContent = c.name;
  showChat();
  renderMessages();
  renderChatList();
  closeSidebar();
}

/* ---------------- Send flow ---------------- */
function run(text, attach) {
  text = text.trim();
  if (!text && attach) text = (attach.intro || (attach.type === "video" ? "What are the key points of this video?" : "Describe this image."));
  if (!text && !attach) return;
  let c = getChat();
  if (!c) { newChat(); c = getChat(); }

  // Direct rule check for creator query
  if (/who (created|made|built|developed|designed) (you|orion)/i.test(text)) {
    const creatorReply = "I was created by the Garexcell team.";
    c.messages.push({ role: "user", text, attach: attach ? attach.type : null, image: attach && attach.type === "image" ? attach.url : null, content: attach ? attach.content : null });
    c.messages.push({ role: "assistant", content: creatorReply });
    nameFromMessage(c, text);
    saveChat();
    renderMessages();
    return;
  }

  // Direct rule check for Garexcell products query
  if (/(what|which) (products|websites|platforms|apps) (does|do) garexcell (own|have|operate|run)/i.test(text) || /garexcell products/i.test(text)) {
    const productReply = "Garexcell owns and operates the following products:\n\n- [istartu.com](https://istartu.com)\n- [tv.istartu.com](https://tv.istartu.com)\n- [play.garexcell.com](https://play.garexcell.com)";
    c.messages.push({ role: "user", text, attach: attach ? attach.type : null, image: attach && attach.type === "image" ? attach.url : null, content: attach ? attach.content : null });
    c.messages.push({ role: "assistant", content: productReply });
    nameFromMessage(c, text);
    saveChat();
    renderMessages();
    return;
  }

  // Direct handler for UK time request to guarantee 100% precision
  if (/(time in (uk|london|britain|england)|uk time|time is it in (uk|london))/i.test(text)) {
    const times = getWorldTimes();
    const timeReply = `The current time in the UK (London) is **${times.ukTime}**.`;
    c.messages.push({ role: "user", text, attach: attach ? attach.type : null, image: attach && attach.type === "image" ? attach.url : null, content: attach ? attach.content : null });
    c.messages.push({ role: "assistant", content: timeReply });
    nameFromMessage(c, text);
    saveChat();
    renderMessages();
    return;
  }

  const guard = safetyRule(text + (attach && attach.name ? " " + attach.name : ""));
  if (guard) {
    c.messages.push({ role: "user", text, attach: attach ? attach.metaType : null, image: attach && attach.type === "image" ? attach.url : null, content: attach ? attach.content : null });
    nameFromMessage(c, text);
    saveChat();
    const row = addBotShell();
    streamAnswer(row, guard);
    return;
  }

  const researched = c.mode === "research" || /weather|temperature|today|latest|news|forecast|current|breaking|scrape|instagram|tiktok|twitter|threads|istartu|2026/i.test(text);
  if (researched) searchNote.hidden = false;

  c.messages.push({ role: "user", text, attach: attach ? (attach.type === "image" ? "image" : "video") : null, image: attach && attach.type === "image" ? attach.url : null, content: attach ? attach.content : null });
  nameFromMessage(c, text);
  saveChat();
  renderMessages();

  const row = addBotShell();
  const bubble = row.querySelector(".bubble");

  websim.chat.completions.create({ messages: buildMessages(c, researched) })
    .then((completion) => {
      searchNote.hidden = true;
      c.messages.push(completion);
      saveChat();
      return streamAnswer(row, completion.content).then(() => renderMessages());
    })
    .catch((e) => {
      searchNote.hidden = true;
      bubble.innerHTML = '<div class="bot-response">Sorry, something went wrong. Please try again.</div>';
      console.error(e);
    });
}

function nameFromMessage(c, m) {
  if (!c.name || c.name === "New chat") {
    const plain = m.trim ? m : "Chat";
    c.name = plain.slice(0, 34) + (plain.length > 34 ? "…" : "");
    chatTitle.textContent = c.name;
  }
}
function addBotShell() {
  showChat();
  const row = document.createElement("div");
  row.className = "row bot-row";
  row.innerHTML = `<div class="avatar bot">${ICONS.bot}</div><div class="bubble bot-response"><span class="cursor"></span></div>`;
  chatEl.appendChild(row);
  scrollToBottom();
  return row;
}
async function streamAnswer(rowEl, text) {
  const bubble = rowEl.querySelector(".bubble");
  bubble.innerHTML = "";
  const cursor = '<span class="cursor"></span>';
  const parts = text.split(/(\s+)/);
  let i = 0;
  const chunkSize = 4;
  await new Promise((resolveInner) => {
    const step = () => {
      i = Math.min(parts.length, i + chunkSize);
      bubble.innerHTML = mdToHtml(parts.slice(0, i).join("")) + cursor;
      scrollToBottom();
      if (i < parts.length) requestAnimationFrame(() => setTimeout(step, 14));
      else { bubble.innerHTML = mdToHtml(parts.join("")); resolveInner(); }
    };
    step();
  });
}

/* ---------------- Composer ---------------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const t = input.value;
  if (!t.trim() && !pendingAttach) return;
  const attach = pendingAttach;
  pendingAttach = null;
  plusBtn.classList.remove("active");
  input.placeholder = "Message Orion";
  input.value = "";
  autoResize();
  scrollToBottom();
  run(t, attach || null);
});
input.addEventListener("input", autoResize);
function autoResize() {
  sendBtn.disabled = !input.value.trim() && !pendingAttach;
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
}
input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.dispatchEvent(new Event("submit")); } });
document.addEventListener("click", (e) => {
  if (e.target.closest(".chip")) {
    input.value = e.target.closest(".chip").textContent;
    form.dispatchEvent(new Event("submit"));
  }
});

/* ---------------- Sidebar ---------------- */
newChatCard.addEventListener("click", newChat);
sideClose.addEventListener("click", closeSidebar);
burger.addEventListener("click", openSidebar);
scrim.addEventListener("click", closeSidebar);
manageAccount.addEventListener("click", () => { closeSidebar(); loginScreen.hidden = false; });
function openSidebar() { sidebar.classList.add("open"); scrim.classList.add("show"); }
function closeSidebar() { sidebar.classList.remove("open"); scrim.classList.remove("show"); }

/* ---------------- Model menu ---------------- */
modelSelect.addEventListener("click", (e) => { e.stopPropagation(); modelMenu.classList.toggle("open"); modelSelect.setAttribute("aria-expanded", modelMenu.classList.contains("open")); });
document.addEventListener("click", (e) => { if (!modelMenu.classList.contains("open")) return; if (!e.target.closest(".model-wrap")) modelMenu.classList.remove("open"); });
modelMenu.addEventListener("click", (e) => {
  const opt = e.target.closest(".model-option");
  if (!opt) return;
  activeModel = opt.dataset.model;
  modelLabel.textContent = opt.dataset.model;
  modelMenu.querySelectorAll(".model-option").forEach((o) => o.classList.toggle("active", o === opt));
  const c = getChat();
  if (c) { c.model = activeModel; saveChat(); }
  modelMenu.classList.remove("open");
});
document.querySelectorAll(".model-option").forEach((o) => { if (o.dataset.model === activeModel) o.classList.add("active"); });

/* ---------------- Bottom sheet + attach ---------------- */
plusBtn.addEventListener("click", openSheet);
function openSheet() {
  sheet.hidden = false;
  sheetScrim.hidden = false;
  document.querySelectorAll(".mode-card").forEach((mc) => mc.classList.toggle("active", mc.dataset.mode === draftMode));
}
function closeSheet() { sheet.hidden = true; sheetScrim.hidden = true; }
sheetScrim.addEventListener("click", closeSheet);

document.querySelectorAll(".mode-card").forEach((mc) => {
  mc.addEventListener("click", () => {
    draftMode = mc.dataset.mode;
    const c = getChat();
    if (c) { c.mode = draftMode; saveChat(); }
    document.querySelectorAll(".mode-card").forEach((o) => o.classList.toggle("active", o === mc));
    closeSheet();
  });
});
document.querySelectorAll(".sheet-action").forEach((b, i) => {
  b.addEventListener("click", () => { closeSheet(); (i === 0 ? fileImage : fileVideo).click(); });
});

fileImage.addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) return;
  fileToDataUrl(f).then((dataUrl) => {
    pendingAttach = { type: "image", metaType: "image", url: dataUrl, intro: "Describe this image.", content: [{ type: "image_url", image_url: { url: dataUrl } }] };
    plusBtn.classList.add("active");
    input.placeholder = "Ask about the image…";
    autoResize();
    input.focus();
  });
  e.target.value = "";
});
fileVideo.addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const frames = await videoToFrames(f);
  pendingAttach = { type: "video", metaType: "video", intro: "What are the key points of this video?", content: frames };
  plusBtn.classList.add("active");
  input.placeholder = "Ask about the video…";
  autoResize();
  input.focus();
  e.target.value = "";
});

function fileToDataUrl(f) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
}
function videoToFrames(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    const frames = [];
    const canvas = document.createElement("canvas");
    video.onloadedmetadata = () => {
      const dur = video.duration || 0;
      const n = Math.min(4, Math.max(1, Math.round(dur / 3)));
      const seek = (idx) => {
        if (idx >= n) { URL.revokeObjectURL(url); resolve(frames); return; }
        const t = (idx / Math.max(1, n - 1)) * Math.max(0.1, dur - 0.2);
        video.onseeked = () => {
          const d = captureFrame(video, canvas);
          if (d) frames.push({ type: "image_url", image_url: { url: d } });
          seek(idx + 1);
        };
        video.currentTime = t;
      };
      seek(0);
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve([]); };
  });
}
function captureFrame(video, canvas) {
  const w = 640, h = 480;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.min(w / vw, h / vh);
  const dw = vw * scale, dh = vh * scale;
  ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return canvas.toDataURL("image/jpeg", 0.7);
}

/* ---------------- Login screen ---------------- */
avatarBtn.addEventListener("click", () => { loginScreen.hidden = false; });
goBack.addEventListener("click", () => { loginScreen.hidden = true; });
loginBtn.addEventListener("click", (e) => { e.preventDefault(); loginBtn.blur(); });

/* ---------------- Rename ---------------- */
editName.addEventListener("click", () => {
  const c = getChat();
  if (!c) return;
  const name = prompt("Rename chat:", c.name);
  if (name && name.trim()) {
    c.name = name.trim().slice(0, 60);
    chatTitle.textContent = c.name;
    saveChat();
    renderChatList();
  }
});

/* ---------------- Init ---------------- */
function init() {
  autoResize();
  renderChatList();
  if (chats.length) openChat(chats[0].id);
  else showWelcome();
}
init();
