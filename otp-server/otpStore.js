const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const crypto = require('crypto');
require('./firebase');

const otps = getFirestore().collection('otps');



const LIFE_T = 5 * 60 * 1000
const MAX_ATTEMPTS = 5;


function hashCode(code){
    return crypto.createHmac('sha256', process.env.OTP_SECRET).update(code).digest();
}


async function issue(id){
    const code = String(crypto.randomInt(100000, 1000000));

   await otps.doc(id).set({
    codeHash: hashCode(code),
    expiresAt: Date.now() + LIFE_T,
    attempts: 0,
    lastSentAt: Date.now()
   })

    return code;
}



async function verifyCode(id, code){

    const ref = otps.doc(id);
    const snap = await ref.get();

    if(!snap.exists || snap.data().expiresAt < Date.now()){
        await ref.delete();
        return "код истек";
    }
    const row = snap.data();

    if (row.attempts >= MAX_ATTEMPTS){
        await ref.delete();
        return "много попыток";
    }

    if(!crypto.timingSafeEqual(row.codeHash, hashCode(code))){
        await ref.update({attempts: FieldValue.increment(1)});
        return "неверный код";
    }
    return null;
}

async function consume(id){
    await otps.doc(id).delete();
}



module.exports = {issue, verifyCode, consume}