const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const crypto = require('crypto');
require('./firebase');

const otps = getFirestore().collection('otps');



const LIFE_T = 5 * 60 * 1000
const MAX_ATTEMPTS = 5;
const COOLDOWN = 60 * 1000

function hashCode(code){
    return crypto.createHmac('sha256', process.env.OTP_SECRET).update(code).digest();
}


async function issue(id){
    const ref = otps.doc(id);
    const snap = await ref.get();
    const now = Date.now();

    if(snap.exists) {
        const passed = now - (snap.data().lastSentAt || 0)
        if(passed <  COOLDOWN){
            return { retryAfter:  Math.ceil((COOLDOWN - passed) / 1000) };
        }
    }


    const code = String(crypto.randomInt(100000, 1000000));

   await otps.doc(id).set({
    codeHash: hashCode(code),
    expiresAt: Date.now() + LIFE_T,
    attempts: 0,
    lastSentAt: Date.now()
   })

    return {code};
}



async function verifyCode(id, code) {
    try {
      const ref = otps.doc(id);
      const snap = await ref.get();
  
      if (!snap.exists || snap.data().expiresAt < Date.now()) {
        await ref.delete();
        return 'код истек';
      }
  
      const row = snap.data();
  
      if (row.attempts >= MAX_ATTEMPTS) {
        await ref.delete();
        return 'много попыток';
      }
  
      const raw = row.codeHash;
      const stored = Buffer.isBuffer(raw)
        ? raw
        : Buffer.from(raw.toUint8Array ? raw.toUint8Array() : raw);
      const incoming = hashCode(String(code));
  
      if (
        stored.length !== incoming.length ||
        !crypto.timingSafeEqual(stored, incoming)
      ) {
        await ref.update({ attempts: FieldValue.increment(1) });
        return 'неверный код';
      }
  
      return null;
    } catch (e) {
      console.error('[verifyCode]', e);
      return 'ошибка проверки кода';
    }
  }

async function consume(id){
    await otps.doc(id).delete();
}



module.exports = {issue, verifyCode, consume}