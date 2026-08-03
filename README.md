# El-bannawy Platform

Enterprise English-learning platform for Arabic-speaking students. The repository is a TypeScript monorepo containing the current web experience, NestJS API, Prisma database package, shared contracts, and an Expo mobile bootstrap.

## Current Baseline

- Release line: `1.0.x` development baseline
- Backend API: NestJS 11 at `/api/v1`
- Web client: Next.js 15 App Router
- Mobile client: Expo Router bootstrap with shared API/auth utilities
- Database: PostgreSQL through Prisma 6
- Primary state: TanStack Query and Zustand on web
- Authentication: JWT access/refresh tokens, password reset, Google OAuth path
- UI: Tailwind CSS v4, semantic design tokens, dark/light mode, Arabic RTL support

The code is the implementation baseline. Feature documents must distinguish implemented behavior from planned behavior.

## Implemented Product Areas

- Registration, login, logout, refresh tokens, sessions, password reset, and Google OAuth flow
- Student, teacher, administrator, staff, secretary, and support account roles in the database
- Role-aware dashboards and academic context: educational system, stage, grade, year, and term
- Curriculum units, lessons, publication state, premium state, locked overrides, and progress
- Multi-video lessons using a provider abstraction with the current YouTube provider
- Interactive video timeline events and video questions
- Activity engine with vocabulary, multiple choice, true/false, matching, fill-in-the-blanks, drag/drop, reading, story questions, conversation, speaking, writing, and paragraph types
- DOCX extraction and preview/import workflows for questions and structured vocabulary, including synonym/antonym sections and part of speech
- Lesson documents/PDF metadata and download flow
- Homework, lesson quizzes, reusable assessments, attempts, autosave-oriented assessment player, scoring, and feedback policies
- Stories with chapters, videos, vocabulary, questions, and student attempts
- Final review with grade/year/term context, sections, videos, vocabulary, questions, and publication controls
- Learn-from-mistakes views and mini exams
- Educational games currently focused on listening and pronunciation challenges
- XP, achievements, leaderboard views, and competitions with invitations, submissions, scoring, and leaderboard
- Coins, coin packages, payment verification flow, wallet balance, content unlocks, activation codes, and unlock requests
- Live sessions, teacher availability, date blocks, subscriptions, bookings, announcements, control logs, and attendance
- In-app notifications and notification preferences
- Support tickets, messages, assignment, resolution, and grade support contacts
- Reports for student, teacher, and administrator views
- AI conversations, recent conversation context, lesson context, provider-compatible chat call, rule-based fallback, and recommendations
- Shared permission constants and delegated teacher/staff permissions with audit logging

## Repository Layout

```text
apps/
  backend/       NestJS modular monolith
  mobile/        Expo Router mobile bootstrap
  web/           Next.js web application
database/        Prisma schema, migrations, and seed
packages/shared/ Shared TypeScript contracts, question types, permissions, utilities
docs/            Current and planned project documentation
docker/          Local PostgreSQL, Redis, Mailpit, backend, and web compose setup
scripts/         Setup scripts
```

## Technology Reality

The repository contains Docker services for PostgreSQL, Redis, and Mailpit. The backend uses Prisma directly; it does not yet wire Redis caching, email delivery, or WhatsApp/FCM delivery. A BullMQ scheduler queue (`scheduler` module, `scheduled-notifications` queue) is provisioned but no job consumers/workers are implemented yet. The AI module currently uses a configurable OpenAI-compatible chat endpoint with a rule-based fallback; a production RAG/vector pipeline is planned, not implemented.

## Local Setup

Prerequisites:

- Node.js 20 or newer
- pnpm 9 or newer; the repository is pinned to pnpm 11
- Docker Desktop, or a reachable PostgreSQL instance

```powershell
pnpm install
Copy-Item .env.example .env
docker compose -f docker/docker-compose.yml up -d postgres redis mailpit
pnpm --filter @el-bannawy/database generate
pnpm --filter @el-bannawy/database migrate:deploy
pnpm --filter @el-bannawy/database seed
pnpm dev
```

The local API listens on `http://localhost:4000/api/v1` and the web client on `http://localhost:3000`. When using the compose PostgreSQL service, its host port is `5433`; update `DATABASE_URL` accordingly.

Required backend secrets are `JWT_SECRET` and `PAYMENT_WEBHOOK_SECRET`, each at least 16 characters. Do not use the example values outside local development.

## Verification

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @el-bannawy/backend test
pnpm --filter @el-bannawy/web test
```

## Documentation Map

- `MASTER_EXECUTION_PLAN.md`: implementation status and delivery gates
- `docs/00_PROJECT_OVERVIEW/`: current product scope, roles, rules, and technology
- `docs/01_ARCHITECTURE/`: runtime and API architecture
- `docs/02_DATABASE/`: Prisma-backed data model and migration policy
- `docs/03_BACKEND/`: module behavior and boundaries
- `docs/05_API/`: endpoint inventory and API conventions
- `docs/06_UI/`: implemented design system and screen conventions
- `docs/07_AI/`: current AI boundary and future AI architecture
- `docs/08_DEVOPS/`, `docs/09_TESTING/`, `docs/10_DEPLOYMENT/`: operational status and procedures

## Out of Current Baseline

The following are not to be described as completed until code and tests exist:

- Parent portal and desktop client
- Full production RAG, embeddings, pgvector retrieval, memory, and streaming orchestration
- Redis cache and BullMQ workers
- Native push, email, WhatsApp, and SMS delivery
- Public Swagger contract for every endpoint
- Production monitoring, metrics, and distributed tracing
- Offline learning and marketplace

End of Document.
