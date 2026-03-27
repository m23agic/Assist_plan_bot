const { dispatchDueReminders } = require("../lib/bot");
const telegram = require("../lib/telegram");
const { dispatchSecret } = require("../lib/config");

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (dispatchSecret) {
    const secret = req.headers["x-dispatch-secret"] || req.query.secret;
    if (secret !== dispatchSecret) {
      res.status(401).json({ ok: false, error: "Invalid dispatch secret" });
      return;
    }
  }

  try {
    const sent = await dispatchDueReminders(telegram);
    res.status(200).json({ ok: true, sent });
  } catch (error) {
    console.error("Dispatch error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
};
