# Roadmap And Changelog

Version: 2.1.0
Last reviewed: 2026-08-03

## Current Baseline

The current repository contains the first broad implementation baseline, including curriculum, learning players, assessments, live classes, support, competitions, games, achievements, and the coin/unlock economy. It is not a production release declaration.

## Recent Implemented Changes

- Added coins economy with configurable unit/lesson unlock costs.
- Added coin packages, purchase verification, wallet crediting, activation codes, code-scoped content unlocks, and unlock requests.
- Added live classes with teacher availability, date blocks, subscriptions, bookings, attendance, announcements, and session control logs.
- Added support tickets and per-grade support contacts.
- Added achievements and competition workflows.
- Added `STAFF` role and delegated teacher/staff permissions with initialization and idempotent legacy backfill.
- Added academic context propagation across authenticated experiences and role-specific dashboards.
- Added structured vocabulary persistence, DOCX semantic parsing, preview, edit, and bulk management.
- Added final review persistence and assessment attempt/player foundations.
- Consolidated semantic UI tokens, dark/light variants, RTL rules, reduced-motion support, and focus visibility.
- Added live-class booking engine (Phase 2A): unified `BookingEngineService`, kind resolution, reservation single-writer, refund policy, waitlist auto-promotion, subscription consumption on booking.
- Added live-class core domain consolidation (Phase 2B): in-process domain-event bus, subscription engine single-owner (consume/creditBack/eligibility/renewal), policy-driven attendance engine, scheduling engine with overlap detection, and `MEETING_PROVIDER` port injection.
- Added live products (Phase 3): `RecurringBookingService` (Private Monthly / Group recurring series over a fixed availability slot, per-occurrence through the Booking Engine) and `LiveReportsService` (per-product session/booking/attendance/capacity analytics derived live from existing tables). Reuse-only: no DB schema or API redesign.
- Added live lifecycle notifications, reminders, analytics and dashboards (Phase 4): lifecycle domain events (`booking.*`, `session.*`, `waitlist.*`), `LiveNotificationService` (in-app notifications for booking/session/waitlist/subscription events), 30-minute session-start reminders via `NotificationsService.scheduleToUserIds`, a daily subscription period-end sweep (`LiveSubscriptionSchedulerService` + `SubscriptionPeriodEndProcessor` on the notifications queue), `LiveAnalyticsService` (overview/teacher/student/session metrics) and `LiveDashboardService` (teacher KPIs, admin status, secretary overview). Added read-only `SECRETARY` access to live routes and new controller endpoints (`analytics/*`, `teacher/kpis`, `admin/status`, `secretary/dashboard`). No DB schema changes.
- Frontend (Phase 4): wired teacher dashboard (session lifecycle controls, KPIs, reschedule alerts, edit/delete), student hub (booking cancel + reschedule requests, full-sessions + waitlist sections, subscription renew/join), teacher availability editor (slot edit + date blocks), admin live widgets + analytics reports, and a new read-only secretary dashboard with SECRETARY role plumbing (nav registry, permissions, bottom nav).

## Next Delivery Track

1. Security hardening for secrets, OAuth token transport, throttling, uploads, and payment simulation.
2. Pagination and typed DTO/response consistency on unbounded endpoints.
3. Integration tests for coins, unlocks, permissions, assessments, live sessions, and support.
4. Health checks, structured logs, metrics, and deployment smoke tests.
5. Mobile feature parity.
6. Redis/BullMQ integration only for a defined workload.
7. Curriculum-aware RAG and vector retrieval after design approval.

## Explicitly Planned

- Parent portal
- Offline learning
- Marketplace
- Desktop application
- Push/email/WhatsApp/SMS delivery
- Complete AI speaking/writing evaluation
- Multi-tenant architecture

## Changelog Rule

Each feature entry must state whether it is implemented, partial, or planned and link to the code/module that proves it. A future requirement must not be marked complete because a schema placeholder exists.

End of Document.
