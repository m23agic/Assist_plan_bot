const { handleUpdate } = require("../lib/bot");
const telegram = require("../lib/telegram");
const { webhookSecret } = require("../lib/config");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (webhookSecret) {
    const header = req.headers["x-telegram-bot-api-secret-token"];
    if (header !== webhookSecret) {
      res.status(401).json({ ok: false, error: "Invalid webhook secret" });
      return;
    }
  }

  try {
    await handleUpdate(telegram, req.body || {});
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
};
