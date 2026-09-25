import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { sessionStorage } from './sessionStorage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(url && key);
let client: SupabaseClient<Database> | undefined;

export function getSupabase() {
  if (!url || !key) throw new Error('Missing Supabase environment configuration');
  client ??= createClient<Database>(url, key, {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  });
  return client;
}
