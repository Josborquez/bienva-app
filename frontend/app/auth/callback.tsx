import { Redirect, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useSession } from '../../src/hooks/useSession';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { es } from '../../src/i18n/es';
import { theme } from '../../src/theme';

export default function AuthCallbackScreen() {
  const { session, loading, callbackLoading, callbackProcessed, callbackTarget, error } = useSession();
  const router = useRouter();
  if (loading || callbackLoading || !callbackProcessed) return <LoadingScreen />;
  if (session && !error) return <Redirect href={callbackTarget} />;
  return <Screen><Text accessibilityRole="alert" style={{ color: theme.colors.text, fontSize: 17 }}>{error || es.auth.callbackError}</Text><Button title={es.auth.back} onPress={() => router.replace('/(auth)/login')} /></Screen>;
}
