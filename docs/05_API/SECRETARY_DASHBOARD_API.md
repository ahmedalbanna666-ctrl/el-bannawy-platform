# SECRETARY_DASHBOARD_API.md

# El-bannawy Platform
## Secretary Dashboard API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints used by the Secretary Dashboard.

The Secretary Dashboard API manages administrative operations including:

- Student Registration
- Subscription Management
- Payment Verification
- Coin Purchases
- Live Class Scheduling
- Parent Communication
- Administrative Reports

The Secretary Dashboard never manages educational content.

---

# Base Endpoint

/api/v1/secretary

---

# Authentication

Required

JWT Access Token

Secretary Role

---

# Supported Roles

- Secretary
- Administrator

---

# ==========================
# DASHBOARD
# ==========================

GET

/secretary/dashboard

Description

Return dashboard overview.

Response

```json
{
  "todayRegistrations": 18,
  "pendingPayments": 7,
  "expiringSubscriptions": 14,
  "todayLiveClasses": 9
}
```

---

# ==========================
# STUDENTS
# ==========================

GET

/secretary/students

Description

Return student list.

Filters

- Grade
- Stage
- Subscription
- Status

---

POST

/secretary/students

Create student account.

---

PATCH

/secretary/students/{studentId}

Update student information.

---

PATCH

/secretary/students/{studentId}/status

Update account status.

Possible Values

- Active
- Pending
- Suspended

---

PATCH

/secretary/students/{studentId}/reset-password

Reset student password.

---

# ==========================
# SUBSCRIPTIONS
# ==========================

GET

/secretary/subscriptions

Return subscriptions.

---

POST

/secretary/subscriptions

Create subscription.

---

PATCH

/secretary/subscriptions/{subscriptionId}

Renew or update subscription.

---

DELETE

/secretary/subscriptions/{subscriptionId}

Cancel subscription.

---

# ==========================
# PAYMENTS
# ==========================

GET

/secretary/payments

Return payment list.

---

POST

/secretary/payments/verify

Verify payment.

---

GET

/secretary/payments/{paymentId}

Return payment details.

---

# ==========================
# COINS
# ==========================

GET

/secretary/coins

Return Coin purchase requests.

---

POST

/secretary/coins/verify

Verify Coin purchase.

Secretaries cannot manually add Coins.

---

# ==========================
# LIVE CLASSES
# ==========================

GET

/secretary/live

Return scheduled classes.

---

POST

/secretary/live

Schedule live class.

---

PATCH

/secretary/live/{classId}

Update schedule.

---

DELETE

/secretary/live/{classId}

Cancel session.

---

# ==========================
# WHATSAPP
# ==========================

POST

/secretary/whatsapp/send

Send WhatsApp message.

Supported Messages

- Registration Confirmation

- Payment Reminder

- Subscription Reminder

- Live Reminder

- Parent Report

---

GET

/secretary/whatsapp/history

Return message history.

---

# ==========================
# REPORTS
# ==========================

GET

/secretary/reports

Return administrative reports.

---

POST

/secretary/reports/generate

Generate report.

Supported

- PDF

- XLSX

---

# ==========================
# PROFILE
# ==========================

GET

/secretary/profile

Return secretary profile.

---

PATCH

/secretary/profile

Update profile.

Editable

- Name
- Phone
- Avatar

---

# ==========================
# VALIDATION
# ==========================

Validate

- Student Exists

- Payment Exists

- Subscription Exists

- Live Session Exists

- WhatsApp Template Exists

---

# ==========================
# SECURITY
# ==========================

Secretaries cannot:

- Modify educational content

- Award XP

- Modify Coins

- Change system settings

- Access administrator APIs

All requests require authorization.

---

# ==========================
# RATE LIMIT
# ==========================

Dashboard

60 Requests / Minute

Student Operations

30 Requests / Minute

Payment Verification

20 Requests / Minute

WhatsApp

20 Requests / Minute

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

Student Search

<200ms

Payment Verification

<500ms

Reports

Background Processing

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Student Registered

- Student Updated

- Subscription Created

- Subscription Renewed

- Payment Verified

- Live Session Scheduled

- WhatsApp Sent

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Dashboard works.

✓ Student registration works.

✓ Subscription management works.

✓ Payment verification works.

✓ Coin verification works.

✓ Live scheduling works.

✓ WhatsApp communication works.

✓ Reports work.

✓ Authorization works.

---

# Final Rule

The Secretary Dashboard API is responsible only for operational and administrative workflows.

Educational content, student learning progress and platform configuration must remain outside the secretary's permissions.

End of Document.