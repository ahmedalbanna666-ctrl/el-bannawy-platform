# NOTIFICATIONS_API.md

# El-bannawy Platform
## Notifications API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Notifications Module.

The Notifications API is responsible for delivering intelligent, personalized, and automated notifications to students, parents, teachers, secretaries, support staff, and administrators.

Notifications may be delivered through multiple communication channels depending on user preferences and system rules.

---

# Base Endpoint

/api/v1/notifications

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

- Student
- Parent
- Teacher
- Secretary
- Support
- Administrator

---

# ==========================
# MY NOTIFICATIONS
# ==========================

GET

/notifications

Description

Return authenticated user's notifications.

Supported Filters

- Unread
- Read
- Priority
- Category

Response

```json
[
  {
    "id": "",
    "title": "",
    "message": "",
    "type": "lesson_reminder",
    "priority": "medium",
    "isRead": false,
    "createdAt": ""
  }
]
```

---

# ==========================
# NOTIFICATION DETAILS
# ==========================

GET

/notifications/{notificationId}

Description

Return notification details.

---

# ==========================
# MARK AS READ
# ==========================

PATCH

/notifications/{notificationId}/read

Description

Mark notification as read.

---

PATCH

/notifications/read-all

Description

Mark all notifications as read.

---

# ==========================
# DELETE
# ==========================

DELETE

/notifications/{notificationId}

Description

Soft delete notification for current user.

Notification remains stored for auditing.

---

# ==========================
# USER PREFERENCES
# ==========================

GET

/notifications/preferences

Description

Return notification settings.

---

PATCH

/notifications/preferences

Description

Update preferences.

Request

```json
{
    "lessonReminders": true,
    "homeworkReminders": true,
    "liveSessionReminders": true,
    "achievementNotifications": true,
    "motivationalMessages": true,
    "studyTips": true,
    "teacherAnnouncements": true
}
```

Critical notifications cannot be disabled.

---

# ==========================
# SEND NOTIFICATION
# ==========================

POST

/notifications/send

Administrator

Secretary

Teacher

Description

Send notification.

Request

```json
{
    "type": "motivational_message",
    "title": "",
    "message": "",
    "channel": "push",
    "targetType": "class",
    "targetId": "uuid"
}
```

Target Types

- all_students
- grade
- class
- individual

---

# ==========================
# SCHEDULE
# ==========================

POST

/notifications/schedule

Administrator

Teacher

Description

Schedule notification.

Request

```json
{
    "type": "homework_reminder",
    "title": "",
    "message": "",
    "channel": "push",
    "targetType": "grade",
    "targetId": "uuid",
    "scheduledAt": "2026-07-01T09:00:00Z"
}
```

Supported Notification Types

- Live Lesson Reminder
- Homework Reminder
- Lesson Reminder
- End Lesson Assessment Reminder
- Motivational Messages
- Daily Study Tips
- Achievement Notifications
- Teacher Announcements
- New Lesson Published
- New Homework Available
- Upcoming Live Session
- Weekly Progress Summary

---

# ==========================
# DELIVERY STATUS
# ==========================

GET

/notifications/{notificationId}/status

Description

Return delivery status.

Possible Values

- Pending
- Sent
- Delivered
- Read
- Failed

---

# ==========================
# TEMPLATES
# ==========================

GET

/notifications/templates

Administrator

Return available templates.

---

POST

/notifications/templates

Create template.

---

PATCH

/notifications/templates/{templateId}

Update template.

---

DELETE

/notifications/templates/{templateId}

Archive template.

---

# ==========================
# ANALYTICS
# ==========================

GET

/notifications/analytics

Administrator

Return

- Delivery Rate
- Open Rate
- Read Rate
- Failed Messages
- Channel Performance
- Most Used Templates

---

# ==========================
# VALIDATION
# ==========================

Validate

- User Exists
- Notification Exists
- Channel Enabled
- Template Exists
- Schedule Time
- Message Length
- Notification Type
- Target Type
- Target ID
- Teacher Authorization (target scope)

---

# ==========================
# SECURITY
# ==========================

Students may access only:

Their own notifications.

Teachers cannot broadcast system-wide notifications.

Administrators have full notification privileges.

---

# ==========================
# RATE LIMIT
# ==========================

Read Notifications

60 Requests / Minute

Send Notification

20 Requests / Minute

Broadcast

5 Requests / Minute

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

Notification List

<200ms

Read Notification

<100ms

Send Notification

<500ms

Broadcast Processing

Asynchronous

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Notification Sent
- Notification Read
- Notification Deleted
- Broadcast Created
- Template Created
- Template Updated
- Delivery Failed

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Notification list works.

✓ Read status works.

✓ Preferences work.

✓ Notification sending works.

✓ Broadcast works.

✓ Scheduling works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Notifications API must ensure timely, secure and personalized communication while respecting user preferences and protecting sensitive information.

Every notification must deliver meaningful value and avoid unnecessary interruptions.

End of Document.