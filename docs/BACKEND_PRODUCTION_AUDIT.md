# Backend Production Audit

Audit date: 2026-07-28
Scope: `apps/backend/src`, database package, and runtime configuration
Status: Action list; verify against source before each release

## Confirmed Strengths

- Modular NestJS monolith with dependency injection.
- Prisma is the persistence boundary and migrations are committed.
- JWT, refresh tokens, bcrypt password hashing, role guards, permission guards, and audit records exist.
- ConfigModule and Joi validation are wired in `app.module.ts`; JWT and payment webhook secrets are required.
- Multi-step code redemption uses a Prisma transaction and re-reads usage state inside it.
- DTO validation is globally enabled, although not every controller input has a dedicated DTO.

## CRITICAL Findings (fix immediately)

| # | Area | File:Line | Finding |
|---|------|-----------|---------|
| 1 | Bootstrap | `main.ts:4` | `dotenv.config()` path resolves 3 levels up; may fail in production builds (dist/). Inconsistent with `app.module.ts` which resolves 4 levels up. |
| 2 | Auth | `auth.module.ts:12-14` | Google OAuth strategy is provided conditionally at module-import time based on `process.env`. If env vars are added later via ConfigModule, the strategy may not register. |
| 3 | AI | `ai.service.ts:181` | Unsanitized `dto.message` sent directly to the LLM — **prompt injection vulnerability**. System prompt includes lesson/unit/grade names but user input is not filtered, sanitized, or guarded. |
| 4 | Payments | `payments.service.ts:80` | Payment verification: `const verified = dto.gatewayRef.length > 0;` — **any non-empty string passes verification**. No actual gateway signature check. Forgeable payments. |
| 5 | Coins | `coins.service.ts:259-261` | `unlockContent` decrements wallet balance outside a transaction. If `contentUnlock.create` fails, coins are deducted with no rollback. |

## HIGH Findings (fix before production)

| # | Area | File:Line | Finding |
|---|------|-----------|---------|
| 6 | Prisma | `prisma.service.ts:9-15` | No retry logic for DB connection failures. `onModuleInit` throws and crashes on first connection failure. |
| 7 | Payments | `payments.service.ts:58` | Checkout URL is self-referencing (`/api/v1/payments/${payment.id}/verify`) — no actual payment gateway redirect. No HMAC/signature verification on verify endpoint. |
| 8 | Payments | `payments.service.ts:196-207` | `refundPayment` sets status to `REFUNDED` but does not deduct coins or reverse content unlocks. Users keep coins after refund. |
| 9 | Quiz | `quiz.service.ts:136-140` | Answer comparison: `.trim().toLowerCase()` on text answers is fragile. Case-insensitive matching fails for proper nouns, vocabulary, and code. |
| 10 | Quiz | `quiz.service.ts:110-116` | `submitQuiz` returns quiz object with `questions.correctAnswer` — students receive correct answers in the response. |
| 11 | Homework | `homework.service.ts:135-139` | Same `.trim().toLowerCase()` answer comparison flaw as quiz. |
| 12 | Homework | `homework.service.ts:427-428` | `deleteMany` + `createMany` not wrapped in a transaction — data loss if update fails mid-way. |
| 13 | Quiz | `quiz.service.ts:416-432` | `updateQuiz` deletes ALL existing answers/questions then recreates — not in a single transaction. Partial failure destroys data. |
| 14 | Live | `live.service.ts:197-217` | `bookSession` has race condition: checks available seats, then creates booking. Two concurrent requests can both pass the check. Needs `$transaction` with row-level locking. |
| 15 | Reports | `reports.service.ts:72-98` | `getStudentReport` fires 7+ parallel `findMany` queries without limits. For students with 1000+ records, OOM risk. |
| 16 | Reports | `reports.service.ts:148-191` | `getTeacherReport` uses `aggregate` across ALL students — no filtering by teacher's assigned grades. Teachers see platform-wide stats. |
| 17 | Mistakes | `mistakes.service.ts:88-149` | `getWrongAnswers` fires 4 separate `findMany` queries (quiz, homework, assessment, story), loads everything into memory, then filters/sorts/paginates. OOM risk for large datasets. |
| 18 | Notifications | `notifications.service.ts:128-138` | `scheduleNotification` is **not implemented** — returns success message without storing or scheduling. Silent failure. |
| 19 | Coins | `coins.service.ts:248-269` | `unlockContent` checks balance, decrements, then creates unlock — not wrapped in `$transaction`. Race condition double-spend. |
| 20 | Competition | `competition.service.ts:375-425` | `submitCompetition` stores client-sent question indices and selected answers. No server-side verification that question indices match actual competition questions. |
| 21 | Lesson | `lesson.controller.ts:74-89` | File upload: no mime-type validation, no file size limit, no content inspection. Arbitrary file upload. |
| 22 | Lesson | `lesson.controller.ts:103-116` | Document upload: same lack of validation as file upload. |
| 23 | Config | `interfaces.ts:9` / `auth.config.ts:4` | `jwtSecret` may be `undefined` with no fallback. Joi validation requires it, but the config function itself has no `?? ""` guard. |
| 24 | Config | `validation.ts:19` | `PAYMENT_WEBHOOK_SECRET` is `.required()` even when all payment gateways are disabled. App won't start without payment secrets. |

