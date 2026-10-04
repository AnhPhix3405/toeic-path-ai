import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class RateLimitKeyService {
  constructor(private readonly configService: ConfigService) {}

  ip(request: Request, endpoint: string): string {
    return this.key(endpoint, 'ip', this.normalizeIp(request.ip));
  }

  user(userId: string, endpoint: string): string {
    const environment = this.configService.get<string>('rateLimit.environment', 'development');
    return `${environment}:upload:${endpoint}:user:${userId}`;
  }

  uploadIp(request: Request, endpoint: string): string {
    const environment = this.configService.get<string>('rateLimit.environment', 'development');
    return `${environment}:upload:${endpoint}:ip:${this.normalizeIp(request.ip)}`;
  }

  sensitive(endpoint: string, dimension: string, value: string): string {
    return this.key(endpoint, dimension, createHash('sha256').update(value).digest('hex'));
  }

  normalizeEmail(value: unknown): string | undefined {
    return typeof value === 'string' ? value.trim().toLowerCase() : undefined;
  }

  private normalizeIp(value: string | undefined): string {
    const ip = value || 'unknown';
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  }

  private key(endpoint: string, dimension: string, identifier: string): string {
    const environment = this.configService.get<string>('rateLimit.environment', 'development');
    return `${environment}:auth:${endpoint}:${dimension}:${identifier}`;
  }
}

