import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.ts';
import type { OnboardingDraft } from '../types/onboarding.ts';
import { parseWeightSuggestion, weightNumber } from '../utils/targetWeight.ts';

export async function suggestTargetWeight(client: SupabaseClient<Database>, draft: Pick<OnboardingDraft, 'height' | 'weight' | 'goal'>, signal?: AbortSignal) {
  if (!draft.goal) throw new Error('Missing goal');
  const query = client.rpc('suggest_target_weight', { p_altura_cm: weightNumber(draft.height), p_peso_kg: weightNumber(draft.weight), p_objetivo: draft.goal });
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return parseWeightSuggestion(data);
}
