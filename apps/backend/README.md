# TOEIC Path AI — Backend API

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)
![Redis](https://img.shields.io/badge/Redis-8-DC382D.svg)

> Production-ready REST API powering **TOEIC Path AI** — an online TOEIC exam preparation platform featuring a full Part 1–7 Question Bank, Maker-Checker Moderation, Exam Builder & Lifecycle Management, an Anti-Cheat Snapshot Exam Engine, and Automated ETS 10–990 Scoring.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Documentation & Modules](#api-documentation--modules)
- [Security & Operations](#security--operations)
- [Scripts & Testing](#scripts--testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Security Policy](#security-policy)
- [License](#license)

---

## Features

- **Authentication & RBAC:** RS256 asymmetric JWT access tokens, rotating HTTP-only refresh cookies (`SHA-256` hashed in PostgreSQL), Google OAuth 2.0 sign-in, Brevo/Console password reset flow, and role-based access control (`student`, `teacher`, `admin`).
- **User Profile & Admin Management:** Profile management, WebP avatar normalization (`sharp`) on Supabase Storage, and admin user role/status lifecycle with automatic session revocation.
- **TOEIC Question Bank (Parts 1–7):** Standalone questions and passage/audio Question Groups, option management, TOEIC Part / Topic / Skill / Difficulty classification, ownership-enforced editing (`Read-All, Edit-Own`), and human-readable codes (`Q-00001`, `QG-00001`).
- **Media & Bulk Import:** Presigned media upload flow, orphan media tracking, and asynchronous Excel/ZIP bulk question import powered by **BullMQ + Redis**.
- **Maker-Checker Review & Versioning:** Content review queue (`pending_review` → `published` / `rejected`), version history snapshots, and field-level diff inspection.
- **Exam Builder & Publishing Lifecycle:** Support for `full_test`, `mini_test`, and `placement_test`; Part 1–7 section builder; optimistic locking (`version`); publish checklist validation; scheduled auto-closure; SEO slugs (`Exam.slug`); and attempt-protected delete/unpublish guards.
- **Anti-Cheat Exam Engine & ETS Scoring:** Immutable JSONB attempt snapshots, Zero Answer Leakage during active attempts, `full_exam` and `part_practice` modes, server-synced timer, conditional auto-save and offline batch sync, `AutoSubmitCron` for expired attempts, ETS 10–990 score conversion, detailed answer review with multi-axis filters, attempt history, and student question-issue reporting (`RP-xxxxx`).
- **Dual-Lookup Public Identifiers:** Supports both canonical UUIDs and friendly identifiers (`Exam.slug`, `att_xxxx`, `Q-00001`, `QG-00001`) across public and management endpoints.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | NestJS 11, Express, TypeScript 5.7 |
| **Database & ORM** | PostgreSQL 16, TypeORM (`synchronize: false`, migration-driven) |
| **Queue & Cache** | Redis 8, BullMQ (`@nestjs/bullmq`), `ioredis` |
| **Authentication** | Passport JWT (RS256), `bcrypt`, `google-auth-library`, HTTP-only cookies |
| **Object Storage** | Supabase Storage (`avatars`, `media`), `sharp` (WebP processing) |
| **Email Delivery** | Brevo REST API (production) / Console adapter (development) |
| **API Docs** | OpenAPI 3 / Swagger UI (`@nestjs/swagger`) |
| **Testing & QA** | Jest (Unit & E2E), Newman CLI (Postman API regression suites) |

---

## Prerequisites

- **Node.js** `>= 22.x`
- **pnpm** `10.30.3` (`corepack enable`)
- **Docker & Docker Compose** (for local PostgreSQL 16 & Redis 8)
- **OpenSSL** (to generate local RS256 key pair)

---

## Quick Start

Run the backend locally in under 5 minutes:

```bash
# 1. Start PostgreSQL 16 (port 5400) and Redis 8 (port 6379) from repository root
docker compose up -d

# 2. Move into the backend directory and install dependencies
cd apps/backend
pnpm install

# 3. Create your local environment file
cp .env.example .env

# 4. Generate a local RS256 key pair (NEVER commit keys/ or .env)
mkdir -p keys
openssl genpkey -algorithm RSA -out keys/private.key -pkeyopt rsa_keygen_bits:2048
openssl rsa -in keys/private.key -pubout -out keys/public.key

# 5. Apply database migrations
pnpm migration:run

# 6. Seed the initial administrator account (uses INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD)
pnpm seed:admin

# 7. Start the development server
pnpm run start:dev
```

Once running:
- **API Base URL:** `http://localhost:3001/api/v1`
- **Health Check:** `http://localhost:3001/api/v1/health`
- **Swagger UI:** `http://localhost:3001/api/docs`

---

## Environment Variables

All environment variables are strictly validated on startup (`src/config/environment.validation.ts`). Copy `.env.example` and configure the following groups:

| Group | Key Variables | Required | Description |
| :--- | :--- | :---: | :--- |
| **App & Proxy** | `NODE_ENV`, `PORT`, `API_PREFIX`, `FRONTEND_URL`, `TRUST_PROXY_HOPS`, `CORS_ORIGINS`, `AUTH_ALLOWED_ORIGINS` | Yes | Server runtime, CORS allowlist, origin guard, and reverse-proxy hop count (`1` behind Render/Railway/Nginx). |
| **PostgreSQL** | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `DB_SSL` | Yes | PostgreSQL 16 connection settings. Set `DB_SSL=true` for cloud databases (Neon/Supabase). |
| **Redis** | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Yes | Redis 8 connection used by BullMQ queues and background workers. |
| **JWT & Auth** | `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `TERMS_VERSION`, `GOOGLE_CLIENT_ID` | Yes* | RS256 key file paths, token lifetimes, and Google OAuth client ID (*`GOOGLE_CLIENT_ID` is strictly required when `NODE_ENV=production`). |
| **Refresh Cookie** | `REFRESH_COOKIE_NAME`, `REFRESH_COOKIE_PATH`, `REFRESH_COOKIE_MAX_AGE_MS`, `REFRESH_COOKIE_SECURE`, `REFRESH_COOKIE_SAME_SITE` | Yes | `REFRESH_COOKIE_MAX_AGE_MS` must match `JWT_REFRESH_EXPIRES_IN`. `Secure=true` is mandatory when `SameSite=none`. |
| **Storage** | `STORAGE_PROVIDER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET_AVATARS`, `STORAGE_BUCKET_MEDIA`, `AVATAR_*` | Yes | Supabase Storage credentials and WebP avatar constraints. Create public `avatars` and `media` buckets before uploading. |
| **Email** | `MAIL_PROVIDER` (`console` \| `brevo`), `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`, `PASSWORD_RESET_URL` | Yes* | Use `console` in development and `brevo` in production (*`BREVO_API_KEY` is required only when `MAIL_PROVIDER=brevo`). |
| **Security & Rate Limit** | `RATE_LIMIT_ENABLED`, `RATE_LIMIT_*`, `SECURITY_EVENT_HMAC_KEY`, `SECURITY_EVENT_*` | Yes* | Rate-limiting policies and structured security audit logging (*`SECURITY_EVENT_HMAC_KEY` >= 32 chars required in production). |
| **Admin Seed** | `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | Seed only | Used exclusively by `pnpm seed:admin` (never executed automatically on app boot). |

> **Security Warning:** Never commit `.env`, `keys/private.key`, or `SUPABASE_SERVICE_ROLE_KEY` to Git. Keep `SUPABASE_SERVICE_ROLE_KEY` strictly backend-only.

---

## API Documentation & Modules

Interactive OpenAPI documentation is available at **`/api/docs`** (all endpoints are prefixed with **`/api/v1`**).

| Module | Base Route(s) | Summary |
| :--- | :--- | :--- |
| **Health** | `/health`, `/health/db` | Liveness probe and authenticated DB connectivity check. |
| **Auth** | `/auth/*` | Registration, login, Google OAuth, cookie refresh rotation, logout/revoke, password reset. |
| **Profile** | `/profile/me`, `/profile/me/avatar` | Self-service profile updates and WebP avatar upload/removal. |
| **Admin Users** | `/admin/users/*` | Paginated user listing, role assignment, account lock/unlock with session revocation. |
| **Questions & Groups** | `/questions/*`, `/question-groups/*`, `/toeic-parts`, `/topics`, `/skills` | Part 1–7 CRUD, options, classification, ownership guards, and Maker-Checker review queue. |
| **Media & Import** | `/media/*`, `/questions/import/*` | Presigned uploads, media verification, and BullMQ Excel/ZIP bulk import jobs. |
| **Exams** | `/exams/*`, `/exams/manage` | Exam CRUD, section & question builder, optimistic locking, publish/unpublish/close/archive, public catalog & overview. |
| **Exam Attempts** | `/exam-attempts/*` | Start/resume/abandon attempt, question delivery (Zero Answer Leakage), single & batch auto-save, submit & ETS grading, score report, review, history. |
| **Question Reports** | `/questions/:id/reports`, `/question-reports/*` | Student issue reporting with duplicate-open protection and teacher/admin moderation queue. |

---

## Security & Operations

- **Tiered Rate Limiting & Origin Protection:** Endpoints are protected by `PolicyThrottlerGuard` (`@ThrottlePolicy(...)`) and `AuthOriginGuard` (`AUTH_ALLOWED_ORIGINS`). Configure `TRUST_PROXY_HOPS` to the exact number of trusted reverse proxies (`1` on Render/Railway/Nginx) so `request.ip` resolves accurately.
- **Structured Security Event Logging:** Auth failures, origin rejections, rate-limit hits, and admin actions are emitted as single-line JSON logs correlated via `X-Request-Id` / `traceId` with centralized secret redaction.
- **Background Scheduled Jobs (`@nestjs/schedule`):**
  - Daily expired/revoked `auth_sessions` cleanup (guarded by PostgreSQL advisory locks).
  - Scheduled automatic closure of expired exams.
  - Periodic `AutoSubmitCron` for timed-out `in_progress` exam attempts.
- **Zero Answer Leakage:** Active exam overviews and attempt question delivery strictly strip `isCorrect`, `correctOptionId`, and `explanation` until submission and grading complete.

---

## Scripts & Testing

```bash
# Build production bundle
pnpm run build

# Lint & format
pnpm run lint
pnpm run format

# Run Jest unit tests
pnpm run test

# Run E2E tests
pnpm run test:e2e

# Generate coverage report
pnpm run test:cov

# Database migrations (schema sync is disabled)
pnpm migration:run
pnpm migration:revert

# Seed initial administrator (idempotent)
pnpm seed:admin
```

---

## Deployment

Deployment guides for both **Free Tier** (Render + Neon + Redis Cloud + Supabase) and **Production Paid Tier** (Railway + Supabase Pro / Self-hosted VPS) across `dev` and `main` branches are documented in:
- [Backend Deployment Architecture](../../docs/devops/deploy-be.md)
- [Step-by-Step Free Tier Guide](../../docs/devops/instruct-deploy-be-free.md)

---

## Contributing

1. Create a feature branch from `dev` (e.g., `feat/my-feature` or `fix/my-bug`).
2. Follow **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
3. Ensure `pnpm run lint`, `pnpm run build`, and `pnpm run test` pass with zero errors before opening a Pull Request targeting `dev`.
4. Never commit secrets, `.env` files, or private keys.

---

## Security Policy

If you discover a security vulnerability, **do not open a public GitHub Issue**. Please report it privately to the project maintainers via GitHub Security Advisories or direct maintainer contact with reproduction steps and impact details so it can be patched responsibly before public disclosure.

---

## License

This project is licensed under the **MIT License** — see the root [LICENSE](../../LICENSE) file for details.
