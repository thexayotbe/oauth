const path = require('path');
const {initializeApp, cert} = require('firebase-admin/app');

const {getAuth} = require('firebase-admin/auth');

initializeApp({credential: cert(require(path.join(__dirname, 'serviceAccount.json')))});


const auth = getAuth();


async function requireAuth(req, res, next){
    const header = req.headers.authorization ?? '';
    const idToken =  header.startsWith('Bearer ') ? header.slice(7): null;

    if(!idToken) return res.status(401).json({ok: false, error: 'не авторизован'});


    try{
        req.user = await auth.verifyIdToken(idToken)
        next();
    }
    catch(e) {
        res.status(401).json({ok: false, error: 'сесия закончилась войдите снова'});
    }
}

module.exports = {auth, requireAuth}