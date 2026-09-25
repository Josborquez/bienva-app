import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.ts';
import type { OnboardingDraft } from '../types/onboarding.ts';
import { onboardingArgs } from '../utils/onboarding.ts';
import { suggestTargetWeight } from './targetWeight.ts';
import { belowSuggestedMinimum, TargetWeightMinimumError } from '../utils/targetWeight.ts';

export function onboardingApi(client: SupabaseClient<Database>) {
  async function validateTarget(draft: OnboardingDraft) {
    if (draft.goal === 'mantener') return;
    const suggestion = await suggestTargetWeight(client, draft);
    if (belowSuggestedMinimum(draft.target, suggestion)) throw new TargetWeightMinimumError(suggestion.peso_min_saludable);
  }
  return {
    async preview(draft: OnboardingDraft) {
      const { p_nombre, p_hora_registro, p_peso_objetivo_kg, ...args } = onboardingArgs(draft);
      await validateTarget(draft);
      const { data, error } = await client.rpc('compute_targets', args);
      if (error) throw error;
      const plan = data?.[0];
      const fields = ['bmr', 'tdee', 'kcal_objetivo', 'kcal_min', 'kcal_max', 'prot_min', 'prot_max'] as const;
      if (!plan || !fields.every(field => typeof plan[field] === 'number' && Number.isFinite(plan[field])) || plan.kcal_min < (draft.sex === 'hombre' ? 1500 : 1200) || plan.kcal_min > plan.kcal_objetivo || plan.kcal_max < plan.kcal_objetivo || plan.prot_min < 0 || plan.prot_max < plan.prot_min) throw new Error('Invalid plan');
      return plan;
    },
    async complete(draft: OnboardingDraft, userId: string) {
      onboardingArgs(draft);
      await validateTarget(draft);
      const { data, error } = await client.rpc('complete_onboarding', onboardingArgs(draft));
      if (error) throw error;
      if (!data || data.id !== userId || !data.onboarding_completo) throw new Error('Incomplete onboarding');
      return data;
    },
  };
}
