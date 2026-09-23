import 'react-native-url-polyfill/auto';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { createSecureSessionStorage } from './secureSessionStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && key);
let client: SupabaseClient | undefined;

export function getSupabase() {
  if (!url || !key) throw new Error('Missing Supabase environment configuration');
  client ??= createClient(url, key, {
    auth: {
      storage: createSecureSessionStorage(SecureStore),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
      lock: processLock,
    },
  });
  return client;
}
