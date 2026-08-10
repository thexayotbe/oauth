import React, { useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AuthScreen from './src/screens/AuthScreen';
import EmailScreen from './src/screens/EmailScreen';
import HomeScreen from './src/screens/HomeScreen';
import OtpScreen from './src/screens/OtpScreen';

type Step = 'auth' | 'email' | 'otp' | 'done';

export default function App() {
  const [step, setStep] = useState<Step>('auth');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {step === 'auth' && (
          <AuthScreen
            onEmailSelected={() => setStep('email')}
            onSignedIn={() => setStep('otp')}
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
});
