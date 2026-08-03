# Product Master Specification (PMS)

Version: 1.0.0
Status: ACTIVE — Source of Truth for Product Behavior

Phase: 3 — Product Master Specification

Preceded by:
- Phase 1 — Enterprise Project Audit V2 (overall readiness ≈ 48/100)
- Phase 2 — Enterprise Remediation Plan (10 phases, P0 gate)

Approved decisions:
- Commit strategy: single bootstrap commit of all current work.
- pgvector: switch to `pgvector/pgvector:pg16` Docker image.
- RAG fix: executed immediately after the Database fix (Phase 1).

---

# 1. Vision And Objectives

## 1.1 Vision

El-Bannawy Platform is the most advanced AI-powered English learning platform in the Arab world. It delivers an Arabic-first, RTL, mobile-first learning experience that combines a structured curriculum, interactive activities, live classes, gamified engagement, and an AI tutoring assistant — all production-grade, scalable, and maintainable.

## 1.2 Primary Objectives

| Objective | Description | Success Metric |
|-----------|-------------|----------------|
| AI Assisted Learning | Personal, contextual AI tutor for every student | ≥ 60% of active students use AI monthly |
| Personalized Education | Content scoped to student academic context (year/term/system/stage/grade) | 100% of students see context-corrected content |
| High Performance | Fast API, fast dashboards, fast AI | API < 300ms, Dashboard < 2s, AI < 3s |
| Enterprise Quality | Documented, tested, secure, audited | ≥ 90% business-logic coverage |
| Long-Term Maintainability | Modular monolith, clean architecture | No module > 1 responsibility |
| Production Readiness | Secure, scalable, observable | Zero P0/P1 audit findings open |

## 1.3 Product Guiding Principles

1. Documentation is the source of truth; code follows documentation.
2. Arabic-first RTL; Dark Mode first; Mobile first; Accessibility first.
3. Consistency over creativity — predictable engineering over clever code.
4. Security first — validate, authorize, sanitize every request.
5. AI First — every AI request flows through: Auth → Context → Memory → RAG → Prompt → LLM → Validation → Logging → Analytics.
6. Never bypass RAG. Never answer outside retrieved educational context.
7. Coins/games/competitions are supplementary engagement; they never replace core lesson completion.

---

# 2. Product Principles (Engineering → Product Mapping)

| Engineering Rule | Product Behavior |
|------------------|------------------|
| Pages are thin | All business logic lives in services/hooks; UI never fetches directly |
| Single responsibility | Every module owns one domain; no cross-module business logic |
| RBAC everywhere | Role ceilings enforced server-side; UI visibility is convenience only |
| Validation on every input | DTOs + class-validator on all endpoints; Zod + RHF on web forms |
| Dark/Light/RTL/Responsive | Every component supports all four |
| Design tokens only | No hardcoded colors/spacing in product UI |
| Soft delete preferred | Deletable content uses `deletedAt` where appropriate |
| Transactions for multi-step | Purchases, unlocks, bookings are transactional |
| Structured logging | Every operation logs timestamp, request ID, user ID, operation, duration, status |
| Error handling | Predictable, documented, actionable, user-friendly; never expose internals |

---

# 3. Module Specifications

## Conventions

Every module spec uses this template:

- **Purpose** — what the module exists for.
- **Goals** — measurable outcomes.
- **Business Rules** — hard invariants.
- **Permissions** — required permissions from `packages/shared`.
- **Dependencies** — other modules it needs.
- **Inputs / Outputs** — key API surface.
- **Edge Cases** — known boundaries.
- **Validation** — DTO validation rules.
- **Success Criteria** — definition of done.
- **Extensibility** — future hooks.

---

## 3.1 Authentication And Accounts (`auth`, `profile`)

**Purpose:** Register, authenticate, and manage user accounts across Web, Android, iOS, Desktop.

**Business Rules:**
- Protected routes require a valid JWT access token.
- Passwords are hashed; never logged or returned.
- Account status flow: `PENDING_VERIFICATION → ACTIVE → SUSPENDED/BANNED/DELETED`.
- OAuth providers: Google, Facebook, and Apple (Apple routes exist but require live `APPLE_*` credentials — untested).
- Refresh-token rotation is supported by the auth service.

**Permissions:** `USERS_VIEW/EDIT/DELETE` (admin), `ROLES_MANAGE` (admin).

**Dependencies:** Prisma, common guards, academic context.

**Inputs / Outputs:** `POST /auth/*` (login, register, refresh, OAuth callbacks); `GET/PATCH /profile/*`.

**Edge Cases:**
- Email already registered → 409 with actionable message.
- Suspended/banned account login → blocked with reason.
- OAuth email mismatch / missing email → clear error path.

**Validation:** DTOs on all auth endpoints; email format; password strength; token expiry.

**Success Criteria:** All OAuth flows working with real credentials; no auth security findings open.

**Extensibility:** Passkeys; MFA; device session management.

---

## 3.2 Academic Context And Curriculum (`curriculum`, `config`)

**Purpose:** Scope all learning content by academic year, term, educational system, stage, grade, unit, lesson.

**Business Rules:**
- Every curriculum query respects the student's assigned academic context.
- Teachers/admins manage content per their effective permissions.
- `published` + `isPremium`/`lockedOverride` determine student availability.
- Curriculum is the master dependency for units, lessons, stories, final review.

**Permissions:** `UNITS_VIEW/CREATE/EDIT/DELETE`.

