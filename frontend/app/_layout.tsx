import { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../src/hooks/useSession';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { theme } from '../src/theme';

function Routes() {
  const { session, loading } = useSession();
  if (loading) return <LoadingScreen />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Protected guard={Boolean(session)}><Stack.Screen name="(tabs)" /></Stack.Protected>
      <Stack.Protected guard={!session}><Stack.Screen name="(auth)/login" /></Stack.Protected>
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><SessionProvider><StatusBar style="dark" /><Routes /></SessionProvider></QueryClientProvider></SafeAreaProvider>;
}
