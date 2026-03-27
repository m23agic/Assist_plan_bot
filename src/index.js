const dotenv = require("dotenv");
const { handleUpdate, dispatchDueReminders } = require("../lib/bot");
const telegram = require("../lib/telegram");

dotenv.config();

async function main() {
  await telegram.deleteWebhook();

  let offset = 0;
  console.log("Local polling bot is running.");

  while (true) {
    try {
      const updates = await telegram.getUpdates(offset);

      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(telegram, update);
      }

      await dispatchDueReminders(telegram);
    } catch (error) {
      console.error("Local polling error:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
