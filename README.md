# TOEIC Path AI

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-000000.svg)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)
![Redis](https://img.shields.io/badge/Redis-8-DC382D.svg)

> Full-stack online TOEIC exam preparation platform featuring a Part 1–7 Question Bank, Maker-Checker Content Moderation, Exam Builder, Anti-Cheat Online Test Room, and Automated ETS 10–990 Scoring.

---

## Repository Structure

| Directory | Description | Documentation |
| :--- | :--- | :--- |
| `apps/backend` | NestJS 11 REST API, TypeORM (PostgreSQL 16), BullMQ (Redis 8), Swagger UI | [Backend README](./apps/backend/README.md) |
| `apps/frontend` | Next.js 16 (App Router), React 19, Tailwind CSS v4, TanStack Query, Zustand | [Frontend README](./apps/frontend/README.md) |
| `docs/devops` | Deployment guides for Backend & Frontend (`dev` & `main` branches) | [BE Deploy](./docs/devops/deploy-be.md) · [FE Deploy](./docs/devops/deploy-fe.md) |
| `docker-compose.yml` | Local PostgreSQL 16 and Redis 8 infrastructure | — |

---

## Quick Start

```bash
# 1. Start local PostgreSQL 16 and Redis 8
docker compose up -d

# 2. Setup and run Backend (see apps/backend/README.md for .env & RSA keys)
cd apps/backend
pnpm install && pnpm migration:run && pnpm run start:dev

# 3. Setup and run Frontend (in a separate terminal)
cd apps/frontend
pnpm install && pnpm dev
```

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:3001/api/v1`
- **Swagger UI:** `http://localhost:3001/api/docs`

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.
