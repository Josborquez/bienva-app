import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { MealType } from '../types/domain';

export async function getFrequentFoods(client: SupabaseClient<Database>, userId: string, type: MealType, signal: AbortSignal) {
  const { data, error } = await client.from('frequent_items').select('*').eq('user_id', userId).eq('tipo', type)
    .order('veces', { ascending: false }).order('nombre').limit(40).abortSignal(signal);
  if (error) throw error;
  return data;
}
export async function searchFoods(client: SupabaseClient<Database>, query: string, signal: AbortSignal) {
  if (query.trim().length < 2) return [];
  const { data, error } = await client.rpc('search_foods', { q: query.trim(), lim: 20 }).abortSignal(signal);
  if (error) throw error;
  return data;
}
