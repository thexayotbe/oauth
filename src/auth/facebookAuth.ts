import { AccessToken, LoginManager, Settings } from 'react-native-fbsdk-next';
import {
  FacebookAuthProvider,
  getAuth,
  signInWithCredential,
} from '@react-native-firebase/auth';

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

  return signInWithCredential(
    getAuth(),
    FacebookAuthProvider.credential(accessToken.accessToken),
  );
}
