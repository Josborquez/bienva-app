import AsyncStorage from '@react-native-async-storage/async-storage';
import { emptyOnboarding, type OnboardingDraft } from '../types/onboarding';

let pending: Promise<unknown> = Promise.resolve();
const key = (id: string) => `bienva.onboarding.v1.${id}`;
export async function readOnboardingDraft(id: string): Promise<{ draft: OnboardingDraft; step: number } | null> {
  await pending;
  const raw = await AsyncStorage.getItem(key(id));
  if (!raw) return null;
  const saved = JSON.parse(raw);
  if (!saved || typeof saved.draft !== 'object' || !saved.draft) return null;
  const draft = { ...emptyOnboarding };
  for (const field of Object.keys(draft) as (keyof OnboardingDraft)[]) {
    if (typeof saved.draft[field] === typeof draft[field]) Object.assign(draft, { [field]: saved.draft[field] });
  }
  return { draft, step: Number.isInteger(saved.step) && saved.step >= 1 && saved.step <= 7 ? saved.step : 1 };
}
export function saveOnboardingDraft(id: string, value: { draft: OnboardingDraft; step: number } | null) {
  const operation = pending.catch(() => undefined).then(() => value ? AsyncStorage.setItem(key(id), JSON.stringify(value)) : AsyncStorage.removeItem(key(id)));
  pending = operation.catch(() => undefined);
  return operation;
}
