# LIVE_CLASSES_UI.md

# El-bannawy Platform
## Live Classes UI Specification

Version: 1.2.0

---

# Purpose

Defines the user interface for live classes.

Students should be able to discover, book and join sessions with minimal effort.

---

# Home Screen

Upcoming Classes

Today's Sessions

Recommended Sessions

Booked Sessions

Waiting List

---

# Live Card

Teacher

Subject

Date

Time

Seats Remaining

Join Button

Countdown

Status

---

# Status

Scheduled

Live

Completed

Cancelled

Full

---

# Booking Flow

View Details

↓

Book Seat

↓

Confirmation

↓

Reminder

↓

Join Session

---

# Join Screen

Meeting Status

Countdown

Teacher

Lesson

Join Button

Connection Test

---

# Attendance

Automatic

Manual Override

Administrator Only

---

# Calendar View

Monthly

Weekly

Daily

---

# Notifications

Booking Confirmation

Reminder

Class Started

Class Cancelled

---

# Study Schedules

Purpose

Recurring weekly templates that power monthly plan purchases.

Surfaces

Teacher / Admin

`/dashboard/live/schedules` — create, edit, delete schedules.

Each schedule holds: name, type (PRIVATE / GROUP), days of the week with start / end time, optional grade, max students, active flag.

Student

Schedules are read-only; students select one schedule while purchasing a plan.

---

# Plan Purchase Flow

Route

`/dashboard/live/private-monthly` (PRIVATE) and `/dashboard/live/group` (GROUP).

Steps

Select Plan

Each sellable plan from the `LivePricingPlan` table (loaded via `useLivePlans`, filtered to `isActive`) is rendered as a selectable card. Prices and session counts come from the plan row, so admin-created plans appear automatically.

Select Schedule

List of active schedules for the chosen type; picking one sets the weekly days.

Summary

Confirmation card with plan, schedule, weekly days, first session and monthly price.

Checkout

`LiveCheckoutDialog` — choose Paymob / Fawry (online redirect) or Instapay (manual proof).

Success returns the student to the live classes landing page.

---

# Student Live Hub

Route

`/dashboard/live`.

Layout

Tabbed hub with three focused tabs (reduces long-scroll crowding):

`الخدمات` (default)

Dynamic plan grid from `useLivePlans` (active, sorted by `sortOrder`), one `ProductCard` per plan. Plan `type` drives icon/tone/link: PRIVATE → individual monthly wizard (featured, "الأكثر طلباً"), GROUP → group wizard, ONE_TIME → single-slot booking, FREE → free events. Empty state when no active plans exist.

`اشتراكاتي`

Active subscriptions with remaining-session progress bars and a renewal CTA routed by subscription type (private / group / one-time).

`حجوزاتي`

`MyBookingsTabs` (upcoming / past / waiting list) with join, reschedule-request, and cancel actions.

A slim header hero + "اشترك الآن" shortcut sits above the tabs. Cancel / reschedule / join dialogs live at the hub level so they work across tabs.

---

# Admin Commerce

Route

`/dashboard/live/admin/commerce`.

Tabs

Plans

Admin CRUD over the `LivePricingPlan` table via `GET/POST /live/products/plans` and `PATCH/DELETE /live/products/plans/:code`: add a plan (code, name, short, description, type, price, sessionCount, benefits, active, sortOrder), edit any field, toggle active state, and delete. Inactive plans remain listed for management but are hidden from the student hub. Deleting a plan referenced by an active subscription is rejected.

Instapay Approvals

List `AWAITING_APPROVAL` payments with sender / transaction details and screenshot.

Approve activates the subscription; reject requires an admin note.

Roles

ADMINISTRATOR.

---

# Teacher Studio

Route

`/dashboard/live/studio`.

Layout

Tabbed studio with three tabs (less crowded than the single long scroll):

`اليوم` (default)

KPI strip, today's session timeline with start/end/publish controls, next-upcoming draft publish CTA, and notifications (reschedule requests, waiting list).

`الجدول الأسبوعي`

Weekly availability grid, blocked dates, and recurring slots.

`الحصص والطلاب`

Group sessions, private/individual students, and the weekly sessions chart.

A fixed live-control card floats when a session is `LIVE` (end / control). Edit and session-detail dialogs remain available in every tab. There is no manual create-session dialog — sessions are materialized from availability/schedule flows.

---

# Accessibility

Required

---

# Responsive

Mobile First

---

# Acceptance Criteria

✓ Booking

✓ Join

✓ Responsive

✓ Accessible

---

# Final Rule

The Live Classes UI must remove every possible obstacle between the student and the live lesson.

End of Document.