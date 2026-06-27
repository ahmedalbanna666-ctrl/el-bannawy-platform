# STORY_API.md

# El-bannawy Platform
## Story Module API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Story Module.

The Story API manages the complete curriculum story experience, including:

- Story Chapters
- Story Lessons
- Story Videos
- Story Vocabulary
- Story Homework
- Story Quizzes
- Story Progress

The Story Module is completely independent from the Main Curriculum Module.

---

# Base Endpoint

/api/v1/story

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
# STORY INFORMATION
# ==========================

GET

/story

Description

Return story information assigned to the student's grade.

Response

```json
{
    "id":"",
    "title":"",
    "author":"",
    "coverImage":"",
    "chapters":12,
    "progress":48
}
```

---

# ==========================
# CHAPTERS
# ==========================

GET

/story/chapters

Description

Return all story chapters.

Response

```json
[
    {
        "id":"",
        "number":1,
        "title":"",
        "status":"completed",
        "progress":100
    }
]
```

---

GET

/story/chapters/{chapterId}

Description

Return chapter details.

Includes

- Lessons
- Progress
- Status

---

# ==========================
# STORY LESSONS
# ==========================

GET

/story/lessons/{lessonId}

Description

Return complete story lesson.

Includes

- Story Video
- Vocabulary
- Files
- Homework
- Quiz

---

# ==========================
# STORY PROGRESS
# ==========================

GET

/story/progress

Description

Return story progress.

Response

```json
{
    "completedLessons":15,
    "totalLessons":24,
    "progress":62
}
```

---

PATCH

/story/progress/{lessonId}

Description

Update story lesson progress.

Validation occurs on the server.

---

# ==========================
# CONTINUE STORY
# ==========================

GET

/story/continue

Description

Return last unfinished story lesson.

Response

```json
{
    "lessonId":"",
    "chapterId":"",
    "resumeAt":425
}
```

---

# ==========================
# STORY HOMEWORK
# ==========================

GET

/story/homework/{lessonId}

Return story homework.

---

POST

/story/homework/{lessonId}/submit

Submit homework.

Return:

- Score
- Correct Answers
- Wrong Answers

---

# ==========================
# STORY QUIZ
# ==========================

GET

/story/quiz/{lessonId}

Return quiz.

---

POST

/story/quiz/{lessonId}/submit

Submit quiz.

Response

```json
{
    "score":85,
    "passed":true,
    "nextLessonUnlocked":true
}
```

---

# ==========================
# STORY VOCABULARY
# ==========================

GET

/story/vocabulary/{lessonId}

Return vocabulary list.

---

# ==========================
# STORY FILES
# ==========================

GET

/story/files/{lessonId}

Return downloadable lesson files.

Supported

- PDF

Future

- Audio
- Images

---

# ==========================
# TEACHER MANAGEMENT
# ==========================

POST

/story/chapters

Create chapter.

---

PATCH

/story/chapters/{chapterId}

Update chapter.

---

DELETE

/story/chapters/{chapterId}

Soft Delete.

---

POST

/story/lessons

Create lesson.

---

PATCH

/story/lessons/{lessonId}

Update lesson.

---

DELETE

/story/lessons/{lessonId}

Soft Delete.

---

# ==========================
# ANALYTICS
# ==========================

GET

/story/analytics

Teacher

Administrator

Return

- Completion Rate
- Homework Rate
- Quiz Pass Rate
- Reading Time
- Difficult Chapters

---

# ==========================
# VALIDATION
# ==========================

Validate

- Story Exists
- Chapter Exists
- Lesson Exists
- Student Enrollment
- Homework Submission
- Quiz Eligibility

---

# ==========================
# SECURITY
# ==========================

Students may access only:

Stories assigned to their educational grade.

Teachers may manage only assigned story content.

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

Story Loading

<300ms

Chapter Loading

<200ms

Lesson Loading

<300ms

Progress Update

<100ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Chapter Created
- Chapter Updated
- Chapter Deleted
- Lesson Created
- Lesson Updated
- Homework Submitted
- Quiz Submitted
- Story Completed

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Story loads correctly.

✓ Chapters load correctly.

✓ Lessons load correctly.

✓ Homework works.

✓ Quiz works.

✓ Progress updates correctly.

✓ Continue Story works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Story API must operate independently from the Main Curriculum while following the same educational philosophy, ensuring that story progress, homework, quizzes and analytics remain completely isolated from the student's regular curriculum progress.

End of Document.