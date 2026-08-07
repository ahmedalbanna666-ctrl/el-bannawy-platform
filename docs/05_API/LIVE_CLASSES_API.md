# Live API

Version: 4.1.0
Source: `apps/backend/src/live/live.controller.ts`

## Base And Authorization

Base path: `/api/v1/live`

Every route requires JWT authentication and the roles guard. Teacher/administrator-only operations are marked below.

## Sessions

| Method | Path                                    | Roles                 | Purpose                   |
| ------ | --------------------------------------- | --------------------- | ------------------------- |
| GET    | `/sessions`                             | Authenticated         | List sessions             |
| GET    | `/sessions/:id`                         | Authenticated         | Read session              |
| GET    | `/sessions/by-lesson/:lessonId`         | Authenticated         | List sessions linked to a lesson, with per-user join eligibility |
| POST   | `/sessions`                             | Administrator/Teacher | Create session            |
| PATCH  | `/sessions/:id`                         | Administrator/Teacher | Update session            |
| DELETE | `/sessions/:id`                         | Administrator/Teacher | Delete session            |
| POST   | `/sessions/:id/publish`                 | Administrator/Teacher | Publish session           |
| POST   | `/sessions/:id/unpublish`               | Administrator/Teacher | Unpublish session         |
| POST   | `/sessions/:id/start`                   | Administrator/Teacher | Start session             |
| POST   | `/sessions/:id/end`                     | Administrator/Teacher | End session               |
| GET    | `/sessions/:id/control-panel`           | Administrator/Teacher/Secretary | Read control panel        |
| GET    | `/sessions/:id/control-logs`            | Administrator/Teacher | Read control logs         |
| GET    | `/sessions/:id/attendance`              | Administrator/Teacher/Secretary | Read attendance log       |
| GET    | `/sessions/:id/announcements`           | Authenticated         | List announcements        |
| POST   | `/sessions/:id/announcements`           | Administrator/Teacher | Send announcement         |
| DELETE | `/sessions/:id/participants/:studentId` | Administrator/Teacher | Remove participant        |
| PATCH  | `/sessions/:id/settings`                | Administrator/Teacher | Override session settings |
| POST   | `/sessions/:id/attendance`              | Administrator/Teacher | Record attendance         |

## Zoom Meeting Management

| Method | Path                             | Roles                 | Purpose                              |
| ------ | -------------------------------- | --------------------- | ------------------------------------ |
| POST   | `/sessions/:id/zoom-meeting`     | Administrator/Teacher | Create and attach a Zoom meeting     |
| PATCH  | `/sessions/:id/zoom-meeting`     | Administrator/Teacher | Update the attached Zoom meeting     |
| DELETE | `/sessions/:id/zoom-meeting`     | Administrator/Teacher | Delete and detach the Zoom meeting   |

## Join And Attendance

| Method | Path                  | Roles         | Purpose                                                    |
| ------ | --------------------- | ------------- | ---------------------------------------------------------- |
| POST   | `/sessions/:id/join`  | Authenticated | Server-side access checks + attendance record + SDK signature |
| POST   | `/sessions/:id/leave` | Authenticated | Finalize attendance (leftAt, duration, status)             |

`/join` validates: session exists and is not `DRAFT`/`CANCELLED`/`COMPLETED`/`ARCHIVED`; the meeting window is open; the user is the session teacher, or is a `STUDENT` with an active, non-expired subscription (or a confirmed booking) and, when no booking exists, is enrolled in the session grade. On success it upserts a `LiveAttendance` row (`status=JOINED`, `joinedAt`, `device`, `ip`) and returns `{ meetingNumber, sdkKey, signature, password, userName, userEmail, role, zoomJoinUrl, leaveUrl }` for `ZOOM_SDK` sessions.

## Booking And Subscription

