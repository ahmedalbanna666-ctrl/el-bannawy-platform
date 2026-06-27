# LIVE_CLASSES_MODULE.md

# El-bannawy Platform
## Live Classes Module Requirements

Version: 1.0.0

---

# Purpose

The Live Classes Module manages all online sessions between teachers and students.

It provides scheduling, booking, attendance tracking, reminders, and post-session analytics.

The module is designed to make joining live classes simple while giving teachers complete control over scheduling and attendance.

---

# Objectives

The Live Classes Module must:

- Allow students to book live classes.
- Allow teachers to manage schedules.
- Track attendance automatically.
- Send reminders.
- Generate attendance reports.
- Integrate with WhatsApp notifications.

---

# Supported Users

Primary Users

- Student
- Teacher

Management Users

- Secretary
- Administrator

---

# Navigation Flow

Home

↓

Book Live Class

↓

Available Sessions

↓

Select Session

↓

Booking Confirmation

↓

Reminder

↓

Join Session

↓

Attendance Recorded

↓

Session Completed

---

# Live Session Structure

Every Live Session contains:

- Session ID
- Session Title
- Teacher
- Grade
- Stage
- Subject
- Date
- Start Time
- End Time
- Duration
- Meeting Link
- Maximum Students
- Booking Status
- Session Status

---

# Session Status

Possible values:

- Draft
- Scheduled
- Open
- Full
- In Progress
- Completed
- Cancelled

---

# Booking Rules

Students may:

- View Available Sessions
- Book Available Sessions
- Cancel Booking (before deadline)

Students cannot:

- Book Full Sessions
- Book Expired Sessions
- Book Outside Their Grade

---

# Waiting List

If a session is full:

Students may join the waiting list.

When a seat becomes available:

The first student in the queue receives a notification.

---

# Booking Confirmation

After successful booking:

Display:

- Teacher Name
- Session Date
- Start Time
- Duration
- Join Button (when available)

---

# Session Reminder

Automatic reminders are sent:

24 Hours Before

↓

1 Hour Before

↓

15 Minutes Before

Supported Channels:

- WhatsApp
- Push Notification
- Email

---

# Join Rules

Students can join only:

Within the configured access window.

Example

15 minutes before the session starts.

Teachers can join at any time.

---

# Attendance Rules

Attendance is recorded automatically when:

Student successfully joins the session.

Additional Data:

- Join Time
- Leave Time
- Attendance Duration

---

# Attendance Status

Possible values:

- Present
- Late
- Absent
- Left Early

---

# Teacher Features

Teachers can:

- Create Sessions
- Edit Sessions
- Cancel Sessions
- Publish Sessions
- View Attendance
- Download Attendance Reports
- Send Announcements

---

# Secretary Features

Secretaries can:

- Schedule Sessions
- Manage Bookings
- Contact Students
- Generate Attendance Reports

---

# Administrator Features

Administrators can:

- Manage All Sessions
- Manage Teachers
- Configure Booking Rules
- Configure Notifications
- View Global Analytics

---

# Reports

Generate:

- Attendance Report
- Booking Report
- Teacher Report
- Student Report
- Cancellation Report

Reports support PDF export.

---

# Analytics

Track:

- Total Sessions
- Attendance Rate
- Booking Rate
- Cancellation Rate
- Average Session Duration
- Teacher Performance

---

# Notifications

Students receive:

- Booking Confirmation
- Session Reminder
- Session Cancelled
- Session Updated

Teachers receive:

- New Booking
- Session Reminder
- Attendance Summary

Parents may receive:

- Attendance Report
- Absence Notification

---

# Performance

Session list should load within:

2 seconds.

Booking confirmation should complete within:

1 second.

---

# Security

Students may join only:

Sessions assigned to their educational stage and grade.

Meeting links must never be publicly accessible.

---

# Empty State

Display:

No live sessions are currently available.

---

# Error State

Display:

Unable to load live sessions.

Retry

---

# Future Enhancements

Future Versions

- One-to-One Sessions
- Group Sessions
- AI Attendance Analysis
- Session Recording
- Calendar Synchronization
- Waiting Room
- Live Polls
- Live Chat
- Raise Hand Feature

---

# Acceptance Criteria

The Live Classes Module is complete when:

✓ Session scheduling works.

✓ Student booking works.

✓ Waiting list works.

✓ Attendance is recorded automatically.

✓ Notifications are delivered.

✓ Reports are generated.

✓ Analytics are collected.

✓ Responsive design works.

---

# Final Rule

The Live Classes Module must provide a seamless experience from booking to attendance tracking.

Students should never miss a session because of poor scheduling or communication.

End of Document.