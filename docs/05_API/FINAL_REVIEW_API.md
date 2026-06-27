# FINAL_REVIEW_API.md

# El-bannawy Platform
## Final Review API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Final Review Module.

The Final Review API manages:

- Final Review Availability
- Review Lessons
- Review Videos
- Review Vocabulary
- Practice Questions
- Final Exams
- Readiness Reports

The Final Review Module is activated only during the revision period configured by teachers or administrators.

---

# Base Endpoint

/api/v1/final-review

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

- Student
- Teacher
- Administrator

---

# ==========================
# MODULE STATUS
# ==========================

GET

/final-review/status

Description

Return module availability.

Response

```json
{
    "enabled":true,
    "message":"Final Review is available."
}
```

When disabled

```json
{
    "enabled":false,
    "message":"Final Review will be available during the official revision period."
}
```

---

# ==========================
# REVIEW UNITS
# ==========================

GET

/final-review/units

Description

Return all review units.

Response

```json
[
    {
        "id":"",
        "title":"",
        "progress":60
    }
]
```

---

GET

/final-review/units/{unitId}

Return complete review unit.

Includes

- Lessons
- Practice
- Final Exam

---

# ==========================
# REVIEW LESSONS
# ==========================

GET

/final-review/lessons/{lessonId}

Return review lesson.

Includes

- Review Video
- Vocabulary
- Summary Notes
- Practice Questions
- Files

---

# ==========================
# PRACTICE QUESTIONS
# ==========================

GET

/final-review/practice/{lessonId}

Return practice questions.

---

POST

/final-review/practice/{lessonId}/submit

Submit answers.

Response

```json
{
    "score":90,
    "correctAnswers":18,
    "wrongAnswers":2
}
```

Practice questions do not unlock content.

---

# ==========================
# FINAL EXAM
# ==========================

GET

/final-review/exams/{unitId}

Return final unit exam.

---

POST

/final-review/exams/{unitId}/submit

Submit exam.

Response

```json
{
    "score":88,
    "passed":true,
    "xpAwarded":100
}
```

---

# ==========================
# FULL COURSE EXAM
# ==========================

GET

/final-review/exams/final

Return complete curriculum exam.

---

POST

/final-review/exams/final/submit

Submit complete final exam.

---

# ==========================
# READINESS REPORT
# ==========================

GET

/final-review/readiness

Return student readiness.

Response

```json
{
    "overallScore":86,
    "status":"Ready",
    "weakTopics":[]
}
```

---

# ==========================
# REVIEW PROGRESS
# ==========================

GET

/final-review/progress

Return:

- Completed Lessons
- Completed Units
- Progress Percentage

---

# ==========================
# TEACHER MANAGEMENT
# ==========================

POST

/final-review/open

Enable Final Review.

Teacher

Administrator

---

POST

/final-review/close

Disable Final Review.

---

POST

/final-review/units

Create review unit.

---

POST

/final-review/lessons

Create review lesson.

---

PATCH

/final-review/lessons/{lessonId}

Update lesson.

---

DELETE

/final-review/lessons/{lessonId}

Soft Delete.

---

# ==========================
# ANALYTICS
# ==========================

GET

/final-review/analytics

Teacher

Administrator

Return

- Participation Rate
- Average Score
- Readiness Distribution
- Weak Topics
- Completion Rate

---

# ==========================
# VALIDATION
# ==========================

Validate

- Review Period Enabled
- Student Enrollment
- Lesson Exists
- Unit Exists
- Exam Eligibility

---

# ==========================
# SECURITY
# ==========================

Students may access only:

Final Review assigned to their educational stage and grade.

When the module is disabled,

students cannot access any review content.

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

Review Loading

<300ms

Exam Loading

<300ms

Submission

<500ms

Readiness Report

<500ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Final Review Opened
- Final Review Closed
- Review Lesson Created
- Review Lesson Updated
- Exam Submitted
- Readiness Generated

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Final Review availability works.

✓ Review lessons load correctly.

✓ Practice questions work.

✓ Final exams work.

✓ Readiness reports work.

✓ Progress tracking works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Final Review API must remain inaccessible until officially activated by the teacher or administrator.

Its purpose is to provide students with a focused exam preparation experience without affecting the normal curriculum flow.

End of Document.