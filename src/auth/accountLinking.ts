import {
  fetchSignInMethodsForEmail,
  getAuth,
} from '@react-native-firebase/auth';
import { checkEmailAccount } from '../api/otpApi';

type AuthLikeError = {
  code?: string;
  email?: string;
  message?: string;
};

function messageForMethods(methods: string[]) {
  if (methods.includes('google.com')) {
    return 'этот email уже зарегистрирован через google';
  }
  if (methods.includes('facebook.com')) {
    return 'этот email уже зарегистрирован через facebook';
  }
  return 'этот email уже зарегистрирован';
}

export async function assertSocialLoginAllowed(email: string | null | undefined) {
  if (!email) return;

  const result = await checkEmailAccount(email);
  if (!result.ok) {
    throw new Error(result.error ?? 'Не удалось проверить email.');
  }
  if (result.exists && result.kind === 'email') {
    throw new Error(
      'этот email уже зарегистрирован через email..',
    );
  }
}
export async function rethrowIfAccountExists(error: unknown): Promise<never> {
  const err = error as AuthLikeError;
  const code = err?.code ?? '';

  if (
    code !== 'auth/account-exists-with-different-credential' &&
    code !== 'auth/email-already-in-use' &&
    code !== 'auth/credential-already-in-use'
  ) {
    throw error instanceof Error ? error : new Error(String(err?.message ?? error));
  }

  let methods: string[] = [];
  if (err.email) {
    try {
      methods = await fetchSignInMethodsForEmail(getAuth(), err.email);
    } catch {
      methods = [];
    }
  }

  throw new Error(messageForMethods(methods));
}
