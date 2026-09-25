import { getSupabase } from './supabase';
import { photoFunctionError } from '../utils/photos';

export async function getPendingPhotos(userId: string) {
  const { data, error } = await getSupabase().from('pending_photos').select('id, error, tomada_en').eq('user_id', userId).eq('procesada', false).order('tomada_en');
  if (error) throw error;
  return data;
}
async function runPendingPhotos() {
  const { data, error } = await getSupabase().functions.invoke('process_pending', { body: { limit: 5 } });
  if (error) throw await photoFunctionError(error);
  if (!data || typeof data !== 'object') throw new Error('Invalid process_pending response');
  if (!Number.isInteger(data.processed) || !Array.isArray(data.created_meals) || !Array.isArray(data.errors)) throw new Error('Invalid process_pending response');
  return { stopped: typeof data.stopped === 'string' ? data.stopped : null, processed: data.processed as number, created: data.created_meals.length, errors: data.errors.length };
}
const processing = new Map<string, ReturnType<typeof runPendingPhotos>>();
export function processPendingPhotos(userId: string) {
  const previous = processing.get(userId);
  if (previous) return previous;
  const operation = runPendingPhotos().finally(() => { processing.delete(userId); });
  processing.set(userId, operation);
  return operation;
}
