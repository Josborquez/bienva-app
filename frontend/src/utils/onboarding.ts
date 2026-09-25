import type { CompleteArgs, OnboardingDraft, Targets } from '../types/onboarding.ts';

const amount = (text: string) => /^\d+(?:[.,]\d)?$/.test(text.trim()) ? Number(text.trim().replace(',', '.')) : NaN;
export function stepError(step: number, draft: OnboardingDraft, now = new Date()): string | null {
  if (step === 1 && (!draft.name.trim() || draft.name.trim().length > 80)) return 'nameError';
  if (step === 2 && !['bajar', 'mantener', 'subir'].includes(draft.goal)) return 'goalError';
  if (step === 3) {
    if (!['hombre', 'mujer'].includes(draft.sex)) return 'sexError';
    const date = new Date(`${draft.birth}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birth) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.birth || date > now || date.getUTCFullYear() < now.getFullYear() - 120) return 'birthError';
    const birthdayPassed = now.getMonth() > date.getUTCMonth() || (now.getMonth() === date.getUTCMonth() && now.getDate() >= date.getUTCDate());
    const age = now.getFullYear() - date.getUTCFullYear() - (birthdayPassed ? 0 : 1);
    if (age < 16 || age > 100) return 'ageError';
  }
  if (step === 4) {
    if (!(amount(draft.height) >= 100 && amount(draft.height) <= 250)) return 'heightError';
    if (!(amount(draft.weight) >= 30 && amount(draft.weight) <= 300)) return 'weightError';
  }
  if (step === 5 && draft.goal !== 'mantener') {
    const target = amount(draft.target), weight = amount(draft.weight);
    if (!(target >= 30 && target <= 300)) return 'targetError';
    if (draft.goal === 'bajar' ? target >= weight : target <= weight) return 'directionError';
    if (![0.25, 0.5, 0.75].includes(draft.pace)) return 'paceError';
  }
  if (step === 6 && !['sedentario', 'ligero', 'moderado', 'activo', 'muy_activo'].includes(draft.activity)) return 'activityError';
  if (step === 7 && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) return 'timeError';
  return null;
}
export function onboardingArgs(draft: OnboardingDraft): CompleteArgs {
  for (let step = 1; step <= 7; step++) if (stepError(step, draft)) throw new Error('Invalid onboarding');
  return {
    p_nombre: draft.name.trim(), p_sexo: draft.sex as CompleteArgs['p_sexo'], p_fecha_nac: draft.birth,
    p_altura_cm: amount(draft.height), p_peso_kg: amount(draft.weight),
    p_peso_objetivo_kg: amount(draft.goal === 'mantener' ? draft.weight : draft.target),
    p_objetivo: draft.goal as CompleteArgs['p_objetivo'], p_actividad: draft.activity as CompleteArgs['p_actividad'],
    p_ritmo_kg_semana: draft.goal === 'mantener' ? 0 : draft.pace, p_hora_registro: draft.time,
  };
}
export function planTiming(draft: OnboardingDraft, targets: Targets, now = new Date()) {
  const clamped = draft.goal === 'bajar' && targets.kcal_objetivo <= (draft.sex === 'hombre' ? 1500 : 1200);
  // A clamped plan no longer supports the selected pace, so do not promise that date.
  if (draft.goal === 'mantener' || clamped) return { clamped, arrival: null };
  const weeks = Math.abs(amount(draft.weight) - amount(draft.target)) / draft.pace;
  const arrival = new Date(now);
  arrival.setDate(arrival.getDate() + Math.ceil(weeks * 7));
  return { clamped, arrival };
}
