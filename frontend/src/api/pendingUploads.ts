import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import type { PendingUpload } from '../types/pendingUpload';
import { cachePhoto, photoBytes, removeCachedPhoto } from './photoFiles';
import { getSupabase } from './supabase';
import { uploadPhotoRecord } from './photoUpload';
import { photoStoragePath, quickPhotoMealType } from '../utils/photos';

const key = (userId: string) => `pendingUploads:${userId}`;
let writes: Promise<unknown> = Promise.resolve();
const running = new Map<string, Promise<void>>();
export async function readPendingUploads(userId: string): Promise<PendingUpload[]> {
  await writes;
  const raw = await AsyncStorage.getItem(key(userId));
  return raw ? (JSON.parse(raw) as PendingUpload[]).filter(photo => photo.userId === userId) : [];
}
function updateQueue(userId: string, update: (photos: PendingUpload[]) => PendingUpload[]) {
  const operation = writes.catch(() => undefined).then(async () => {
    const raw = await AsyncStorage.getItem(key(userId));
    await AsyncStorage.setItem(key(userId), JSON.stringify(update(raw ? JSON.parse(raw) : [])));
  });
  writes = operation.catch(() => undefined);
  return operation;
}
export async function enqueuePhoto(uri: string, userId: string, takenAt: Date) {
  const id = randomUUID();
  const cached = await cachePhoto(uri, userId, id);
  const photo: PendingUpload = { id, userId, uri: cached, storagePath: photoStoragePath(userId, id), takenAt: takenAt.toISOString(), mealType: quickPhotoMealType(takenAt.getHours()) };
  try { await updateQueue(userId, photos => [...photos, photo]); }
  catch (error) { await removeCachedPhoto(cached).catch(() => undefined); throw error; }
  return photo;
}
export function flushPendingUploads(userId: string): Promise<void> {
  const previous = running.get(userId);
  if (previous) return previous;
  const operation = (async () => {
    const attempted = new Set<string>();
    let firstFailure: unknown;
    while (true) {
      const photo = (await readPendingUploads(userId)).find(item => !attempted.has(item.id));
      if (!photo) break;
      attempted.add(photo.id);
      const { data } = await getSupabase().auth.getSession();
      if (data.session?.user.id !== userId) return;
      try {
        await uploadPhotoRecord(getSupabase(), photo, await photoBytes(photo.uri));
        await updateQueue(userId, photos => photos.filter(item => item.id !== photo.id));
        await removeCachedPhoto(photo.uri).catch(() => undefined);
      } catch (error) { firstFailure ??= error; }
    }
    if (firstFailure) throw firstFailure;
  })().finally(() => { running.delete(userId); });
  running.set(userId, operation);
  return operation;
}