## MEDIUM Findings (fix per priority)

| # | Area | File:Line | Finding |
|---|------|-----------|---------|
| 25 | Bootstrap | `main.ts:11` | No `unhandledRejection` / `uncaughtException` handlers. Unhandled promise rejections crash silently in Node 15+. |
| 26 | Bootstrap | `main.ts:19` | CORS origin uses `configService.get<string>("FRONTEND_URL")` — returns `undefined` silently. If missing, CORS is wide open. |
| 27 | Bootstrap | `main.ts:31` | `configService.get<number>("PORT")` may return a `string`. No parseInt conversion. |
| 28 | Config | `app.config.ts:6` | `frontendUrl` defaults to `"http://localhost:3000"` even with `NODE_ENV=production`. Missing env var silently uses localhost. |
| 29 | Config | `app.module.ts:48` | `abortEarly: true` in Joi validation stops on first error — users see one missing env at a time. Painful debugging. |
| 30 | Config | `validation.ts:19` | `PAYMENT_WEBHOOK_SECRET` required even when no payment gateway configured. Prevents app startup. |
| 31 | Auth | `auth.service.ts:37-39` | Password comparison before hash check — potential timing side-channel on password match. |
| 32 | Auth | `auth.service.ts:85-89` | Login: `dto.identity` and `dto.mobile` are both `@IsOptional()`. If both undefined, throws after attempting to use them — validation should enforce at least one. |
| 33 | Auth | `auth.service.ts:112` | Error message: "This account uses Google or Apple sign-in" — information disclosure about account auth method. |
| 34 | Auth | `auth.service.ts:160-166` | Allows 3 active reset codes per user. Attacker can consume rate limit for legitimate user. |
| 35 | Auth | `auth.service.ts:188` | `console.warn` with mobile number slice — PII in logs. |
| 36 | Auth | `auth.service.ts:193-228` | No rate limiting on password reset attempts per mobile. |
| 37 | Auth | `auth.controller.ts:55-60` | OAuth callback passes tokens as URL query params — leaked in logs, Referrer headers, browser history. |
| 38 | Auth | `auth.dto.ts:29-32` | Password regex has no special-character constraints — some may cause bcrypt issues. |
| 39 | Common | `current-user.decorator.ts:7` | Returns `""` when no user on request — controllers receive `""` instead of `undefined`, causing UUID lookup failures. |
| 40 | Common | `roles.guard.ts:26-27` | Returns `false` when `request.user?.role` undefined — returns 403 instead of 401, leaking route existence. |
| 41 | Common | `bootstrap.service.ts:47-48` | `lessonFilter` queries DB on every user registration — no caching. |
| 42 | Common | `local-file.storage.ts:5` | `UPLOAD_ROOT` hardcoded to `uploads/documents` under `cwd()`. Not config-driven. Doesn't scale across instances. |
| 43 | Quiz | `quiz.service.ts:191` | XP awarded even if student already passed the quiz — no duplicate check. |
| 44 | Quiz | `quiz.controller.ts:55-64` | Route collision: `GET :lessonId/analytics` placed after `GET :lessonId` — `analytics` matches as `:lessonId`, unreachable. |
| 45 | Homework | `homework.service.ts:33` | `getHomework` calls `verifyStudentLessonAccess` even for admin/teacher users — unnecessary DB queries. |
| 46 | Curriculum | `curriculum.service.ts:35-79` | `getCurriculum` uses 4-level nested `include` without pagination or limiting. Massive payloads for large curricula. |
| 47 | Curriculum | `curriculum.service.ts:209-248` | `getOverallProgress` fetches ALL lessonProgress records then aggregates in-memory. O(n) for 500+ lessons. |
| 48 | AI | `ai.service.ts:186-198` | No timeout on `fetch` to LLM provider. If provider hangs, request hangs indefinitely. |
| 49 | AI | `ai.service.ts:184-203` | API key sent as Bearer token — if endpoint URL is manipulated, key could be exfiltrated. |
| 50 | Live | `live.service.ts:672-683` | `decrementSeats` / `incrementSeats` can go negative — no check for `availableSeats < 0`. |
| 51 | Live | `live.service.ts:406-442` | `getAvailableSlots` does per-day DB queries in a loop — 30 queries for 30-day range. |
| 52 | Live | `live.controller.ts:33` | `@UseGuards(JwtAuthGuard)` at controller level — `listSessions` and `getSession` are public but require auth. |
| 53 | Live | `live.service.ts:38` | `getSessions` returns ALL sessions with no pagination. |
| 54 | Payments | `payments.service.ts:69-120` | No idempotency key on verify endpoint — duplicate requests could activate content multiple times. |
| 55 | Payments | `payments.service.ts:9` | `static INVOICE_COUNTER = 1000` — in-memory counter resets on restart. Duplicate invoice numbers. |
| 56 | Payments | `payments.controller.ts:33-39` | Verify endpoint is JWT-guarded — payment webhooks don't have user JWT tokens. Webhook endpoint missing. |
| 57 | Notifications | `notifications.service.ts:160-191` | `resolveTargets` for "grade" fetches ALL lessons then iterates progress — N+1 anti-pattern. |
| 58 | Notifications | `notifications.service.ts:107-126` | `Promise.all` for 5000+ recipients — overwhelms connection pool. |
| 59 | Notifications | `notifications.controller.ts:58` | `"SECRETARY"` role used in decorator but not defined in `UserRole` enum — check passes silently for everyone. |
| 60 | Video | `video.service.ts:23-37` | `getVideo` includes `activities.questions` with `correctAnswer` exposed to client. |
| 61 | Video | `video.service.ts:98-118` | `completeVideo` sets `watchedSeconds: video.duration` without verifying actual watch time. |
| 62 | Video-Question | `video-question.service.ts:67-109` | `createWithEvent` creates event+question in transaction but doesn't verify user has video access. |
| 63 | Reports | `reports.controller.ts:23-30` | `getStudentReport` requires JWT but no role/ownership check — any authenticated user can view any student's report. |
| 64 | Competition | `competition.service.ts:62-65` | Questions stored as raw `Prisma.InputJsonValue` — no type safety, no individual validation. |
| 65 | Competition | `competition.service.ts:236-268` | `topScore` uses `Math.max(ranked[0].score, 1)` — gives 1 XP even if all scores are 0. |
| 66 | Story | `story.service.ts:215-248` | `getStoriesForStudent` sets `where.educationalSystem = null` if field is null — filters for NULL instead of ignoring filter. |
| 67 | Mistakes | `mistakes.service.ts:211-289` | `createMiniExam` fires 4 queries + in-memory shuffle — scalability bottleneck. |
| 68 | Mistakes | `mistakes.service.ts:68-83` | `parseJsonOptions` casts `options as string[]` unsafely — Prisma `JsonValue` can be objects. |
| 69 | Mistakes | `mistakes.service.ts:397-424` | `resolveUserContext` allows TEACHER to view ANY student's mistakes — no grade-assignment check. |
| 70 | Support | `support.service.ts:117-118` | `resolveTicket` checks for `SUPPORT` role — not defined in `UserRole` enum. Dead code check. |
| 71 | Support | `support.service.ts:132-140` | `closeTicket` has NO authorization check — any authenticated user can close any ticket. |
| 72 | Support | `support.controller.ts:86-91` | Same — no `@CurrentUser()` or `@Roles()` on closeTicket endpoint. |
| 73 | Admin | `admin.service.ts:238-292` | `createTeacher` creates teacher with `PENDING_VERIFICATION` but generates no password — teacher can't log in. No invitation sent. |
| 74 | Admin | `admin.service.ts:294-313` | `updateTeacher` doesn't clear `deletedAt` when restoring — soft-deleted teachers can't be restored. |
| 75 | Admin | `admin.service.ts:828-838` | `resetStudentDevice` deletes all sessions with no audit log. |
| 76 | Activity | `activity.service.ts:71-80` | `JSON.parse(activity.config)` with no try/catch — malformed JSON crashes the request. |
| 77 | Activity | `activity.service.ts:75-77` | `.toLowerCase().trim()` comparison for potentially case-sensitive answers (proper nouns, vocabulary). |
| 78 | Home | `home.service.ts:89-93` | `getDashboard` doesn't verify `lessonProgress.lesson.unit` matches user's academic context. |
| 79 | Profile | `profile.service.ts:56-93` | Teacher's `assignedGrades: []` and `totalStudents: 0` are hardcoded — not fetched from DB. |
| 80 | Execution | `execution.service.ts:13-18` | Pipeline stages registered in constructor — tight coupling, hard to test. |
| 81 | Document-Import | (module-wide) | No controller — lesson module imports it directly. Utility module, not a feature module. (Informational) |

