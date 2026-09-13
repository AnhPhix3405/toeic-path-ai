import { InMemoryAuthRateLimitStore } from './in-memory-auth-rate-limit.store';

describe('InMemoryAuthRateLimitStore', () => {
  afterEach(() => jest.useRealTimers());

  it('blocks above the limit and allows requests after the fixed window expires', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-13T00:00:00Z'));
    const store = new InMemoryAuthRateLimitStore();
    expect(store.consume('key', 2, 60).allowed).toBe(true);
    expect(store.consume('key', 2, 60).allowed).toBe(true);
    expect(store.consume('key', 2, 60).allowed).toBe(false);
    jest.advanceTimersByTime(60_000);
    expect(store.consume('key', 2, 60).allowed).toBe(true);
  });

  it('resets a tracker independently', () => {
    const store = new InMemoryAuthRateLimitStore();
    store.consume('login-email', 1, 60);
    expect(store.isBlocked('login-email', 1)).toBe(true);
    store.reset('login-email');
    expect(store.isBlocked('login-email', 1)).toBe(false);
  });
});
