require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const TelegramBot = require('node-telegram-bot-api');
const {issue, verifyCode, consume} = require('./otpStore');
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in otp-server/.env before starting the server.');

const {auth, requireAuth} = require('./firebase');

const { getFirestore } = require('firebase-admin/firestore');
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');
const OTP_LIFETIME_MS = 5 * 60 * 1000;

const bot = new TelegramBot(token, { polling: true });
const app = express();
const contacts = loadContacts();
const mailer = createMailer();
const db = getFirestore();

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

async function ensureUser(email) {
    try {
      return await auth.getUserByEmail(email);
    }catch(e){
      return await auth.createUser({email, emailVerified: true})
    }
}
async function getEmailAccountInfo(email) {
  try {
    const user = await auth.getUserByEmail(email);
    const ids = (user.providerData || []).map(p => p.providerId);
    const snap = await db.collection('users').doc(user.uid).get();
    const docProvider = snap.exists ? snap.data().provider : null;
    const claimMethod = user.customClaims?.authMethod;

    if (claimMethod === 'email' || docProvider === 'email') {
      return { exists: true, kind: 'email', uid: user.uid };
    }
    if (ids.includes('google.com')) {
      return { exists: true, kind: 'google', uid: user.uid };
    }
    if (ids.includes('facebook.com')) {
      return { exists: true, kind: 'facebook', uid: user.uid };
    }
    return { exists: true, kind: 'email', uid: user.uid };
  } catch {
    return { exists: false, kind: null, uid: null };
  }
}
async function socialProviderForEmail(email) {
  const info = await getEmailAccountInfo(email);
  if (!info.exists) return null;
  if (info.kind === 'email') return null;
  return info.kind;
}

function socialConflictPayload(provider) {
  const label = provider === 'google' ? 'Google' : 'Facebook';
  return {
    ok: false,
    error: `этот email уже используется через ${label}. войдите через ${label}.`,
    existingProvider: provider,
  };
}
async function saveUserDoc(user) {
  await db.collection('users').doc(user.uid).set(
    {
      email: user.email,
      createdAt: Date.now(),
      provider: 'email',
      authMethod: 'email',
      isActive: true,
    },
    { merge: true },
  );
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

  const result = await issue(phone);

  if(result.retryAfter){
    return res.json({
      ok: false,
      error: 'слишком мноого',
      retryAfter: result.retryAfter,
    })
  }
  const code = result.code;

  try {
    await bot.sendMessage(chatId, `Код подтверждения: ${code}`);
    return res.json({ ok: true });
  } catch {
    await consume(phone);
    return res.status(502).json({ ok: false, error: 'Не удалось отправить код в Telegram.' });
  }
});

app.post('/verify-otp', requireAuth, async (req, res) => {
  const phone = onlyDigits(req.body.phone);
  const error = await verifyCode(phone, onlyDigits(req.body.code));

  if (error) return res.status(400).json({ ok: false, error });

  await db.collection('users').doc(req.user.uid).set(
    {
      phone: `+${phone}`,
      isActive: true,
      activatedAt: Date.now(),
    },
    { merge: true },
  );
  const existing = (await auth.getUser(req.user.uid)).customClaims ?? {};

  await auth.setCustomUserClaims(req.user.uid, { ...existing, otpVerified: true });

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

  const social = await socialProviderForEmail(email);
  if (social) {
    return res.status(409).json(socialConflictPayload(social));
  }

  const result = await issue(email);

  if(result.retryAfter){
    return res.json({
      ok: false,
      error: 'слишком мноого',
      retryAfter: result.retryAfter,
    })
  }
  const code = result.code;

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

  const social = await socialProviderForEmail(email);
  if (social) {
    return res.status(409).json(socialConflictPayload(social));
  }

  const user = await ensureUser(email);
  await saveUserDoc(user);

  const existing = (await auth.getUser(user.uid)).customClaims ?? {};
  await auth.setCustomUserClaims(user.uid, {
    ...existing,
    otpVerified: true,
    authMethod: 'email',
  });
  const firebaseToken = await auth.createCustomToken(user.uid);
  await consume(email);
  return res.json({ ok: true, firebaseToken });
});


app.post('/check-email', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isEmail(email)) {
    return res.status(400).json({ ok: false, error: 'ykажите корректный email.' });
  }
  const info = await getEmailAccountInfo(email);
  return res.json({
    ok: true,
    exists: info.exists,
    kind: info.kind,
  });
});
app.post('/register', requireAuth, async(req,res)=>{
  const uid = req.user.uid;
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  const incoming = req.user.firebase?.sign_in_provider ?? 'unknown';
  const patch = {
    email: req.user.email ?? null,
    provider: incoming,
  };

  if (snap.exists) {
    const prev = snap.data();
    if (
      (prev.provider === 'email' || prev.authMethod === 'email') &&
      (incoming === 'google.com' || incoming === 'facebook.com')
    ) {
      return res.status(409).json({
        ok: false,
        error: 'этот email уже зарегистрирован через email..',
        existingProvider: 'email',
      });
    }
    await ref.set(patch, { merge: true });
  } else {
    await ref.set({
      ...patch,
      isActive: false,
      createdAt: Date.now(),
    });
  }

  const user = (await ref.get()).data();
  return res.json({ok:true, user});
})
app.get('/me', requireAuth, async (req, res) => {
  const snap = await db.collection('users').doc(req.user.uid).get();
  if (!snap.exists) return res.json({ ok: true, isActive: false });
  return res.json({ ok: true, isActive: !!snap.data().isActive });
});

app.delete('/account', requireAuth, async (req, res) => {
  const { uid} = req.user;

  try {
    const userRecord = await auth.getUser(uid);
    const phone = userRecord.phoneNumber
      ? onlyDigits(userRecord.phoneNumber)
      : null;
    const email = userRecord.email ? normalizeEmail(userRecord.email) : null;

    await auth.revokeRefreshTokens(uid);
    await auth.deleteUser(uid);
    await db.collection('users').doc(uid).delete().catch(() => {});

    if (phone) await consume(phone).catch(() => {});
    if (email) await consume(email).catch(() => {});
    return res.json({ ok: true });
  } catch (e) {
    console.error('[delete-account]', e);
    return res.status(500).json({ ok: false, error: 'не удалось удалить.' });
  }
});


app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('OTP server listening.'));
