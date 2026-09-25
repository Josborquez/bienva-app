import type { OnboardingDraft, WeightSuggestion } from '../types/onboarding.ts';

export const weightNumber = (value: string) => /^\d+(?:[.,]\d)?$/.test(value.trim()) ? Number(value.trim().replace(',', '.')) : NaN;
export const weightLabel = (value: number) => value.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export function belowSuggestedMinimum(target: string, suggestion: WeightSuggestion) {
  return weightNumber(target) < suggestion.peso_min_saludable;
}
export function stepTargetWeight(value: string, delta: -0.5 | 0.5, fallback: number) {
  const current = weightNumber(value);
  return weightLabel(Math.max(0, Math.round(((Number.isFinite(current) ? current : fallback) + delta) * 10) / 10));
}
export function arrivalDate(draft: Pick<OnboardingDraft, 'weight' | 'target' | 'pace'>, now = new Date()) {
  const weeks = Math.abs(weightNumber(draft.weight) - weightNumber(draft.target)) / draft.pace;
  if (!Number.isFinite(weeks) || draft.pace <= 0) return null;
  const arrival = new Date(now);
  arrival.setDate(arrival.getDate() + Math.ceil(weeks * 7));
  return arrival;
}
// Preload the suggestion the first time, or when height/weight/goal changed since
// the last one. Otherwise keep what the user chose (revisits, restored drafts).
export function shouldPreloadTarget(currentTarget: string, lastKey: string | null, key: string) {
  return !currentTarget.trim() || (lastKey !== null && lastKey !== key);
}
export function arrivalLabel(date: Date, months: readonly string[]) {
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}
export function onboardingStep(step: number, direction: -1 | 1, goal: OnboardingDraft['goal']) {
  const next = step + direction;
  return next === 5 && goal === 'mantener' ? next + direction : Math.max(1, Math.min(7, next));
}
export function parseWeightSuggestion(data: unknown): WeightSuggestion {
  const row = (Array.isArray(data) ? data[0] : data) as WeightSuggestion | null;
  if (!row || ![row.peso_sugerido, row.peso_min_saludable, row.peso_max_saludable].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0)
    || row.peso_min_saludable > row.peso_max_saludable || (row.nota !== null && typeof row.nota !== 'string')) throw new Error('Invalid weight suggestion');
  // Only expose the requested fields; internal measurements never reach the view.
  return { peso_sugerido: row.peso_sugerido, peso_min_saludable: row.peso_min_saludable, peso_max_saludable: row.peso_max_saludable,
    nota: row.nota };
}
export const hasInternalMetric = (note: string) => /\bimc\b|índice de masa corporal/i.test(note);
export class TargetWeightMinimumError extends Error {
  minimum: number;
  constructor(minimum: number) { super('Target below suggested minimum'); this.minimum = minimum; }
}
