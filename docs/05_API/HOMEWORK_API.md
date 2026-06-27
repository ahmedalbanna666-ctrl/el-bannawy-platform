# HOMEWORK_API.md

# El-bannawy Platform
## Homework API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Homework Module.

The Homework API is responsible for:

- Loading homework
- Retrieving questions
- Saving answers
- Auto-grading
- Tracking attempts
- Managing homework progress
- Integrating with Learn From Mistakes

---

# Base Endpoint

/api/v1/homework

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
# HOMEWORK DETAILS
# ==========================

GET

/homework/{lessonId}

Description

Return lesson homework.

Response

```json
{
  "id": "",
  "lessonId": "",
  "title": "",
  "instructions": "",
  "passingScore": 70,
  "maxAttempts": 3,
  "questions": 15
}
```

---

# ==========================
# QUESTIONS
# ==========================

GET

/homework/{lessonId}/questions

Description

Return all homework questions.

Response

```json
{
  "questions": [
    {
      "id": "",
      "type": "multiple_choice",
      "question": "",
      "options": []
    }
  ]
}
```

---

# ==========================
# SAVE PROGRESS
# ==========================

PATCH

/homework/{lessonId}/save

Description

Automatically save student progress.

Request

```json
{
  "answers": [
    {
      "questionId": "",
      "selectedAnswer": ""
    }
  ]
}
```

Response

```json
{
  "success": true
}
```

---

# ==========================
# SUBMIT HOMEWORK
# ==========================

POST

/homework/{lessonId}/submit

Description

Submit homework for grading.

Response

```json
{
  "score": 85,
  "correctAnswers": 17,
  "wrongAnswers": 3,
  "passed": true
}
```

---

# ==========================
# HOMEWORK RESULT
# ==========================

GET

/homework/{lessonId}/result

Description

Return latest homework result.

Includes

- Score
- Attempts
- Passing Status
- Time Spent

---

# ==========================
# HOMEWORK HISTORY
# ==========================

GET

/homework/{lessonId}/history

Description

Return all previous attempts.

Response

```json
[
  {
    "attempt": 1,
    "score": 70,
    "submittedAt": ""
  }
]
```

---

# ==========================
# REVIEW ANSWERS
# ==========================

GET

/homework/{lessonId}/review

Description

Return:

- Student Answers
- Correct Answers
- Explanations

Visibility controlled by teacher settings.

---

# ==========================
# TEACHER MANAGEMENT
# ==========================

POST

/homework

Teacher

Administrator

Create homework.

---

PATCH

/homework/{id}

Update homework.

---

DELETE

/homework/{id}

Soft Delete.

---

POST

/homework/import

Bulk Import

Supported Formats

- CSV
- Excel

Future

- JSON

---

# ==========================
# ANALYTICS
# ==========================

GET

/homework/{lessonId}/analytics

Teacher

Administrator

Return:

- Average Score
- Pass Rate
- Completion Rate
- Average Time
- Most Missed Questions

---

# ==========================
# VALIDATION
# ==========================

Validate

- Lesson Exists
- Homework Exists
- Student Enrollment
- Question Exists
- Attempt Limit
- Submission Status

---

# ==========================
# SECURITY
# ==========================

Students may submit:

Only their own homework.

Teachers may manage:

Assigned educational content only.

Server validates every submission.

---

# ==========================
# RATE LIMIT
# ==========================

Homework Submission

10 Requests / Minute

Auto Save

120 Requests / Minute

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

Homework Loading

<300ms

Auto Save

<100ms

Submission

<500ms

Auto Grading

<1 Second

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Homework Created
- Homework Updated
- Homework Deleted
- Homework Submitted
- Homework Reviewed
- Attempt Completed

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Homework loads correctly.

✓ Questions load correctly.

✓ Auto Save works.

✓ Submission works.

✓ Auto Grading works.

✓ Review Mode works.

✓ History works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Homework API must ensure that every homework submission is securely validated, automatically graded, accurately recorded and immediately synchronized with the student's learning progress and the Learn From Mistakes Module.

End of Document.