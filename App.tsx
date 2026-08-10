import React, { useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import OtpScreen from './src/screens/OtpScreen';

type Step = 'auth' | 'otp' | 'done';

export default function App() {
  const [step, setStep] = useState<Step>('auth');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {step === 'auth' && <AuthScreen onSignedIn={() => setStep('otp')} />}
        {step === 'otp' && <OtpScreen onVerified={() => setStep('done')} />}
        {step === 'done' && <HomeScreen onSignedOut={() => setStep('auth')} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
