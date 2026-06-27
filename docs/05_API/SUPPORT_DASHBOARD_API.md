# SUPPORT_DASHBOARD_API.md

# El-bannawy Platform
## Technical Support Dashboard API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints used by the Technical Support Dashboard.

The Support Dashboard API enables support agents to assist users, resolve technical issues, monitor incidents, manage support tickets and improve customer satisfaction.

Support Agents never have direct access to educational content, financial operations or administrative settings unless explicitly authorized.

---

# Base Endpoint

/api/v1/support

---

# Authentication

Required

JWT Access Token

Support Role

---

# Supported Roles

- Support
- Administrator

---

# ==========================
# DASHBOARD
# ==========================

GET

/support/dashboard

Description

Return support dashboard overview.

Response

```json
{
  "openTickets": 48,
  "criticalTickets": 3,
  "resolvedToday": 67,
  "averageResponseTime": "8 Minutes"
}
```

---

# ==========================
# TICKETS
# ==========================

GET

/support/tickets

Description

Return ticket list.

Supported Filters

- Status
- Priority
- Category
- Assigned Agent

---

GET

/support/tickets/{ticketId}

Return ticket details.

---

POST

/support/tickets

Create support ticket.

Students may create tickets.

---

PATCH

/support/tickets/{ticketId}

Update ticket.

---

POST

/support/tickets/{ticketId}/assign

Assign ticket to support agent.

---

POST

/support/tickets/{ticketId}/resolve

Mark ticket as resolved.

---

POST

/support/tickets/{ticketId}/close

Close ticket.

---

# ==========================
# USER SEARCH
# ==========================

GET

/support/users/search

Search users.

Supported Parameters

- Student Name

- Mobile Number

- Student ID

- Ticket ID

---

GET

/support/users/{userId}

Return support-related user information.

Includes

- Account Status

- Device Information

- Login History

Support agents cannot access passwords.

---

# ==========================
# INCIDENTS
# ==========================

GET

/support/incidents

Return active incidents.

---

POST

/support/incidents

Create incident.

Administrator

Support Lead

---

PATCH

/support/incidents/{incidentId}

Update incident.

---

POST

/support/incidents/{incidentId}/resolve

Resolve incident.

---

# ==========================
# KNOWLEDGE BASE
# ==========================

GET

/support/knowledge-base

Return articles.

---

GET

/support/knowledge-base/{articleId}

Return article details.

---

POST

/support/knowledge-base

Administrator

Create article.

---

PATCH

/support/knowledge-base/{articleId}

Update article.

---

DELETE

/support/knowledge-base/{articleId}

Archive article.

---

# ==========================
# ANNOUNCEMENTS
# ==========================

GET

/support/announcements

Return announcements.

---

POST

/support/announcements

Administrator

Create announcement.

---

PATCH

/support/announcements/{announcementId}

Update announcement.

---

DELETE

/support/announcements/{announcementId}

Archive announcement.

---

# ==========================
# REPORTS
# ==========================

GET

/support/reports

Return support reports.

---

POST

/support/reports/generate

Generate report.

Supported Formats

- PDF

- XLSX

---

# ==========================
# ANALYTICS
# ==========================

GET

/support/analytics

Return

- Open Tickets

- Resolution Time

- Satisfaction Rate

- Most Common Issues

- Agent Performance

- Escalation Rate

---

# ==========================
# PROFILE
# ==========================

GET

/support/profile

Return support profile.

---

PATCH

/support/profile

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

- Ticket Exists

- User Exists

- Incident Exists

- Article Exists

- Agent Permission

---

# ==========================
# SECURITY
# ==========================

Support agents cannot:

- Modify educational content

- Modify payments

- Modify XP

- Modify Coins

- Change system settings

Support agents access only information necessary to resolve technical issues.

---

# ==========================
# RATE LIMIT
# ==========================

Dashboard

60 Requests / Minute

Ticket Operations

40 Requests / Minute

Knowledge Base

30 Requests / Minute

Reports

10 Requests / Minute

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

Ticket Search

<300ms

Ticket Update

<300ms

Reports

Background Processing

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Ticket Created

- Ticket Assigned

- Ticket Updated

- Ticket Resolved

- Ticket Closed

- Incident Created

- Knowledge Base Updated

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Dashboard works.

✓ Ticket management works.

✓ User lookup works.

✓ Incident management works.

✓ Knowledge Base works.

✓ Reports work.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Support Dashboard API exists to resolve technical issues efficiently while protecting user privacy and platform security.

Support agents must always have the minimum level of access required to perform their responsibilities.

End of Document.