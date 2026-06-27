# ANALYTICS_API.md

# El-bannawy Platform
## Analytics API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Analytics Module.

The Analytics API is responsible for collecting, aggregating and exposing business intelligence, educational insights and platform performance metrics.

Unlike Reports, Analytics focuses on trends, patterns and decision-making.

---

# Base Endpoint

/api/v1/analytics

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

- Administrator
- Teacher
- Secretary (Limited)

Students do not have direct access.

---

# ==========================
# DASHBOARD
# ==========================

GET

/analytics/dashboard

Description

Return platform overview.

Response

```json
{
  "activeStudents": 5241,
  "activeTeachers": 18,
  "dailyActiveUsers": 2148,
  "lessonCompletionRate": 87,
  "revenue": 125000
}
```

---

# ==========================
# STUDENT ANALYTICS
# ==========================

GET

/analytics/students

Description

Return student analytics.

Supported Filters

- Grade
- Stage
- Date Range

Metrics

- Active Students
- Retention
- Completion Rate
- Average Study Time
- Learning Streak

---

# ==========================
# LESSON ANALYTICS
# ==========================

GET

/analytics/lessons

Description

Return lesson statistics.

Metrics

- Completion Rate
- Replay Count
- Average Duration
- Drop-off Rate
- Pass Rate

---

# ==========================
# VIDEO ANALYTICS
# ==========================

GET

/analytics/videos

Description

Return video engagement (per video and aggregated per lesson).

Supports multi-video lessons: each video is tracked independently.

Metrics

- Watch Time (per video)
- Completion (per video)
- Replay
- Skip Attempts
- Timeline Event Completion (per video)
- Video Order Completion

---

# ==========================
# HOMEWORK ANALYTICS
# ==========================

GET

/analytics/homework

Return

- Submission Rate
- Pass Rate
- Average Score
- Completion Time

---

# ==========================
# QUIZ ANALYTICS
# ==========================

GET

/analytics/quizzes

Return

- Quiz Attempts
- Average Score
- Pass Rate
- Failure Rate
- Retry Count

---

# ==========================
# LIVE CLASS ANALYTICS
# ==========================

GET

/analytics/live

Return

- Attendance
- Booking Rate
- Cancellation Rate
- Average Attendance

---

# ==========================
# AI ANALYTICS
# ==========================

GET

/analytics/ai

Return

- Conversations
- Questions
- Average Response Time
- Satisfaction
- Cost
- Token Usage

---

# ==========================
# FINANCIAL ANALYTICS
# ==========================

GET

/analytics/payments

Return

- Revenue
- Payment Success Rate
- Coin Sales
- Refunds
- Average Order Value

---

# ==========================
# XP ANALYTICS
# ==========================

GET

/analytics/xp

Return

- XP Distribution
- Average XP
- Level Distribution
- Leaderboards

---

# ==========================
# REFERRAL ANALYTICS
# ==========================

GET

/analytics/referrals

Return

- Invitations
- Conversion Rate
- Top Referrers
- Fraud Attempts

---

# ==========================
# NOTIFICATION ANALYTICS
# ==========================

GET

/analytics/notifications

Return

- Delivery Rate
- Read Rate
- Open Rate
- Failed Notifications
- Notifications by Type
- Channel Performance
- Most Used Notification Types
- Teacher Send Rate
- Student Preference Distribution

---

# ==========================
# SYSTEM ANALYTICS
# ==========================

GET

/analytics/system

Administrator

Return

- API Latency
- Database Performance
- Redis Status
- Queue Performance
- CPU Usage
- Memory Usage

---

# ==========================
# REAL-TIME METRICS
# ==========================

GET

/analytics/realtime

Return

- Online Users
- Active Sessions
- Live Classes
- Active AI Requests
- Current Revenue

Updates should be near real-time.

---

# ==========================
# EXPORT
# ==========================

GET

/analytics/export

Supported Formats

- PDF
- XLSX
- CSV

Future

- Power BI
- Looker Studio

---

# ==========================
# FILTERS
# ==========================

Supported Filters

- Today
- Yesterday
- Last 7 Days
- Last 30 Days
- Current Month
- Previous Month
- Custom Range

---

# ==========================
# VALIDATION
# ==========================

Validate

- User Authorization
- Date Range
- Export Format
- Requested Metrics

---

# ==========================
# SECURITY
# ==========================

Teachers may access only:

Educational analytics.

Secretaries may access only:

Administrative analytics.

Administrators have full access.

Students cannot access Analytics APIs.

---

# ==========================
# RATE LIMIT
# ==========================

Dashboard

30 Requests / Minute

Analytics

30 Requests / Minute

Export

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

Analytics

<1 Second

Real-Time Metrics

<500ms

Export

Background Processing

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Analytics Viewed
- Export Generated
- Dashboard Accessed
- Filters Applied

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Dashboard works.

✓ Educational analytics work.

✓ Financial analytics work.

✓ AI analytics work.

✓ Real-time metrics work.

✓ Export works.

✓ Filters work.

✓ Authorization works.

---

# Final Rule

The Analytics API exists to transform platform data into actionable insights.

Every metric exposed by this API must help improve educational quality, operational efficiency or business performance.

End of Document.