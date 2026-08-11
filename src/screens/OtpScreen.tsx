import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sendOtp, verifyOtp } from '../api/otpApi';
import { getAuth, getIdTokenResult } from '@react-native-firebase/auth';
type Props = { onVerified: () => void };

export default function OtpScreen({ onVerified }: Props) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!phone.trim()) return setError('Введите номер телефона.');
    setLoading(true); setError('');
    try {
      const result = await sendOtp(phone.trim());
      if (result.ok) setSent(true); else setError(result.error ?? 'Не удалось отправить код.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось отправить код.');
    } finally { setLoading(false); }
  };

  const verify = async () => {
    if (code.length !== 6) return setError('Введите 6-значный код.');
    setLoading(true); setError('');
    try {
      const result = await verifyOtp(phone.trim(), code);
      if (!result.ok) {
        setError(result.error ?? 'Неверный код.');
        return;
      }
      await getIdTokenResult(getAuth().currentUser!, true);
      onVerified()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось проверить код.');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Подтверждение номера</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!sent ? <>
        <Text style={styles.label}>Отправьте боту в Telegram команду /start и поделитесь номером. Затем введите его здесь.</Text>
        <TextInput autoCapitalize="none" keyboardType="phone-pad" onChangeText={setPhone} placeholder="+998 90 123 45 67" style={styles.input} value={phone} />
        <Button disabled={loading} label="Отправить код" onPress={send} />
      </> : <>
        <Text style={styles.label}>Введите 6-значный код, отправленный в Telegram.</Text>
        <TextInput keyboardType="number-pad" maxLength={6} onChangeText={setCode} placeholder="123456" style={styles.input} value={code} />
        <Button disabled={loading} label="Подтвердить" onPress={verify} />
        <TouchableOpacity disabled={loading} onPress={() => { setSent(false); setCode(''); setError(''); }}>
          <Text style={styles.link}>Изменить номер</Text>
        </TouchableOpacity>
      </>}
      {loading && <ActivityIndicator style={styles.spinner} />}
    </View>
  );
}

function Button({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  label: { color: '#333', lineHeight: 21, marginBottom: 12 },
  input: { borderColor: '#bbb', borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 12 },
  button: { backgroundColor: '#0088cc', borderRadius: 8, padding: 14 },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  link: { color: '#0088cc', marginTop: 16, textAlign: 'center' },
  error: { color: '#b00020', marginBottom: 12, textAlign: 'center' },
  spinner: { marginTop: 16 },
});
