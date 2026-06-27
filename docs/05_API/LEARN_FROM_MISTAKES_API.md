# LEARN_FROM_MISTAKES_API.md

# El-bannawy Platform
## Learn From Mistakes API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Learn From Mistakes Module.

The API automatically manages every incorrect answer submitted by students across the platform and provides personalized revision functionality.

It integrates with:

- Interactive Video
- Homework
- Lesson Quiz
- Story Homework
- Story Quiz
- Final Review
- Educational Games

---

# Base Endpoint

/api/v1/mistakes

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
# MISTAKES DASHBOARD
# ==========================

GET

/mistakes

Description

Return student's mistake dashboard.

Response

```json
{
  "totalMistakes": 54,
  "mastered": 31,
  "reviewing": 15,
  "new": 8,
  "masteryPercentage": 57
}
```

---

# ==========================
# MISTAKE LIST
# ==========================

GET

/mistakes/questions

Description

Return all recorded mistakes.

Supported Filters

- Lesson
- Unit
- Story
- Homework
- Quiz
- Video
- New
- Reviewing
- Mastered

Pagination supported.

---

# ==========================
# SINGLE MISTAKE
# ==========================

GET

/mistakes/{mistakeId}

Description

Return complete mistake details.

Includes

- Question
- Student Answer
- Correct Answer
- Explanation
- Source Module
- Attempts
- Mastery Status

---

# ==========================
# RETRY QUESTION
# ==========================

POST

/mistakes/{mistakeId}/retry

Description

Submit another attempt.

Request

```json
{
    "selectedAnswer":""
}
```

Response

```json
{
    "correct":true,
    "mastered":true,
    "attempts":4
}
```

---

# ==========================
# MASTERY
# ==========================

GET

/mistakes/mastery

Description

Return mastery statistics.

Response

```json
{
    "mastered":31,
    "remaining":23,
    "percentage":57
}
```

---

# ==========================
# PROGRESS
# ==========================

GET

/mistakes/progress

Description

Return improvement statistics.

Includes

- Improvement Rate
- Weekly Progress
- Review Streak

---

# ==========================
# SEARCH
# ==========================

GET

/mistakes/search

Parameters

- search
- lesson
- unit
- topic

Search supports:

- Question Text
- Lesson Name
- Vocabulary Word

---

# ==========================
# RECOMMENDATIONS
# ==========================

GET

/mistakes/recommendations

Description

Return personalized revision recommendations.

Examples

- Replay Lesson
- Review Vocabulary
- Retry Homework
- Retake Quiz

---

# ==========================
# ANALYTICS
# ==========================

GET

/mistakes/analytics

Teacher

Administrator

Return

- Most Common Mistakes
- Weak Lessons
- Weak Units
- Difficult Questions
- Mastery Distribution

---

# ==========================
# VALIDATION
# ==========================

Validate

- Student Enrollment
- Mistake Exists
- Question Exists
- Ownership

Students may access only their own mistakes.

---

# ==========================
# SECURITY
# ==========================

Students cannot:

- Delete mistakes
- Modify history
- Reset mastery manually

Teachers may only view aggregated analytics.

---

# ==========================
# PAGINATION
# ==========================

Supported

- page
- limit
- sort
- order

Maximum

100

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

<200ms

Question Retrieval

<300ms

Retry Submission

<300ms

Analytics

<500ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Mistake Created
- Retry Submitted
- Mastery Updated
- Recommendation Generated

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Mistakes are retrieved correctly.

✓ Retry functionality works.

✓ Mastery updates automatically.

✓ Recommendations work.

✓ Analytics work.

✓ Search works.

✓ Authorization works.

✓ Responsive behavior is supported.

---

# Final Rule

The Learn From Mistakes API must preserve every educational mistake as a valuable learning opportunity.

No incorrect answer should ever be lost, and every retry must contribute to the student's long-term mastery and personalized learning journey.

End of Document.