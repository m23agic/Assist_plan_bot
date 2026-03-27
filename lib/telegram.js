const { token, webhookSecret } = require("./config");

function ensureToken() {
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing. Set it in your environment.");
  }
}

async function telegramRequest(method, body) {
  ensureToken();

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    const description = payload.description || `Telegram API request failed: ${response.status}`;
    throw new Error(description);
  }

  return payload.result;
}

async function sendMessage(chatId, text, extra = {}) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    ...extra
  });
}

async function setWebhook(url) {
  const body = { url };
  if (webhookSecret) {
    body.secret_token = webhookSecret;
  }

  return telegramRequest("setWebhook", body);
}

async function deleteWebhook() {
  return telegramRequest("deleteWebhook", {
    drop_pending_updates: false
  });
}

async function getUpdates(offset) {
  return telegramRequest("getUpdates", {
    offset,
    timeout: 30,
    allowed_updates: ["message"]
  });
}

module.exports = {
  sendMessage,
  setWebhook,
  deleteWebhook,
  getUpdates
};
