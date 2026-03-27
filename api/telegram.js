const { handleUpdate } = require("../lib/bot");
const telegram = require("../lib/telegram");
const { webhookSecret } = require("../lib/config");

function parseRequestBody(req) {
  if (!req || typeof req.body === "undefined" || req.body === null) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }

  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString("utf8"));
    } catch (error) {
      return {};
    }
  }

  if (typeof req.body === "object") {
    return req.body;
  }

  return {};
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({ ok: true, route: "telegram-webhook" });
    return;
  }

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
    const update = parseRequestBody(req);
    await handleUpdate(telegram, update);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
};