| Method | Path                                    | Roles         | Purpose                                 |
| ------ | --------------------------------------- | ------------- | --------------------------------------- |
| GET    | `/my-bookings`                          | Authenticated | List current user's bookings            |
| POST   | `/sessions/:id/book`                    | Authenticated | Book session                            |
| DELETE | `/bookings/:id`                         | Authenticated | Cancel booking subject to service rules |
| POST   | `/bookings/:id/reschedule-request`      | Authenticated | Student requests reschedule with reason |
| PATCH  | `/bookings/:id/reschedule-decision`     | Admin/Teacher | Approve or reject a reschedule request  |
| GET    | `/subscriptions`                        | Authenticated | List subscriptions                      |
| POST   | `/subscriptions`                        | Authenticated | Create subscription                     |
| PATCH  | `/subscriptions/:id`                    | Authenticated | Update subscription                     |

### Waiting List

| Method | Path                       | Roles         | Purpose                              |
| ------ | -------------------------- | ------------- | ------------------------------------ |
| GET    | `/my-waitlist`             | Authenticated | List current user's waiting entries  |
| POST   | `/sessions/:id/waitlist`   | Authenticated | Join waiting list when session is full |
| DELETE | `/sessions/:id/waitlist`   | Authenticated | Leave waiting list                   |
| GET    | `/sessions/:id/waitlist`   | Admin/Teacher/Secretary | List a session's waiting entries     |

## Availability And Date Blocks

| Method | Path                                  | Roles                 | Purpose                                            |
| ------ | ------------------------------------- | --------------------- | -------------------------------------------------- |
| GET    | `/availability`                       | Authenticated         | List teacher availability; optional `teacherId`    |
| POST   | `/availability`                       | Administrator/Teacher | Create availability                                |
| PATCH  | `/availability/:id`                   | Administrator/Teacher | Update availability                                |
| DELETE | `/availability/:id`                   | Administrator/Teacher | Soft-delete availability                           |
| GET    | `/availability/calendar`              | Authenticated         | List bookable calendar slots                       |
| POST   | `/availability/calendar/:slotId/book` | Authenticated         | Book a calendar slot                               |
| POST   | `/availability/calendar/:slotId/recurring-book` | Authenticated | Book a recurring series for a fixed slot (Private Monthly / Group) |
| GET    | `/date-blocks`                        | Authenticated         | List date blocks; optional `teacherId`             |
| POST   | `/date-blocks`                        | Administrator/Teacher | Block date                                         |
| DELETE | `/date-blocks/:id`                    | Authenticated         | Remove date block subject to service authorization |

## Recurring Booking

| Method | Path                                       | Roles         | Purpose                                                       |
| ------ | ------------------------------------------ | ------------- | ------------------------------------------------------------- |
| POST   | `/availability/calendar/:slotId/recurring-book` | Authenticated | Book a recurring series (Private Monthly / Group) for a fixed slot |

`POST /availability/calendar/:slotId/recurring-book` body (validated by `RecurringBookDto`):

| Field            | Type     | Required | Description                                                            |
| ---------------- | -------- | -------- | ---------------------------------------------------------------------- |
| `dateFrom`       | ISO date | Yes      | First day of the series range                                            |
| `dateTo`         | ISO date | Yes      | Last day of the series range                                             |
| `subscriptionId` | UUID     | No       | Subscription to consume for the series                                  |

Behavior (reuse-only, no new business rules):

- The `slotId` must reference an existing, non-deleted availability slot (format `<availId>:<date>` as returned by `/availability/calendar`). Only the availability id is used; the embedded date is ignored.
- Eligible dates are those within `[dateFrom, dateTo]` whose `dayOfWeek` matches the slot's recurring day, bounded by the slot's `effectiveFrom`/`effectiveTo`.
- Each occurrence is materialized through the Scheduling Engine (`LiveAvailabilityService.materializeSessionFromSlot`) and booked through the unified `BookingEngineService` (all V1–V9 checks per occurrence).
- `LiveSubscriptionService.isEligible`/`isExhausted` are checked per occurrence; once the entitlement is exhausted the remaining occurrences are reported `SKIPPED`.
- Response: `data.occurrences` array with `{ date, status: "BOOKED" | "SKIPPED", reason?, booking? }`; `data.bookedCount` and `data.skippedCount` summarize the series. A `BOOKED` occurrence carries the engine booking payload including its `bookingKind`.

## Study Schedules

Recurring weekly templates that drive monthly plan purchases.

