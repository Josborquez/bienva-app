import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export function createPasswordAuth(client: SupabaseClient<Database>, redirectTo: string) {
  return {
    async signIn(email: string, password: string) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      return data;
    },
    async signUp(email: string, password: string) {
      const { data, error } = await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      return data;
    },
    async recover(email: string) {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
    },
    async update(password: string) {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },
  };
}