**Dependencies:** Prisma, academic-context service.

**Edge Cases:** Student with no assigned grade → no content, clear messaging.

**Success Criteria:** Context-correct content for 100% of students.

---

## 3.3 Units, Stories, And Final Review (`curriculum`)

**Purpose:** Group lessons into learning units; support three content types via `UnitType`:

| UnitType | Meaning | Behavior |
|----------|---------|----------|
| `UNIT` | Standard lesson unit | Normal progression |
| `STORY` | Story with chapters (videos, vocabulary, questions, attempts) | Story-first flow |
| `FINAL_REVIEW` | Separate from regular progression | Exposed per publication + academic context |

**Business Rules:**
- A unit has display order, isPremium flag, published state, lock/override.
- Unlock cost is configurable per `UNIT`/`TERM` (defaults: 50 / 300 coins).
- Lesson-level purchases are disabled; lessons inherit the parent unit lock state.
- Coins/activation codes unlock units; unlocks are recorded with method and amount.

**Permissions:** `UNITS_VIEW/CREATE/EDIT/DELETE`; students get `UNITS_VIEW`.

**Dependencies:** coins module (unlocks), academic context.

**Edge Cases:** Premium unit locked → student sees unlock CTA, cannot access content.

**Success Criteria:** All three unit types render correctly; unlock flow end-to-end.

---

## 3.4 Lessons And Lesson Content (`lesson`)

**Purpose:** Lesson entity aggregating videos, vocabulary, questions, documents, assessments, and settings.

**Business Rules:**
- A lesson belongs to exactly one unit; has one or more videos.
- Lesson flags: `published`, `isHidden`, `sequentialMode`, `homeworkEnabled`, `quizEnabled`, `isPremium`.
- Settings: `passingScore` (default 70), `maxAttempts` (default 3), `xpReward` (default 100).
- `LessonSettings`: `allowRetry`, `showAnswers`, `unlockNextOnComplete`, `games`.
- Lesson documents served through protected route; downloadable flag respected.
- Video provider is YouTube; platform stores provider metadata, not uploaded files.
- Timeline events and video questions belong to a specific video; enabled/disabled, required/optional.

**Permissions:** `LESSONS_VIEW/CREATE/EDIT/DELETE`, `VIDEOS_UPLOAD`, `PDFS_UPLOAD`.

**Edge Cases:**
- Sequential mode: next lesson locked until current completed.
- Locked override bypasses default lock.

**Success Criteria:** Full lesson lifecycle (create → publish → learn → complete → unlock next) verified.

---

## 3.5 Vocabulary (`lesson`, `vocabulary`)

**Purpose:** Structured vocabulary per lesson with standard and synonym/antonym sections.

**Business Rules:**
- Vocabulary and vocabulary sections belong to a lesson.
- Vocabulary relations link words across sections.
- Supports `VOCABULARY` activity type.

**Permissions:** `VOCABULARY_MANAGE` (teacher/admin).

**Success Criteria:** CRUD + display in lesson player verified; mobile renders correctly.

---

## 3.6 Activities And Activity Engine (`activity`)

**Purpose:** Interactive activities within lessons, powered by `ActivityType`:

```
VOCABULARY, MULTIPLE_CHOICE, TRUE_FALSE, MATCHING, FILL_IN_BLANKS, DRAG_DROP,
READING, STORY_QUESTIONS, CONVERSATION, SPEAKING, WRITING, PARAGRAPH
```

**Business Rules:**
- Activity progress stored per user per activity.
- Attempts, scoring, and feedback honor lesson settings.
- Reusable question system supports hints, attachments, tags, options, groups.

**Permissions:** `LESSONS_EDIT`, `VOCABULARY_MANAGE`, `QUIZZES_MANAGE`.

**Edge Cases:** Writing/speaking activities require human or AI evaluation; see 3.21 AI.

**Success Criteria:** All 12 activity types functional in lesson player; progress persists.

---

## 3.7 Quiz Engine (`quiz`)

**Purpose:** Per-lesson quizzes with attempts, passing score, and feedback policy.

**Business Rules:**
- `quizEnabled` gates the lesson quiz; `passingScore`, `maxAttempts`, `xpReward` configurable.
- MCQ letter↔index evaluation is correct (fixed in `answer-evaluation.ts`).
- Feedback policies: `IMMEDIATE`, `AFTER_SUBMISSION`, `AFTER_DUE_DATE`, `MANUAL_RELEASE`.
- Attempt policies: `SINGLE`, `MULTIPLE`, `UNLIMITED`, `TEACHER_CONTROLLED`.
- `getResult` aggregation rewritten and verified.

**Permissions:** `QUIZZES_MANAGE` (teacher/admin); students take quizzes via `LEARNING_ACCESS`.

**Success Criteria:** Attempt limits, scoring, retries, XP grant all correct.

---

## 3.8 Homework (`homework`)

**Purpose:** Teacher-assigned homework per lesson with attempts, deadlines, and evaluation.

**Business Rules:**
- `homeworkEnabled` gates homework per lesson.
- Student homework attempts stored; evaluation correct for MCQ-style items.
- Same attempt/feedback policy model as quizzes.

**Permissions:** `HOMEWORK_MANAGE` (teacher/admin).

**Success Criteria:** Assign → submit → evaluate → grade → notify student flow works.

---

## 3.9 Mistakes And Mini-Exams (`mistakes`)

**Purpose:** Dedicated practice flow on the student's weak points; separate from original assessments.

