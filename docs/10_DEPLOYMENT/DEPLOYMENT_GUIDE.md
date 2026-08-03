# Deployment Guide

Version: 3.1.0
Status: Vercel (frontend) + Railway (backend)

## Architecture

This platform is deployed as two separate services:

| Service | Runtime | Host |
| --- | --- | --- |
| Frontend (`apps/web`, Next.js) | Vercel | Vercel (project `el-bannawy-web`) → https://el-bannawy-web.vercel.app |
| Backend (`apps/backend`, NestJS) | Long-running container | Railway (service `el-bannawy-backend`) → https://el-bannawy-backend-production.up.railway.app |
| PostgreSQL | Managed | Neon |
| Redis | Provisioned | Railway (BullMQ scheduler workers) |

The backend is a long-running NestJS process that runs BullMQ workers (`ScheduledNotificationsProcessor`, `SubscriptionPeriodEndProcessor`) and stores uploaded files on the local filesystem. It must therefore run on a **persistent container host**, not on Vercel serverless functions.

## Frontend → Vercel

### Project configuration

- Vercel project name: `el-bannawy-web`
- Root Directory: `apps/web`
- Framework: Next.js
- Build Command: `pnpm --filter @el-bannawy/shared build && pnpm --filter @el-bannawy/web build`
- Install Command: `pnpm install --frozen-lockfile`
- Output Directory: `.next`

These settings live in `apps/web/vercel.json` and were pushed to the project via the Vercel API.

### Required env vars (Vercel)

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `/api/v1` (same-origin; Vercel rewrites `/api/*` to the backend) |

`NEXT_PUBLIC_FIREBASE_*` values should also be added if Firebase Auth/FCM is used.

### API rewrites

`apps/web/vercel.json` rewrites `/api/:path*` to the backend URL. Update the placeholder after the backend container is deployed:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR-BACKEND-URL/api/:path*"
    }
  ]
}
```

Keeping the API same-origin via rewrites preserves `sameSite: "strict"` auth cookies.

### Deploy via CLI

```powershell
vercel link --project el-bannawy-web --yes   # from repo root
vercel deploy --prod --yes                    # from repo root
```

## Backend → Railway

The backend runs on Railway, built from the GitHub repo root `Dockerfile` (monorepo-aware). The build:

1. Installs all workspace dependencies (`pnpm install --frozen-lockfile`)
2. Builds `packages/shared`
3. Runs `prisma generate` in `database`
4. Runs `nest build` in `apps/backend`
5. Deploys the package via `pnpm deploy --legacy` (self-contained `node_modules`)
6. Regenerates the Prisma client inside the deployed package
7. Starts with `node out/dist/src/main.js`

Deployed URL: https://el-bannawy-backend-production.up.railway.app

Required secrets (set as Railway service variables):

- `DATABASE_URL`, `DIRECT_URL` (PostgreSQL/Neon)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_USER`, `REDIS_PASSWORD` (Redis service on Railway)
- `JWT_SECRET`, `COOKIE_SECRET`, `PAYMENT_WEBHOOK_SECRET`
- `AI_ENCRYPTION_KEY` (required, min 32 chars, in production)
- `FRONTEND_URL` (the Vercel URL, e.g. `https://el-bannawy-web.vercel.app`)
- `PUBLIC_BASE_URL`, `CORS_ORIGINS`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`

The Vercel frontend rewrites `/api/*` to this URL (configured in `apps/web/vercel.json`).

### Railway Redis

A `Redis` service is provisioned on the same Railway project. The backend's BullMQ scheduler workers connect via `REDIS_HOST`/`REDIS_PORT`/`REDIS_USER`/`REDIS_PASSWORD`. The `scheduler.module.ts` reads these env vars.

## Build And Verify

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @el-bannawy/backend test
pnpm --filter @el-bannawy/web test
docker compose -f docker/docker-compose.yml build
```

## Database

Run migrations through Prisma:

```powershell
pnpm --filter @el-bannawy/database migrate:deploy
```

Review migration status and backup/restore procedures before applying production changes. Never run `migrate:reset` against production.

## Runtime Health

The backend exposes `GET /api/v1/home/health` without authentication. It returns `{ status: "ok", timestamp }` and is used by the container host health check.

## Seed Accounts (Production DB)

Created by `database/prisma/seed.ts` (idempotent — re-running rebuilds demo data). All share password `Test@1234`.

| Role | Email | Login verified |
| --- | --- | --- |
| ADMINISTRATOR | `admin@elbannawy.com` | ✅ 201 |
| ADMINISTRATOR | `ahmed.albanna6666@gmail.com` | ✅ in DB |
| TEACHER | `teacher@elbannawy.com` | ✅ 201 |
| TEACHER | `ahmed.albanna666@gmail.com` | ✅ in DB |
| STUDENT | `student@elbannawy.com` | ✅ in DB |

> These accounts have `status: ACTIVE` but `emailVerifiedAt: null`. Login is allowed (they were created before the email-verification gate). To harden, run the seed accounts through `/auth/verify-email` or set `emailVerifiedAt` directly.

## Post-Deploy Smoke Test

1. Open `https://el-bannawy-web.vercel.app` and confirm the login page renders (HTTP 200).
2. Confirm `/api/v1/...` requests are rewritten to the backend: `https://el-bannawy-web.vercel.app/api/v1/home/health` → `{"status":"ok"}`.
3. Verify login and refresh-token flow (cookies must be same-origin via the rewrite).
4. Verify a read-only curriculum request.
5. Verify migration status and logs contain no secrets.

## Verified Status (2026-08-04)

- Frontend: `https://el-bannawy-web.vercel.app` → HTTP 200 (Ready).
- Backend health via Vercel rewrite: `https://el-bannawy-web.vercel.app/api/v1/home/health` → `{"status":"ok"}`.
- Backend direct: `https://el-bannawy-backend-production.up.railway.app/api/v1/home/health` → `{"status":"ok"}`.
- Redis: Railway `Redis` service SUCCESS; BullMQ scheduler workers registered at boot.
- Backend logs: `Nest application successfully started`, no `EACCES`/config errors.
- Brevo: transactional email configured (`BREVO_API_KEY`, `BREVO_SENDER_EMAIL=ahmed.albanna6666@gmail.com`); test send verified (HTTP 201).
- Admin login: `admin@elbannawy.com` / `Test@1234` → 201 via production API.
- Teacher login: `teacher@elbannawy.com` / `Test@1234` → 201 via production API.

End of Document.
