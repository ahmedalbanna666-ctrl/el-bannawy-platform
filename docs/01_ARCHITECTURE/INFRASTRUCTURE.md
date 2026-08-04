# Infrastructure

Version: 2.0.0
Status: Current local/container baseline

## Current Topology

```text
Web container -> Backend container -> PostgreSQL
                                      |
                                      +-> file storage (local disk or Cloudflare R2)
                                      +-> optional AI-compatible provider
```

File uploads (lesson documents, saved documents, certificates, UI images, AI
knowledge-base files) flow through the `FileStorage` abstraction. The default
backend is local disk (`uploads/`). When the `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET` environment variables
are set, files are stored in Cloudflare R2 via its S3-compatible API instead.
The `/files/*` URL shape is identical for both backends, so existing database
rows and client URLs keep working.

`docker/docker-compose.yml` also provisions Redis and Mailpit. They are available for local development but are not active application dependencies in the current backend.

## Current Containers

- `postgres`: PostgreSQL 16 with persistent volume and health check
- `redis`: Redis 7 with persistent volume and health check, currently unused by backend logic
- `mailpit`: local mail inspection service, currently unused by backend delivery logic
- `backend`: NestJS API on port 4000
- `web`: Next.js application on port 3000

## Current Health Check

The backend exposes `/api/v1/home/health`. Compose uses it as a liveness check. It does not yet validate database, Redis, AI, or payment-provider readiness.

## Not Yet Provisioned As Runtime Architecture

Cloudflare, Nginx, BullMQ workers, AI workers, notification workers, Prometheus, Grafana, Loki, OpenTelemetry, object storage, load balancing, and multi-region/read-replica infrastructure remain deployment plans.

## Production Requirements Before Claiming Readiness

- Managed PostgreSQL backup/restore and migration procedure
- Secret manager and non-default credentials
- HTTPS/CORS/reverse-proxy configuration
- Database readiness and application metrics
- Upload storage policy and cleanup
- Rollback and smoke-test procedure

End of Document.
