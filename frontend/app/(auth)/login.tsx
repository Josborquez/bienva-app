import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { sendMagicLink } from '../../src/api/auth';
import { isSupabaseConfigured } from '../../src/api/supabase';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { useSession } from '../../src/hooks/useSession';
import { es } from '../../src/i18n/es';
import { theme } from '../../src/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const submitting = useRef(false);
  const { error } = useSession();

  async function submit() {
    if (submitting.current || !isSupabaseConfigured) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setNotice(es.auth.invalidEmail);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setNotice(null);
    try {
      await sendMagicLink(email);
      setNotice(es.auth.sent);
    } catch (failure) {
      setNotice(typeof failure === 'object' && failure !== null && 'status' in failure && failure.status === 429 ? es.auth.rateLimit : es.auth.sendError);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>{es.brand}</Text>
        <Text style={styles.tagline}>{es.tagline}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{es.auth.title}</Text>
      <Text style={styles.copy}>{es.auth.description}</Text>
      <View style={styles.form}>
        <Text style={styles.label}>{es.auth.email}</Text>
        <TextInput accessibilityLabel={es.auth.email} placeholder={es.auth.placeholder} placeholderTextColor={theme.colors.muted}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          autoComplete="email" textContentType="emailAddress" returnKeyType="send" editable={!busy}
          onSubmitEditing={submit} style={styles.input} />
        <Button title={busy ? es.auth.sending : es.auth.send} busy={busy} disabled={!isSupabaseConfigured} onPress={submit} />
      </View>
      {!isSupabaseConfigured && <Text accessibilityRole="alert" style={styles.notice}>{es.auth.missingConfig}</Text>}
      {(notice || error) && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.notice}>{notice || error}</Text>}
    </Screen>
  );
}
const styles = StyleSheet.create({
  brandBlock: { gap: 8, marginBottom: 28 },
  brand: { fontSize: 48, letterSpacing: -2, fontWeight: '700', color: theme.colors.primary },
  tagline: { fontSize: 17, color: theme.colors.muted },
  title: { fontSize: 30, fontWeight: '600', color: theme.colors.text, letterSpacing: -0.6 },
  copy: { fontSize: 17, lineHeight: 25, color: theme.colors.muted },
  form: { gap: 12, marginTop: 12 },
  label: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  input: { minHeight: 56, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.control, padding: 16, backgroundColor: theme.colors.surface, fontSize: 17, color: theme.colors.text },
  notice: { color: theme.colors.text, fontSize: 16, lineHeight: 24, padding: 16, backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.control },
});