## LOW Findings (fix opportunistically)

| # | Area | File:Line | Finding |
|---|------|-----------|---------|
| 82 | App Module | `app.module.ts:45` | `envFilePath` resolves 4 levels up while `main.ts` resolves 3 — inconsistent. |
| 83 | App Module | `app.module.ts:39` | `BootstrapService` provided in both `AppModule` and `AuthModule` — confusing duplication. |
| 84 | Auth | `jwt.strategy.ts:21` | `configService.get<string>("JWT_SECRET") as string` — if missing, runtime crash. (Joi requires it, so mitigated.) |
| 85 | Auth | `auth.service.ts:141` | Refresh token lookup by `token` field — verify Prisma indexes it. |
| 86 | Common | `audit.service.ts:8-27` | No async error handling — failed audit writes are silently lost. |
| 87 | Quiz | `quiz.service.ts:160-163` | Score uses `Math.round`. No floor/ceiling — zero correct = 0, OK. |
| 88 | Homework | `homework.module.ts` | `RolesGuard` provided locally and in CommonModule — duplicate. |
| 89 | Curriculum | `curriculum.controller.ts:37-41` | `continue-learning` on curriculum controller — conceptual mismatch. Belongs in home/progress. |
| 90 | AI | `ai.service.ts:122-157` | `getRecommendations` returns raw wrong-answer data with lesson/unit/grade — potential data leakage. |
| 91 | Live | `live.service.ts:83` | `dto.type as never` — cast bypasses TypeScript enum constraint. |
| 92 | Video Event | `video-event.service.ts:12-25` | `payload` cast as `Prisma.InputJsonValue` — no runtime JSON validation. |
| 93 | Video Event | `video-event.controller.ts:93` | `reorder` takes `{ ids: string[] }` — no class-validator DTO. |
| 94 | Video Question | `video-question.handler.ts:35` | Handler returns `Triggered` without executing logic — no-op. |
| 95 | Video Question | `video-question.controller.ts:32,39,83-86` | Response format uses `{ data: ... }` instead of standard `ISuccessResponse`. Inconsistent API contract. |
| 96 | Competition | `competition.service.ts:375-425` | `submitCompetition` stores `questionIndex` and `selectedIndex` from client — no server-side verification of question IDs. |
| 97 | Story | `story.service.ts:138` | `content` cast as `Prisma.InputJsonValue` — no validation. |
| 98 | Final Review | `final-review.service.ts:15-28` | `gradeId: { in: user?.role === "ADMINISTRATOR" ? undefined : [...gradeIds] }` — `undefined` in `in` is intentional but fragile. |
| 99 | Final Review | `final-review.controller.ts:16` | Controller method signature > 79 chars — violates `max-len`. |
| 100 | Teachers | `teachers.controller.ts:15` | `@Roles("TEACHER")` excludes ADMINISTRATOR — but ADMIN should have all permissions. |
| 101 | Admin | `admin.service.ts:59` | `getTeacherPermissions` checks `deletedAt` but `findUnique` returns deleted records. |
| 102 | Activity | `activity.service.ts:59` | `clientScore` from client used as-is if server-side grading fails — client can manipulate score. |
| 103 | Lesson | `lesson.controller.ts:150-154` | `uploadQuiz` method ignores the uploaded file — just upserts a quiz with title. Dead code. |
| 104 | Lesson | `lesson.service.ts:219-224` | `addVideo` sets `title: youtubeUrl` instead of fetching actual title from YouTube API. |
| 105 | Lesson | `lesson.service.ts:515-518` | `extractYoutubeId` only matches 2 URL formats — no support for shorts, embeds. |
| 106 | Home | `home.service.ts:177` | `upcomingLiveClasses` is hardcoded as `[]` — advertised feature not implemented. |
| 107 | Profile | `profile.service.ts:91` | Destructure drops `assignedGrade`, `academicYear`, `term` — fields may be needed. |
| 108 | Payments | `payments.service.ts:341-348` | Hardcoded prices (lesson: 200, unit: 800, coins: 100) — should be configurable. |
| 109 | Notification | `notifications.controller.ts:58` | `"SECRETARY"` role used but not in `UserRole` enum — check silently passes. (Duplicate of #59) |
| 110 | Main | `main.ts:4` | `dotenv.config()` called before ConfigModule — may interfere. |
| 111 | Quiz | `quiz.service.ts:136-140` | `.trim().toLowerCase()` answer comparison lossy for text answers. |
| 112 | Homework | `homework.service.ts:135-139` | Same answer comparison issue as quiz. |

## Architectural Gaps (cross-cutting)

| Gap | Details |
|-----|---------|
| No global exception filter | Default NestJS errors expose stack traces in development. No centralized error handling. |
| No request correlation ID | Impossible to trace requests across logs. |
| No rate limiting | Login, forgot-password, payment endpoints unprotected against brute force. |
| No health check | `/home/health` doesn't verify DB connectivity. |
| No WebSocket gateway | Live module is REST-only with polling. Real-time features not possible. |
| No Redis cache | Configured in Docker but never wired. Every request hits DB. |
| No pagination | Many `findMany` calls lack `take`/`skip` — admin, live, support, notifications, reports, competition, coins, mistakes. |
| Role enum inconsistency | `"SUPPORT"`, `"SECRETARY"` roles used in code but not defined in `UserRole` enum. Authorization checks are dead code. |

## Release Blockers

Do not declare production-ready until:
- All CRITICAL (5) and HIGH (24) findings are fixed
- Payment gateway has real signature verification (not `gatewayRef.length > 0`)
- AI module has prompt injection guardrails
- File uploads have mime-type validation, size limits, and content inspection
- Rate limiting is implemented on auth endpoints
- Global exception filter is registered
- Pagination is added to all list endpoints

End of Document.
