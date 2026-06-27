# LIVE_CLASSES_API.md

# El-bannawy Platform
## Live Classes API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Live Classes Module.

The Live Classes API is responsible for:

- Scheduling live sessions
- Student booking
- Waiting list management
- Attendance tracking
- Session reminders
- Meeting access
- Live class analytics

---

# Base Endpoint

/api/v1/live-classes

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

- Student
- Teacher
- Secretary
- Administrator

---

# ==========================
# LIVE CLASS LIST
# ==========================

GET

/live-classes

Description

Return all available live classes.

Supported Filters

- Grade
- Teacher
- Date
- Status

Response

```json
[
  {
    "id": "",
    "title": "",
    "teacher": "",
    "date": "",
    "startTime": "",
    "duration": 90,
    "availableSeats": 12,
    "status": "scheduled"
  }
]
```

---

# ==========================
# LIVE CLASS DETAILS
# ==========================

GET

/live-classes/{classId}

Description

Return complete session details.

Includes

- Teacher
- Date
- Time
- Duration
- Available Seats
- Booking Status

---

# ==========================
# BOOK SESSION
# ==========================

POST

/live-classes/{classId}/book

Description

Book a seat.

Response

```json
{
    "bookingId":"",
    "status":"confirmed"
}
```

---

# ==========================
# CANCEL BOOKING
# ==========================

DELETE

/live-classes/{classId}/booking

Description

Cancel booking.

Validation

Booking cancellation deadline applies.

---

# ==========================
# WAITING LIST
# ==========================

POST

/live-classes/{classId}/waiting-list

Description

Join waiting list.

---

DELETE

/live-classes/{classId}/waiting-list

Leave waiting list.

---

GET

/live-classes/{classId}/waiting-list

Administrator

Teacher

Return waiting list.

---

# ==========================
# JOIN SESSION
# ==========================

GET

/live-classes/{classId}/join

Description

Return meeting link.

Validation

Server verifies:

- Booking Exists
- Session Started
- Student Authorized

Response

```json
{
    "meetingUrl":"",
    "accessGranted":true
}
```

---

# ==========================
# ATTENDANCE
# ==========================

POST

/live-classes/{classId}/attendance

Description

Record attendance.

Automatically called after joining.

---

GET

/live-classes/{classId}/attendance

Teacher

Administrator

Return attendance list.

---

# ==========================
# MY BOOKINGS
# ==========================

GET

/live-classes/my-bookings

Description

Return student's booked sessions.

---

# ==========================
# TEACHER MANAGEMENT
# ==========================

POST

/live-classes

Teacher

Administrator

Create session.

---

PATCH

/live-classes/{classId}

Update session.

---

DELETE

/live-classes/{classId}

Cancel session.

Soft Delete.

---

POST

/live-classes/{classId}/publish

Publish session.

---

POST

/live-classes/{classId}/close

Close booking.

---

# ==========================
# REMINDERS
# ==========================

POST

/live-classes/{classId}/send-reminders

Administrator

Secretary

Send reminders.

Channels

- WhatsApp
- Push
- Email

---

# ==========================
# ANALYTICS
# ==========================

GET

/live-classes/analytics

Teacher

Administrator

Return

- Attendance Rate
- Booking Rate
- Cancellation Rate
- Average Attendance
- Popular Sessions

---

# ==========================
# VALIDATION
# ==========================

Validate

- Session Exists
- Student Enrollment
- Booking Availability
- Capacity
- Waiting List
- Join Time

---

# ==========================
# SECURITY
# ==========================

Students may join only:

Booked sessions.

Meeting links are temporary.

Meeting URLs must never be public.

---

# ==========================
# RATE LIMIT
# ==========================

Booking

20 Requests / Minute

Join Session

10 Requests / Minute

Attendance

30 Requests / Minute

---

# ==========================
# STATUS CODES
# ==========================

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# ==========================
# PERFORMANCE
# ==========================

Session List

<300ms

Booking

<500ms

Attendance

<200ms

Join Session

<300ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Session Created
- Session Updated
- Booking Created
- Booking Cancelled
- Attendance Recorded
- Reminder Sent

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Live class listing works.

✓ Booking works.

✓ Waiting list works.

✓ Attendance works.

✓ Join session works.

✓ Reminder sending works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Live Classes API must guarantee a reliable booking and attendance experience while ensuring that only authorized students can participate in scheduled live sessions.

End of Document.