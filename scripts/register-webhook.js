const dotenv = require("dotenv");
const telegram = require("../lib/telegram");

dotenv.config();

async function main() {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL is missing. Example: https://your-project.vercel.app");
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram`;
  const result = await telegram.setWebhook(webhookUrl);
  console.log("Webhook set:", result);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
