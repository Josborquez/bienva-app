import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TablesInsert } from '../types/database';
import type { MealDraft } from '../types/mealDraft';

export async function writeMealRecords(client: SupabaseClient<Database>, userId: string, draft: MealDraft, rows: TablesInsert<'meal_items'>[], finalize: boolean) {
  // Stable IDs make retries safe even after a lost response. Totals exclude the
  // meal until all its items have been written successfully.
  const { error: mealError } = await client.from('meals').upsert({
    id: draft.id, user_id: userId, fecha: draft.fecha, tipo: draft.tipo,
    origen: draft.origin ?? 'texto', nota: draft.origin && draft.origin !== 'texto' ? null : draft.text, es_borrador: true,
  });
  if (mealError) throw mealError;
  const { error: itemError } = await client.from('meal_items').upsert(rows);
  if (itemError) throw itemError;
  if (finalize) {
    const { data, error } = await client.from('meals').update({ es_borrador: false }).eq('id', draft.id).eq('user_id', userId).select('id').single();
    if (error || !data) throw error ?? new Error('Meal not saved');
  }
}
