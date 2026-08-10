import { getAuth, signOut as firebaseSignOut } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager } from 'react-native-fbsdk-next';

export async function signOutEverywhere() {
  LoginManager.logOut();

  try {
    await GoogleSignin.signOut();
  } catch {}

  const auth = getAuth();
  if (auth.currentUser) {
    await firebaseSignOut(auth);
  }
}
