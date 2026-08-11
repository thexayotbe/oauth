require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const TelegramBot = require('node-telegram-bot-api');
const {issue, verifyCode, consume} = require('./otpStore');
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in otp-server/.env before starting the server.');

const CONTACTS_FILE = path.join(__dirname, 'contacts.json');
const OTP_LIFETIME_MS = 5 * 60 * 1000;

const bot = new TelegramBot(token, { polling: true });
const app = express();
const contacts = loadContacts();
const mailer = createMailer();

app.use(express.json());

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

function createMailer() {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
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

  const code = await issue(phone);

  try {
    await bot.sendMessage(chatId, `Код подтверждения: ${code}`);
    return res.json({ ok: true });
  } catch {
    await consume(phone);
    return res.status(502).json({ ok: false, error: 'Не удалось отправить код в Telegram.' });
  }
});

app.post('/verify-otp', async (req, res) => {
  const phone = onlyDigits(req.body.phone);
  const error = await verifyCode(phone, onlyDigits(req.body.code));

  if (error) return res.status(400).json({ ok: false, error });

  await consume(phone);
  return res.json({ ok: true });
});

app.post('/send-email-otp', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Укажите корректный email.' });
  }

  if (!mailer) {
    return res.status(503).json({
      ok: false,
      error: 'Отправка писем не настроена. Укажите MAIL_USER и MAIL_PASS в otp-server/.env.',
    });
  }

  const code = await issue(email);

  try {
    await mailer.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: 'Код подтверждения',
      text: `Ваш код подтверждения: ${code}\n\nКод действителен 5 минут.`,
    });
    return res.json({ ok: true });
  } catch {
    await consume(email);
    return res.status(502).json({ ok: false, error: 'Не удалось отправить письмо.' });
  }
});

app.post('/verify-email-otp', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const error = await verifyCode(email, onlyDigits(req.body.code));

  if (error) return res.status(400).json({ ok: false, error });

  await consume(email);
  return res.json({ ok: true });
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('OTP server listening.'));
