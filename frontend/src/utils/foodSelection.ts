import type { Tables } from '../types/database';
import type { EditableItem } from '../types/mealDraft';
import type { FoodOption, FoodSelection } from '../types/foodSelection';

export function catalogOption(food: Tables<'foods'>): FoodOption {
  return { key: `food:${food.id}`, foodId: food.id, name: food.marca ? `${food.nombre} · ${food.marca}` : food.nombre,
    source: 'base', portion: food.porcion_desc, baseQuantity: 1, kcal: food.kcal, protein: food.prot_g, grams: food.porcion_g };
}
export function frequentOption(food: Tables<'frequent_items'>): FoodOption | null {
  if (!food.nombre || food.cantidad_tipica === null || food.cantidad_tipica <= 0 || food.kcal_tipico === null || food.prot_tipico === null) return null;
  return { key: food.food_id ? `food:${food.food_id}` : `name:${food.nombre.trim().toLocaleLowerCase('es-CL')}`,
    foodId: food.food_id, name: food.nombre, source: 'frecuente', portion: null,
    baseQuantity: food.cantidad_tipica, kcal: food.kcal_tipico, protein: food.prot_tipico, grams: null };
}
export function toggleFood(selections: FoodSelection[], food: FoodOption): FoodSelection[] {
  return selections.some(selection => selection.food.key === food.key)
    ? selections.filter(selection => selection.food.key !== food.key)
    : [...selections, { food, quantity: String(food.baseQuantity) }];
}
export function uniqueFoodOptions(foods: FoodOption[]): FoodOption[] {
  const seen = new Set<string>();
  return foods.filter(food => {
    if (seen.has(food.key)) return false;
    seen.add(food.key);
    return true;
  });
}
export function selectedNutrition(selection: FoodSelection) {
  const { food } = selection;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(selection.quantity.trim())) throw new Error('Invalid quantity');
  const quantity = Number(selection.quantity.trim().replace(',', '.'));
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 99999.99 || !Number.isFinite(food.baseQuantity) || food.baseQuantity <= 0) throw new Error('Invalid quantity');
  const factor = quantity / food.baseQuantity;
  const round = (number: number) => Math.round(number * 10) / 10;
  const kcal = round(food.kcal * factor), protein = round(food.protein * factor);
  const grams = food.grams === null ? null : round(food.grams * factor);
  if (!Number.isFinite(kcal) || kcal < 0 || kcal > 999999.9 || !Number.isFinite(protein) || protein < 0 || protein > 99999.9 || (grams !== null && (!Number.isFinite(grams) || grams < 0 || grams > 999999.9))) throw new Error('Invalid nutrition');
  return { quantity, kcal, protein, grams };
}
export function selectionItem(selection: FoodSelection, id: string): EditableItem {
  const values = selectedNutrition(selection);
  return { id, nombre: selection.food.name, cantidad: String(values.quantity), cantidad_g: values.grams,
    kcal: String(values.kcal), prot_g: String(values.protein), food_id: selection.food.foodId,
    fuente: selection.food.source, confianza: 1, confirmed: true, edited: false };
}
