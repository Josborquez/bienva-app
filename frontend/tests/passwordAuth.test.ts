import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createPasswordAuth } from '../src/api/passwordAuth.ts';
import { authErrorKey, newPasswordError, validEmail } from '../src/utils/authValidation.ts';
import type { Database } from '../src/types/database.ts';

test('password validation preserves existing shorter passwords at sign-in and requires confirmation for new ones', () => {
  assert.equal(validEmail(' test@example.invalid '), true);
  assert.equal(validEmail('invalid'), false);
  assert.equal(newPasswordError('short', 'short'), 'passwordShort');
  assert.equal(newPasswordError('long-password', 'different'), 'passwordMismatch');
  assert.equal(newPasswordError('long-password', 'long-password'), null);
  assert.equal(authErrorKey({ code: 'invalid_credentials' }, 'loginError'), 'invalidCredentials');
  assert.equal(authErrorKey({ code: 'email_not_confirmed' }, 'loginError'), 'emailUnconfirmed');
  assert.equal(authErrorKey({ status: 429 }, 'sendError'), 'rateLimit');
  assert.equal(authErrorKey({ code: 'weak_password' }, 'updateError'), 'weakPassword');
  assert.equal(authErrorKey(new Error('private backend detail'), 'loginError'), 'loginError');
});

test('password login, signup, recovery and update use Supabase and the existing callback', async () => {
  const calls: { url: URL; method: string; body: Record<string, unknown> }[] = [];
  const user = { id: 'password-test-user', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  let rejectLogin = false;
  const client = createClient<Database>('https://password-test.supabase.co', 'test-public-key', {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ url, method: init?.method ?? 'GET', body });
      if (url.pathname.endsWith('/token')) {
        if (rejectLogin) return Response.json({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, { status: 400 });
        return Response.json({ user, access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600 });
      }
      if (url.pathname.endsWith('/signup')) return Response.json({ user });
      if (url.pathname.endsWith('/recover')) return Response.json({});
      if (url.pathname.endsWith('/user')) return Response.json({ user });
      throw new Error('Unexpected auth request');
    } },
  });
  const redirect = 'https://bienva.example/auth/callback';
  const auth = createPasswordAuth(client, redirect);
  try {
    await auth.signIn(' test@example.invalid ', ' short ');
    assert.equal(calls[0].url.searchParams.get('grant_type'), 'password');
    assert.equal(calls[0].body.email, 'test@example.invalid');
    assert.equal(calls[0].body.password, ' short ');
    assert.equal((await client.auth.getSession()).data.session?.user.id, user.id);
    const signup = await auth.signUp('new@example.invalid', 'long-password');
    assert.equal(signup.session, null);
    assert.equal(calls.find(call => call.url.pathname.endsWith('/signup'))?.url.searchParams.get('redirect_to'), redirect);
    await auth.recover(' test@example.invalid ');
    const recovery = calls.find(call => call.url.pathname.endsWith('/recover'))!;
    assert.equal(recovery.url.searchParams.get('redirect_to'), redirect);
    assert.equal(recovery.body.email, 'test@example.invalid');
    await auth.update('new-password');
    assert.equal(calls.find(call => call.method === 'PUT')?.body.password, 'new-password');
    rejectLogin = true;
    await assert.rejects(auth.signIn('test@example.invalid', 'incorrect'), (failure: unknown) => authErrorKey(failure, 'loginError') === 'invalidCredentials');
  } finally { await client.auth.dispose(); }
});
