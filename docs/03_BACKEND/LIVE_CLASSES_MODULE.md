# Live Classes Module

Version: 4.0.0
Source: `apps/backend/src/live`

## Responsibility

Manages teacher availability, date blocks, live-session lifecycle, subscriptions, bookings, waiting lists, reschedule requests, announcements, attendance, session control history, and Zoom Meeting SDK integration.

## Persisted Model

`LiveSession`, `TeacherAvailability`, `TeacherDateBlock`, `TeacherLiveSettings`, `LiveSubscription`, `LiveBooking`, `LiveWaitingList`, `LiveAttendance`, `LiveAnnouncement`, `LiveSessionControlLog`, and `LivePricingPlan`.

## Sellable Plans (`LivePricingPlan`)

The `LivePricingPlan` table is the runtime source of truth for sellable live products (prices, session counts, descriptions, activation state). It replaces the legacy `live_product_prices` `SystemSetting` map. The six legacy products are seeded as default rows and remain fully supported; administrators can add/update/delete/toggle plans at runtime.

- `LiveSubscription.planCode` (nullable) links a subscription to the plan it was purchased from (indexed); plans referenced by `ACTIVE` subscriptions cannot be deleted (`409 ConflictException`).
- Newer subscriptions may use generic types `CUSTOM_PRIVATE`, `CUSTOM_GROUP`, or `CUSTOM_ONE_TIME` instead of the fixed legacy enum values. All activation, booking-validation, session-kind, and reporting logic accepts the custom types alongside the legacy ones.
- Plan `type` drives the student purchase flow: `PRIVATE` → private monthly wizard, `GROUP` → group wizard, `ONE_TIME` → single-slot booking, `FREE` → free events.
- Seed defaults (idempotent, applied only when the table is empty): `PRIVATE_PLAN_A` 500 EGP/4, `PRIVATE_PLAN_B` 800/8, `GROUP_PLAN_A` 300/4, `GROUP_PLAN_B` 400/8, `ONE_TIME` 200/1, `FREE` 0/0.

## Scheduling Model

Teachers define recurring or bounded availability. Concrete sessions may reference an availability slot. Sessions support private/group type, capacity, grade targeting, and optional lesson linkage (`lessonId`).

## Zoom Integration

Live sessions may use the `ZOOM_SDK` meeting provider so students join the class **inside the platform** (no new window, no `zoom.us` redirect). The server is the only component that knows Zoom credentials.

The live module depends on the `MeetingProvider` port (`apps/backend/src/live/meeting-provider/meeting-provider.interface.ts`), implemented by `ZoomProvider` (`apps/backend/src/live/meeting-provider/zoom.provider.ts`). Domain services inject `MeetingProvider` through the `MEETING_PROVIDER` DI token; the concrete vendor implementation is confined to the adapter. `LiveZoomMeetingService` and `LiveAttendanceService` never import `ZoomService` directly.

- **Signature generation**: the provider mints short-lived in-browser SDK signatures using either the Meeting SDK Key/Secret pair (JWT/HMAC-SHA256) or the OAuth flow against Zoom's `/sdk/signature` endpoint. The frontend only ever receives the signature, meeting number and sdk key.
- **Meeting management**: `POST/PATCH/DELETE /api/v1/live/sessions/:id/zoom-meeting` create/update/delete a Zoom meeting through the REST API and persist `zoomMeetingId`, `zoomPassword`, `zoomJoinUrl`, `waitingRoom`, and `autoRecord` on the `LiveSession`.
- **Join**: `POST /api/v1/live/sessions/:id/join` runs all access checks server-side (active subscription, non-expired subscription, grade enrollment, session window, provider configured), records attendance, and returns the SDK join config.
- **Leave**: `POST /api/v1/live/sessions/:id/leave` closes the attendance record (sets `leftAt`, computes `durationMinutes`, updates `attendanceStatus`).

### Zoom OAuth (authorization-code flow)

Zoom REST operations require an access token. Two grants are supported by `ZoomService` (`apps/backend/src/zoom/zoom.service.ts`):

