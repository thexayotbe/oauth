import { OTP_SERVER_URL } from '../config/authConfig';

type OtpResponse = { ok: boolean; error?: string, firebaseToken?: string};

async function post(path: string, body: Record<string, string>): Promise<OtpResponse> {
  let response: Response;
  try {
    response = await fetch(`${OTP_SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Сервер недоступен. Проверьте адрес и что он запущен.');
  }

  const data = (await response.json().catch(() => ({}))) as OtpResponse;
  if (!response.ok && !data.error) {
    data.error = 'Сервер отклонил запрос.';
  }
  return data;
}

export function sendOtp(phone: string) {
  return post('/send-otp', { phone });
}

export function verifyOtp(phone: string, code: string) {
  return post('/verify-otp', { phone, code });
}

export function sendEmailOtp(email: string) {
  return post('/send-email-otp', { email });
}

export function verifyEmailOtp(email: string, code: string) {
  return post('/verify-email-otp', { email, code });
}
