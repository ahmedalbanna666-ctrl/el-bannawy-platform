# Technology Stack

Version: 2.0.0
Status: Current repository inventory

## Runtime

| Layer            | Current implementation                                    |
| ---------------- | --------------------------------------------------------- |
| Monorepo         | pnpm workspaces and Turborepo                             |
| Language         | TypeScript with strict compiler settings                  |
| Web              | Next.js 15, React 19, App Router                          |
| Web styling      | Tailwind CSS 4, semantic CSS tokens, Lucide icons         |
| Web state        | TanStack Query and Zustand                                |
| Web forms        | React Hook Form and Zod where used                        |
| Mobile           | Expo 56, Expo Router, React Native 0.85                   |
| API              | NestJS 11, Express adapter                                |
| API validation   | class-validator, class-transformer, Joi config validation |
| Auth             | Passport JWT, Google OAuth strategy, bcryptjs             |
| ORM              | Prisma 6                                                  |
| Database         | PostgreSQL                                                |
| Shared contracts | `@el-bannawy/shared`                                      |
| Tests            | Jest backend, Vitest web/shared                           |
| Containers       | Docker Compose, separate backend/web Dockerfiles          |

## Current Infrastructure

- PostgreSQL is the required persistence service.
- Local Docker Compose also starts Redis and Mailpit.
- Local file storage is available through the backend common storage boundary.
- The backend currently does not consume Redis for caching.
- The backend uses BullMQ (`@nestjs/bullmq`, `bullmq`) for the scheduler queue infrastructure: a global `SchedulerModule` (`apps/backend/src/scheduler`) registers a `scheduled-notifications` queue and exposes a `BullJobQueue` (via the `JobQueue` port). A `ScheduledNotificationsProcessor` consumer dispatches scheduled notifications when their delayed job fires.
- The live module depends on a `MeetingProvider` port (`apps/backend/src/live/meeting-provider`) implemented by `ZoomProvider`; it never imports the Zoom vendor service directly.
- Live Classes V2 (Phase 1B) adds a waiting list (`LiveWaitingList`), reschedule lifecycle (`LiveBooking.rescheduleStatus`), subscription session consumption (`sessionsUsed`), and a refund ledger (`LiveRefund`). Consumption timing and cancellation refund eligibility are read through a `LivePolicyEngine` port (`apps/backend/src/live/policy`) implemented by `BootstrapLivePolicy` with temporary bootstrap defaults.

## Current External Boundaries

- Lesson videos use a provider abstraction with YouTube as the current provider.
- AI uses an OpenAI-compatible chat-completions endpoint configured by environment variables, with a rule-based fallback when no key is present.
- Payment code contains gateway abstractions and simulation support; real gateway credentials and certification are environment/deployment concerns.

## Planned, Not Yet Runtime Dependencies

The original design documents mention pgvector, RAG, LangChain, FCM, WhatsApp, Resend, Socket.IO, Prometheus, Grafana, Loki, Sentry, PostHog, MinIO, and Cloudflare R2. These must not be treated as active dependencies until they appear in package manifests and runtime modules.

## Configuration

Backend configuration is loaded through `ConfigModule` and validated with Joi. `JWT_SECRET` and `PAYMENT_WEBHOOK_SECRET` are required. Payment, Google, and AI provider variables are optional depending on the enabled integration.

End of Document.
