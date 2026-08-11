import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, StyleSheet ,ActivityIndicator, View} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AuthScreen from './src/screens/AuthScreen';
import EmailScreen from './src/screens/EmailScreen';
import HomeScreen from './src/screens/HomeScreen';
import OtpScreen from './src/screens/OtpScreen';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { OTP_SERVER_URL } from './src/config/authConfig';

type Step = 'auth' | 'email' | 'otp' | 'done';

async function fetchIsActive(user: { getIdToken: () => Promise<string> }) {
  try {
    const token = await user.getIdToken();
    const res = await fetch(`${OTP_SERVER_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return !!data.isActive;
  } catch {
    return false;
  }
}

export default function App() {
  const [step, setStep] = useState<Step>('auth');
  const [ready, setReady] = useState(false);
  const booted = useRef(false);

useEffect(() => {
  const unsub = onAuthStateChanged(getAuth(), async user => {
    if (!user) {
      setStep('auth');
      setReady(true);
      booted.current = true;
      return;
    }
    if (!booted.current) {
      booted.current = true;
      setStep((await fetchIsActive(user)) ? 'done' : 'otp');
      setReady(true);
      return;
    }
    setReady(true);
  });
  return unsub;
}, []);


  if (!ready) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {step === 'auth' && (
          <AuthScreen
            onEmailSelected={() => setStep('email')}
            onSignedIn={active => setStep(active ? 'done' : 'otp')}
          />
        )}
        {step === 'email' && (
          <EmailScreen onCancel={() => setStep('auth')} onSignedIn={() => setStep('done')} />
        )}
        {step === 'otp' && <OtpScreen onVerified={() => setStep('done')} />}
        {step === 'done' && <HomeScreen onSignedOut={() => setStep('auth')} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: {justifyContent: 'center', alignItems: 'center'},
});
