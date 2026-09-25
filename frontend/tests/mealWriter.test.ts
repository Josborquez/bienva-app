import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { writeMealRecords } from '../src/api/mealWriter.ts';
import type { Database } from '../src/types/database.ts';
import type { MealDraft } from '../src/types/mealDraft.ts';

const draft: MealDraft = { id: 'stable-meal-id', fecha: '2026-09-24', tipo: 'once', text: 'Pan', items: [] };
const rows = [{ id: 'stable-item-id', meal_id: draft.id, nombre: 'Pan', kcal: 100, prot_g: 4 }];
test('a failed item write leaves a draft; retry reuses IDs and only then finalizes', async () => {
  let failItems = true;
  const calls: { table: string; method: string; body: any; url: URL }[] = [];
  const client = createClient<Database>('https://meal-test.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').pop()!;
      const method = init?.method ?? 'GET';
      const body = JSON.parse(String(init?.body));
      calls.push({ table, method, body, url });
      if (table === 'meal_items' && failItems) return Response.json({ message: 'Temporary write failure' }, { status: 400 });
      return method === 'PATCH' ? Response.json({ id: draft.id }) : new Response(null, { status: 201 });
    } },
  });
  try {
    await assert.rejects(writeMealRecords(client, 'user-a', draft, rows, true));
    assert.equal(calls.some(call => call.method === 'PATCH'), false);
    assert.equal(calls[0].body.es_borrador, true);
    failItems = false;
    await writeMealRecords(client, 'user-a', draft, rows, true);
    assert.equal(calls[2].body.id, calls[0].body.id);
    assert.equal(calls[3].body[0].id, calls[1].body[0].id);
    assert.equal(calls[4].body.es_borrador, false);
    assert.equal(calls[4].url.searchParams.get('user_id'), 'eq.user-a');
    await writeMealRecords(client, 'user-a', { ...draft, origin: 'repetir', text: 'Inactive text tab' }, rows, false);
    assert.equal(calls[5].body.origen, 'repetir');
    assert.equal(calls[5].body.nota, null);
    assert.equal(calls.length, 7);
  } finally { await client.auth.dispose(); }
});
