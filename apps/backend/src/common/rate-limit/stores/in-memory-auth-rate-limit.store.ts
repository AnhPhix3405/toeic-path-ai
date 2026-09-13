import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import type { AuthRateLimitStore, RateLimitResult } from '../interfaces/rate-limit-store.interface';

interface Counter {
  count: number;
  expiresAt: number;
}

@Injectable()
export class InMemoryAuthRateLimitStore implements AuthRateLimitStore, OnApplicationShutdown {
  private readonly counters = new Map<string, Counter>();

  consume(key: string, limit: number, ttlSeconds: number): RateLimitResult {
    const now = Date.now();
    let counter = this.counters.get(key);
    if (!counter || counter.expiresAt <= now) {
      counter = { count: 0, expiresAt: now + ttlSeconds * 1000 };
      this.counters.set(key, counter);
    }
    counter.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((counter.expiresAt - now) / 1000));
    return {
      allowed: counter.count <= limit,
      limit,
      remaining: Math.max(0, limit - counter.count),
      retryAfterSeconds,
    };
  }

  isBlocked(key: string, limit: number): boolean {
    const counter = this.counters.get(key);
    if (!counter) return false;
    if (counter.expiresAt <= Date.now()) {
      this.counters.delete(key);
      return false;
    }
    return counter.count >= limit;
  }

  reset(key: string): void {
    this.counters.delete(key);
  }

  onApplicationShutdown(): void {
    this.counters.clear();
  }
}
