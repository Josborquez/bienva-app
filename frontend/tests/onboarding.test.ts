import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { onboardingArgs, planTiming, stepError } from '../src/utils/onboarding.ts';
import { onboardingApi } from '../src/api/onboarding.ts';
import type { Database } from '../src/types/database.ts';
import type { OnboardingDraft } from '../src/types/onboarding.ts';

const draft: OnboardingDraft = { name: ' Prueba ', goal: 'bajar', sex: 'hombre', birth: '1990-05-10', height: '175', weight: '90', target: '80', pace: 0.5, activity: 'ligero', time: '21:00' };
const targets = { bmr: 1819, tdee: 2501, kcal_objetivo: 1951, kcal_min: 1801, kcal_max: 2101, prot_min: 144, prot_max: 198 };
test('onboarding validates calendar dates, decimal limits, goal direction and time', () => {
  for (let step = 1; step <= 7; step++) assert.equal(stepError(step, draft), null);
  assert.equal(stepError(3, { ...draft, birth: '1990-02-30' }), 'birthError');
  assert.equal(stepError(3, { ...draft, birth: '2090-01-01' }), 'birthError');
  assert.equal(stepError(3, { ...draft, birth: '2010-09-26' }, new Date('2026-09-25T12:00:00Z')), 'ageError');
  assert.equal(stepError(3, { ...draft, birth: '2010-09-25' }, new Date('2026-09-25T12:00:00Z')), null);
  assert.equal(stepError(4, { ...draft, weight: '90,5' }), null);
  assert.equal(stepError(4, { ...draft, weight: '90.55' }), 'weightError');
  assert.equal(stepError(4, { ...draft, height: '99' }), 'heightError');
  assert.equal(stepError(5, { ...draft, target: '91' }), 'directionError');
  assert.equal(stepError(5, { ...draft, goal: 'subir', target: '80' }), 'directionError');
  assert.equal(stepError(5, { ...draft, pace: 1.5 }), 'paceError');
  assert.equal(stepError(7, { ...draft, time: '24:00' }), 'timeError');
  assert.throws(() => onboardingArgs({ ...draft, goal: '' }));
});
test('maintenance discards stale weight goal and pace; comma decimals normalize', () => {
  const args = onboardingArgs({ ...draft, goal: 'mantener', weight: '90,5', target: '', pace: 0.75 });
  assert.equal(args.p_peso_kg, 90.5);
  assert.equal(args.p_peso_objetivo_kg, 90.5);
  assert.equal(args.p_ritmo_kg_semana, 0);
  assert.equal(args.p_nombre, 'Prueba');
});
test('arrival date is informational and omitted for maintenance or a minimum-calorie adjustment', () => {
  const now = new Date('2026-09-25T12:00:00Z');
  assert.equal(planTiming(draft, targets, now).arrival?.toISOString().slice(0, 10), '2027-02-12');
  assert.deepEqual(planTiming(draft, { ...targets, kcal_objetivo: 1500 }, now), { clamped: true, arrival: null });
  assert.equal(planTiming({ ...draft, goal: 'mantener' }, targets, now).arrival, null);
});
test('preview only computes; final RPC saves the complete profile and validates its user', async () => {
  const calls: { path: string; args: Record<string, unknown> }[] = [];
  let fail = false;
  const client = createClient<Database>('https://onboarding-test.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const path = new URL(String(input)).pathname;
      calls.push({ path, args: JSON.parse(String(init?.body)) });
      if (fail) return Response.json({ message: 'connection failed' }, { status: 503 });
      if (path.endsWith('suggest_target_weight')) return Response.json([{ peso_sugerido: 76, peso_min_saludable: 57, peso_max_saludable: 76, nota: null }]);
      return Response.json(path.endsWith('compute_targets') ? [targets] : { id: 'user-a', onboarding_completo: true });
    } },
  });
  try {
    const api = onboardingApi(client);
    assert.deepEqual(await api.preview(draft), targets);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].path, '/rest/v1/rpc/compute_targets');
    assert.equal(Object.hasOwn(calls[1].args, 'p_nombre'), false);
    assert.equal(calls[1].args.p_peso_kg, 90);
    assert.equal((await api.complete(draft, 'user-a')).onboarding_completo, true);
    assert.equal(calls[3].path, '/rest/v1/rpc/complete_onboarding');
    assert.equal(calls[3].args.p_hora_registro, '21:00');
    assert.equal(calls[3].args.p_peso_objetivo_kg, 80);
    await assert.rejects(api.complete(draft, 'user-b'));
    fail = true;
    await assert.rejects(api.preview(draft));
    await assert.rejects(api.complete(draft, 'user-a'));
  } finally { await client.auth.dispose(); }
});