| Method | Path               | Roles                 | Purpose                                  |
| ------ | ------------------ | --------------------- | ---------------------------------------- |
| GET    | `/schedules`       | Authenticated         | List schedules; optional `teacherId` query |
| GET    | `/schedules/:id`   | Authenticated         | Read one schedule                        |
| POST   | `/schedules`       | Administrator/Teacher | Create schedule                          |
| PATCH  | `/schedules/:id`   | Administrator/Teacher | Update schedule (name, type, days, active) |
| DELETE | `/schedules/:id`   | Administrator/Teacher | Delete schedule                          |

`POST /schedules` body (`CreateStudyScheduleDto`):

| Field         | Type     | Required | Description                                                        |
| ------------- | -------- | -------- | ------------------------------------------------------------------ |
| `name`        | string   | Yes      | Display name of the schedule                                       |
| `type`        | enum     | Yes      | `PRIVATE` or `GROUP`                                               |
| `maxStudents` | number   | No       | Group capacity (used by GROUP schedules)                           |
| `gradeId`     | UUID     | No       | Optional grade scope                                               |
| `days`        | array    | Yes      | Recurring day rows: `{ dayOfWeek, startTime, endTime, maxStudents? }` |

Students read schedules through the shared `GET /schedules`; write operations are restricted to administrators and teachers.

## Live Product Pricing

| Method | Path                 | Roles         | Purpose                                             |
| ------ | -------------------- | ------------- | --------------------------------------------------- |
| GET    | `/products/pricing`  | Authenticated | Read the six live product prices (flat code → price map) |
| PUT    | `/products/pricing`  | Administrator | Update one or more product prices                   |

Products (`LIVE_*` codes): `PRIVATE_PLAN_A` (4 sessions), `PRIVATE_PLAN_B` (8), `GROUP_PLAN_A` (4), `GROUP_PLAN_B` (8), `ONE_TIME` (1), `FREE` (0).

`GET /products/pricing` returns a flat map, e.g. `{ PRIVATE_PLAN_A: 500, ... }`. Persisted in `SystemSetting` under key `live_product_prices` with defaults applied when unset. `PUT /products/pricing` accepts the same flat map; invalid (negative / non-finite) prices are rejected.

## Per-Product Reports

| Method | Path            | Roles                 | Purpose                                        |
| ------ | --------------- | --------------------- | ---------------------------------------------- |
| GET    | `/reports/products` | Administrator/Teacher/Secretary | Per-product live analytics for a date range    |

`GET /reports/products` query (validated by `ProductReportQueryDto`):

| Field       | Type     | Required | Description                                                            |
| ----------- | -------- | -------- | ---------------------------------------------------------------------- |
| `dateFrom`  | ISO date | Yes      | Range start                                                           |
| `dateTo`    | ISO date | Yes      | Range end                                                             |
| `teacherId` | UUID     | No       | Restrict to one teacher (teachers are always scoped to themselves)    |

Response: `data` array with one entry per product (`PRIVATE_MONTHLY`, `GROUP`, `ONE_TIME`, `FREE`):

| Field                 | Type     | Description                                                        |
| --------------------- | -------- | ------------------------------------------------------------------ |
| `product`             | enum     | One of the four live products                                      |
| `sessionCount`        | number   | Distinct live sessions with at least one confirmed booking         |
| `bookingCount`        | number   | Confirmed bookings                                                 |
| `attendanceRate`      | number   | Attended / booked ratio (0–100)                                    |
| `capacityUtilization` | number   | Booked seats / total seats across the product's sessions (0–100)   |

Classification uses the deterministic `SessionKindResolver` rules applied to each confirmed booking: GROUP session → `GROUP`; PRIVATE + `PRIVATE_MONTHLY` subscription → `PRIVATE_MONTHLY`; PRIVATE + `ONE_TIME_PRIVATE` → `ONE_TIME`; PRIVATE with no subscription → `FREE`. All metrics are derived live from `LiveSession`, `LiveBooking`, `LiveSubscription` and `LiveAttendance`; no persisted aggregates exist.

## Analytics And Dashboards (Phase 4)

Read-only analytics and dashboard aggregates. All responses are derived live from existing tables; no persisted aggregates.

