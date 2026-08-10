import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { signInWithFacebook } from '../auth/facebookAuth';
import { signInWithGoogle } from '../auth/googleAuth';

type Props = { onSignedIn: () => void };

function messageFrom(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Не удалось войти. Попробуйте снова.';
  }

  const code = (error as { code?: string }).code;
  return code ? `${error.message} (${code})` : error.message;
}

export default function AuthScreen({ onSignedIn }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async (provider: () => Promise<unknown>) => {
    setLoading(true);
    setError('');
    try {
      await provider();
      onSignedIn();
    } catch (signInError) {
      setError(messageFrom(signInError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вход</Text>
      <Text style={styles.subtitle}>Выберите способ входа, чтобы продолжить.</Text>
      {loading && <ActivityIndicator style={styles.spinner} />}
      {!!error && <Text selectable style={styles.error}>{error}</Text>}
      <TouchableOpacity disabled={loading} style={styles.button} onPress={() => signIn(signInWithGoogle)}>
        <Text style={styles.buttonText}>Продолжить с Google</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={loading} style={[styles.button, styles.facebook]} onPress={() => signIn(signInWithFacebook)}>
        <Text style={styles.buttonText}>Продолжить с Facebook</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#555', marginBottom: 24, textAlign: 'center' },
  spinner: { marginBottom: 12 },
  button: { backgroundColor: '#4285F4', borderRadius: 8, marginBottom: 12, padding: 14 },
  facebook: { backgroundColor: '#1877F2' },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  error: { color: '#b00020', marginBottom: 12, textAlign: 'center' },
});
