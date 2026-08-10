import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { signOutEverywhere } from '../auth/signOut';

type Props = { onSignedOut: () => void };

export default function HomeScreen({ onSignedOut }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const logOut = async () => {
    setLoading(true);
    setError('');
    try {
      await signOutEverywhere();
      onSignedOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Не удалось выйти.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вы полностью авторизованы</Text>
      <Text style={styles.subtitle}>Вход через провайдера и подтверждение номера завершены.</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator style={styles.spinner} />}
      <TouchableOpacity
        disabled={loading}
        onPress={logOut}
        style={[styles.button, loading && styles.disabled]}>
        <Text style={styles.buttonText}>Выйти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#555', marginBottom: 24, textAlign: 'center' },
  button: { backgroundColor: '#b00020', borderRadius: 8, paddingHorizontal: 32, paddingVertical: 14 },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  error: { color: '#b00020', marginBottom: 12, textAlign: 'center' },
  spinner: { marginBottom: 12 },
});
