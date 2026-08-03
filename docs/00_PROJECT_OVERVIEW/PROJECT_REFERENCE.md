# Project Reference

Version: 2.0.0
Status: Current implementation reference

## Source Of Truth

Use the following order when a document conflicts with the code:

1. Current Prisma schema and migrations for persisted data.
2. Backend controllers, DTOs, guards, and services for runtime API behavior.
3. Web/mobile routes and shared contracts for client behavior.
4. This documentation for intent, boundaries, and known limitations.

An old requirement document is not evidence that a feature exists.

## Repository Map

| Area             | Location          | Responsibility                                                                 |
| ---------------- | ----------------- | ------------------------------------------------------------------------------ |
| Web              | `apps/web`        | Next.js dashboard, auth screens, learning players, admin/teacher/student views |
| Mobile           | `apps/mobile`     | Expo Router authentication and initial dashboard/units flow                    |
| API              | `apps/backend`    | NestJS modular monolith and `/api/v1` REST endpoints                           |
| Database         | `database/prisma` | Prisma schema, migrations, and seed                                            |
| Shared           | `packages/shared` | Permission map, roles, question contracts, utilities, live types               |
| Runtime services | `docker`          | PostgreSQL, Redis, Mailpit, backend, and web containers                        |

## Backend Modules

`auth`, `home`, `curriculum`, `lesson`, `video`, `video-question`, `video-event`, `activity`, `execution`, `homework`, `quiz`, `reports`, `payments`, `notifications`, `ai`, `profile`, `common`, `competition`, `document-import`, `admin`, `teachers`, `support`, `mistakes`, `coins`, `live`, and `scheduler`.

The Story (قصة المنهج) and Final Review (المراجعة النهائية) are delivered through the `curriculum` module using the `unitType` discriminator on `Unit` (`STORY`, `FINAL_REVIEW`); their chapters/sections are `Lesson` rows.

## Product Domains

- Identity: users, sessions, refresh tokens, login history, password resets, OAuth
- Academic context: academic years, terms, stages, grades, books, units, lessons
- Learning: videos, timeline events, activities, vocabulary, documents, progress
- Assessment: questions, homework, quizzes, reusable assessments, attempts, answers
- Content extensions: stories, final reviews, competitions, mistakes, games
- Commercial access: payments, coin packages, wallets, purchases, codes, unlocks
- Live learning: availability, sessions, subscriptions, bookings, attendance, announcements
- Operations: notifications, support tickets, reports, audit logs, system settings
- AI: conversations, messages, lesson context, provider-compatible response, recommendations

## API Conventions

- Base path: `/api/v1`
- Success envelope: `{ success, message, data, timestamp }`
- Authentication: `Authorization: Bearer <access-token>` on protected routes
- Validation: NestJS global `ValidationPipe` with whitelist, transform, and forbidden unknown properties
- IDs: UUIDs in persisted resources
- Current client API base: `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:4000/api/v1`

## Documentation Index

- `PROJECT_SUMMARY.md`: concise system description
- `PROJECT_SCOPE.md`: implemented scope and explicitly planned items
- `TECH_STACK.md`: dependencies that are actually present versus planned integrations
- `USER_ROLES.md`: database roles and effective permission model
- `BUSINESS_RULES.md`: behavior that current services enforce
- `ROADMAP_CHANGELOG.md`: implementation history and next work

End of Document.
