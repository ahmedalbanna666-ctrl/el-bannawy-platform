# SECRETARY_UI.md

# El-bannawy Platform
## Secretary Dashboard UI

Version: 2.0.0

---

# Purpose

Defines the Secretary Dashboard interface.

Focuses on administrative operations only.

---

# Current Implementation (Live Observer)

The current milestone delivers the secretary as a **read-only live observer**. The secretary can view live-class and platform health metrics but cannot mutate data. Full secretary administrative operations (student CRUD, payments, WhatsApp) are documented in `SECRETARY_DASHBOARD_API.md` and are deferred to a later milestone.

## Routing And Access

- Secretaries land on `/dashboard` and see the read-only secretary dashboard (dynamic import of `secretary-dashboard.tsx`, dispatched by role in `apps/web/src/app/dashboard/page.tsx`).
- Bottom navigation: Home, Live Classes, Reports, Notifications, Profile.
- `nav-registry.ts` registers the `secretary-live` module for the `SECRETARY` role; `ROLE_LABELS` maps `SECRETARY → "سكرتير"`.
- Live hub (`/dashboard/live`) routes secretaries to `SecretaryLiveObserverView` (upcoming sessions with join links).

## Home Screen Widgets

Today's Live Classes

Upcoming Live Classes

Active Subscriptions

Total Students

Waitlist Entries

Recent Sessions

---

# Navigation

Dashboard

Students (deferred)

Subscriptions (deferred)

Payments (deferred)

Coins (deferred)

Live Classes

Reports

WhatsApp (deferred)

Profile

---

# Live Classes Observer

Secretaries can:

- View live overview stats (today's/upcoming live classes, active subscriptions, students, waitlist).
- Browse upcoming sessions and open external meeting URLs.
- View the control panel and session attendance for a session (read-only backend routes).
- View product reports and analytics (read-only).

Secretaries cannot create, publish, start, end, delete, book, or cancel live sessions.

---

# Responsive

Mobile First

Desktop Optimized

---

# Accessibility

Required

---

# Acceptance Criteria

✓ Fast

✓ Accessible

✓ Administrative Focus

✓ Responsive

✓ Read-Only Observation

---

# Final Rule

The Secretary Dashboard should simplify administrative tasks and reduce repetitive work.

End of Document.