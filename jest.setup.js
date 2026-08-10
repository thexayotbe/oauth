/* global jest */

jest.mock('@react-native-firebase/auth', () => ({
  FacebookAuthProvider: { credential: jest.fn() },
  GoogleAuthProvider: { credential: jest.fn() },
  getAuth: jest.fn(() => ({ currentUser: null })),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
}));

jest.mock('react-native-fbsdk-next', () => ({
  AccessToken: { getCurrentAccessToken: jest.fn() },
  LoginManager: { logInWithPermissions: jest.fn(), logOut: jest.fn() },
  Settings: { setAdvertiserTrackingEnabled: jest.fn() },
}));
