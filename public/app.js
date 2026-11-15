const form = document.querySelector("#chat-form");
const promptInput = document.querySelector("#prompt");
const sendButton = document.querySelector("#send-button");
const messages = document.querySelector("#messages");
const clearButton = document.querySelector("#clear-chat");

document.querySelector("#year").textContent = new Date().getFullYear();

let history = [];

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

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  content.append(name, paragraph);
  row.append(avatar, content);
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
  return paragraph;
}

function setBusy(busy) {
  sendButton.disabled = busy;
  sendButton.querySelector("span").textContent = busy ? "Thinking" : "Send";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = promptInput.value.trim();
  if (!message || sendButton.disabled) return;

  addMessage("user", message);
  history.push({ role: "user", content: message });
  promptInput.value = "";
  setBusy(true);
  const replyElement = addMessage("assistant", "Thinking...");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-12) })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The assistant could not respond.");
    const reply = typeof data.reply === "string" ? data.reply : "I couldn't create a response. Please try again.";
    replyElement.textContent = reply;
    history.push({ role: "assistant", content: reply });
  } catch (error) {
    replyElement.textContent = error.message || "Something went wrong. Please try again.";
    history.pop();
  } finally {
    setBusy(false);
    promptInput.focus();
  }
});

clearButton.addEventListener("click", () => {
  history = [];
  messages.replaceChildren();
  addMessage("assistant", "New chat started. What would you like to explore?");
  promptInput.focus();
});