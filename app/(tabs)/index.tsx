import { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { signOut } from '../../src/api/auth';
import { es } from '../../src/i18n/es';
import { theme } from '../../src/theme';

// P1 landing only: no P2 meal functionality before the physical-device test.
export default function TodayPlaceholder() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function leave() {
    setBusy(true);
    setError(false);
    try { await signOut(); } catch { setError(true); } finally { setBusy(false); }
  }
  return <Screen>
    <Text accessibilityRole="header" style={{ fontSize: 32, fontWeight: '600', color: theme.colors.text }}>{es.today.title}</Text>
    <Text style={{ fontSize: 22, color: theme.colors.primary }}>{es.today.welcome}</Text>
    <Text style={{ fontSize: 17, lineHeight: 25, color: theme.colors.muted }}>{es.today.pending}</Text>
    <Button title={es.auth.signOut} onPress={leave} busy={busy} />
    {error && <Text accessibilityRole="alert" style={{ color: theme.colors.amber }}>{es.auth.signOutError}</Text>}
  </Screen>;
}
