# Deployment Guide

Version: 3.0.0
Status: Vercel (frontend) + Container host (backend)

## Architecture

This platform is deployed as two separate services:

| Service | Runtime | Host |
| --- | --- | --- |
| Frontend (`apps/web`, Next.js) | Vercel | Vercel (project `el-bannawy-web`) |
| Backend (`apps/backend`, NestJS) | Long-running container | Container host (Render/Railway/Fly.io) |
| PostgreSQL | Managed | Neon / hosted provider |
| Redis | Managed | Hosted provider (BullMQ scheduler workers) |

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

## Backend → Container host

A Render blueprint is provided at `render.yaml`. It deploys the NestJS backend from `docker/Dockerfile.backend` as a persistent web service with a `/api/v1/home/health` health check.

Required secrets (set in the container host):

- `DATABASE_URL`, `DIRECT_URL` (PostgreSQL)
- `REDIS_HOST`, `REDIS_PORT` (Redis for BullMQ)
- `JWT_SECRET`, `COOKIE_SECRET`, `PAYMENT_WEBHOOK_SECRET`
- `FRONTEND_URL` (the Vercel URL, e.g. `https://el-bannawy-web.vercel.app`)
- `PUBLIC_BASE_URL`, `CORS_ORIGINS`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`

After deployment, set the backend URL as the rewrite destination in `apps/web/vercel.json` and redeploy the frontend.

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

## Post-Deploy Smoke Test

1. Open `https://el-bannawy-web.vercel.app` and confirm the login page renders.
2. Confirm `/api/v1/...` requests are rewritten to the backend (e.g. `/api/v1/home/health`).
3. Verify login and refresh-token flow (cookies must be same-origin via the rewrite).
4. Verify a read-only curriculum request.
5. Verify migration status and logs contain no secrets.

End of Document.
