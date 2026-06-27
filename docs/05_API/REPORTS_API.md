# REPORTS_API.md

# El-bannawy Platform
## Reports API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Reports Module.

The Reports API is responsible for:

- Student Reports
- Parent Reports
- Teacher Reports
- Administrative Reports
- PDF Generation
- Excel Export
- Scheduled Reports

Reports transform platform data into structured educational and business insights.

---

# Base Endpoint

/api/v1/reports

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
- Administrator

---

# ==========================
# MY REPORTS
# ==========================

GET

/reports/my

Description

Return authenticated user's reports.

Response

```json
[
  {
    "id": "",
    "title": "Weekly Progress",
    "type": "student_progress",
    "createdAt": "",
    "format": "pdf"
  }
]
```

---

# ==========================
# STUDENT REPORT
# ==========================

GET

/reports/student/{studentId}

Description

Return complete student report.

Includes

- Learning Progress
- Homework
- Quiz Results
- Attendance
- XP
- Achievements

Authorization

Student (Own Report)

Teacher

Administrator

Parent (Linked Student)

---

# ==========================
# PARENT REPORT
# ==========================

GET

/reports/parent/{studentId}

Description

Return parent-friendly report.

Includes

- Attendance
- Homework
- Quiz Results
- Teacher Notes
- Weekly Progress

---

# ==========================
# TEACHER REPORT
# ==========================

GET

/reports/teacher

Teacher

Administrator

Return

- Class Performance
- Weak Lessons
- Homework Statistics
- Quiz Statistics
- Attendance

---

# ==========================
# ADMIN REPORTS
# ==========================

GET

/reports/admin

Administrator

Return

- Platform Statistics
- Revenue
- Student Growth
- AI Usage
- Notifications
- Referral Statistics

---

# ==========================
# DOWNLOAD REPORT
# ==========================

GET

/reports/{reportId}/download

Description

Download report.

Supported Formats

- PDF
- XLSX
- CSV

---

# ==========================
# GENERATE REPORT
# ==========================

POST

/reports/generate

Description

Generate custom report.

Request

```json
{
  "type": "student_progress",
  "filters": {
    "grade": "",
    "dateFrom": "",
    "dateTo": ""
  },
  "format": "pdf"
}
```

---

# ==========================
# SCHEDULED REPORTS
# ==========================

GET

/reports/scheduled

Administrator

Return scheduled reports.

---

POST

/reports/scheduled

Create scheduled report.

Supported Frequencies

- Daily
- Weekly
- Monthly
- End of Term

---

PATCH

/reports/scheduled/{scheduleId}

Update scheduled report.

---

DELETE

/reports/scheduled/{scheduleId}

Delete scheduled report.

---

# ==========================
# REPORT FILTERS
# ==========================

Supported Filters

- Stage
- Grade
- Unit
- Lesson
- Teacher
- Student
- Date Range
- Status

---

# ==========================
# EXPORT
# ==========================

Supported Formats

- PDF
- XLSX
- CSV

Future

- Power BI
- Looker Studio

---

# ==========================
# ANALYTICS
# ==========================

GET

/reports/analytics

Administrator

Return

- Generated Reports
- Download Count
- Export Formats
- Most Requested Reports
- Parent Engagement

---

# ==========================
# VALIDATION
# ==========================

Validate

- User Authorization
- Student Exists
- Report Exists
- Export Format
- Filter Values
- Date Range

---

# ==========================
# SECURITY
# ==========================

Users may access only:

Reports they are authorized to view.

Generated reports must contain only permitted information.

Every report download must be logged.

---

# ==========================
# RATE LIMIT
# ==========================

Report Generation

10 Requests / Minute

Download

20 Requests / Minute

Analytics

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

Report Retrieval

<300ms

PDF Generation

<5 Seconds

Excel Export

<5 Seconds

Large Reports

Background Processing

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Report Generated
- Report Downloaded
- Report Scheduled
- Report Deleted
- Export Completed

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Student reports work.

✓ Parent reports work.

✓ Teacher reports work.

✓ Administrative reports work.

✓ PDF export works.

✓ Excel export works.

✓ Scheduling works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Reports API must provide accurate, secure and role-based reporting for every stakeholder while ensuring that sensitive educational and financial information is accessible only to authorized users.

End of Document.