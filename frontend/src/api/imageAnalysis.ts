import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.ts';
import type { MealType } from '../types/domain.ts';
import { parseAnalysis } from '../utils/nutrition.ts';
import { PhotoAnalysisError, photoFunctionError } from '../utils/photos.ts';

export async function requestImageAnalysis(client: SupabaseClient<Database>, base64: string, mealType: MealType, date: string) {
  const { data, error } = await client.functions.invoke('analyze', { body: { image_base64: base64, mime_type: 'image/jpeg', meal_type: mealType, fecha: date } });
  if (error) throw await photoFunctionError(error);
  const items = parseAnalysis(data);
  if (!items.length) throw new PhotoAnalysisError('empty');
  return items;
}
