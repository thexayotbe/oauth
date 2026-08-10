import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { requestEmailCode, signInWithEmailCode } from '../auth/emailAuth';

type Props = { onSignedIn: () => void; onCancel: () => void };

export default function EmailScreen({ onSignedIn, onCancel }: Props) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async (action: () => Promise<void>) => {
    setLoading(true);
    setError('');
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Что-то пошло не так.');
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    if (!email.trim()) return setError('Введите email.');
    return run(async () => {
      await requestEmailCode(email.trim());
      setSent(true);
    });
  };

  const verify = () => {
    if (code.length !== 6) return setError('Введите 6-значный код.');
    return run(async () => {
      await signInWithEmailCode(email.trim(), code);
      onSignedIn();
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Вход по email</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!sent ? (
        <>
          <Text style={styles.label}>Введите email, и мы отправим на него 6-значный код.</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            style={styles.input}
            value={email}
          />
          <Button disabled={loading} label="Отправить код" onPress={send} />
        </>
      ) : (
        <>
          <Text style={styles.label}>Код отправлен на {email.trim()}. Проверьте почту.</Text>
          <TextInput
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setCode}
            placeholder="123456"
            style={styles.input}
            value={code}
          />
          <Button disabled={loading} label="Подтвердить" onPress={verify} />
          <TouchableOpacity
            disabled={loading}
            onPress={() => {
              setSent(false);
              setCode('');
              setError('');
            }}>
            <Text style={styles.link}>Изменить email</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity disabled={loading} onPress={onCancel}>
        <Text style={styles.link}>Другой способ входа</Text>
      </TouchableOpacity>
      {loading && <ActivityIndicator style={styles.spinner} />}
    </View>
  );
}

function Button({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  label: { color: '#333', lineHeight: 21, marginBottom: 12 },
  input: { borderColor: '#bbb', borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 12 },
  button: { backgroundColor: '#0a7d33', borderRadius: 8, padding: 14 },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  link: { color: '#0088cc', marginTop: 16, textAlign: 'center' },
  error: { color: '#b00020', marginBottom: 12, textAlign: 'center' },
  spinner: { marginTop: 16 },
});
