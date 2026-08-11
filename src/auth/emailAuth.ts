import { sendEmailOtp, verifyEmailOtp } from '../api/otpApi';
import { getAuth, signInWithCustomToken } from '@react-native-firebase/auth';

export async function requestEmailCode(email: string) {
  const result = await sendEmailOtp(email);
  if (!result.ok) {
    throw new Error(result.error ?? 'Не удалось отправить код.');
  }
}

export async function signInWithEmailCode(email: string, code: string) {
  const result = await verifyEmailOtp(email, code);
  if (!result.ok) {
    throw new Error(result.error ?? 'Неверный код.');
  }
  if(!result.firebaseToken){
    throw new Error('сервер не вернул токен).');
  }

  return signInWithCustomToken(getAuth(), result.firebaseToken);

}
