import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, goalState, parseAmount, parseAnalysis, sumNutrition, suggestedMeal, validDay } from '../src/utils/nutrition.ts';

test('uses the profile timezone at midnight and includes once', () => {
  const date = new Date('2026-09-25T01:00:00Z');
  assert.equal(dayKey(date, 'America/Santiago'), '2026-09-24');
  assert.equal(dayKey(date, 'UTC'), '2026-09-25');
  assert.equal(suggestedMeal(new Date('2026-09-24T21:00:00Z'), 'America/Santiago'), 'once');
});
test('distinguishes no record from zero and treats both goal bounds as inclusive', () => {
  assert.equal(goalState(null, 100, 200), 'empty');
  assert.equal(goalState(0, 100, 200), 'below');
  assert.equal(goalState(100, 100, 200), 'within');
  assert.equal(goalState(200, 100, 200), 'within');
  assert.equal(goalState(201, 100, 200), 'above');
  assert.equal(goalState(100, null, null), 'unset');
  assert.equal(goalState(100, 200, 100), 'unset');
});
test('accepts decimal commas but rejects invalid amounts and impossible dates', () => {
  assert.equal(parseAmount('1,5'), 1.5);
  for (const value of ['', '-1', 'Infinity', '1e3', '1.2.3']) assert.equal(parseAmount(value), null);
  assert.equal(validDay('2026-02-30'), false);
  assert.equal(validDay('2026-09-24'), true);
});
test('validates model output before saving and sums without per-item rounding', () => {
  const item = { nombre: 'Palta', cantidad: 0.5, kcal: 80.4, prot_g: 1.2, confianza: 0.5, fuente: 'modelo' };
  const items = parseAnalysis({ items: [item, item] });
  assert.deepEqual(sumNutrition(items), { kcal: 160.8, prot_g: 2.4 });
  assert.throws(() => parseAnalysis({ items: [{ ...item, kcal: -1 }] }));
  assert.throws(() => parseAnalysis({ items: [{ ...item, cantidad: 0 }] }));
  assert.throws(() => parseAnalysis({ items: [{ ...item, confianza: 2 }] }));
  assert.throws(() => parseAnalysis({ error: 'unavailable' }));
});
