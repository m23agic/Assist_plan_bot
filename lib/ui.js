function getMainKeyboard() {
  return {
    keyboard: [
      [{ text: "Создать напоминание" }],
      [{ text: "Список напоминаний" }, { text: "Удалить напоминание" }]
    ],
    resize_keyboard: true
  };
}

function formatReminder(reminder) {
  return `#${reminder.id} | ${reminder.localDateTime} | ${reminder.text}`;
}

module.exports = {
  getMainKeyboard,
  formatReminder
};
