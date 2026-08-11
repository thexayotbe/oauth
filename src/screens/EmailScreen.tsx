import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View,KeyboardAvoidingView, Platform } from 'react-native';
import { requestEmailCode, signInWithEmailCode } from '../auth/emailAuth';
import { sendEmailOtp, verifyEmailOtp } from '../api/otpApi';

type Props = { onSignedIn: () => void; onCancel: () => void };

export default function EmailScreen({ onSignedIn, onCancel }: Props) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coolDown, setCoolDown] = useState(0);

  
  useEffect(() => {
    if (coolDown <= 0) return;
    const t = setInterval(() => setCoolDown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [coolDown]);


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

  const send = async () => {
    if (!email.trim()) return setError('Введите email.');
    Keyboard.dismiss();
    setLoading(true);
    setError('');

    try{
      const result = await sendEmailOtp(email.trim());
      if(result.retryAfter){
        setCoolDown(result.retryAfter);
        setError(result.error ?? 'слишком мноого');
        return;
      }
      if (result.ok) {
        setSent(true);
        setCoolDown(60);
      }
      else setError(result.error ?? 'Не удалось отправить код.');
    }
    catch(actionError){
      setError(actionError instanceof Error ? actionError.message : 'Что-то пошло не так.');
    }
    finally{
      setLoading(false);
    }
  };

  const verify = () => {
    if (code.length !== 6) return setError('Введите 6-значный код.');
    return run(async () => {
      Keyboard.dismiss();
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      const result = await verifyEmailOtp(email.trim(), code);
      if (!result.ok) throw new Error(result.error ?? 'неверный код');

      onSignedIn();

    });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          {coolDown > 0 ? (
              <Text style={styles.link}>Повторить через {coolDown}с</Text>
            ) : (
              <TouchableOpacity disabled={loading} onPress={send}>
                <Text style={styles.link}>Отправить код ещё раз</Text>
              </TouchableOpacity>
            )}
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
    </KeyboardAvoidingView>
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
  flex: { flex: 1, backgroundColor: '#fff' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  label: { color: '#333', lineHeight: 21, marginBottom: 12 },
  input: { borderColor: '#bbb', borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 12 },
  button: { backgroundColor: '#0a7d33', borderRadius: 8, padding: 14 },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  link: { color: '#0088cc', marginTop: 16, textAlign: 'center' },
  error: { color: '#b00020', marginBottom: 12, textAlign: 'center' },
  spinner: { marginTop: 16 },
});
