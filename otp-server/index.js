require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in otp-server/.env before starting the server.');

const CONTACTS_FILE = path.join(__dirname, 'contacts.json');
const OTP_LIFETIME_MS = 5 * 60 * 1000;

const bot = new TelegramBot(token, { polling: true });
const app = express();
const otpStore = new Map();
const contacts = loadContacts();

app.use(express.json());

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function loadContacts() {
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'))));
  } catch {
    return new Map();
  }
}

function saveContacts() {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(Object.fromEntries(contacts), null, 2));
}

bot.onText(/\/start/, (message) => {
  bot.sendMessage(
    message.chat.id,
    'Нажмите кнопку ниже, чтобы поделиться номером телефона. Затем введите этот номер в приложении.',
    {
      reply_markup: {
        keyboard: [[{ text: 'Поделиться номером', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    },
  );
});

bot.on('contact', (message) => {
  const phone = onlyDigits(message.contact.phone_number);
  if (!phone) return;

  contacts.set(phone, message.chat.id);
  saveContacts();

  bot.sendMessage(
    message.chat.id,
    `Номер +${phone} сохранён. Введите его в приложении, чтобы получить код.`,
    { reply_markup: { remove_keyboard: true } },
  );
});

app.post('/send-otp', async (req, res) => {
  const phone = onlyDigits(req.body.phone);
  if (!phone) return res.status(400).json({ ok: false, error: 'Укажите номер телефона.' });

  const chatId = contacts.get(phone);
  if (!chatId) {
    return res.status(404).json({
      ok: false,
      error: 'Номер не найден. Откройте бота в Telegram, отправьте /start и поделитесь номером.',
    });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_LIFETIME_MS });

  try {
    await bot.sendMessage(chatId, `Код подтверждения: ${code}`);
    return res.json({ ok: true });
  } catch {
    otpStore.delete(phone);
    return res.status(502).json({ ok: false, error: 'Не удалось отправить код в Telegram.' });
  }
});

app.post('/verify-otp', (req, res) => {
  const phone = onlyDigits(req.body.phone);
  const code = onlyDigits(req.body.code);
  const entry = otpStore.get(phone);

  if (!entry || entry.expiresAt < Date.now()) {
    otpStore.delete(phone);
    return res.status(400).json({ ok: false, error: 'Код истёк или не найден. Запросите новый.' });
  }

  if (entry.code !== code) {
    return res.status(400).json({ ok: false, error: 'Неверный код.' });
  }

  otpStore.delete(phone);
  return res.json({ ok: true });
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('OTP server listening.'));
