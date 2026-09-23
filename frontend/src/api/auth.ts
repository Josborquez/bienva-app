import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import { getSupabase } from './supabase';
import { parseAuthCallback } from './authCallback';

export function getAuthRedirectUrl() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? Linking.createURL('auth/callback')
    : 'bienva://auth/callback';
}

export async function sendMagicLink(email: string) {
  const { error } = await getSupabase().auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: getAuthRedirectUrl() },
  });
  if (error) throw error;
}

let lastCompletedUrl: string | null = null;
let inFlight: { url: string; promise: Promise<boolean> } | null = null;

export async function completeAuthCallback(url: string): Promise<boolean> {
  if (lastCompletedUrl === url) return true;
  if (inFlight?.url === url) return inFlight.promise;
  const credentials = parseAuthCallback(url, getAuthRedirectUrl());
  if (!credentials) return false;
  const promise = (async () => {
    const { error } = 'code' in credentials
      ? await getSupabase().auth.exchangeCodeForSession(credentials.code)
      : await getSupabase().auth.setSession(credentials);
    if (error) throw error;
    lastCompletedUrl = url;
    return true;
  })();
  inFlight = { url, promise };
  try { return await promise; }
  finally { if (inFlight?.promise === promise) inFlight = null; }
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut({ scope: 'local' });
  if (error) throw error;
  lastCompletedUrl = null;
}
