# Master Execution Plan

## El-bannawy Platform

Version: 2.0.0
Status: Active implementation baseline
Last reviewed: 2026-07-21

## Purpose

This is the execution source of truth for the repository as it exists today. It replaces the original bootstrap-only plan. New work must be based on the actual monorepo structure and must update documentation when behavior changes.

## Current Architecture

```text
Web / Mobile clients
        |
        v
NestJS API (/api/v1)
        |
        v
Prisma service -> PostgreSQL
        |
        +-> local file storage and external providers
        +-> configurable AI-compatible chat endpoint
```

The backend is a modular monolith. Controllers handle transport and guards; services contain application logic; Prisma is the current persistence boundary. A separate repository layer, Redis cache, and BullMQ worker layer are not currently implemented.

## Implemented Milestones

| Area                            | Status                                            | Evidence                                    |
| ------------------------------- | ------------------------------------------------- | ------------------------------------------- |
| Monorepo bootstrap              | Implemented                                       | `apps/*`, `packages/shared`, `database`     |
| Web application                 | Implemented baseline                              | `apps/web/src/app`                          |
| Mobile bootstrap                | Partial                                           | `apps/mobile/app`                           |
| NestJS API                      | Implemented baseline                              | `apps/backend/src/app.module.ts`            |
| Prisma schema and migrations    | Implemented baseline                              | `database/prisma`                           |
| Authentication and sessions     | Implemented                                       | `auth` module                               |
| RBAC and delegated permissions  | Implemented for student/teacher/staff/admin paths | `shared/permissions`, delegated service     |
| Curriculum and lesson engine    | Implemented baseline                              | `curriculum`, `lesson`, `video`, `activity` |
| DOCX question/vocabulary import | Implemented                                       | `document-import` and lesson routes         |
| Homework and quiz flows         | Implemented baseline                              | `homework`, `quiz`, `execution`             |
| Assessment engine/player        | Implemented baseline                              | assessment persistence and web player       |
| Stories and final review        | Implemented baseline                              | `story`, `final-review`                     |
| Live classes                    | Implemented baseline                              | `live` module                               |
| Live provider abstraction       | Implemented                                       | `live/meeting-provider` (MeetingProvider port + ZoomProvider) |
| Scheduler infrastructure        | Implemented                                       | `scheduler` module (BullMQ, `scheduled-notifications` queue) + scheduled-notification consumer |
| Live waiting list (Phase 1B)    | Implemented                                       | `live-waitlist.service` + `LiveWaitingList` model + auto-promote on seat release |
| Live reschedule (Phase 1B)      | Implemented                                       | `LiveBooking.rescheduleStatus` lifecycle + request/decision endpoints |
| Live monetization (Phase 1B)    | Implemented                                       | Subscription `sessionsUsed` consumed per policy (`LivePolicyEngine` bootstrap default CONSUME_ON_BOOKING), credited per refund policy |
| Refund ledger (Phase 1B)        | Implemented                                       | `LiveRefund` model + `POST /payments/:id/refund` ledger row |
| Coupon FK (Phase 1B)            | Implemented                                       | `payments.couponId` → `coupons.id` FK (orphan scan clean) |
| Scheduled notifications (Phase 1B) | Implemented                                    | `notifications.scheduledAt/sentAt` + BullMQ `ScheduledNotificationsProcessor` |
| Coins and unlock economy        | Implemented baseline                              | `coins` module and migrations               |
| Competitions and achievements   | Implemented baseline                              | `competition` and profile/dashboard paths   |
| Support and mistakes            | Implemented baseline                              | `support`, `mistakes`                       |
| AI chat and recommendations     | Implemented (enterprise AI features)             | `ai` module + `ai-settings` + `ai-provider` service (multi-provider failover, SSE streaming, prompt versioning, credits ledger, feedback/favorites/regenerate) |
| RAG/vector retrieval            | Implemented baseline (pgvector)                  | `ai-knowledge-base` module, `vector(1536)`  |
| AI operations                   | Implemented (admin/teacher)                      | `ai-settings` module (plans, packages, credits, teaching styles, prompt templates, model configs, usage/moderation logs, analytics) |
| Production hardening            | In progress                                       | See `docs/BACKEND_PRODUCTION_AUDIT.md`      |

## Delivery Order From This Point

1. Keep the implemented baseline stable and documented.
2. Close security and payment hardening findings before production exposure.
3. Add pagination and consistent DTO/response contracts to growing list endpoints.
4. Add automated integration and end-to-end coverage for money, access, assessment, and live-session flows.
5. Add operational health checks, structured logs, metrics, and deployment smoke tests.
6. Add Redis/BullMQ only when a documented feature requires them.
7. Implement the RAG/vector AI architecture after curriculum retrieval and privacy requirements are approved.

## Quality Gates

Before merging a behavior change:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Relevant backend, web, shared, and end-to-end tests
- Prisma migration review for schema changes
- Documentation update and endpoint/role verification
- Security review for authentication, authorization, uploads, payments, and personal data

## Definition of Done

A change is complete only when:

- The implemented behavior matches the documented behavior.
- The correct role and permission checks are enforced server-side.
- DTO validation exists for external input where the module contract requires it.
- Database writes are safe for multi-step operations.
- Loading, empty, error, dark-mode, RTL, responsive, and accessible UI states are handled where applicable.
- Tests cover the changed business path.
- Documentation states limitations instead of promising future integrations.

## Non-Implemented Architecture

These remain planned and must not be presented as active runtime dependencies:

- Redis caching
- BullMQ job consumers/workers (the scheduler queue infrastructure in the `scheduler` module exists, but no processors are registered)
- FCM, email, WhatsApp, and SMS delivery
- Full observability stack
- Public Swagger/OpenAPI contract
- Parent, marketplace, offline, and desktop products

End of Document.
