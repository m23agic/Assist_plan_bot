const { timezone } = require("./config");
const { parseReminderInput } = require("./time");
const { formatReminder, getMainKeyboard } = require("./ui");
const storage = require("./storage");

async function sendMainMenu(telegram, chatId, text) {
  await telegram.sendMessage(chatId, text, {
    reply_markup: getMainKeyboard()
  });
}

async function getActiveReminders(chatId) {
  const reminders = await storage.getReminders();
  return reminders
    .filter((item) => item.chatId === chatId && !item.sent)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

async function sendReminderList(telegram, chatId) {
  const items = await getActiveReminders(chatId);

  if (!items.length) {
    await sendMainMenu(telegram, chatId, "Активных напоминаний пока нет.");
    return;
  }

  await sendMainMenu(telegram, chatId, items.map(formatReminder).join("\n"));
}

async function createReminder(telegram, chatId, text, parsed) {
  const reminders = await storage.getReminders();
  const nextId = reminders.length ? Math.max(...reminders.map((item) => item.id)) + 1 : 1;
  const reminder = {
    id: nextId,
    chatId,
    text,
    scheduledAt: parsed.scheduledAt,
    localDateTime: parsed.localDateTime,
    sent: false
  };

  reminders.push(reminder);
  await storage.saveReminders(reminders);
  await sendMainMenu(telegram, chatId, `Готово. Напомню: ${formatReminder(reminder)}`);
}

async function deleteReminder(chatId, reminderId) {
  const reminders = await storage.getReminders();
  const nextReminders = reminders.filter(
    (item) => !(item.chatId === chatId && item.id === reminderId)
  );

  if (nextReminders.length === reminders.length) {
    return false;
  }

  await storage.saveReminders(nextReminders);
  return true;
}

async function handleTextMessage(telegram, message) {
  const text = String(message.text || "").trim();
  const chatId = message.chat.id;

  if (!text) {
    return;
  }

  if (text === "/start") {
    await storage.clearChatState(chatId);
    await sendMainMenu(
      telegram,
      chatId,
      [
        "Я бот-напоминалка.",
        "",
        "Можно нажимать кнопки снизу или писать команды.",
        "",
        "Примеры:",
        "/remind 2026-03-28 14:30 Купить молоко",
        "/remind 18:45 Позвонить другу"
      ].join("\n")
    );
    return;
  }

  if (text === "/help") {
    await sendMainMenu(
      telegram,
      chatId,
      [
        "Как пользоваться:",
        "1. Нажми 'Создать напоминание'",
        "2. Отправь текст напоминания",
        "3. Потом отправь время в формате YYYY-MM-DD HH:MM или HH:MM",
        "4. Посмотреть список: /list или кнопка снизу",
        "5. Удалить напоминание: /delete ID или кнопка снизу",
        "",
        `Часовой пояс бота: ${timezone}`
      ].join("\n")
    );
    return;
  }

  if (text.startsWith("/remind")) {
    const input = text.replace(/^\/remind\s*/, "");
    const parsed = parseReminderInput(input);

    if (parsed.error) {
      await sendMainMenu(telegram, chatId, parsed.error);
      return;
    }

    await storage.clearChatState(chatId);
    await createReminder(telegram, chatId, parsed.text, parsed);
    return;
  }

  if (text === "/list" || text === "Список напоминаний") {
    await storage.clearChatState(chatId);
    await sendReminderList(telegram, chatId);
    return;
  }

  if (text.match(/^\/delete\s+(\d+)$/)) {
    const reminderId = Number(text.match(/^\/delete\s+(\d+)$/)[1]);
    const deleted = await deleteReminder(chatId, reminderId);

    if (!deleted) {
      await sendMainMenu(telegram, chatId, "Напоминание с таким ID не найдено.");
      return;
    }

    await storage.clearChatState(chatId);
    await sendMainMenu(telegram, chatId, `Удалил напоминание #${reminderId}.`);
    return;
  }

  if (text === "Создать напоминание") {
    await storage.setChatState(chatId, { step: "awaiting_text" });
    await telegram.sendMessage(chatId, "Напиши текст напоминания.", {
      reply_markup: getMainKeyboard()
    });
    return;
  }

  if (text === "Удалить напоминание") {
    const items = await getActiveReminders(chatId);

    if (!items.length) {
      await storage.clearChatState(chatId);
      await sendMainMenu(telegram, chatId, "Удалять пока нечего.");
      return;
    }

    await storage.setChatState(chatId, { step: "awaiting_delete_id" });
    await telegram.sendMessage(
      chatId,
      `${items.map(formatReminder).join("\n")}\n\nОтправь ID напоминания, которое нужно удалить.`,
      { reply_markup: getMainKeyboard() }
    );
    return;
  }

  const state = await storage.getChatState(chatId);

  if (!state) {
    await sendMainMenu(
      telegram,
      chatId,
      "Нажми кнопку снизу или используй /help, если хочешь посмотреть подсказки."
    );
    return;
  }

  if (state.step === "awaiting_text") {
    await storage.setChatState(chatId, {
      step: "awaiting_time",
      reminderText: text
    });
    await telegram.sendMessage(chatId, "Теперь отправь время: YYYY-MM-DD HH:MM или коротко HH:MM", {
      reply_markup: getMainKeyboard()
    });
    return;
  }

  if (state.step === "awaiting_time") {
    if (!/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(text) && !/^\d{2}:\d{2}$/.test(text)) {
      await telegram.sendMessage(chatId, "Не понял время. Используй формат YYYY-MM-DD HH:MM или HH:MM", {
        reply_markup: getMainKeyboard()
      });
      return;
    }

    const parsed = parseReminderInput(`${text} ${state.reminderText}`);
    if (parsed.error) {
      await telegram.sendMessage(chatId, parsed.error, {
        reply_markup: getMainKeyboard()
      });
      return;
    }

    await storage.clearChatState(chatId);
    await createReminder(telegram, chatId, state.reminderText, parsed);
    return;
  }

  if (state.step === "awaiting_delete_id") {
    const reminderId = Number(text);
    if (!Number.isInteger(reminderId)) {
      await telegram.sendMessage(chatId, "Отправь именно числовой ID напоминания.", {
        reply_markup: getMainKeyboard()
      });
      return;
    }

    const deleted = await deleteReminder(chatId, reminderId);
    if (!deleted) {
      await telegram.sendMessage(chatId, "Напоминание с таким ID не найдено.", {
        reply_markup: getMainKeyboard()
      });
      return;
    }

    await storage.clearChatState(chatId);
    await sendMainMenu(telegram, chatId, `Удалил напоминание #${reminderId}.`);
  }
}

async function handleUpdate(telegram, update) {
  if (update && update.message && update.message.text) {
    await handleTextMessage(telegram, update.message);
  }
}

async function dispatchDueReminders(telegram) {
  const reminders = await storage.getReminders();
  const now = Date.now();
  let changed = false;
  let sentCount = 0;

  for (const reminder of reminders) {
    if (reminder.sent) {
      continue;
    }

    if (new Date(reminder.scheduledAt).getTime() <= now) {
      await telegram.sendMessage(reminder.chatId, `Напоминание: ${reminder.text}`);
      reminder.sent = true;
      changed = true;
      sentCount += 1;
    }
  }

  if (changed) {
    await storage.saveReminders(reminders);
  }

  return sentCount;
}

module.exports = {
  handleUpdate,
  dispatchDueReminders
};
