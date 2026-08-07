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

Plan A (1 day / week, 4 sessions) or Plan B (2 days / week, 8 sessions).

Prices are loaded from `useLivePricing` and rendered per plan.

Select Schedule

List of active schedules for the chosen type; picking one sets the weekly days.

Summary

Confirmation card with plan, schedule, weekly days, first session and monthly price.

Checkout

`LiveCheckoutDialog` — choose Paymob / Fawry (online redirect) or Instapay (manual proof).

Success returns the student to the live classes landing page.

---

# Admin Commerce

Route

`/dashboard/live/admin/commerce`.

Tabs

Prices

Edit the six live product prices (PRIVATE/GROUP Plan A & B, ONE_TIME, FREE) via `PUT /live/products/pricing`.

Instapay Approvals

List `AWAITING_APPROVAL` payments with sender / transaction details and screenshot.

Approve activates the subscription; reject requires an admin note.

Roles

ADMINISTRATOR.

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