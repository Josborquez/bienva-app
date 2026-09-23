import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSecureSessionStorage } from '../src/api/secureSessionStorage.ts';

function mockStore() {
  const values = new Map<string, string>();
  let failNextChunk = false;
  return {
    values,
    fail() { failNextChunk = true; },
    async getItemAsync(key: string) { return values.get(key) ?? null; },
    async setItemAsync(key: string, value: string) {
      if (failNextChunk && key !== 'session') { failNextChunk = false; throw new Error('Storage unavailable'); }
      assert.ok(Buffer.byteLength(value, 'utf8') < 2048);
      values.set(key, value);
    },
    async deleteItemAsync(key: string) { values.delete(key); },
  };
}

test('a large session survives restart with Unicode metadata', async () => {
  const store = mockStore();
  const value = JSON.stringify({ token: 'x'.repeat(9000), name: 'María 🥑'.repeat(400) });
  await createSecureSessionStorage(store).setItem('session', value);
  assert.equal(await createSecureSessionStorage(store).getItem('session'), value);
});
test('failed updates preserve the previous complete session', async () => {
  const store = mockStore();
  const adapter = createSecureSessionStorage(store);
  await adapter.setItem('session', 'previous');
  store.fail();
  await assert.rejects(adapter.setItem('session', 'new'));
  assert.equal(await adapter.getItem('session'), 'previous');
  await adapter.setItem('session', 'retry');
  assert.equal(await adapter.getItem('session'), 'retry');
});
test('serialized updates and sign-out leave no session chunks', async () => {
  const store = mockStore();
  const adapter = createSecureSessionStorage(store);
  await Promise.all([adapter.setItem('session', 'old'.repeat(2000)), adapter.setItem('session', 'new'), adapter.removeItem('session')]);
  assert.equal(await adapter.getItem('session'), null);
  assert.equal(store.values.size, 0);
});
test('incomplete persisted sessions fail instead of returning truncated tokens', async () => {
  const store = mockStore();
  const adapter = createSecureSessionStorage(store);
  await adapter.setItem('session', 'large'.repeat(1000));
  const key = [...store.values.keys()].find(key => key !== 'session')!;
  store.values.delete(key);
  await assert.rejects(adapter.getItem('session'), /Incomplete/);
});
