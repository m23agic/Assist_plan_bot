const { DateTime } = require("luxon");
const { timezone } = require("./config");

function parseReminderInput(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) {
    return { error: "Пустая команда. Пример: /remind 2026-03-28 14:30 Купить молоко" };
  }

  const fullMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+)$/);
  if (fullMatch) {
    const [, datePart, timePart, text] = fullMatch;
    const scheduledAt = DateTime.fromFormat(
      `${datePart} ${timePart}`,
      "yyyy-MM-dd HH:mm",
      { zone: timezone }
    );

    if (!scheduledAt.isValid) {
      return { error: "Не удалось разобрать дату. Используй формат YYYY-MM-DD HH:MM текст" };
    }

    return {
      scheduledAt: scheduledAt.toUTC().toISO(),
      localDateTime: scheduledAt.toFormat("yyyy-MM-dd HH:mm"),
      text: text.trim()
    };
  }

  const todayMatch = trimmed.match(/^(\d{2}:\d{2})\s+(.+)$/);
  if (todayMatch) {
    const [, timePart, text] = todayMatch;
    const [hours, minutes] = timePart.split(":").map(Number);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return { error: "Время должно быть в формате HH:MM" };
    }

    const now = DateTime.now().setZone(timezone);
    let scheduledAt = now.set({
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0
    });

    if (scheduledAt.toMillis() <= now.toMillis()) {
      scheduledAt = scheduledAt.plus({ days: 1 });
    }

    return {
      scheduledAt: scheduledAt.toUTC().toISO(),
      localDateTime: scheduledAt.toFormat("yyyy-MM-dd HH:mm"),
      text: text.trim()
    };
  }

  return {
    error: "Не понял формат. Используй /remind YYYY-MM-DD HH:MM текст или /remind HH:MM текст"
  };
}

module.exports = {
  parseReminderInput
};
