const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'otp.db'));


const db = new Database(path.join(__dirname, 'otp.db'));
db.pragma('journal_mode = WAL');
db.exec(`
    CREATE TABLE IF NOT EXISTS otps (
        id         TEXT PRIMARY KEY,
        code_hash  BLOB NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts   INTEGER NOT NULL DEFAULT 0
    )
`);




const LIFE_T = 5 * 60 * 1000
const MAX_ATTEMPTS = 5;


function hashCode(code){
    return crypto.createHmac('sha256', process.env.OTP_SECRET).update(code).digest();
}


function issue(id){
    const code = String(crypto.randomInt(100000, 999999));

    db.prepare('INSERT INTO otps (id, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)').run(id, hashCode(code), Date.now() + LIFE_T);

    return code;
}



function verifyCode(id, code){
    const row = db.prepare('SELECT * FROM otp WHERE id = ?').get(id);


    if(!row || row.expires_at < Date.now()){
        db.prepare('DELETE FROM otps WHERE id = ?').run(id);
        return "код истек"
    }

    if (row.attempts >= MAX_ATTEMPTS){
        db.prepare('DELETE FROM otps WHERE id = ?').run(id);
        return "много попыток"
    }

    if(!crypto.timingSafeEqual(row.code_hash, hashCode(code))){
        db.prepare('UPDATE otps SET attempts = attempts + 1 where id = ?').run(id);
        return "неверный код"
    }
    return null
}

function consume(id){
    db.prepare('DELETE FROM otps WHERE id = ?').run(id);
}

function purgeExpired(){
    db.prepare('DELETE FROM otps WHERE expires_at < ?').run(Date.now());
}

module.exports = {issue, verifyCode, consume, purgeExpired}