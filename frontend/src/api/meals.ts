import { getSupabase } from './supabase';
import type { MealDraft } from '../types/mealDraft';
import { parseAmount, validDay } from '../utils/nutrition';
import { writeMealRecords } from './mealWriter';

export async function getProfile(userId: string) {
  const { data, error } = await getSupabase().from('users').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}
export async function getDayMeals(userId: string, date: string) {
  const { data, error } = await getSupabase().from('meals').select('*, meal_items(*)').eq('user_id', userId).eq('fecha', date).order('created_at');
  if (error) throw error;
  return data;
}
export async function getRemoteDrafts(userId: string) {
  const { data, error } = await getSupabase().from('meals').select('id, fecha, tipo, nota').eq('user_id', userId).eq('es_borrador', true).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function loadMealDraft(userId: string, id: string): Promise<MealDraft | null> {
  const { data, error } = await getSupabase().from('meals').select('*, meal_items(*)').eq('id', id).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data || !data.es_borrador) return null;
  return {
    id: data.id, fecha: data.fecha, tipo: data.tipo, text: data.nota ?? '', origin: data.origen,
    entryMode: data.origen === 'texto' ? 'texto' : 'frecuentes',
    items: data.meal_items.map(item => ({
      id: item.id, nombre: item.nombre, cantidad: String(item.cantidad), cantidad_g: item.cantidad_g,
      kcal: String(item.kcal), prot_g: String(item.prot_g), food_id: item.food_id, confianza: item.confianza ?? 0,
      fuente: data.origen === 'repetir' ? 'frecuente' : item.food_id ? 'base' : 'modelo', edited: item.editado_por_usuario, confirmed: item.editado_por_usuario,
    })),
  };
}
export function draftRows(draft: MealDraft) {
  if (!validDay(draft.fecha) || !draft.items.length) throw new Error('Invalid draft');
  return draft.items.map(item => {
    const cantidad = parseAmount(item.cantidad), kcal = parseAmount(item.kcal), prot_g = parseAmount(item.prot_g);
    if (!item.nombre.trim() || cantidad === null || cantidad <= 0 || cantidad > 99999.99 || kcal === null || kcal > 999999.9 || prot_g === null || prot_g > 99999.9) throw new Error('Invalid item');
    return { id: item.id, meal_id: draft.id, nombre: item.nombre.trim(), cantidad, cantidad_g: item.cantidad_g, kcal, prot_g,
      food_id: item.food_id, confianza: item.confianza, editado_por_usuario: item.edited };
  });
}
export async function saveMealDraft(userId: string, draft: MealDraft, finalize = false) {
  const rows = draftRows(draft);
  if (finalize && draft.items.some(item => item.confianza < 0.6 && !item.confirmed)) throw new Error('Confirmation required');
  await writeMealRecords(getSupabase(), userId, draft, rows, finalize);
}
