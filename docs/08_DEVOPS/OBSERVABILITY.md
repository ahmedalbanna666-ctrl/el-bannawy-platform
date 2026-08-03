# Observability

Version: 2.0.0
Status: Current gaps and target design

## Implemented Today

- NestJS logger output during bootstrap.
- Login history and selected audit records in PostgreSQL.
- Backend liveness response at `/api/v1/home/health`.
- Docker health checks for PostgreSQL and Redis.

## Not Yet Implemented

- Structured request logs and correlation IDs
- Prometheus metrics, Grafana dashboards, Loki logs, OpenTelemetry traces
- Database/Redis/queue/AI cost dashboards
- Alert routing and incident automation
- Readiness checks for all dependencies

## Minimum Production Observability

1. Request ID from ingress through API logs.
2. Redacted method/path/status/duration logs.
3. Error-rate, latency, throughput, database connection, and process health metrics.
4. Authentication, permission, payment, code redemption, and migration audit events.
5. Alerts for API down, database failure, error spikes, payment verification failure, and storage exhaustion.

Never log passwords, tokens, API keys, payment payloads, verification codes, or unnecessary personal data.

End of Document.
