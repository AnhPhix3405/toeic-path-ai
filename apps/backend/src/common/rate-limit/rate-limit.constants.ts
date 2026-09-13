export const AUTH_RATE_LIMIT_STORE = Symbol('AUTH_RATE_LIMIT_STORE');

export const AUTH_RATE_LIMIT_POLICY = Symbol('AUTH_RATE_LIMIT_POLICY');

export type AuthRateLimitPolicyName =
  'register' | 'login' | 'forgotPassword' | 'resetPassword' | 'refresh' | 'logout';
