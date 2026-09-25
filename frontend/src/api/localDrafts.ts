import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealDraft } from '../types/mealDraft';

let pending: Promise<unknown> = Promise.resolve();
const key = (userId: string) => `bienva.meal-drafts.v1.${userId}`;
export async function readLocalDrafts(userId: string): Promise<Record<string, MealDraft>> {
  await pending;
  const raw = await AsyncStorage.getItem(key(userId));
  return raw ? JSON.parse(raw) : {};
}
export function writeLocalDraft(userId: string, draft: MealDraft | null, id: string) {
  const operation = pending.catch(() => undefined).then(async () => {
    const raw = await AsyncStorage.getItem(key(userId));
    const drafts: Record<string, MealDraft> = raw ? JSON.parse(raw) : {};
    if (draft) drafts[id] = draft;
    else delete drafts[id];
    await AsyncStorage.setItem(key(userId), JSON.stringify(drafts));
  });
  pending = operation.catch(() => undefined);
  return operation;
}
