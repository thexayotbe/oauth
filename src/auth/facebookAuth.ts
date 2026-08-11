import { AccessToken, LoginManager, Settings } from 'react-native-fbsdk-next';
import {
  FacebookAuthProvider,
  getAuth,
  signInWithCredential,
} from '@react-native-firebase/auth';
import { rethrowIfAccountExists } from './accountLinking';

export async function signInWithFacebook() {
  await Settings.setAdvertiserTrackingEnabled(true);

  LoginManager.logOut();

  const result = await LoginManager.logInWithPermissions(
    ['public_profile'],
    'enabled',
  );

  if (result.isCancelled) {
    throw new Error('Вход через Facebook отменён.');
  }

  const accessToken = await AccessToken.getCurrentAccessToken();
  if (!accessToken) {
    throw new Error('Facebook не вернул токен доступа.');
  }

  try {
    return await signInWithCredential(
      getAuth(),
      FacebookAuthProvider.credential(accessToken.accessToken),
    );
  } catch (error) {
    await rethrowIfAccountExists(error);
  }
}
