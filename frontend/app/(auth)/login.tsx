import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { passwordAuth, sendMagicLink } from '../../src/api/auth';
import { isSupabaseConfigured } from '../../src/api/supabase';
import { authErrorKey, newPasswordError, validEmail } from '../../src/utils/authValidation';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { useSession } from '../../src/hooks/useSession';
import { es } from '../../src/i18n/es';
import { theme } from '../../src/theme';

type Mode = 'login' | 'signup' | 'recovery';
export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const submitting = useRef(false);
  const { error } = useSession();
  function changeMode(next: Mode) {
    if (submitting.current) return;
    setMode(next); setPassword(''); setConfirmation(''); setNotice(null);
  }
  async function submit(magic = false) {
    if (submitting.current || !isSupabaseConfigured) return;
    if (!validEmail(email)) { setNotice(es.auth.invalidEmail); return; }
    if (!magic && mode === 'login' && !password) { setNotice(es.auth.passwordRequired); return; }
    if (!magic && mode === 'signup') {
      const validation = newPasswordError(password, confirmation);
      if (validation) { setNotice(es.auth[validation]); return; }
    }
    submitting.current = true; setBusy(true); setNotice(null);
    try {
      if (magic) { await sendMagicLink(email); setNotice(es.auth.sent); }
      else if (mode === 'recovery') { await passwordAuth().recover(email); setNotice(es.auth.recoverySent); }
      else if (mode === 'signup') {
        const data = await passwordAuth().signUp(email, password);
        if (!data.session) setNotice(es.auth.signupSent);
      } else { await passwordAuth().signIn(email, password); }
      setPassword(''); setConfirmation('');
    } catch (failure) {
      const fallback = magic || mode === 'recovery' ? 'sendError' : mode === 'signup' ? 'signupError' : 'loginError';
      setNotice(es.auth[authErrorKey(failure, fallback)]);
    } finally { submitting.current = false; setBusy(false); }
  }
  const title = mode === 'login' ? es.auth.title : mode === 'signup' ? es.auth.signupTitle : es.auth.recoveryTitle;
  const description = mode === 'login' ? es.auth.description : mode === 'signup' ? es.auth.signupDescription : es.auth.recoveryDescription;
  const action = mode === 'login' ? es.auth.signIn : mode === 'signup' ? es.auth.createAccount : es.auth.recoverySend;
  return <Screen>
    <View style={styles.brandBlock}><Text style={styles.brand}>{es.brand}</Text><Text style={styles.copy}>{es.tagline}</Text></View>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.copy}>{description}</Text>
    <View style={styles.form}>
      <Text style={styles.label}>{es.auth.email}</Text>
      <TextInput accessibilityLabel={es.auth.email} placeholder={es.auth.placeholder} placeholderTextColor={theme.colors.muted} value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!busy} style={styles.input}
        returnKeyType={mode === 'recovery' ? 'send' : 'next'} onSubmitEditing={mode === 'recovery' ? () => submit() : undefined} />
      {mode !== 'recovery' && <>
        <Text style={styles.label}>{es.auth.password}</Text>
        <TextInput key={mode} accessibilityLabel={es.auth.password} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'} editable={!busy} style={styles.input}
          returnKeyType={mode === 'signup' ? 'next' : 'go'} onSubmitEditing={mode === 'login' ? () => submit() : undefined} />
      </>}
      {mode === 'signup' && <>
        <Text style={styles.label}>{es.auth.confirmPassword}</Text>
        <TextInput accessibilityLabel={es.auth.confirmPassword} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" autoCorrect={false}
          autoComplete="new-password" textContentType="newPassword" editable={!busy} style={styles.input} returnKeyType="go" onSubmitEditing={() => submit()} />
      </>}
      <Button title={action} busy={busy} disabled={!isSupabaseConfigured} onPress={() => submit()} />
      {mode === 'login' && <>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => changeMode('recovery')} style={styles.link}><Text style={styles.linkText}>{es.auth.forgot}</Text></Pressable>
        <Button secondary title={es.auth.send} disabled={busy || !isSupabaseConfigured} onPress={() => submit(true)} />
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => changeMode('signup')} style={styles.link}><Text style={styles.linkText}>{es.auth.createAccount}</Text></Pressable>
        <Text style={styles.hint}>{es.auth.existingMagic}</Text>
      </>}
      {mode !== 'login' && <Button secondary title={es.auth.backToLogin} disabled={busy} onPress={() => changeMode('login')} />}
    </View>
    {!isSupabaseConfigured && <Text accessibilityRole="alert" style={styles.notice}>{es.auth.missingConfig}</Text>}
    {(notice || error) && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.notice}>{notice || error}</Text>}
  </Screen>;
}
const styles = StyleSheet.create({
  brandBlock: { gap: 8, marginBottom: 12 },
  brand: { fontSize: 48, letterSpacing: -2, fontWeight: '700', color: theme.colors.primary },
  title: { fontSize: 30, fontWeight: '600', color: theme.colors.text, letterSpacing: -0.6 },
  copy: { fontSize: 17, lineHeight: 25, color: theme.colors.muted },
  form: { gap: 12, marginTop: 12 },
  label: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  input: { minHeight: 56, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.control, padding: 16, backgroundColor: theme.colors.surface, fontSize: 17, color: theme.colors.text },
  notice: { color: theme.colors.text, fontSize: 16, lineHeight: 24, padding: 16, backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.control },
  link: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  linkText: { color: theme.colors.primary, fontSize: 16, fontWeight: '600' },
  hint: { color: theme.colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
