import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { suggestTargetWeight } from '../src/api/targetWeight.ts';
import { onboardingApi } from '../src/api/onboarding.ts';
import { arrivalDate, arrivalLabel, belowSuggestedMinimum, hasInternalMetric, onboardingStep, parseWeightSuggestion, shouldPreloadTarget, stepTargetWeight, TargetWeightMinimumError, weightLabel } from '../src/utils/targetWeight.ts';
import { es } from '../src/i18n/es.ts';
import type { Database } from '../src/types/database.ts';
import type { OnboardingDraft } from '../src/types/onboarding.ts';

const suggestion = { peso_sugerido: 76, peso_min_saludable: 57, peso_max_saludable: 76, nota: null };
const draft: OnboardingDraft = { name: 'Prueba', goal: 'bajar', sex: 'hombre', birth: '1990-05-10', height: '175', weight: '90', target: '76,0', pace: 0.5, activity: 'ligero', time: '21:00' };
test('175 cm / 90 kg / bajar uses the RPC suggestion and formats the requested range', async () => {
  let args: unknown;
  const client = createClient<Database>('https://weight-test.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      assert.equal(new URL(String(input)).pathname, '/rest/v1/rpc/suggest_target_weight');
      args = JSON.parse(String(init?.body));
      return Response.json([suggestion]);
    } },
  });
  try {
    const result = await suggestTargetWeight(client, draft);
    assert.deepEqual(args, { p_altura_cm: 175, p_peso_kg: 90, p_objetivo: 'bajar' });
    assert.equal(weightLabel(result.peso_sugerido), '76,0');
    assert.equal(es.onboarding.healthyRange(weightLabel(result.peso_min_saludable), weightLabel(result.peso_max_saludable)), 'Rango saludable para tu estatura: 57,0–76,0 kg');
  } finally { await client.auth.dispose(); }
});
test('half-kilo stepper accepts comma decimals and the exact minimum remains allowed', () => {
  assert.equal(stepTargetWeight('76,0', -0.5, 76), '75,5');
  assert.equal(stepTargetWeight('75.5', 0.5, 76), '76,0');
  assert.equal(belowSuggestedMinimum('57,0', suggestion), false);
  assert.equal(belowSuggestedMinimum(stepTargetWeight('57,0', -0.5, 76), suggestion), true);
  assert.equal(es.onboarding.belowHealthyMinimum(weightLabel(57)), 'Ese peso queda bajo el rango saludable; el mínimo es 57,0 kg');
});
test('maintenance skips step five in both directions; arrival responds to target and pace', () => {
  assert.equal(onboardingStep(4, 1, 'mantener'), 6);
  assert.equal(onboardingStep(6, -1, 'mantener'), 4);
  assert.equal(onboardingStep(4, 1, 'bajar'), 5);
  const now = new Date('2026-09-25T12:00:00Z');
  assert.equal(arrivalDate(draft, now)?.toISOString().slice(0, 10), '2027-04-09');
  assert.equal(arrivalDate({ ...draft, pace: 0.25 }, now)?.toISOString().slice(0, 10), '2027-10-22');
  assert.equal(arrivalDate({ ...draft, target: 'invalid' }, now), null);
  assert.equal(arrivalDate({ ...draft, pace: 0 }, now), null);
  assert.equal(es.onboarding.arrival('marzo 2027'), 'llegarías en marzo 2027');
});
test('invalid responses fail closed and internal metrics never pass as display fields', () => {
  assert.deepEqual(parseWeightSuggestion([{ ...suggestion, imc: 29.4 }]), suggestion);
  assert.throws(() => parseWeightSuggestion([]));
  assert.throws(() => parseWeightSuggestion({ ...suggestion, peso_min_saludable: NaN }));
  assert.throws(() => parseWeightSuggestion({ ...suggestion, peso_max_saludable: 50 }));
  assert.equal(hasInternalMetric('Tu IMC es 29,4'), true);
  assert.equal(hasInternalMetric('Ya estás bajo el rango saludable; te sugerimos mantener'), false);
});
test('a restored target below minimum cannot preview or save; maintenance saves current weight without the suggestion RPC', async () => {
  const paths: string[] = [];
  const client = createClient<Database>('https://weight-test.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      if (path.endsWith('suggest_target_weight')) return Response.json([suggestion]);
      const args = JSON.parse(String(init?.body));
      assert.equal(args.p_peso_objetivo_kg, 90);
      assert.equal(args.p_ritmo_kg_semana, 0);
      return Response.json({ id: 'user-a', onboarding_completo: true });
    } },
  });
  try {
    const api = onboardingApi(client);
    await assert.rejects(api.preview({ ...draft, target: '56,5' }), TargetWeightMinimumError);
    await assert.rejects(api.complete({ ...draft, target: '56,5' }, 'user-a'), TargetWeightMinimumError);
    assert.ok(paths.every(path => path.endsWith('suggest_target_weight')));
    paths.length = 0;
    await api.complete({ ...draft, goal: 'mantener', target: '56,5' }, 'user-a');
    assert.deepEqual(paths, ['/rest/v1/rpc/complete_onboarding']);
  } finally { await client.auth.dispose(); }
});
test('the suggestion preloads on first entry and on changed inputs, but never overwrites a revisited or restored target', () => {
  const key = JSON.stringify(['175', '90', 'bajar']);
  assert.equal(shouldPreloadTarget('', null, key), true);                          // first entry
  assert.equal(shouldPreloadTarget('78,0', key, key), false);                      // user edited, left and came back
  assert.equal(shouldPreloadTarget('78,0', null, key), false);                     // draft restored from the device
  assert.equal(shouldPreloadTarget('78,0', JSON.stringify(['175', '95', 'bajar']), key), true); // weight changed in step 4
});
test('arrival month comes from es.ts, without depending on Intl on the device', () => {
  const arrival = arrivalDate(draft, new Date('2026-09-25T12:00:00Z'))!;
  assert.equal(es.onboarding.arrival(arrivalLabel(arrival, es.onboarding.months)), 'llegarías en abril 2027');
  assert.equal(arrivalLabel(new Date(2027, 2, 15), es.onboarding.months), 'marzo 2027');
});
