import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAuthCallback } from '../src/api/authCallback.ts';

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
test('ignores unrelated routes, origins and schemes', () => {
  for (const url of ['https://auth/callback', 'bienva://other/callback', 'bienva://auth/wrong', 'exp://192.168.1.3:8081']) {
    assert.equal(parseAuthCallback(url, 'bienva://auth/callback'), null);
  }
});
