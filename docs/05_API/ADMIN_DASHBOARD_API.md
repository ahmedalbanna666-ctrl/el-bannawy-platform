# ADMIN_DASHBOARD_API.md

# El-bannawy Platform
## Administration Dashboard API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints used by the Administration Dashboard.

The Administration Dashboard API provides complete control over the platform.

Only authorized administrators may access these endpoints.

---

# Base Endpoint

/api/v1/admin

---

# Authentication

Required

JWT Access Token

Administrator Role

---

# Supported Roles

- Administrator

Future

- Super Administrator

---

# ==========================
# DASHBOARD
# ==========================

GET

/admin/dashboard

Description

Return platform overview.

Response

```json
{
  "students": 12054,
  "teachers": 24,
  "activeUsers": 3485,
  "todayRevenue": 15600,
  "activeLiveClasses": 12,
  "platformHealth": "Healthy"
}
```

---

# ==========================
# STUDENT MANAGEMENT
# ==========================

GET

/admin/students

Return student list.

Filters

- Grade
- Stage
- Status

---

POST

/admin/students

Create student.

---

PATCH

/admin/students/{studentId}

Update student.

---

DELETE

/admin/students/{studentId}

Soft Delete.

---

PATCH

/admin/students/{studentId}/status

Update status.

---

# ==========================
# TEACHER MANAGEMENT
# ==========================

GET

/admin/teachers

Return teacher list.

---

POST

/admin/teachers

Create teacher.

---

PATCH

/admin/teachers/{teacherId}

Update teacher.

---

DELETE

/admin/teachers/{teacherId}

Soft Delete.

---

# ==========================
# SECRETARY MANAGEMENT
# ==========================

GET

/admin/secretaries

Return secretary list.

---

POST

/admin/secretaries

Create secretary.

---

PATCH

/admin/secretaries/{id}

Update secretary.

---

DELETE

/admin/secretaries/{id}

Soft Delete.

---

# ==========================
# SUPPORT MANAGEMENT
# ==========================

GET

/admin/support

Return support staff.

---

POST

/admin/support

Create support account.

---

PATCH

/admin/support/{id}

Update support account.

---

DELETE

/admin/support/{id}

Soft Delete.

---

# ==========================
# SYSTEM SETTINGS
# ==========================

GET

/admin/settings

Return system configuration.

---

PATCH

/admin/settings

Update settings.

Supported

- Academic Year

- XP

- Coins

- Referral

- Live Classes

- Maintenance Mode

---

# ==========================
# ROLE MANAGEMENT
# ==========================

GET

/admin/roles

Return roles.

---

POST

/admin/roles

Create role.

---

PATCH

/admin/roles/{roleId}

Update role.

---

DELETE

/admin/roles/{roleId}

Archive role.

---

# ==========================
# PERMISSIONS
# ==========================

GET

/admin/permissions

Return permission matrix.

---

PATCH

/admin/permissions

Update permissions.

---

# ==========================
# AUDIT LOGS
# ==========================

GET

/admin/audit-logs

Return audit logs.

Supported Filters

- User

- Action

- Date

- Module

---

# ==========================
# SYSTEM HEALTH
# ==========================

GET

/admin/system-health

Return

- API Status

- Database

- Redis

- Queue

- Storage

- AI Provider

---

# ==========================
# FEATURE FLAGS
# ==========================

GET

/admin/features

Return feature flags.

---

PATCH

/admin/features

Enable or disable platform features.

---

# ==========================
# BROADCAST
# ==========================

POST

/admin/broadcast

Broadcast announcement.

Targets

- Students

- Teachers

- Parents

- Secretaries

---

# ==========================
# ANALYTICS
# ==========================

GET

/admin/analytics

Return

- Users

- Revenue

- AI

- Notifications

- System Health

- Growth

---

# ==========================
# VALIDATION
# ==========================

Validate

- Administrator Authorization

- Resource Exists

- Permission Assignment

- Feature Availability

---

# ==========================
# SECURITY
# ==========================

Only Administrators may access these endpoints.

Every request must be authenticated.

Every action must be audited.

Critical operations require password confirmation.

Future Version

Multi-Factor Authentication.

---

# ==========================
# RATE LIMIT
# ==========================

Dashboard

60 Requests / Minute

Configuration

20 Requests / Minute

Audit Logs

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

Dashboard

<500ms

System Health

<500ms

Audit Logs

<1 Second

Large Reports

Background Processing

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- User Created

- User Updated

- Role Updated

- Permission Updated

- Settings Changed

- Broadcast Sent

- Feature Updated

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Dashboard works.

✓ User management works.

✓ Role management works.

✓ Permission management works.

✓ Settings work.

✓ Audit logs work.

✓ System health works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Administration Dashboard API is the highest authority within the El-bannawy Platform.

Every administrative operation must be secure, auditable and fully traceable.

End of Document.