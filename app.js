"use strict";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL   = "allam-2-7b";

// ── State ──────────────────────────────────────────────────────
const messages = [];   // full conversation history

// ── DOM refs ───────────────────────────────────────────────────
const messagesEl = document.getElementById("messages");
const inputEl    = document.getElementById("input");
const sendBtn    = document.getElementById("send-btn");
const apiKeyEl   = document.getElementById("api-key");
const saveKeyBtn = document.getElementById("save-key-btn");

// ── API key persistence ─────────────────────────────────────────
const STORAGE_KEY = "groq_api_key";

// Load saved key on startup
const savedKey = localStorage.getItem(STORAGE_KEY);
if (savedKey) {
  apiKeyEl.value = savedKey;
  saveKeyBtn.textContent = "Saved ✓";
  saveKeyBtn.classList.add("saved");
}

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyEl.value.trim();
  if (!key) {
    localStorage.removeItem(STORAGE_KEY);
    saveKeyBtn.textContent = "Save";
    saveKeyBtn.classList.remove("saved");
    return;
  }
  localStorage.setItem(STORAGE_KEY, key);
  saveKeyBtn.textContent = "Saved ✓";
  saveKeyBtn.classList.add("saved");
  // Reset label after 2 seconds
  setTimeout(() => {
    saveKeyBtn.textContent = "Saved ✓";
  }, 2000);
});

// Reset button state when user edits the key field
apiKeyEl.addEventListener("input", () => {
  saveKeyBtn.textContent = "Save";
  saveKeyBtn.classList.remove("saved");
});

// ── API ────────────────────────────────────────────────────────
async function callAllam(history, apiKey) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: history,
      max_tokens: 1024,
      temperature: 0.7
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data.choices[0].message.content;
}

// ── Rendering ──────────────────────────────────────────────────
function renderMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "You" : role === "assistant" ? "ALLAM 2" : "Error";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.dir = "auto";            // RTL/LTR detected per bubble
  bubble.textContent = text;      // safe — no innerHTML

  wrap.appendChild(label);
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function showTyping() {
  const el = document.createElement("div");
  el.className = "typing-indicator";
  el.id = "typing";
  el.setAttribute("aria-label", "ALLAM is typing");
  el.innerHTML = "<span></span><span></span><span></span>";
  messagesEl.appendChild(el);
  scrollToBottom();
  return el;
}

function removeTyping() {
  document.getElementById("typing")?.remove();
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ── Send flow ──────────────────────────────────────────────────
async function handleSend() {
  const text   = inputEl.value.trim();
  const apiKey = apiKeyEl.value.trim();

  if (!text) return;

  if (!apiKey) {
    renderMessage("error", "⚠ Please enter your GroqCloud API key above.");
    return;
  }

  // Clear input & disable controls
  inputEl.value = "";
  autoResize();
  setLoading(true);

  // Push & render user message
  messages.push({ role: "user", content: text });
  renderMessage("user", text);

  // Show typing indicator
  const typingEl = showTyping();

  try {
    const reply = await callAllam(messages, apiKey);

    removeTyping();
    messages.push({ role: "assistant", content: reply });
    renderMessage("assistant", reply);
  } catch (err) {
    removeTyping();
    renderMessage("error", `⚠ ${err.message}`);
  } finally {
    setLoading(false);
    inputEl.focus();
  }
}

function setLoading(on) {
  sendBtn.disabled = on;
  inputEl.disabled = on;
}

// ── Auto-resize textarea ───────────────────────────────────────
function autoResize() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + "px";
}

// ── Events ─────────────────────────────────────────────────────
sendBtn.addEventListener("click", handleSend);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

inputEl.addEventListener("input", autoResize);

// Focus input on load
inputEl.focus();
