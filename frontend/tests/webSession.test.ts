import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { sessionStorage } from '../src/api/sessionStorage.web.ts';

const user = { id: 'test-user', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
function token(expiresAt: number) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: expiresAt })}.test-signature`;
}
function client(storageKey: string) {
  return createClient('https://session-test.supabase.co', 'test-public-key', {
    auth: { storage: sessionStorage, storageKey, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input) => {
        const url = String(input);
        if (url.includes('/auth/v1/user')) return Response.json(user);
        if (url.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
        throw new Error(`Unexpected auth request: ${url}`);
      },
    },
  });
}

test('web session survives a fresh Supabase client and is removed by sign-out', async () => {
  const storageKey = 'web-persistence-test';
  const first = client(storageKey);
  const credentials = { access_token: token(Math.floor(Date.now() / 1000) + 3600), refresh_token: 'test-refresh-token' };
  try {
    const result = await first.auth.setSession(credentials);
    assert.equal(result.error, null);
    assert.equal(result.data.session?.user.id, user.id);
    assert.ok(await sessionStorage.getItem(storageKey));
  } finally {
    await first.auth.dispose();
  }

  const reopened = client(storageKey);
  try {
    const restored = await reopened.auth.getSession();
    assert.equal(restored.error, null);
    assert.equal(restored.data.session?.access_token, credentials.access_token);
    assert.equal((await reopened.auth.signOut({ scope: 'local' })).error, null);
    assert.equal(await sessionStorage.getItem(storageKey), null);
  } finally {
    await reopened.auth.dispose();
  }

  const afterSignOut = client(storageKey);
  try {
    assert.equal((await afterSignOut.auth.getSession()).data.session, null);
  } finally {
    await afterSignOut.auth.dispose();
  }
});
