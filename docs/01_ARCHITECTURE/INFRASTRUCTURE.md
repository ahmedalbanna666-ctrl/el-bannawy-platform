# Infrastructure

Version: 2.0.0
Status: Current local/container baseline

## Current Topology

```text
Web container -> Backend container -> PostgreSQL
                                      |
                                      +-> local file storage
                                      +-> optional AI-compatible provider
```

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
