export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export interface AuthRateLimitStore {
  consume(
    key: string,
    limit: number,
    ttlSeconds: number,
  ): RateLimitResult | Promise<RateLimitResult>;
  isBlocked(key: string, limit: number): boolean | Promise<boolean>;
  reset(key: string): void | Promise<void>;
}
