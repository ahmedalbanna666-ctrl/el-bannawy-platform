# LESSON_QUIZ_API.md

# El-bannawy Platform
## Lesson Quiz API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the End Lesson Assessment (Lesson Quiz) Module.

The Lesson Quiz API is responsible for:

- Loading assessments
- Retrieving assessment questions
- Saving assessment progress
- Submitting assessment attempts
- Auto-grading assessments
- Unlocking the next lesson (when enabled)
- Awarding XP
- Recording analytics

---

# Base Endpoint

/api/v1/quizzes

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
# QUIZ DETAILS
# ==========================

GET

/quizzes/{lessonId}

Description

Return lesson quiz details.

Response

```json
{
  "id": "",
  "lessonId": "",
  "title": "",
  "passingScore": 70,
  "maxAttempts": 3,
  "questions": 20,
  "xpReward": 100
}
```

---

# ==========================
# QUIZ QUESTIONS
# ==========================

GET

/quizzes/{lessonId}/questions

Description

Return quiz questions.

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
# AUTO SAVE
# ==========================

PATCH

/quizzes/{lessonId}/save

Description

Automatically save quiz progress.

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
# SUBMIT QUIZ
# ==========================

POST

/quizzes/{lessonId}/submit

Description

Submit quiz answers.

Server validates:

✓ Homework Completed

✓ All Videos Completed

✓ Student Authorization

Response

```json
{
  "score": 90,
  "passed": true,
  "xpAwarded": 100,
  "nextLessonUnlocked": true
}
```

---

# ==========================
# QUIZ RESULT
# ==========================

GET

/quizzes/{lessonId}/result

Description

Return latest quiz result.

Includes

- Score
- Passing Status
- XP Earned
- Attempts
- Time Spent

---

# ==========================
# QUIZ HISTORY
# ==========================

GET

/quizzes/{lessonId}/history

Description

Return all quiz attempts.

Response

```json
[
  {
    "attempt": 1,
    "score": 75,
    "passed": true,
    "submittedAt": ""
  }
]
```

---

# ==========================
# REVIEW QUIZ
# ==========================

GET

/quizzes/{lessonId}/review

Description

Return:

- Student Answers
- Correct Answers
- Explanations

Teacher controls visibility.

---

# ==========================
# NEXT LESSON
# ==========================

GET

/quizzes/{lessonId}/unlock-status

Description

Return whether the next lesson has been unlocked.

Response

```json
{
  "lessonCompleted": true,
  "nextLessonUnlocked": true
}
```

---

# ==========================
# TEACHER MANAGEMENT
# ==========================

POST

/quizzes

Teacher

Administrator

Create quiz.

---

PATCH

/quizzes/{id}

Update quiz.

---

DELETE

/quizzes/{id}

Soft Delete.

---

POST

/quizzes/import

Bulk Import

Supported

- CSV
- Excel

Future

- JSON

---

# ==========================
# ANALYTICS
# ==========================

GET

/quizzes/{lessonId}/analytics

Teacher

Administrator

Return

- Average Score
- Pass Rate
- Failure Rate
- Completion Rate
- Retry Count
- Most Missed Questions

---

# ==========================
# VALIDATION
# ==========================

Validate

- Lesson Exists
- Quiz Exists
- Student Enrollment
- Video Completion
- Homework Submission
- Attempt Limits

---

# ==========================
# SECURITY
# ==========================

Students may access only:

Assigned quizzes.

Students cannot:

- Modify scores
- Award XP
- Unlock lessons manually

All grading occurs on the server.

---

# ==========================
# RATE LIMIT
# ==========================

Quiz Submission

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

Quiz Loading

<300ms

Auto Save

<100ms

Submission

<500ms

Auto Grading

<1 Second

Lesson Unlock

Immediate

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Quiz Created
- Quiz Updated
- Quiz Deleted
- Quiz Submitted
- XP Awarded
- Lesson Unlocked

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Quiz loads correctly.

✓ Questions load correctly.

✓ Auto Save works.

✓ Submission works.

✓ Auto Grading works.

✓ XP rewards work.

✓ Lesson unlocking works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Lesson Quiz API serves the End Lesson Assessment — the official gateway for lesson completion (when enabled).

A lesson is considered completed only after the student successfully passes the End Lesson Assessment (if required by teacher configuration), and only then may the next lesson be unlocked automatically.

End of Document.