**Business Rules:**
- Mistake practice and mini-exams do not replace the original assessment.
- Teacher can view mistake practice; student can practice.
- Mini-exam DTOs: `create-mini-exam`, `submit-mini-exam`; query DTO for filtering.

**Permissions:** `MISTAKES_VIEW`, `MISTAKES_PRACTICE`.

**Edge Cases:** No mistakes yet → empty state with guidance.

**Success Criteria:** Mistakes surfaced from prior attempts; practice generates new questions.

---

## 3.10 Video Questions And Video Events (`video`, `video-question`, `video-event`)

**Purpose:** Embed questions and timeline events inside video playback.

**Business Rules:**
- Video questions have options and answers (`VideoQuestionOption`, `VideoQuestionAnswer`).
- Video events capture user behavior; video progress stored per user.
- Questions can be enabled/disabled and required/optional per video.

**Permissions:** `LESSONS_EDIT`, `VIDEOS_UPLOAD`.

**Edge Cases:** Required question skipped → progress blocked until answered.

**Success Criteria:** In-video question pause/resume verified on web + mobile WebView player.

---

## 3.11 Live Classes (`live`, `zoom`)

**Purpose:** Schedule, book, and run live group/private classes.

**Business Rules:**
- Teachers define availability and date blocks, then create concrete sessions.
- Session fields: type (PRIVATE/GROUP), capacity, provider (`EXTERNAL_URL` or Zoom SDK), status lifecycle (`DRAFT → PUBLISHED → SCHEDULED → OPEN → FULL → ...`).
- Booking: unique per `(sessionId, studentId)`; status defaults `CONFIRMED`.
- Attendance is recorded; announcements and control logs supported.
- `waitingRoom` flag on sessions.

