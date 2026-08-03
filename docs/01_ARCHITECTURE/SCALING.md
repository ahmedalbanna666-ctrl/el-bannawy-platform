# Scaling Strategy

Version: 2.0.0
Status: Capacity risks and future direction

## Current Runtime Shape

The backend is a stateless NestJS modular monolith with PostgreSQL persistence. Web state is client-side/API-backed. Redis is provisioned but not used for cache or sessions by the current application.

## Current Bottlenecks To Address

- Several list queries are unpaginated.
- Some hot service paths perform repeated per-record queries.
- No shared cache layer is active.
- No queue worker exists for heavy AI, notification, import, or report work.
- No request/latency metrics exist to establish real capacity.

## Safe Scaling Sequence

1. Add query limits, pagination, indexes, and transaction boundaries.
2. Measure API/database latency and connection usage.
3. Introduce Redis for explicitly selected read-heavy data with invalidation rules.
4. Move long-running import, report, notification, and AI work to a queue after idempotency is defined.
5. Run multiple API/web instances behind a managed reverse proxy.
6. Evaluate database replicas/partitioning only from measured workload.

## Targets

The original `<300ms` API and `<3s` AI targets are goals, not verified current measurements. Load-test curriculum, assessment, coin, live, support, and AI paths before making concurrency claims.

End of Document.
