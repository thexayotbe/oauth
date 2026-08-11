import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';
import { Platform } from 'react-native';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../config/authConfig';
import {
  assertSocialLoginAllowed,
  rethrowIfAccountExists,
} from './accountLinking';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
});

export async function signInWithGoogle() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Укажите GOOGLE_WEB_CLIENT_ID в src/config/authConfig.ts.');
  }

  if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) {
    throw new Error('Укажите GOOGLE_IOS_CLIENT_ID в src/config/authConfig.ts.');
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  const email = response.data?.user?.email;

  if (!idToken) {
    throw new Error('Google не вернул ID-токен.');
  }

  try {
    await assertSocialLoginAllowed(email);
  } catch (error) {
    try {
      await GoogleSignin.signOut();
    } catch {}
    throw error;
  }

  try {
    return await signInWithCredential(
      getAuth(),
      GoogleAuthProvider.credential(idToken),
    );
  } catch (error) {
    await rethrowIfAccountExists(error);
  }
}
