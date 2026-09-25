import { getSupabase } from './supabase';
import { parseAnalysis } from '../utils/nutrition';
import type { MealType } from '../types/domain';
import { requestImageAnalysis } from './imageAnalysis';

export async function analyzeImage(base64: string, mealType: MealType, date: string) {
  return requestImageAnalysis(getSupabase(), base64, mealType, date);
}

export async function analyzeText(text: string, mealType: MealType, date: string) {
  const { data, error } = await getSupabase().functions.invoke('analyze', { body: { text: text.trim(), meal_type: mealType, fecha: date } });
  if (error) throw error;
  return parseAnalysis(data);
}
