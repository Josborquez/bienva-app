import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { passwordAuth } from '../../src/api/auth';
import { authErrorKey, newPasswordError } from '../../src/utils/authValidation';
import { useSession } from '../../src/hooks/useSession';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { es } from '../../src/i18n/es';
import { theme } from '../../src/theme';

export default function PasswordScreen() {
  const { session, loading } = useSession();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  async function save() {
    if (!session || submitting.current) return;
    const invalid = newPasswordError(password, confirmation);
    if (invalid) { setError(es.auth[invalid]); return; }
    submitting.current = true; setBusy(true); setError(null);
    try {
      await passwordAuth().update(password);
      setPassword(''); setConfirmation(''); setSaved(true);
    } catch (failure) { setError(es.auth[authErrorKey(failure, 'updateError')]); }
    finally { submitting.current = false; setBusy(false); }
  }
  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Screen>
    <Text accessibilityRole="header" style={styles.title}>{es.auth.passwordTitle}</Text>
    {saved ? <><Text accessibilityRole="alert" style={styles.copy}>{es.auth.passwordSaved}</Text><Button title={es.auth.continue} onPress={() => router.replace('/')} /></> : <>
      <Text style={styles.copy}>{es.auth.passwordHint}</Text>
      <Text style={styles.label}>{es.auth.password}</Text>
      <TextInput accessibilityLabel={es.auth.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" autoCapitalize="none" autoCorrect={false} editable={!busy} style={styles.input} />
      <Text style={styles.label}>{es.auth.confirmPassword}</Text>
      <TextInput accessibilityLabel={es.auth.confirmPassword} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" textContentType="newPassword" autoCapitalize="none" autoCorrect={false} editable={!busy} style={styles.input} returnKeyType="go" onSubmitEditing={save} />
      <Button title={es.auth.savePassword} busy={busy} onPress={save} />
      {error && <Text accessibilityRole="alert" style={styles.copy}>{error}</Text>}
      <Button secondary title={es.register.back} disabled={busy} onPress={() => router.replace('/')} />
    </>}
  </Screen>;
}
const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 30, fontWeight: '600' },
  copy: { color: theme.colors.muted, fontSize: 16, lineHeight: 24 },
  label: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  input: { minHeight: 56, padding: 16, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, color: theme.colors.text, backgroundColor: theme.colors.surface, fontSize: 17 },
});