**Gaps (must be spec'd as new):**
- `sessionsUsed` (subscription) is now consumed per confirmed booking (Phase 1B): `bookSession` increments it, cancellation credits it back.
- Waiting list implemented in Phase 1B (`LiveWaitingList`, auto-promote on seat release).
- Reschedule implemented in Phase 1B (`rescheduleStatus` lifecycle + decision endpoints).
- Cancellation credits the session; refunds are recorded in the `LiveRefund` ledger (Phase 1B). Refund eligibility is policy-driven via `LivePolicyEngine` (bootstrap default: FULL_CREDIT before 24h cutoff, NO_CREDIT after); persisted policy storage is pending.

**Permissions:** `LIVE_VIEW/CREATE/EDIT/DELETE/CONTROL`; students get `LIVE_VIEW`.

**Success Criteria:** Book → attend → record attendance → consume subscription session; waiting list + reschedule + refund per §7.

---

## 3.12 Payments And Manual Payments (`payments`, `manual-payment`)

**Purpose:** Monetization: coin packages, subscriptions, and manual bank transfers.

**Business Rules:**
- Coin packages create pending payment/purchase records; coins credited only after verification.
- Payment statuses tracked; verification via checkoutId + gatewayRef.
- Local gateway stubs: Paymob, Fawry, InstaPay; manual bank transfer flow exists.
- `manual_payment_orders` and `payment_transfer_numbers` support the manual flow.

**Gaps:**
- No real gateway integration (all local stubs).
- No AI-credit purchase path (see §3.21 gap).
- No coupon system.

**Permissions:** `COINS_PURCHASE` (student); admin manages packages/config.

**Success Criteria:** Real gateway integration verified; refunds; coupons per §8.

---

## 3.13 Coins, Unlocks, And Gamification (`coins`)

**Purpose:** Engagement + monetization via coins, unit unlocks, activation codes.

**Business Rules (20 endpoints):**
- One coin wallet per user; balance is an Int (no coin ledger — XP transactions provide history).
- Packages: CRUD (admin), list active (all).
- Purchase → verify → credit flow.
- Activation codes: add coins or unlock a target; may expire; usage limit; same user cannot redeem same code twice.
- Unlock cost configurable for `UNIT`/`TERM` (defaults 50/300); `POST /unlock-cost` admin/teacher.
- One pending unlock request per user per target; admin resolves.
- Unlock/access endpoints enforce content gates.
- Coins do NOT affect ranking.

**Permissions:** `COINS_VIEW/MANAGE/GRANT/PURCHASE/UNLOCK`, `UNLOCK_CODES_MANAGE`, `UNLOCK_REQUESTS_MANAGE`.

**Edge Cases:** Insufficient balance → 402-style error with top-up CTA; expired code → clear message.

**Success Criteria:** Wallet, purchase, redeem, unlock, requests all verified end-to-end.

---

## 3.14 XP And Achievements

**Purpose:** Track engagement and progress.

**Business Rules:**
- XP awarded on lesson/quiz/homework completion (`xpReward`).
- `XPTransaction` provides history.
- Achievements engine exists (badge conditions); leaderboard exists in web frontend.
- Achievements measure engagement; do not affect coin balance or ranking directly.

**Permissions:** Students view own; teachers/admin view class-wide.

**Success Criteria:** XP correct per completion; achievements trigger; leaderboard accurate.

---

## 3.15 Competition (`competition`)

**Purpose:** Weekly quiz competition among students.

**Business Rules:**
- Admin/teacher manages competitions; students view and participate.
- Competition does not substitute core lesson completion.

**Permissions:** `COMPETITION_MANAGE` (teacher/admin), `COMPETITION_VIEW` (all).

**Success Criteria:** Competition lifecycle (create → open → close → leaderboard) verified.

---

## 3.16 Certificates (`certificates`)

**Purpose:** Generate unit/lesson completion certificates.

**Business Rules:**
- `UnitCertificate` model; generation uses jsPDF + html2canvas (web).
- Certificate tied to completion data.

**Permissions:** Students download own (`SAVED_PDFS_DOWNLOAD`).

**Success Criteria:** Certificate generation matches completion; downloadable as PDF.

---

## 3.17 Games (`games`)

**Purpose:** Supplementary learning games (memory game shipped).

**Business Rules:**
- Games must not be treated as a substitute for lesson completion.
- Game settings exist in backend; memory game in web.

**Permissions:** `LEARNING_ACCESS`.

**Success Criteria:** Memory game playable; score recorded.

---

## 3.18 Saved Documents (`saved-documents`)

**Purpose:** Students save/download PDFs and lesson documents.

**Business Rules:**
- Saved documents belong to a lesson and user.
- Download/delete permissions enforced.

**Permissions:** `SAVED_PDFS_VIEW/DELETE/DOWNLOAD`.

**Success Criteria:** Save → list → download → delete verified.

---

## 3.19 Support Tickets (`support`)

**Purpose:** User-initiated support workflow.

**Business Rules:**
- Tickets belong to the creating user; contain messages, assignment, priority, status, resolution.
- Support/administrator can answer; staff can answer.

**Permissions:** `SUPPORT_ANSWER` (support/admin/staff).

**Success Criteria:** Ticket lifecycle (create → assign → resolve) verified.

---

## 3.20 Notifications (`notifications`)

**Purpose:** In-app + external notification delivery.

**Business Rules (existing):**
- `@Global()` module exporting NotificationsService, WhatsAppService, FcmService.
- Admin: configs/templates/whatsapp config/logs/test/analytics endpoints.
- User: list/unread-count/device-token/preferences/read-all/read/delete.
- Staff send (`POST /send`: TEACHER/SECRETARY/ADMIN) and schedule (`POST /schedule`: TEACHER/ADMIN).
- Routing gated by `NotificationConfig.isEnabled` (8 known types) + `NotificationPreference` opt-in.
- Channels today: **WhatsApp + FCM push only**.

**Gaps (spec'd as new in §9):**
- No email channel (no mailer dependency).
- No SMS channel.
- Scheduling implemented in Phase 1B: `Notification.scheduledAt/sentAt` + a BullMQ `ScheduledNotificationsProcessor` dispatches scheduled notifications (in-app/WhatsApp/push) at the target time; email/SMS channels remain.

**Permissions:** `NOTIFICATIONS_SEND`.

**Success Criteria:** All 5 channels deliverable per §9; preferences honored.

---

## 3.21 AI Suite (`ai`, `ai-knowledge-base`, `ai-settings`, `essay-evaluation`)

**Purpose:** AI tutor chat, knowledge base, settings, essay evaluation.

**Business Rules (existing):**
- AI conversations belong to the authenticated user.
- Chat uses recent messages + optional lesson/unit/grade context.
- Configurable provider; without a key the deterministic rule-based fallback is used.
- Message limits: 50 messages/conversation; 20 conversations max; 2000 chars/message.
- Credits: `AiCreditPlan` with `creditsPerQuestion`, `creditsPerSession`, `freeCredits` (default 20), `resetPeriod` (DAILY/WEEKLY/MONTHLY); `StudentAiCredits` tracks used/limit/reset.
- Essay evaluation module exists (writing feedback).
- Knowledge base CRUD exists; embeddings stored as JSONB.

**Critical gaps (P0 blockers from audit — must be fixed):**
1. **Credits reset bug**: `ai-settings.service.ts:236` uses `where: { id: resetPeriod }` — resets the wrong entity; credits never reset properly.
2. **SSRF**: `ai-knowledge-base.service.ts:213` fetches arbitrary URLs (SSRF risk).
3. **RAG non-functional**: embeddings are JSONB and never queried; `search.service.ts` is keyword(TF)-only; `embedding.service.ts` `semanticSearch`/`cosineSimilarity` are dead code. RAG is documented but not implemented — must not be documented as real until fixed.
4. **No streaming, no provider abstraction, no queue** for AI.
5. **No response validation** layer.
6. **No AI-credit purchase package** (students cannot buy credits).

**Permissions:** `AI_MANAGE` (teacher + student per roles.ts), `AI_SETTINGS_MANAGE` (admin only).

**Success Criteria:** Full AI pipeline per §6: Context → Memory → RAG (pgvector) → Prompt → LLM → Validation → Logging → Analytics; credits reset correctly; credits purchasable.

---

## 3.22 Reports (`reports`)

**Purpose:** Student, teacher, and admin reporting.

**Business Rules (existing — only 4 GET endpoints):**
- `GET /reports/my` — student's own report (JWT).
- `GET /reports/student/:studentId` — TEACHER/ADMIN/STAFF; teacher grade access verified via academic context.
- `GET /reports/teacher` — TEACHER/ADMIN.
- `GET /reports/admin` — ADMIN.
- Pagination page/limit clamped (1..100, default 20) on student endpoints only.
- `reports.repository.ts` is an unused stub — service uses PrismaService directly.

**Gaps (spec'd as new in §10):**
- No financial report, no live-class report, no AI-usage report.

**Permissions:** `REPORTS_VIEW`, `REPORTS_EXPORT`.

**Success Criteria:** Reports per §10; role scoping correct; export working.

---

## 3.23 Document Import (`document-import`)

**Purpose:** DOCX import → extraction → parsing → preview → optional editing → persistence.

**Business Rules:**
- Structured vocabulary supports standard and synonym/antonym sections.
- Import is teacher/admin driven.

**Success Criteria:** Import pipeline verified with realistic DOCX files.

---

## 3.24 Grade Schedule (`grade-schedule`), Teachers (`teachers`), Admin (`admin`), Config (`config`), UI Settings (`ui-settings`), Social Links (`social-links`), Health (`health`)

**Purpose:** Operational/plumbing modules.

- **grade-schedule:** grade scheduling data.
- **teachers:** teacher management + `UserPermissionGrant` delegation; grants initialized idempotently on teacher creation; audit records on grant/revoke.
- **admin:** admin-only operations (users, content, permissions, unlock requests).
- **config:** platform config.
- **ui-settings:** `UI_SETTINGS_MANAGE` (admin); UI theming.
- **social-links:** contact/social links.
- **health:** `/health` endpoint (currently public — see §11; must restrict).

**Success Criteria:** Each module documented, tested, and no orphan/unused code.

---

## 3.25 Common And Cross-Cutting (`common`, `prisma`, `execution`)

**Purpose:** Shared guards, decorators, helpers, response envelope, Prisma service, execution/queue scaffolding.

**Business Rules:**
- Standard response envelope: success `{ data, meta }`; error `{ timestamp, requestId }`.
- Guards: `JwtAuthGuard`, `RolesGuard`, permission guards.
- Academic context service (`verifyTeacherGradeAccess`, version 1).
- `successResponse` / `paginatedResponse` helpers.

**Gaps:** BullMQ scheduler queue infrastructure exists (`scheduler` module, `scheduled-notifications` queue). The scheduled-notifications consumer (`ScheduledNotificationsProcessor`) is registered in Phase 1B; AI/job consumers beyond notifications remain.

---

# 4. Roles And Permissions Matrix

## 4.1 Permission Catalog (from `packages/shared/src/permissions/permissions.ts`)

| Group | Permissions |
|-------|-------------|
| Users | `users.view`, `users.create`, `users.edit`, `users.delete` |
| Units | `units.view`, `units.create`, `units.edit`, `units.delete` |
| Lessons | `lessons.view`, `lessons.create`, `lessons.edit`, `lessons.delete` |
| Uploads | `videos.upload`, `pdfs.upload` |
| Content | `vocabulary.manage`, `homework.manage`, `quizzes.manage` |
| Live | `live.view`, `live.create`, `live.edit`, `live.delete`, `live.control` |
| Students | `students.view`, `students.create` |
| AI | `ai.manage`, `ai_settings.manage` |
| Reports | `reports.view`, `reports.export` |
| Notifications | `notifications.send` |
| Settings | `settings.manage` |
| Support | `support.answer` |
| Learning | `learning.access` |
| Mistakes | `mistakes.view`, `mistakes.practice` |
| Admin | `roles.manage`, `platform.manage` |
| Coins | `coins.view`, `coins.manage`, `coins.grant`, `coins.purchase`, `coins.unlock`, `unlock_codes.manage`, `unlock_requests.manage` |
| Competition | `competition.manage`, `competition.view` |
| Saved PDFs | `saved_pdfs.view`, `saved_pdfs.delete`, `saved_pdfs.download` |
| UI | `ui_settings.manage` |

## 4.2 Role × Permission Matrix

Legend: ✔ = granted. Source: `roles.ts`. `ADMINISTRATOR` = ALL.

| Permission | STUDENT | TEACHER | STAFF | SECRETARY | SUPPORT | ADMIN |
|------------|:-------:|:-------:|:-----:|:---------:|:-------:|:-----:|
| learning.access | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| units.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| lessons.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| live.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| ai.manage | ✔ | ✔ | — | — | — | ✔ |
| ai_settings.manage | — | — | — | — | — | ✔ |
| coins.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| coins.purchase | ✔ | — | — | — | — | ✔ |
| coins.unlock | ✔ | ✔ | — | — | — | ✔ |
| coins.manage | — | — | — | — | — | ✔ |
| coins.grant | — | ✔ | — | — | — | ✔ |
| unlock_codes.manage | — | ✔ | — | — | — | ✔ |
| unlock_requests.manage | — | — | — | — | — | ✔ |
| mistakes.view | ✔ | ✔ | — | — | — | ✔ |
| mistakes.practice | ✔ | ✔ | — | — | — | ✔ |
| competition.view | ✔ | ✔ | — | — | — | ✔ |
| competition.manage | — | ✔ | — | — | — | ✔ |
| saved_pdfs.view/delete/download | ✔ | ✔ | — | — | — | ✔ |
| units.create/edit/delete | — | ✔ | — | — | — | ✔ |
| lessons.create/edit/delete | — | ✔ | ✔(edit) | — | — | ✔ |
| videos.upload | — | ✔ | ✔ | — | — | ✔ |
| pdfs.upload | — | ✔ | ✔ | — | — | ✔ |
| vocabulary.manage | — | ✔ | — | — | — | ✔ |
| homework.manage | — | ✔ | — | — | — | ✔ |
| quizzes.manage | — | ✔ | — | — | — | ✔ |
| live.create/edit/delete/control | — | ✔ | — | — | — | ✔ |
| students.view/create | — | — | — | — | — | ✔ |
| reports.view | — | ✔ | ✔ | ✔ | ✔ | ✔ |
| reports.export | — | ✔ | — | — | — | ✔ |
| notifications.send | — | ✔ | ✔ | ✔ | ✔ | ✔ |
| settings.manage | — | — | — | — | — | ✔ |
| support.answer | — | — | ✔ | — | ✔ | ✔ |
| roles.manage / platform.manage | — | — | — | — | — | ✔ |
| ui_settings.manage | — | — | — | — | — | ✔ |
| users.* | — | — | — | — | — | ✔ |

## 4.3 Delegation Model

- Teachers' effective grants persisted in `UserPermissionGrant`, initialized idempotently.
- Staff linked to managing teacher via `managedByTeacherId`; staff permission effective only when within staff ceiling AND granted to managing teacher.
- Teacher may delegate only allowed staff permissions to managed staff.
- Grant/revoke creates audit records.
- Delegation fails closed for unknown roles/permissions.

---

# 5. User Journeys

## Journey 1 — Student Lesson Completion
1. Student logs in; dashboard shows context-corrected units (units → lessons).
2. Opens a lesson; watches video; answers in-video questions.
3. Completes vocabulary + activities; progress saved per activity.
4. Takes lesson quiz (attempts/passing honored) → XP awarded.
5. Lesson marked COMPLETED; next lesson unlocks (sequential mode).
6. Optionally unlocks premium units with coins/code or submits unlock request.

## Journey 2 — Student Homework + Mistakes
1. Teacher assigns homework (homeworkEnabled).
2. Student submits; evaluation runs; grade/feedback returned.
3. Wrong answers seed the mistakes pool.
4. Student runs mistake practice / mini-exam; independent of original assessment.

## Journey 3 — Live Class Booking
1. Teacher defines availability and creates session (PUBLISHED).
2. Student sees session; books (unique per session+student); booking CONFIRMED.
3. Attendance recorded; subscription session consumed (implemented in Phase 1B — per confirmed booking, credited back on cancellation).
4. Waiting list / reschedule / refund handled per §7 (waiting list + reschedule + refund ledger implemented in Phase 1B; refund eligibility policy-driven via `LivePolicyEngine`).

## Journey 4 — AI Tutor
1. Student opens AI chat; credits checked.
2. Request flows: Auth → Context (lesson/unit/grade) → Memory → RAG (pgvector, fixed) → Prompt → LLM → Response Validation → Logging → Analytics.
3. Credits decremented per question/session; reset per plan period.
4. Student can purchase more credits (§8).

## Journey 5 — Admin Platform Setup
1. Admin seeds academic context (system/stage/grade/terms).
2. Admin manages users, roles, permissions, content, unlock requests, notifications config, coin packages, payments config, AI settings.
3. Admin views platform reports (§10).

---

# 6. AI Specification

## 6.1 AI Pipeline (mandatory)

Every AI request must pass through, in order:

```
Authentication
  → Context Builder (lesson/unit/grade/academic context)
  → Memory (recent conversation history)
  → RAG (pgvector semantic retrieval over approved knowledge base)
  → Prompt Builder (template engine; prompts never exposed to client)
  → LLM (provider abstraction)
  → Response Validation (schema/format checks, curriculum-bound answers)
  → Logging (structured, no secrets)
  → Analytics (token usage, cost, latency)
```

## 6.2 Knowledge Base (KB)

- Approved curriculum documents + teacher-uploaded content only.
- Embeddings stored in **pgvector** (Postgres 16, `pgvector/pgvector:pg16` image). Migration from JSONB required (audit blocker).
- Never answer outside retrieved educational context.
- Never expose prompts, internal documentation, or API keys.

## 6.3 Teaching Style And Prompt Rules

- Arabic-first responses for Arab students; English learning content.
- Encouraging, structured, level-appropriate (CEFR-aligned where applicable).
- Answers always grounded in retrieved context; citations to lesson/unit where available.
- No invented curriculum; no hallucinated facts.

## 6.4 Credits

- `AiCreditPlan`: `creditsPerQuestion`, `creditsPerSession`, `freeCredits` (default 20), `resetPeriod` (DAILY/WEEKLY/MONTHLY), `isUnlimited`.
- `StudentAiCredits`: used/limit/lastReset/nextReset.
- **Fix required:** reset logic must target the correct student record and respect `resetPeriod` (current bug at `ai-settings.service.ts:236`).
- **New:** students purchase additional credits (gap — see §8).

## 6.5 Limits

- 50 messages/conversation.
- 20 conversations max per user.
- 2000 chars per message.

## 6.6 Context And Memory

- Context: academic context + lesson/unit/grade identifiers + recent messages.
- Memory: conversation-level history persisted per user.

## 6.7 Providers And Models

- Provider abstraction layer required (open + configurable).
- Configurable via AI settings; without a provider key → deterministic rule-based fallback.
- Streaming enabled.

## 6.8 Security

- Auth on every AI endpoint (`AI_MANAGE` for teacher+student; `AI_SETTINGS_MANAGE` admin-only).
- Input validation + prompt injection defenses.
- SSRF fix required (`ai-knowledge-base.service.ts:213`).
- No secrets in logs.

## 6.9 Success Criteria

- RAG returns relevant KB content; response grounded.
- Credits reset correctly; purchasable.
- Streaming works.
- Zero P0/P1 AI findings.

---

# 7. Live Specification

## 7.1 Core Flow (existing)

- Availability + date blocks → concrete sessions.
- Session lifecycle: `DRAFT → PUBLISHED → SCHEDULED → OPEN → FULL → (ENDED/CANCELLED)`.
- Types: PRIVATE / GROUP; capacity; waitingRoom.
- Provider: EXTERNAL_URL or Zoom SDK (zoomMeetingId/password/joinUrl).
- Bookings unique per (session, student); default CONFIRMED.
- Attendance; announcements; control logs.

## 7.2 New — Monetization

- `LiveSubscription` exists (`sessionsUsed`); wire booking → subscription consumption:
  - Consume one session per group attendance or private booking (per subscription rules). **Implemented in Phase 1B**: `bookSession` consumes per confirmed booking; cancellation credits the session back. Blocking booking when sessions exhausted + top-up/plan CTA remains.
- `LiveSubscription.price` currently defaults 0; a payment → subscription purchase tie-in (checkout flow) remains.

## 7.3 New — Waiting List

- When FULL → student joins waiting list. **Implemented in Phase 1B** (`LiveWaitingList`, `POST /sessions/:id/waitlist`).
- On cancellation/seat release → first waiter auto-promoted (notification via §9). **Auto-promotion implemented in Phase 1B**; the §9 notification on promotion remains.

## 7.4 New — Reschedule

- Student requests reschedule with reason (fields exist). **Implemented in Phase 1B** (`POST /bookings/:id/reschedule-request`).
- Teacher/admin approves/rejects → booking updated; notification sent. **Decision endpoints implemented in Phase 1B**; the notification remains.

## 7.5 New — Cancellation And Refunds

- Cancellation window rules: **bootstrap policy default (FPCS pending)** — cutoff 24h before start; `FULL_CREDIT` before cutoff, `NO_CREDIT` inside cutoff window, `NO_CREDIT` after start. Implemented via the `LivePolicyEngine` port (`BootstrapLivePolicy`); the cutoff/refund decision is policy-driven, not hardcoded.
- Refund path through §8 payments. **Implemented in Phase 1B**: `LiveRefund` ledger + `POST /payments/:id/refund` creates a ledger row.
- Cancel reason recorded. **Implemented** (`cancelReason`).

## 7.6 Permissions

- Manage: `LIVE_CREATE/EDIT/DELETE/CONTROL` (teacher/admin).
- Student: `LIVE_VIEW` (book).
- Secretary/support/staff: `LIVE_VIEW`.

---

# 8. Payments Specification

## 8.1 Products

- Coin packages (existing): CRUD (admin), list active, purchase, verify.
- Live subscriptions (to be wired).
- **AI credit packages (new).**

## 8.2 Gateways

- Target: Paymob / Fawry / InstaPay integration (currently local stubs).
- Manual bank transfer (existing): `payment_transfer_numbers`, `manual_payment_orders`; admin verification.

## 8.3 Verification

- Checkout → gatewayRef → verify → credit coins/credits/sessions only after confirmed status.
- Statuses tracked end-to-end; no credit without confirmation.

## 8.4 Invoices And Coupons (new)

- Invoices for all purchases.
- Coupon system (code → discount) — new.

## 8.5 Wallet And Refunds

- Coin wallet exists (single balance). Consider movement ledger for auditability (XPTransaction pattern as reference).
- Refunds: gateway reversal or manual; refund record; session/coin restoration rules.

## 8.6 Success Criteria

- Real gateway sandbox verified; no credit without confirmed payment; refunds tested.

---

# 9. Notifications Specification

## 9.1 Channels

| Channel | Status | Delivery |
|---------|--------|----------|
| In-app | ✅ existing | Notification rows; unread-count; read-all |
| Push (FCM) | ✅ existing | device-token register/unregister; send via FcmService |
| WhatsApp | ✅ existing | config/templates/logs/test; WhatsAppService |
| Email | 🆕 new | Requires mailer integration (provider TBD, e.g., SendGrid/Resend); templates |
| SMS | 🆕 new | Requires SMS gateway (TBD); templates |

## 9.2 Types And Config

- 8 known config types; gated by `NotificationConfig.isEnabled`.
- `NotificationTemplate` per type/channel; admin editable.
- `NotificationPreference` opt-in per type; preferences honored across channels.

## 9.3 Scheduling And Queueing

- `POST /notifications/schedule` persists `scheduledAt` rows and enqueues a delayed BullMQ job; the `ScheduledNotificationsProcessor` dispatches at the target time and sets `sentAt`. **Implemented in Phase 1B.**
- Worker retries on channel failure; logs deliveries.

## 9.4 Permissions

- Send: `NOTIFICATIONS_SEND` (teacher/secretary/admin/staff/support).
- Schedule: teacher/admin.
- Analytics: admin.

## 9.5 Success Criteria

- Email + SMS delivered; scheduled notifications fire on time; preferences respected; failure logged.

---

# 10. Reports And Analytics Specification

## 10.1 Existing

- Student report (`/reports/my`, `/reports/student/:id`).
- Teacher report (`/reports/teacher`).
- Admin report (`/reports/admin`).

## 10.2 New Reports (gaps)

| Report | Audience | Contents |
|--------|----------|----------|
| Financial report | Admin | Revenue by product/gateway/period; coin/credit sales; refunds; manual transfers |
| Live-class report | Admin/Teacher | Sessions, bookings, attendance rate, waitlist, cancellations |
| AI-usage report | Admin | Conversations, token usage, cost, credit consumption, reset events |

## 10.3 Cross-Cutting

- Pagination on all reports (page/limit clamped).
- Export (`REPORTS_EXPORT`) → CSV/PDF.
- Role scoping verified server-side (teacher grade access via academic context).
- Delete unused `reports.repository.ts` stub; route through service layer.

---

# 11. Security Specification

## 11.1 Hard Requirements

- Validate every request; authorize every request; sanitize every input.
- Hash passwords; encrypt secrets; never log passwords/tokens/secrets/PII/payment data.
- Least privilege everywhere.
- No stack traces, SQL errors, internal exceptions, or env vars exposed.
- CORS restricted to trusted origins (audit finding: currently broad).
- `.metrics` endpoint must not be public (audit finding).
- `/health` should be minimal and safe (audit finding: currently public).

## 11.2 P0/P1 Fix List (from audits)

1. Credits reset bug — `ai-settings.service.ts:236`.
2. SSRF — `ai-knowledge-base.service.ts:213`.
3. RAG not functional (JSONB embeddings; TF-only search) — rebuild on pgvector.
4. Migrations broken (P3006) — remove failed ledger row, recreate shadow DB, catch-up migration.
5. Fallback secrets in repo — replace with env-backed secrets.
6. Apple OAuth `id_token` unverified — validate signature/claims.
7. Broad CORS.
8. Public `.metrics` / `/health`.

## 11.3 Success Criteria

- All P0/P1 items closed before any new feature ships (P0 gate).

---

# 12. KPIs (Per Module)

| Module | KPI |
|--------|-----|
| Auth | Login success rate; account recovery time |
| Curriculum | % students with context-correct content = 100% |
| Lessons | Completion rate; avg time per lesson |
| Quiz | Pass rate; retry rate; avg score |
| Homework | Submission rate; on-time rate |
| Mistakes | Practice adoption; score improvement after practice |
| Video | In-video question completion rate |
| Live | Booking fill rate; attendance rate; waitlist-to-booking conversion |
| Payments | Payment success rate; chargeback/refund rate; verification time |
| Coins | Unlock conversion; code redemption rate |
| XP/Achievements | XP earned/week; achievement unlock rate |
| Competition | Participation rate; weekly active participants |
| Certificates | Certificate generation rate |
| AI | Questions/student/week; token cost/student; RAG hit rate; response grounding score |
| Reports | Report generation latency; export usage |
| Notifications | Delivery success rate by channel; open/read rate; opt-out rate |

---

# 13. Out Of Scope (Deferred)

| Item | Reason | Revisit |
|------|--------|---------|
| Native Android/iOS feature parity | Mobile app currently has only 10 screens (auth + dashboard + lesson detail) | Phase 9 (Mobile MVP) |
| Real payment gateway live keys | Requires merchant accounts/credentials | Phase 6 |
| Email/SMS providers | Requires provider accounts | Phase 6/8 |
| Advanced recommendations engine | Requires real usage data + pgvector | Post-RAG |
| Marketing site / SEO | Not core learning platform | Later |
| Multi-tenant/SaaS hosting for other schools | Enterprise single-tenant focus | Later |

---

# 14. Readiness Assessment

## 14.1 Buildable Now (already implemented)

Auth+RBAC, curriculum (Unit/Story/Final Review), lessons, vocabulary, activities, quiz, homework, mistakes, video questions, live core, coins/unlocks/codes, XP/achievements, competition, certificates, games, saved documents, support, notifications (in-app/WhatsApp/push), reports (student/teacher/admin), document import, delegation model.

## 14.2 Blocked Until P0 Gate (migrations → RAG → then features)

- Any new feature work.
- Real RAG / semantic search.
- AI credits purchase.
- Live monetization (session consumption), waiting list, reschedule, refunds. **Implemented in Phase 1B** (consumption on confirmed booking, waiting list + auto-promote, reschedule lifecycle, `LiveRefund` ledger).
- Email/SMS notifications.
- Financial/live/AI reports.
- Coupons, real gateways.

## 14.3 P0 Gate Definition

Ship nothing new until:
1. ✅ Migrations fixed (P3006 resolved; `db push` replaced by `migrate dev/deploy`; catch-up migration for the 8 push-only tables).
2. ✅ Single bootstrap commit of all current work.
3. ✅ RAG fixed on pgvector (image swap to `pgvector/pgvector:pg16`).
4. ✅ Security P0/P1 list closed.
5. ✅ Unit/integration tests pass for touched areas.

---

# 15. Compliance Checklist (AGENTS.md)

- ✅ Documentation driven: this document is the source of truth.
- ✅ No invented architecture, tables, APIs, or folder structures.
- ✅ Roles/permissions from shared package (never hardcoded).
- ✅ Naming: kebab-case files, PascalCase components/interfaces/enums, camelCase vars/functions, SCREAMING_SNAKE_CASE constants.
- ✅ TypeScript strict; no `any`; explicit return types.
- ✅ Controllers = requests only; services = business logic; repositories = DB access; DTOs = validation.
- ✅ Transactions for multi-step ops.
- ✅ Tests required per module (unit + integration; e2e where applicable).
- ✅ Documentation updated before/with implementation.
- ✅ Conventional commits; feature branches; PR review.
- ✅ No secrets committed; `.gitignore` for stray log/cookie files (backend*.log, cookies-*.txt, frontend*.log, dev-*.log, req.json).

---

End of Document.
