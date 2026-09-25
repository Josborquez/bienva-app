export function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
export function newPasswordError(password: string, confirmation: string): 'passwordShort' | 'passwordMismatch' | null {
  if (password.length < 8) return 'passwordShort';
  if (password !== confirmation) return 'passwordMismatch';
  return null;
}
export function authErrorKey(error: unknown, fallback: 'loginError' | 'signupError' | 'sendError' | 'updateError') {
  const failure = error as { status?: number; code?: string } | null;
  if (failure?.status === 429) return 'rateLimit';
  if (failure?.code === 'invalid_credentials') return 'invalidCredentials';
  if (failure?.code === 'email_not_confirmed') return 'emailUnconfirmed';
  if (failure?.code === 'weak_password') return 'weakPassword';
  if (failure?.code === 'same_password') return 'samePassword';
  if (failure?.code === 'reauthentication_needed' || failure?.code === 'session_not_found') return 'reauthenticate';
  return fallback;
}
