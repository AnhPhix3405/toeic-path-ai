# Backend Agent Instructions

## Project context

This directory contains the backend for **TOEIC Path AI**, an adaptive TOEIC learning platform.

The backend is a NestJS modular monolith. PostgreSQL is the source of truth, TypeORM is the ORM, and schema changes are managed exclusively through migrations.

## Technology baseline

- TypeScript with strict type checking.
- NestJS.
- TypeORM.
- PostgreSQL.
- Jest and Supertest when tests are in scope.
- Docker and Docker Compose.
- Use the Node.js version and package manager declared by the repository.

Do not replace these technologies without explicit approval.

## Scope and change discipline

- Read root instructions and this file before editing backend code.
- Inspect existing files, scripts, configuration, and conventions before creating new ones.
- Make the smallest coherent change that completes the requested task.
- Do not implement future use cases, speculative abstractions, or unrelated refactors.
- Preserve user changes and unrelated work already present in the repository.
- Do not add frontend code from this directory.
- Do not commit, push, merge, or modify remote resources unless explicitly requested.

## Architecture rules

Use a modular-monolith structure organized by business capability:

```text
src/
├── common/
├── config/
├── database/
├── modules/
├── app.module.ts
└── main.ts
```

Inside a business module, prefer:

```text
module-name/
├── controllers/
├── dto/
├── entities/
├── repositories/
├── services/
├── tests/
└── module-name.module.ts
```

- Controllers handle transport concerns and delegate business work.
- Services coordinate use cases and business rules.
- DTOs define and validate external input.
- Entities represent persistence state; do not expose entities as public API contracts.
- Repositories encapsulate persistence queries that do not belong in services.
- A module must not directly access another module's repository without an explicit shared contract.
- Shared technical code belongs in `common`; domain-specific code stays in its module.
- Avoid circular dependencies and `forwardRef` unless no cleaner boundary exists.

## Naming and language

- Use English for filenames, folders, symbols, database objects, API paths, logs, and comments.
- Use `kebab-case` for folders and filenames.
- Use `PascalCase` for classes, types, DTOs, entities, interfaces, and enums.
- Use `camelCase` for methods, functions, variables, and object fields.
- Use `UPPER_SNAKE_CASE` for constants and environment variables.
- Use plural nouns for REST resources.
- User-facing API messages may be Vietnamese when required by the product contract.
- Prefer clear names over abbreviations.

## TypeScript rules

- Keep strict TypeScript enabled.
- Do not use `any` unless an external boundary makes it unavoidable and the reason is documented.
- Prefer `unknown` plus validation for untrusted values.
- Use `import type` for type-only imports when required by isolated modules or decorator metadata.
- Do not suppress compiler or lint errors without a documented reason.
- Keep public method return types explicit when inference would hide an important contract.

## Configuration and environment

- Load configuration through `@nestjs/config`.
- Validate required environment variables at startup.
- Group configuration by concern, such as application and database configuration.
- Never hardcode credentials, secrets, hostnames, or environment-specific URLs.
- Commit `.env.example`; never commit a real `.env` file.
- Fail fast with a clear message when required configuration is missing.
- Never log secret values.

## Database and TypeORM

- PostgreSQL is the authoritative persistent store.
- Keep `synchronize: false` in every environment intended to mirror production.
- Make schema changes through versioned TypeORM migrations.
- Provide a TypeORM CLI DataSource independent of NestJS application bootstrap.
- Use UUID primary keys for public domain entities unless the schema explicitly requires another type.
- Store timestamps as timezone-aware PostgreSQL values and handle application time in UTC.
- Use database constraints for invariants the database can enforce reliably.
- Use transactions for multi-write operations that must succeed or fail together.
- Avoid N+1 queries, unbounded list queries, and loading unnecessary relations.
- Do not run destructive migration or database-reset commands without explicit approval.
- Do not enable automatic production migration execution unless explicitly required by deployment design.

## API behavior

- Use the global prefix `/api/v1` unless the repository defines another contract.
- Validate request input at the application boundary.
- Use appropriate HTTP methods and status codes.
- Keep error responses consistent and do not expose stack traces or internal details.
- Never return password hashes, tokens, secret fields, or internal persistence metadata.
- Frontend checks never replace backend authentication, authorization, or ownership validation.
- Design mutating endpoints so retries cannot silently corrupt state.

## Security baseline

- Treat every external input as untrusted.
- Use parameterized ORM queries; never concatenate user input into SQL.
- Keep credentials and tokens out of source code, responses, and logs.
- Configure CORS from validated environment values.
- Apply request-size and upload limits when those features are introduced.
- Use rate limiting for authentication and abuse-sensitive endpoints when implemented.
- Hash passwords and sensitive reset/session tokens with approved libraries when authentication is in scope.

## Docker rules

- Use a multi-stage Dockerfile.
- Install dependencies deterministically from the lockfile.
- Keep the runtime image minimal and run as a non-root user where practical.
- Do not copy `.env`, local build output, dependency folders, or secrets into the image.
- Add a `.dockerignore` suited to the backend build context.
- Use service names, not `localhost`, between Docker Compose services.
- Use health checks and named volumes for stateful local services.
- Do not bake environment-specific credentials into images.

## Testing and verification

Before declaring a task complete, run the relevant repository commands:

1. Install dependencies using the lockfile.
2. Run the TypeScript build.
3. Run lint when configured.
4. Run relevant tests when configured or changed.
5. Start PostgreSQL and the backend through the documented local workflow.
6. Verify database connectivity and the health endpoint.
7. Verify the Docker image can build.

If a command cannot run, report the exact blocker. Never claim verification that was not performed.

## Documentation expectations

Update documentation when setup, environment variables, scripts, ports, migrations, or runtime behavior changes.

The backend README must document prerequisites, environment setup, local and Docker commands, migration commands, URLs, and common troubleshooting.

## Completion report

At the end of a task, report:

- files created or changed;
- key architectural decisions;
- commands executed and their results;
- migration or environment changes;
- unresolved issues or intentionally deferred work.
