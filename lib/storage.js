const fs = require("fs");
const path = require("path");

let kv = null;
try {
  ({ kv } = require("@vercel/kv"));
} catch (error) {
  kv = null;
}

const dataDir = path.join(process.cwd(), "data");
const remindersFile = path.join(dataDir, "reminders.json");
const chatStatesFile = path.join(dataDir, "chat-states.json");

function isKvEnabled() {
  return Boolean(
    kv &&
    (process.env.KV_REST_API_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL)
  );
}

function ensureLocalFile(filePath, initialValue) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialValue, null, 2), "utf8");
  }
}

function readLocalJson(filePath, initialValue) {
  ensureLocalFile(filePath, initialValue);

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return initialValue;
  }
}

function writeLocalJson(filePath, value) {
  ensureLocalFile(filePath, value);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function getReminders() {
  if (isKvEnabled()) {
    return (await kv.get("reminders")) || [];
  }

  const reminders = readLocalJson(remindersFile, []);
  return Array.isArray(reminders) ? reminders : [];
}

async function saveReminders(reminders) {
  if (isKvEnabled()) {
    await kv.set("reminders", reminders);
    return;
  }

  writeLocalJson(remindersFile, reminders);
}

async function getChatState(chatId) {
  const key = String(chatId);

  if (isKvEnabled()) {
    return (await kv.hget("chat_states", key)) || null;
  }

  const states = readLocalJson(chatStatesFile, {});
  return states[key] || null;
}

async function setChatState(chatId, state) {
  const key = String(chatId);

  if (isKvEnabled()) {
    await kv.hset("chat_states", { [key]: state });
    return;
  }

  const states = readLocalJson(chatStatesFile, {});
  states[key] = state;
  writeLocalJson(chatStatesFile, states);
}

async function clearChatState(chatId) {
  const key = String(chatId);

  if (isKvEnabled()) {
    await kv.hdel("chat_states", key);
    return;
  }

  const states = readLocalJson(chatStatesFile, {});
  delete states[key];
  writeLocalJson(chatStatesFile, states);
}

module.exports = {
  getReminders,
  saveReminders,
  getChatState,
  setChatState,
  clearChatState,
  isKvEnabled
};