| Method | Path                    | Roles                        | Purpose                                    |
| ------ | ----------------------- | ---------------------------- | ------------------------------------------ |
| GET    | `/analytics/overview`   | Administrator/Secretary      | Platform-wide live KPIs over a date range  |
| GET    | `/analytics/teachers`   | Administrator/Secretary      | Teacher-scoped live KPIs; `teacherId` query |
| GET    | `/analytics/students`   | Administrator/Secretary/Teacher | Student-scoped live KPIs; `studentId` query |
| GET    | `/analytics/sessions`   | Administrator/Secretary      | Session-level attendance/booking aggregates |
| GET    | `/teacher/kpis`         | Administrator/Teacher/Secretary | Teacher dashboard KPIs; optional `teacherId` query |
| GET    | `/admin/status`         | Administrator                | Meeting-provider config, policies, notifications analytics |
| GET    | `/secretary/dashboard`  | Secretary/Administrator      | Secretary read-only overview (today/upcoming classes, subscriptions, students, waitlist, recent sessions) |

`/analytics/overview`, `/analytics/teachers`, `/analytics/students` and `/analytics/sessions` accept an `AnalyticsQueryDto` with:

| Field       | Type     | Required | Description                                                            |
| ----------- | -------- | -------- | ---------------------------------------------------------------------- |
| `dateFrom`  | ISO date | Yes      | Range start                                                           |
| `dateTo`    | ISO date | Yes      | Range end                                                             |
| `teacherId` | UUID     | No       | Restrict to one teacher (used by `/analytics/teachers`)               |
| `studentId` | UUID     | No       | Restrict to one student (used by `/analytics/students`)               |

`/analytics/overview` response fields: `totalSessions`, `publishedSessions`, `liveNowSessions`, `completedSessions`, `cancelledSessions`, `upcomingSessions`, `totalBookings`, `totalStudents`, `attendanceRate` (0–100), `capacityUtilization` (0–100), `activeSubscriptions`, `waitlistEntries`.

`/teacher/kpis` response fields: `teacherId`, `totalSessions`, `upcomingSessions`, `liveNow`, `todaySessions`, `totalBookings`, `uniqueStudents`, `waitlistEntries`, `pendingRescheduleRequests`.

`/admin/status` response: `meetingProvider` (id, configured, restConfigured, sdkKeyConfigured), `policies` (sessionConsumptionTiming, cancellationRefundPolicy, attendancePolicy), `notifications` (analytics, configsCount, templatesCount).

`/secretary/dashboard` response: `todayLiveClasses`, `upcomingLiveClasses`, `activeSubscriptions`, `totalStudents`, `waitlistEntries`, `recentSessions`.

## Rules And Limitations

- Sessions support `PRIVATE` and `GROUP` types and `ZOOM_SDK`/`EXTERNAL_URL` providers.
- Meeting numbers must never be used directly by clients; only the `/join` endpoint returns an SDK signature.
- Attendance uniqueness is enforced by database constraints.
- Booking a session consumes one subscription session (`sessionsUsed`) when a subscription is linked; cancellation credits it back.
- When a seat is released, the first waiting-list entry is auto-promoted to a confirmed booking within the same transaction.
- `POST /sessions/:id/book` accepts an optional `subscriptionId` (and optional `bookingKind` on the DTO) and returns `data.bookingKind` — the engine-resolved kind (`PRIVATE_MONTHLY`, `GROUP`, `ONE_TIME`, or `FREE`).
- Reschedule requests are single-stage (`REQUESTED` → `APPROVED`/`REJECTED`); a decision can only be made on a pending request.
- Publishing a session sends an immediate notice to active subscribers and schedules a `live_session_reminder` notification 30 minutes before the session start (via `NotificationsService.scheduleToUserIds`, subject to notification preferences).
- `SECRETARY` has read-only access to live routes (attendance, control panel, waitlist, product reports, analytics, teacher KPIs, secretary dashboard); it cannot create/publish/start sessions or mutate bookings.
- Zoom REST and signature calls require `ZOOM_CLIENT_ID`/`ZOOM_CLIENT_SECRET` (and/or `ZOOM_SDK_KEY`/`ZOOM_SDK_SECRET`).

End of Document.
