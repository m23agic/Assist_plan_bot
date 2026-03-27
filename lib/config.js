const timezone = process.env.TIMEZONE || "Asia/Yekaterinburg";
const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const dispatchSecret = process.env.DISPATCH_SECRET || "";

module.exports = {
  timezone,
  token,
  webhookSecret,
  dispatchSecret
};
