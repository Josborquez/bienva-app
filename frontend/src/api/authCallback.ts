export type CallbackCredentials = { access_token: string; refresh_token: string } | { code: string };

export function parseAuthCallback(incoming: string, expectedRedirect: string): CallbackCredentials | null {
  const url = new URL(incoming);
  const expected = new URL(expectedRedirect);
  if (url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname) return null;
  const params = new URLSearchParams(url.search);
  new URLSearchParams(url.hash.slice(1)).forEach((value, key) => params.set(key, value));
  if (params.has('error') || params.has('error_code')) throw new Error('Auth callback rejected');
  const code = params.get('code');
  if (code) return { code };
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) return { access_token, refresh_token };
  throw new Error('Missing callback credentials');
}
