# Environments

Version: 3.0.0

## Local Development

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- PostgreSQL Compose host port: `5433`
- Redis Compose host port: `6379` (used by BullMQ scheduler workers)
- Mailpit UI: `http://localhost:8025` (local email capture)

Use `.env.example` as the variable inventory and create a local `.env`. Required backend secrets are validated at startup.

## Production

- Web: Vercel — project `el-bannawy-web`, Root Directory `apps/web`. See `docs/10_DEPLOYMENT/DEPLOYMENT_GUIDE.md`.
- API: Persistent container host (Render/Railway/Fly.io) running the NestJS backend, because BullMQ workers and local file uploads require a long-running process.
- Frontend reaches the API through Vercel rewrites (`/api/*` → backend URL), keeping requests same-origin so `sameSite: "strict"` cookies work.

## Docker Compose

`docker/docker-compose.yml` provisions PostgreSQL, Redis, Mailpit, backend, and web. Compose defaults are for local convenience only. Replace secrets and review the database URL before staging/production use.

## Environment Separation

Local, test, staging, and production databases and credentials must remain isolated. Never use production payment, AI, or user data in local/test environments.

## Current Configuration Reality

- PostgreSQL is required at runtime.
- Redis is required by BullMQ scheduler workers.
- AI and gateway integrations are optional/configured independently.
- The backend validates `NODE_ENV`, ports, URLs, JWT settings, payment webhook secret, and provider-specific variables through Joi.

End of Document.

