import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { completeAuthCallback, getAuthRedirectUrl } from '../api/auth';
import { authCallbackTarget } from '../api/authCallback';
import { getSupabase, isSupabaseConfigured } from '../api/supabase';
import { es } from '../i18n/es';

type AuthState = { session: Session | null; loading: boolean; callbackLoading: boolean; callbackProcessed: boolean; callbackTarget: '/' | '/auth/password'; error: string | null };
const SessionContext = createContext<AuthState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [callbackTarget, setCallbackTarget] = useState<'/' | '/auth/password'>('/');
  const [error, setError] = useState<string | null>(null);
  const url = Linking.useURL();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = getSupabase();
    let active = true;
    let authEventReceived = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      authEventReceived = true;
      setSession(next);
      setLoading(false);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authEventReceived) return;
      if (sessionError) setError(es.auth.restoringError);
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError(es.auth.restoringError);
      setLoading(false);
    });
    const updateRefresh = (state: string) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    // Supabase manages visibility and recovery itself in browsers. Calling
    // start/stopAutoRefresh there removes its built-in visibility listener.
    const listener = Platform.OS !== 'web'
      ? AppState.addEventListener('change', updateRefresh)
      : undefined;
    if (Platform.OS !== 'web') updateRefresh(AppState.currentState);
    return () => {
      active = false;
      listener?.remove();
      subscription.unsubscribe();
      if (Platform.OS !== 'web') client.auth.stopAutoRefresh();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!url || !isSupabaseConfigured) return;
    let active = true;
    setCallbackLoading(true);
    setError(null);
    completeAuthCallback(url).then(() => {
      if (active) setCallbackTarget(authCallbackTarget(url, getAuthRedirectUrl()));
    }).catch(() => {
      if (active) setError(es.auth.callbackError);
    }).finally(() => {
      if (active) { setProcessedUrl(url); setCallbackLoading(false); }
    });
    return () => { active = false; };
  }, [url]);

  return <SessionContext.Provider value={{ session, loading, callbackLoading: callbackLoading || Boolean(url && url !== processedUrl), callbackProcessed: Boolean(processedUrl && processedUrl === url), callbackTarget, error }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession requires SessionProvider');
  return context;
}
