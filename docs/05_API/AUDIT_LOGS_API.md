# AUDIT_LOGS_API.md

# El-bannawy Platform
## Audit Logs API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Audit Logs Module.

The Audit Logs API provides a complete, immutable record of every critical action performed within the El-bannawy Platform.

Audit Logs are essential for:

- Security
- Compliance
- Troubleshooting
- Incident Investigation
- Change Tracking
- Accountability

Audit logs are append-only.

Existing records must never be modified or deleted.

---

# Base Endpoint

/api/v1/audit-logs

---

# Authentication

Required

JWT Access Token

Administrator Role

Read-only access for Support Lead (Limited).

---

# Supported Roles

- Administrator
- Support Lead (Read Only)

---

# ==========================
# AUDIT LOGS
# ==========================

GET

/audit-logs

Description

Return audit logs.

Supported Filters

- User
- Module
- Action
- Resource
- Status
- Date Range
- IP Address

Response

```json
[
    {
        "id":"",
        "timestamp":"",
        "userId":"",
        "module":"Lessons",
        "action":"UPDATE",
        "resourceId":"",
        "status":"SUCCESS"
    }
]
```

---

# ==========================
# SINGLE LOG
# ==========================

GET

/audit-logs/{logId}

Description

Return complete audit record.

Includes

- User
- IP Address
- Device
- Browser
- Action
- Previous Value
- New Value
- Execution Time

---

# ==========================
# USER ACTIVITY
# ==========================

GET

/audit-logs/users/{userId}

Description

Return user activity timeline.

Filters

- Today

- Last 7 Days

- Last Month

---

# ==========================
# MODULE HISTORY
# ==========================

GET

/audit-logs/modules/{module}

Description

Return history for one module.

Examples

- Lessons

- Homework

- Payments

- AI

- Users

---

# ==========================
# SECURITY EVENTS
# ==========================

GET

/audit-logs/security

Description

Return security events.

Examples

- Failed Login

- Permission Denied

- Password Reset

- MFA Failure

- Token Revoked

---

# ==========================
# EXPORT
# ==========================

GET

/audit-logs/export

Administrator

Supported Formats

- CSV

- XLSX

- PDF

---

# ==========================
# SEARCH
# ==========================

GET

/audit-logs/search

Supported Parameters

- User

- Action

- Module

- Resource

- IP

- Date

---

# ==========================
# RETENTION
# ==========================

GET

/audit-logs/retention

Return retention policy.

Default

7 Years

Future

Configurable.

---

# ==========================
# SYSTEM EVENTS
# ==========================

GET

/audit-logs/system

Return

- Deployment

- Configuration Changes

- Service Restart

- Maintenance Mode

- Feature Flags

---

# ==========================
# VALIDATION
# ==========================

Validate

- Administrator Permission

- Log Exists

- Module Exists

- Date Range

---

# ==========================
# SECURITY
# ==========================

Audit Logs are immutable.

Records cannot be:

- Edited

- Deleted

- Hidden

Every privileged action must generate an audit log.

---

# ==========================
# RATE LIMIT
# ==========================

Audit Search

30 Requests / Minute

Export

10 Requests / Minute

---

# ==========================
# STATUS CODES
# ==========================

200 OK

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# ==========================
# PERFORMANCE
# ==========================

Search

<500ms

Single Record

<100ms

Export

Background Processing

---

# ==========================
# AUTOMATIC EVENTS
# ==========================

Automatically record

✓ Login

✓ Logout

✓ User Creation

✓ User Update

✓ Permission Change

✓ Lesson Update

✓ Homework Update

✓ Quiz Update

✓ Payment Verification

✓ Coin Transaction

✓ XP Award

✓ AI Configuration

✓ File Upload

✓ File Delete

✓ System Configuration

✓ Maintenance Mode

✓ Feature Flags

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Audit logs are generated automatically.

✓ Logs are searchable.

✓ Logs are immutable.

✓ Export works.

✓ Security events are tracked.

✓ System events are tracked.

✓ Authorization works.

---

# Final Rule

The Audit Logs API is the single source of truth for platform activity.

Every critical action performed by users, administrators or automated services must be permanently recorded to ensure complete traceability, accountability and security.

End of Document.