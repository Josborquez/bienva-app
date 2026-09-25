import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAuthCallback, authCallbackTarget } from '../src/api/authCallback.ts';

test('opens a native magic link with fragment credentials', () => {
  assert.deepEqual(parseAuthCallback('bienva://auth/callback#access_token=abc&refresh_token=xyz', 'bienva://auth/callback'), { access_token: 'abc', refresh_token: 'xyz' });
});
test('opens an Expo Go callback and decodes URL parameters', () => {
  assert.deepEqual(parseAuthCallback('exp://192.168.1.3:8081/--/auth/callback#access_token=a%2Bb&refresh_token=x', 'exp://192.168.1.3:8081/--/auth/callback'), { access_token: 'a+b', refresh_token: 'x' });
});
test('rejects expired links and incomplete credentials', () => {
  assert.throws(() => parseAuthCallback('bienva://auth/callback#error_code=otp_expired', 'bienva://auth/callback'));
  assert.throws(() => parseAuthCallback('bienva://auth/callback#access_token=abc', 'bienva://auth/callback'));
});

test('opens an HTTPS callback only on the expected web origin', () => {
  const redirect = 'https://bienva.example/auth/callback';
  assert.deepEqual(parseAuthCallback(`${redirect}#access_token=abc&refresh_token=xyz`, redirect), { access_token: 'abc', refresh_token: 'xyz' });
  assert.equal(parseAuthCallback('https://other.example/auth/callback#access_token=abc&refresh_token=xyz', redirect), null);
  assert.equal(parseAuthCallback('http://bienva.example/auth/callback#access_token=abc&refresh_token=xyz', redirect), null);
  assert.throws(() => parseAuthCallback(`${redirect}#error_code=otp_expired`, redirect));
});
test('ignores unrelated routes, origins and schemes', () => {
  for (const url of ['https://auth/callback', 'bienva://other/callback', 'bienva://auth/wrong', 'exp://192.168.1.3:8081']) {
    assert.equal(parseAuthCallback(url, 'bienva://auth/callback'), null);
  }
});

test('recovery returns to the password form and a cleaned callback can be reopened', () => {
  for (const redirect of ['https://bienva.example/auth/callback', 'bienva://auth/callback', 'exp://192.168.1.3:8081/--/auth/callback']) {
    const link = `${redirect}#access_token=abc&refresh_token=xyz&type=recovery`;
    assert.deepEqual(parseAuthCallback(link, redirect), { access_token: 'abc', refresh_token: 'xyz' });
    assert.equal(authCallbackTarget(link, redirect), '/auth/password');
    assert.equal(authCallbackTarget(`${redirect}?recovery=1`, redirect), '/auth/password');
    assert.equal(parseAuthCallback(`${redirect}?recovery=1`, redirect), null);
    assert.equal(authCallbackTarget(`${redirect}#type=signup`, redirect), '/');
  }
  assert.equal(authCallbackTarget('https://other.example/auth/callback#type=recovery', 'https://bienva.example/auth/callback'), '/');
  assert.throws(() => parseAuthCallback('https://bienva.example/auth/callback#error_code=otp_expired&type=recovery', 'https://bienva.example/auth/callback'));
});
