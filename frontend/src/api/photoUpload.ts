import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.ts';
import type { PendingUpload } from '../types/pendingUpload.ts';

export async function uploadPhotoRecord(client: SupabaseClient<Database>, photo: PendingUpload, bytes: ArrayBuffer) {
  const { error: uploadError } = await client.storage.from('meal-photos').upload(photo.storagePath, bytes, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;
  // A repeated request must not reset procesada or overwrite an existing meal link.
  const { error } = await client.from('pending_photos').upsert({
    id: photo.id, user_id: photo.userId, storage_path: photo.storagePath, tomada_en: photo.takenAt, tipo_sugerido: photo.mealType,
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}
