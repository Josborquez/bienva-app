import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogOption, frequentOption, selectedNutrition, selectionItem, toggleFood, uniqueFoodOptions } from '../src/utils/foodSelection.ts';
import type { Tables } from '../src/types/database.ts';

const food: Tables<'foods'> = { id: 'food-1', nombre: 'Huevo', marca: null, porcion_desc: '1 unidad', porcion_g: 50,
  kcal: 70, prot_g: 6, aliases: [], carb_g: null, grasa_g: null, categoria: null, created_at: '', updated_at: '', created_by: null,
  fuente: 'base', usos: 3, verificado: true };
const frequent: Tables<'frequent_items'> = { food_id: food.id, nombre: food.nombre, tipo: 'desayuno', user_id: 'user-a',
  cantidad_tipica: 2, kcal_tipico: 140, prot_tipico: 12, ultima_vez: '2026-09-24', veces: 3 };

test('catalog portions scale nutrients and grams, accepting decimal commas', () => {
  const selected = { food: catalogOption(food), quantity: '1,5' };
  assert.deepEqual(selectedNutrition(selected), { quantity: 1.5, kcal: 105, protein: 9, grams: 75 });
  const item = selectionItem(selected, 'item-1');
  assert.equal(item.food_id, food.id);
  assert.equal(item.cantidad, '1.5');
  assert.equal(item.cantidad_g, 75);
  assert.equal(item.fuente, 'base');
  assert.equal(item.confirmed, true);
});
test('frequents use totals for the typical quantity, not totals per unit', () => {
  const option = frequentOption(frequent)!;
  assert.deepEqual(selectedNutrition({ food: option, quantity: '2' }), { quantity: 2, kcal: 140, protein: 12, grams: null });
  assert.equal(selectedNutrition({ food: option, quantity: '3' }).kcal, 210);
  assert.equal(selectionItem({ food: option, quantity: '3' }, 'item-2').fuente, 'frecuente');
});
test('frequents without a catalog match remain usable and invalid typical quantities are rejected', () => {
  const option = frequentOption({ ...frequent, food_id: null })!;
  assert.equal(selectionItem({ food: option, quantity: '1' }, 'item-3').food_id, null);
  assert.equal(frequentOption({ ...frequent, cantidad_tipica: 0 }), null);
  assert.equal(frequentOption({ ...frequent, kcal_tipico: null }), null);
});
test('catalog and frequent aliases share a selection key and quantities survive serialization', () => {
  const option = frequentOption(frequent)!;
  const catalog = catalogOption(food);
  assert.equal(uniqueFoodOptions([option, catalog]).length, 1);
  const selected = toggleFood([], option);
  selected[0].quantity = '3,5';
  const restored = JSON.parse(JSON.stringify(selected));
  assert.equal(selectedNutrition(restored[0]).kcal, 245);
  assert.deepEqual(toggleFood(restored, catalog), []);
});
test('rejects empty, negative, non-finite and overflowing portions', () => {
  for (const quantity of ['', '0', '-1', 'Infinity', '1e3', '1.234', '999999']) {
    assert.throws(() => selectedNutrition({ food: catalogOption(food), quantity }));
  }
  assert.throws(() => selectedNutrition({ food: catalogOption({ ...food, kcal: 999999 }), quantity: '2' }));
});
