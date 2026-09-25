import type { MealItemDraft, MealType } from '../types/domain';

export const mealTypes: MealType[] = ['desayuno', 'almuerzo', 'snack', 'once', 'cena'];
export function dayKey(now = new Date(), timeZone = 'America/Santiago'): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function suggestedMeal(now = new Date(), timeZone = 'America/Santiago'): MealType {
  const hour = Number(new Intl.DateTimeFormat('en', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now));
  return hour < 10 ? 'desayuno' : hour < 15 ? 'almuerzo' : hour < 17 ? 'snack' : hour < 20 ? 'once' : 'cena';
}
export function sumNutrition(items: Pick<MealItemDraft, 'kcal' | 'prot_g'>[]) {
  return items.reduce((total, item) => ({ kcal: total.kcal + item.kcal, prot_g: total.prot_g + item.prot_g }), { kcal: 0, prot_g: 0 });
}
export function goalState(value: number | null, min: number | null, max: number | null) {
  if (value === null) return 'empty';
  if (min === null || max === null || min < 0 || max <= 0 || min > max) return 'unset';
  return value < min ? 'below' : value > max ? 'above' : 'within';
}
export function parseAmount(value: string): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const amount = Number(value.trim().replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
}
export function validDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function parseAnalysis(value: unknown): MealItemDraft[] {
  if (!value || typeof value !== 'object' || !('items' in value) || !Array.isArray(value.items)) throw new Error('Invalid analysis');
  return value.items.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid item');
    const it = item as Record<string, unknown>;
    const numeric = (key: string, max: number, positive = false) => {
      const n = it[key];
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max || (positive && n === 0)) throw new Error(`Invalid ${key}`);
      return n;
    };
    if (typeof it.nombre !== 'string' || !it.nombre.trim() || !['base', 'modelo'].includes(String(it.fuente))) throw new Error('Invalid item');
    return {
      nombre: it.nombre.trim(), cantidad: numeric('cantidad', 99999.99, true),
      kcal: numeric('kcal', 999999.9), prot_g: numeric('prot_g', 99999.9), confianza: numeric('confianza', 1),
      cantidad_g: it.cantidad_g == null ? null : numeric('cantidad_g', 999999.9),
      food_id: typeof it.food_id === 'string' ? it.food_id : null, fuente: it.fuente as 'base' | 'modelo',
    };
  });
}
