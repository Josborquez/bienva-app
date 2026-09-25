import { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../src/hooks/useSession';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { theme } from '../src/theme';
import { useProfile } from '../src/hooks/useProfile';

function Routes() {
  const { session, loading } = useSession();
  const profile = useProfile(session?.user.id ?? '');
  if (loading) return <LoadingScreen />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Protected guard={profile.data?.onboarding_completo === true}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="registrar" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={profile.data?.onboarding_completo !== true}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Screen name="auth/password" />
      </Stack.Protected>
      <Stack.Protected guard={!session}><Stack.Screen name="(auth)/login" /></Stack.Protected>
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><SessionProvider><StatusBar style="dark" /><Routes /></SessionProvider></QueryClientProvider></SafeAreaProvider>;
}