1. **Authorization-code flow (preferred)** — the operator completes a one-time browser authorization:

   - `GET /api/v1/zoom/oauth/start` redirects to Zoom's authorize page (`ZOOM_AUTHORIZE_BASE_URL`, default `https://zoom.us/oauth/authorize`) with a short-lived in-memory CSRF `state`.
   - `GET /api/v1/zoom/oauth/callback` (public, browser redirect) exchanges the `code` via `grant_type=authorization_code`, persists the access/refresh token pair in the `SystemSetting` table under key `zoom_oauth_tokens`, and returns the result.
   - Subsequent `getAccessToken()` calls refresh transparently (`grant_type=refresh_token`); Zoom rotates the refresh token, so the latest one is written back to `SystemSetting`.

2. **Client-credentials grant (fallback)** — used automatically when no refresh token has been stored yet (works for Server-to-Server OAuth apps without a redirect URI).

Required environment variables: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, and `ZOOM_REDIRECT_URI` (must match the app's allowlisted redirect URL, e.g. `https://el-bannawy-backend-production.up.railway.app/api/v1/zoom/oauth/callback`). Optional: `ZOOM_AUTHORIZE_BASE_URL`.

Token storage reuses the existing `SystemSetting` key/value table — no schema migration is required.

The client lazily loads the Zoom Web SDK from the official CDN only when a user joins (`apps/web/src/lib/zoom-sdk.ts` + `apps/web/src/components/live/zoom-meeting-room.tsx`). The shared `JoinLiveSessionModal` (`apps/web/src/components/live/join-live-session-modal.tsx`) is the single in-platform join surface: it calls `/join`, renders the Zoom room for `ZOOM_SDK` sessions, or falls back to opening the external `meetingUrl`. It is wired into every student entry point — booked sessions (`/dashboard/live`), lesson-linked sessions (`lesson-live-session-card`), free events (`/dashboard/live/events`), and group schedules (`/dashboard/live/group`) — so the join button appears for any live session regardless of provider.

## Lifecycle

The current enum supports `DRAFT`, `PUBLISHED`, `SCHEDULED`, `OPEN`, `FULL`, `LIVE`, `COMPLETED`, `CANCELLED`, and `ARCHIVED`. The service controls publish, unpublish, start, end, update, and delete transitions.

## Student Flow

Students can list sessions, create/list subscriptions, book a session or available slot, view bookings, cancel bookings, join the waiting list when a session is full, request a reschedule, read announcements, view lesson-linked sessions (with join eligibility), and join/leave Zoom meetings with automatic attendance tracking.

## Waiting List (PMS §7.3)

When a session is full (`availableSeats = 0`), a student can join the waiting list (`LiveWaitingList`, status `WAITING`). When a seat is released (booking cancelled or participant removed), the first `WAITING` entry is **auto-promoted inside the same transaction** that frees the seat: the entry is marked `PROMOTED`, a `CONFIRMED` booking is created for the student, and the freed seat is consumed. Entries are uniquely keyed on `(sessionId, studentId)` and ordered by `position`.

## Reschedule Requests (PMS §7.4)

`LiveBooking` carries a reschedule request lifecycle. A student submits a request (`POST /bookings/:id/reschedule-request`) which sets `rescheduleStatus=REQUESTED` plus `rescheduleRequestedAt`/`rescheduleReason`. A teacher or administrator approves or rejects it (`PATCH /bookings/:id/reschedule-decision`), recording `rescheduleStatus`, `rescheduleResolvedAt`, and `rescheduleResolvedById`. Approval moves the booking status to `RESCHEDULED`.

## Subscription Session Consumption (PMS §7.2)

`LiveSubscription.sessionsUsed` consumption is **policy-driven** via the `LivePolicyEngine` port (`apps/backend/src/live/policy`). `LiveBookingService` reads the policy through the interface only; it never hardcodes consumption or refund decisions. `BootstrapLivePolicy` is the single source of temporary bootstrap defaults, replaceable later by a persisted policy store without touching business logic:

- **Session consumption timing**: `CONSUME_ON_BOOKING` — `bookSession` increments `sessionsUsed` on the linked active subscription only when the policy timing is `CONSUME_ON_BOOKING`.
- **Cancellation cutoff**: 24 hours before session start.
- **Refund policy**: `FULL_CREDIT` before cutoff, `NO_CREDIT` inside the cutoff window, `NO_CREDIT` after the session starts.

Cancelling a booking (or removing a participant) credits the subscription session back **only when the policy grants it**. Re-confirming a previously-cancelled booking consumes again.

## Booking Engine (Phase 2A)

All booking decisions for private/group/one-time/free sessions run through the unified `BookingEngineService` (`apps/backend/src/live/booking/`). `LiveBookingService` is a thin facade that delegates to the engine; reschedule logic stays in the facade.

### Responsibilities

- `BookingValidationService` — the V1–V9 validation matrix (session exists/published, student eligibility, duplicate booking, teacher availability, capacity, subscription entitlement/status/validity, refund policy check, etc.).
- `SessionKindResolver` — resolves the booking kind deterministically, with documented precedence (no heuristics):
  1. `session.type = GROUP` → `GROUP`
  2. PRIVATE + `PRIVATE_MONTHLY` subscription → `PRIVATE_MONTHLY`
  3. PRIVATE + `ONE_TIME_PRIVATE` subscription → `ONE_TIME`
  4. otherwise PRIVATE → `FREE`
  The resolved kind is echoed back in the booking response (`data.bookingKind`).
- `ReservationService` — the **single owner of `availableSeats` and reservation writes**. Every seat decrement/increment (direct booking, waitlist promotion, cancel credit) goes through it.
- `RefundPolicyService` — interprets `LivePolicyEngine` refund grants and drives credit-back calls.
- `LiveSubscriptionService` — the **only** component allowed to touch subscription counters (`consume`, `creditBack`, `getRemaining`, `getActiveTypesForTeacherTx`). The booking engine never writes subscription counters directly.

### Constraints

- Subscription counters live exclusively in `LiveSubscriptionService`; the engine calls it and never mutates counters itself.
- `ReservationService` is the single writer of seat counts and reservations; no other service decrements `availableSeats`.
- Validation includes **teacher availability**: a booking fails even when seats are free if the teacher or slot is unavailable.
- No DB schema changes, no API redesign, no business-rule changes in Phase 2A.

## Core Domain (Phase 2B)

Phase 2B consolidated the domain into single-owner services and introduced an in-process domain-event bus, without any DB schema or API changes.

### Domain Events

The live module emits typed domain events through the `LiveDomainEventBus` port (`apps/backend/src/live/events/domain-event.interface.ts`). `InProcessDomainEventBus` runs handlers sequentially after the producing write; a failing handler is logged and never breaks the originating transaction. The bus is bound to the `LIVE_DOMAIN_EVENT_BUS` token.

- `subscription.consumed` / `subscription.creditedBack` — session counter changed (with optional `sessionId` context).
- `subscription.exhausted` — counter reached the total (top-up/plan CTA trigger).
- `subscription.renewed` / `subscription.expired` — period lifecycle.
- `subscription.statusChanged` — subscription status transition.
- `attendance.recorded` / `attendance.finalized` — attendance written on join/manual mark, and finalized on leave.

### Subscription Engine (single owner)

`LiveSubscriptionService` is the **only** component that mutates subscription state (`sessionsUsed`, `status`, periods) or makes entitlement decisions. All other services (`LiveSessionService`, `LiveAttendanceService`, booking engine) call it and never read `prisma.liveSubscription` directly. It owns `consume`, `creditBack`, `getRemaining`, `getRemainingByKind`, `isEligible`, `isExhausted`, `hasAnyActiveSubscription`, `getActiveSubscriberUserIds`, `renew`, `expire`, and `processPeriodEnd`. `consume`/`creditBack` run inside the caller's transaction and emit events with `sessionId` context.

### Attendance Engine

`LiveAttendanceService` records attendance on join (auto, `AUTO` marker), finalizes it on leave (`COMPLETED` when duration meets the attendance policy threshold, otherwise `LEFT_EARLY`), and supports teacher/admin manual marking. Finalization decisions are **policy-driven**: `LivePolicyEngine.getAttendancePolicy()` supplies `minCompletedMinutes` (bootstrap default 30). Every write emits `attendance.recorded` / `attendance.finalized`.

### Scheduling Engine

`LiveAvailabilityService` owns teacher availability windows and slot materialization. Create/update reject overlapping windows for the same teacher on the same day and enforce `end > start`. `getAvailableSlots` derives seat counts from the authoritative `LiveSession.availableSeats` (ReservationService remains the single writer), skips terminal sessions (`CANCELLED`, `COMPLETED`, `ARCHIVED`) via `TERMINAL_SESSION_STATUSES`, and marks slots already booked by the requesting student with `bookedByMe` (from the current user's non-cancelled bookings keyed by `availabilitySlotId + date`) so the UI renders them red and disables re-booking.

### Meeting Provider Port

The `MeetingProvider` port (`apps/backend/src/live/meeting-provider/meeting-provider.interface.ts`) is injected via the `MEETING_PROVIDER` token, bound to `ZoomProvider`. `LiveAttendanceService` and `LiveZoomMeetingService` depend on the `MeetingProvider` interface only — never on `ZoomService` or a concrete vendor class.

## Staff Flow

Teachers and administrators manage sessions, Zoom meetings, availability, announcements, participant removal, waiting-list entries, reschedule decisions, settings, control logs, and attendance. Explicit endpoint role checks remain the source of truth.

## Attendance

`LiveAttendance` is the attendance table (equivalent of the `LiveSessionAttendance` requirement): it stores `sessionId`, `studentId`, `status`, `joinedAt`, `leftAt`, `durationMinutes`, `device`, `ip`, and markers. Join writes the record automatically; leave finalizes it.

## Live Products (Phase 3)

Phase 3 implements the four live products by **reusing** the Phase 2 engines. No DB schema changes, no API redesign of existing routes, and no business-rule changes were introduced. Each product is a composition of the unified `BookingEngineService` pipeline plus product-level conveniences:

| Product | Resolved kind | Composition |
| ------- | ------------- | ----------- |
| Private Monthly | `PRIVATE_MONTHLY` | Recurring booking over a fixed availability slot; every occurrence goes through `BookingEngineService.book` |
| Group | `GROUP` | Recurring booking over a fixed availability slot; `GROUP_MONTHLY` entitlement; every occurrence goes through `BookingEngineService.book` |
| One-Time Private | `ONE_TIME` | Single booking through `BookingEngineService.book` (existing `POST /sessions/:id/book`); `ONE_TIME_PRIVATE` entitlement |
| Free Live Session | `FREE` | Single booking through `BookingEngineService.book` (existing endpoints); always eligible |

### Recurring Booking (Private Monthly / Group)

`RecurringBookingService` (`apps/backend/src/live/live-recurring-booking.service.ts`) books a student into a **series** of sessions derived from a single recurring availability slot within a date range. It is a product-level convenience that reuses existing engines and never duplicates scheduling, seat or subscription logic:

- **Scheduling reuse**: each occurrence is materialized through the Scheduling Engine (`LiveAvailabilityService.materializeSessionFromSlot`) — the same find-or-create path used by `bookBySlot`. No duplicate slot materialization.
- **Validation reuse**: every occurrence is booked through the unified `BookingEngineService.book` pipeline (V1–V9), so capacity, duplicate, overlap, subscription status, booking window, eligibility, teacher availability and refund-policy checks apply per occurrence.
- **Subscription reuse**: `LiveSubscriptionService.isEligible` / `isExhausted` are consulted per occurrence so the series stops booking cleanly when the entitlement is exhausted (top-up/plan CTA). Counters are still mutated only by `LiveSubscriptionService` inside the engine.
- **Deterministic kind**: each occurrence's kind is resolved by `SessionKindResolver` from the materialized session type plus the student's active subscription types — a PRIVATE slot books as `PRIVATE_MONTHLY`, a GROUP slot books as `GROUP`.
- **Per-occurrence result**: the response reports each occurrence as `BOOKED` or `SKIPPED` (with a reason), so a full or ineligible occurrence does not abort the whole series.

The availability slot's `isRecurring`, `dayOfWeek` and `effectiveFrom`/`effectiveTo` boundaries define which dates are eligible for the series.

### Per-Product Reports

`LiveReportsService` (`apps/backend/src/live/live-reports.service.ts`) exposes read-only per-product analytics **reusing existing tables only** (`LiveSession`, `LiveBooking`, `LiveSubscription`, `LiveAttendance`). No new tables or persisted aggregates.

- **Product classification**: bookings are classified into the four products using the same deterministic rules as `SessionKindResolver` — GROUP session → `GROUP`; PRIVATE + `PRIVATE_MONTHLY` subscription → `PRIVATE_MONTHLY`; PRIVATE + `ONE_TIME_PRIVATE` subscription → `ONE_TIME`; PRIVATE with no subscription → `FREE`.
- **Metrics per product**: session count (distinct live sessions with at least one booking), booking count (confirmed bookings), attendance rate (attended / booked), and capacity utilization (booked seats / total seats across the product's sessions).
- **Scoping**: reports are scoped by date range and optionally by `teacherId`; teachers only see their own sessions.

### Constraints

- Recurring booking and reports only **read** domain state or route bookings through the Booking Engine; they never write subscription counters or seat counts directly.
- No DB schema change, no new Prisma model, no API redesign in Phase 3.
- Group transfers, session-question submission/moderation and live discussion remain out of scope (documented in the original requirements but lacking architecture/schema support; `live_sessions.groupId` was dropped in the Phase 1 report).

## Phase 4 — Lifecycle Notifications, Reminders, Analytics And Dashboards

Phase 4 closes the "not implemented" gaps from Phase 3 without any DB schema changes: lifecycle notifications via the domain-event bus, session reminders through the notifications queue, a subscription period-end sweep, and read-only analytics/dashboard aggregates for admin, teacher and secretary surfaces.

### Lifecycle Events

`apps/backend/src/live/events/lifecycle.events.ts` defines discriminated lifecycle events emitted by the booking, session, waitlist and subscription domains. These sit alongside the existing `subscription.*` and `attendance.*` events:

- `booking.created` / `booking.cancelled` / `booking.rescheduleRequested` / `booking.rescheduleResolved`
- `session.started` / `session.ended` / `session.cancelled`
- `waitlist.joined` / `waitlist.promoted`

### LiveNotificationService

`LiveNotificationService` (`apps/backend/src/live/live-notification.service.ts`) subscribes to the `LiveDomainEventBus` and translates each lifecycle event into in-app notifications through `NotificationsService`. Notifications are a pure side effect — a failing handler is contained by the bus and never breaks the domain write that produced the event. It notifies students and teachers on booking confirmation/cancellation, reschedule request/resolution, session start/end/cancel, waitlist join/promotion, and subscription creation.

### Session Reminders

`LiveSessionService.publishSession` sends an immediate "new live session" notice to the teacher's active subscribers and calls `scheduleSessionReminder`, which schedules a `live_session_reminder` notification **30 minutes before** session start through `NotificationsService.scheduleToUserIds` (a single delayed BullMQ job targeting an explicit user list, with notification-preference filtering). Reminders are only scheduled when the lead time is still in the future and there is at least one opted-in subscriber.

### Subscription Period-End Sweep

`LiveSubscriptionSchedulerService` registers a BullMQ repeatable scheduler (`live-subscription-period-end`, cron `5 0 * * *` UTC) on the existing notifications queue. `SubscriptionPeriodEndProcessor` runs `LiveSubscriptionService.processPeriodEnd` daily to renew subscriptions that have `autoRenew` and expire those that do not. Registration is best-effort — if Redis is unavailable at boot the failure is logged and the sweep resumes on a later boot.

### LiveAnalyticsService

`LiveAnalyticsService` (`apps/backend/src/live/live-analytics.service.ts`) derives read-only platform and per-entity metrics **live** from existing tables only (no persisted aggregates, no schema changes). It never mutates domain state.

- **Overview** — total/published/live/upcoming/completed/cancelled sessions, total bookings, unique students, attendance rate, capacity utilization, active subscriptions, waitlist entries.
- **Per-teacher** — teacher-scoped session/booking/student metrics.
- **Per-student** — student-scoped booking/attendance metrics.
- **Per-session** — session-level attendance and booking aggregates.

### LiveDashboardService

`LiveDashboardService` (`apps/backend/src/live/live-dashboard.service.ts`) exposes read-only aggregates for dashboards:

- **Teacher KPIs** — total/upcoming/today/live-now sessions, total bookings, unique students, waitlist entries, pending reschedule requests.
- **Admin status** — meeting-provider configuration, active policies (consumption timing, cancellation refund, attendance), and notifications analytics/config/template counts.
- **Secretary overview** — today's live classes, upcoming live classes, active subscriptions, total students, waitlist entries, and recent sessions (read-only observer).

### SECRETARY Read-Only Access

`SECRETARY` is granted read-only access to live routes: session attendance, control panel, waitlist listing, product reports, analytics (`overview`, `teachers`, `students`, `sessions`), teacher KPIs and the secretary dashboard. Secretaries observe; they cannot create/publish/start sessions or mutate bookings.

## Not Implemented From Original Requirements

The module still does not expose a standalone join-token endpoint separate from `/join`. External meeting-provider integration is limited to `ZOOM_SDK` and `EXTERNAL_URL` providers.

See `docs/05_API/LIVE_CLASSES_API.md` for actual routes.

End of Document.
