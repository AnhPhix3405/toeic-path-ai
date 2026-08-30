## Project setup

```bash
$ pnpm install
```

Copy `.env.example` to `.env`, configure PostgreSQL, and generate a local RSA
key pair (never commit these files):

```bash
mkdir keys
openssl genpkey -algorithm RSA -out keys/private.key -pkeyopt rsa_keygen_bits:2048
openssl rsa -in keys/private.key -pubout -out keys/public.key
pnpm migration:run
```

Required authentication settings are `JWT_PRIVATE_KEY_PATH`,
`JWT_PUBLIC_KEY_PATH`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, and
`BCRYPT_SALT_ROUNDS`. The application fails during startup when either RSA key
path is missing or unreadable.

Refresh-cookie settings are `REFRESH_COOKIE_NAME`, `REFRESH_COOKIE_PATH`,
`REFRESH_COOKIE_MAX_AGE_MS`, `REFRESH_COOKIE_SECURE`, and
`REFRESH_COOKIE_SAME_SITE`. Cookie max age must match the refresh JWT lifetime.
Use `Secure=true` whenever `SameSite=none` is required in production.

Authentication endpoints use the global `/api/v1` prefix:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout` (Bearer access token)
- `POST /api/v1/auth/revoke` (Bearer access token)
- `GET /api/v1/auth/me` (Bearer access token)

Login and refresh return the access token in JSON and transport the refresh
token exclusively through an HTTP-only cookie. Clients must send requests with
credentials enabled. Refresh tokens are rotated per use and only their SHA-256
hashes are stored.

Role-protected administrator endpoints are:

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/:id`
- `PATCH /api/v1/admin/users/:id/role`
- `PATCH /api/v1/admin/users/:id/status`

Public registration always creates an active Student. To create the first
administrator, set `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`, then run
`pnpm seed:admin`. The command is idempotent for an existing administrator and
is never run automatically during application startup. Changing a role or
locking an account revokes its active sessions; unlocking does not restore old
sessions.

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Database migrations

```bash
pnpm migration:run
pnpm migration:revert
```

The TypeORM CLI reads database settings from `.env`. Schema synchronization is
disabled; all schema changes must use migrations.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
