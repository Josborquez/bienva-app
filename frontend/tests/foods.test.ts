import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { getFrequentFoods, searchFoods } from '../src/api/foods.ts';
import type { Database } from '../src/types/database.ts';

test('frequents are scoped to the user and meal; search uses the existing RPC', async () => {
  const calls: { url: URL; body: unknown }[] = [];
  const client = createClient<Database>('https://food-test.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      calls.push({ url: new URL(String(input)), body: init?.body ? JSON.parse(String(init.body)) : null });
      return Response.json([]);
    } },
  });
  try {
    const signal = new AbortController().signal;
    await getFrequentFoods(client, 'user-a', 'once', signal);
    assert.equal(calls[0].url.searchParams.get('user_id'), 'eq.user-a');
    assert.equal(calls[0].url.searchParams.get('tipo'), 'eq.once');
    await searchFoods(client, ' p ', signal);
    assert.equal(calls.length, 1);
    await searchFoods(client, ' palta ', signal);
    assert.equal(calls[1].url.pathname, '/rest/v1/rpc/search_foods');
    assert.deepEqual(calls[1].body, { q: 'palta', lim: 20 });
  } finally { await client.auth.dispose(); }
});
