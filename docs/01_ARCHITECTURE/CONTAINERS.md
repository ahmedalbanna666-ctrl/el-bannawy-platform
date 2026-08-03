# Containers

Version: 2.0.0
Status: Docker baseline

## Defined Images

- `docker/Dockerfile.backend`
- `docker/Dockerfile.web`
- `docker/docker-compose.yml` services: PostgreSQL, Redis, Mailpit, backend, web

## Container Rules

- Build from the repository lockfile and pinned package manifests.
- Keep database and Redis data in named volumes for local development.
- Pass secrets through environment/deployment secret management.
- Do not use compose fallback credentials in production.
- Run migration deployment as an explicit release step.

## Current Health

PostgreSQL and Redis have container health checks. The backend liveness check is `/api/v1/home/health`. Web depends on backend startup but does not have a complete application readiness contract.

## Planned Containers

Queue workers, AI workers, notification workers, reverse proxy, metrics, logs, and tracing containers are not part of the current compose file and must not be treated as deployed.

End of Document.
