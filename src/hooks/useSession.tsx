import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { completeAuthCallback } from '../api/auth';
import { getSupabase, isSupabaseConfigured } from '../api/supabase';
import { es } from '../i18n/es';

type AuthState = { session: Session | null; loading: boolean; callbackLoading: boolean; error: string | null };
const SessionContext = createContext<AuthState | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [callbackLoading, setCallbackLoading] = useState(false);
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
    updateRefresh(AppState.currentState);
    const listener = AppState.addEventListener('change', updateRefresh);
    return () => {
      active = false;
      listener.remove();
      subscription.unsubscribe();
      client.auth.stopAutoRefresh();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!url || !isSupabaseConfigured) return;
    let active = true;
    setCallbackLoading(true);
    setError(null);
    completeAuthCallback(url).catch(() => {
      if (active) setError(es.auth.callbackError);
    }).finally(() => {
      if (active) setCallbackLoading(false);
    });
    return () => { active = false; };
  }, [url]);

  return <SessionContext.Provider value={{ session, loading, callbackLoading, error }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession requires SessionProvider');
  return context;
}
