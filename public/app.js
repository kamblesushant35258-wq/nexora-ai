const form = document.querySelector("#chat-form");
const promptInput = document.querySelector("#prompt");
const sendButton = document.querySelector("#send-button");
const messages = document.querySelector("#messages");
const clearButton = document.querySelector("#clear-chat");

const STORAGE_KEY = "nexora-ai-chat-v2";
const MAX_SAVED_MESSAGES = 40;

document.querySelector("#year").textContent = new Date().getFullYear();

let history = loadHistory();

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((item) =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string"
      )
      .slice(-MAX_SAVED_MESSAGES)
      .map((item) => ({ role: item.role, content: item.content.slice(0, 2000) }));
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_SAVED_MESSAGES)));
  } catch {
    // Chat still works if browser storage is unavailable or full.
  }
}

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = role === "user" ? "message user-message" : "message assistant-message";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "You" : "N";

  const content = document.createElement("div");
  content.className = "message-content";

  const name = document.createElement("span");
  name.className = "message-name";
  name.textContent = role === "user" ? "You" : "Nexora AI";

  const body = document.createElement("div");
  body.className = "message-body";
  if (role === "assistant") renderSafeMarkdown(body, text);
  else {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    body.append(paragraph);
  }

  content.append(name, body);
  row.append(avatar, content);
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
  return body;
}

function renderSafeMarkdown(container, text) {
  let inCode = false;
  let codeLines = [];
  let list = null;
  for (const line of text.split(String.fromCharCode(10))) {
    if (line.trim().startsWith(String.fromCharCode(96, 96, 96))) {
      if (!inCode) { inCode = true; codeLines = []; list = null; }
      else {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = codeLines.join(String.fromCharCode(10));
        pre.append(code); container.append(pre); inCode = false;
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    const heading = line.match(/^(#{1,3})\\s+(.+)$/);
    const bullet = line.match(/^\\s*[-*]\\s+(.+)$/);
    const numbered = line.match(/^\\s*\\d+[.)]\\s+(.+)$/);
    if (bullet || numbered) {
      const tag = bullet ? 'UL' : 'OL';
      if (!list || list.tagName !== tag) { list = document.createElement(bullet ? 'ul' : 'ol'); container.append(list); }
      const item = document.createElement('li'); item.textContent = (bullet || numbered)[1]; list.append(item);
      continue;
    }
    list = null;
    if (!line.trim()) continue;
    const block = document.createElement(heading ? 'h' + (heading[1].length + 2) : 'p');
    block.textContent = heading ? heading[2] : line;
    container.append(block);
  }
  if (inCode) {
    const pre = document.createElement('pre'); const code = document.createElement('code');
    code.textContent = codeLines.join(String.fromCharCode(10)); pre.append(code); container.append(pre);
  }
}
function renderConversation() {
  messages.replaceChildren();

  if (history.length === 0) {
    addMessage("assistant", "Hello! I'm Nexora, your AI assistant. What would you like to explore today?");
    return;
  }

  for (const item of history) addMessage(item.role, item.content);
}

function setBusy(busy) {
  sendButton.disabled = busy;
  sendButton.querySelector("span").textContent = busy ? "Thinking" : "Send";
  promptInput.disabled = busy;
}

renderConversation();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = promptInput.value.trim();
  if (!message || sendButton.disabled) return;

  history.push({ role: "user", content: message });
  addMessage("user", message);
  promptInput.value = "";
  setBusy(true);
  const replyElement = addMessage("assistant", "Thinking...");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-12) })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (HTTP ${response.status}).`);

    const reply = typeof data.reply === "string" && data.reply.trim()
      ? data.reply.trim()
      : "I couldn't create a response. Please try again.";

    replyElement.replaceChildren();
    renderSafeMarkdown(replyElement, reply);
    history.push({ role: "assistant", content: reply });
    history = history.slice(-MAX_SAVED_MESSAGES);
    saveHistory();
  } catch (error) {
    history.pop();
    replyElement.replaceChildren();
    const errorText = document.createElement("p");
    errorText.textContent = error.message || "Something went wrong. Please try again.";
    replyElement.append(errorText);
  } finally {
    setBusy(false);
    promptInput.focus();
  }
});

clearButton.addEventListener("click", () => {
  history = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Clearing the visible chat still works if browser storage is unavailable.
  }
  renderConversation();
  promptInput.focus();
});
