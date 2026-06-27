# TEACHER_DASHBOARD_API.md

# El-bannawy Platform
## Teacher Dashboard API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints used by the Teacher Dashboard.

The Teacher Dashboard API enables teachers to manage educational content, monitor student progress, review assessments, schedule live classes and analyze classroom performance.

Teachers may only manage content assigned to them.

---

# Base Endpoint

/api/v1/teacher

---

# Authentication

Required

JWT Access Token

Teacher Role

---

# Supported Roles

- Teacher
- Administrator

---

# ==========================
# DASHBOARD
# ==========================

GET

/teacher/dashboard

Description

Return teacher dashboard overview.

Response

```json
{
  "todayClasses":3,
  "students":542,
  "pendingHomework":48,
  "newQuestions":12,
  "activeLiveClasses":2
}
```

---

# ==========================
# STUDENTS
# ==========================

GET

/teacher/students

Description

Return assigned students.

Filters

- Grade
- Unit
- Status

---

GET

/teacher/students/{studentId}

Return student profile.

Includes

- Progress
- Homework
- Quiz Results
- Attendance
- XP

---

# ==========================
# LESSONS
# ==========================

GET

/teacher/lessons

Return assigned lessons.

---

POST

/teacher/lessons

Create lesson.

---

PATCH

/teacher/lessons/{lessonId}

Update lesson.

---

DELETE

/teacher/lessons/{lessonId}

Archive lesson.

---

POST

/teacher/lessons/{lessonId}/videos

Add a lesson video.

Request

```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=...",
  "displayOrder": 1
}
```

System validates URL, extracts Video ID, retrieves metadata.

---

PATCH

/teacher/lessons/{lessonId}/videos/{videoId}

Update video URL or settings.

Request

```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=...",
  "displayOrder": 2,
  "enabled": true
}
```

System validates URL, extracts Video ID, retrieves metadata.

---

DELETE

/teacher/lessons/{lessonId}/videos/{videoId}

Remove video from lesson.

---

POST

/teacher/lessons/{lessonId}/upload/document

Upload Microsoft Word document.

System converts document into structured lesson content.

---

PATCH

/teacher/lessons/{lessonId}/settings

Update lesson settings.

Request

```json
{
  "isFree": true,
  "isPublished": true,
  "activitiesEnabled": true,
  "homeworkEnabled": true,
  "endLessonAssessmentEnabled": true,
  "interactiveTimelineEnabled": true
}
```

---

# ==========================
# LESSON COMPLETION RULES
# ==========================

GET

/teacher/lessons/{lessonId}/completion-rules

Return lesson completion rules.

---

PATCH

/teacher/lessons/{lessonId}/completion-rules

Update lesson completion rules.

Request

```json
{
  "requireVideoCompletion": true,
  "requireActivityCompletion": true,
  "requireHomework": true,
  "requireEndLessonAssessment": true,
  "passingScore": 70,
  "retryLimit": 3,
  "unlockNextLesson": true
}
```

---

# ==========================
# INTERACTIVE TIMELINE
# ==========================

GET

/teacher/lessons/{lessonId}/timeline-events

Return all timeline events.

---

POST

/teacher/lessons/{lessonId}/timeline-events

Create timeline event.

Request

```json
{
  "timestamp": 150,
  "activityType": "vocabulary",
  "isRequired": true
}
```

---

PATCH

/teacher/timeline-events/{eventId}

Update timeline event.

---

DELETE

/teacher/timeline-events/{eventId}

Remove timeline event.

---

PATCH

/teacher/timeline-events/{eventId}/toggle

Enable or disable timeline event.

---

PATCH

/teacher/timeline-events/{eventId}/required

Toggle between Required and Optional.

---

# ==========================
# HOMEWORK
# ==========================

GET

/teacher/homework

Return homework list.

---

PATCH

/teacher/homework/{lessonId}/toggle

Enable or disable homework for a lesson.

---

GET

/teacher/homework/submissions

Return submitted homework.

---

# ==========================
# END LESSON ASSESSMENT
# ==========================

GET

/teacher/assessments

Return assessments.

---

POST

/teacher/assessments

Create assessment.

---

PATCH

/teacher/assessments/{assessmentId}

Update assessment.

---

DELETE

/teacher/assessments/{assessmentId}

Archive assessment.

---

PATCH

/teacher/assessments/{lessonId}/toggle

Enable or disable End Lesson Assessment for a lesson.

---

# ==========================
# LIVE CLASSES
# ==========================

GET

/teacher/live

Return live sessions.

---

POST

/teacher/live

Create session.

---

PATCH

/teacher/live/{classId}

Update session.

---

DELETE

/teacher/live/{classId}

Cancel session.

---

GET

/teacher/live/{classId}/attendance

Return attendance report.

---

# ==========================
# ANALYTICS
# ==========================

GET

/teacher/analytics

Return

- Student Progress
- Lesson Completion
- Homework Rate
- Quiz Performance
- Weak Topics
- Attendance

---

# ==========================
# REPORTS
# ==========================

GET

/teacher/reports

Return teacher reports.

---

POST

/teacher/reports/generate

Generate report.

Supported

- PDF
- XLSX

---

# ==========================
# NOTIFICATIONS
# ==========================

GET

/teacher/notifications/settings

Return teacher notification settings.

---

PATCH

/teacher/notifications/settings

Update teacher notification settings.

---

POST

/teacher/notifications/send

Send notification immediately.

Request

```json
{
  "type": "motivational_message",
  "message": "Keep up the great work!",
  "targetType": "class",
  "targetId": "class-uuid"
}
```

---

POST

/teacher/notifications/schedule

Schedule notification.

Request

```json
{
  "type": "homework_reminder",
  "message": "Homework is due tomorrow.",
  "targetType": "grade",
  "targetId": "grade-uuid",
  "scheduledAt": "2026-07-01T09:00:00Z"
}
```

---

GET

/teacher/notifications/history

Return notification history.

Filters

- Type
- Date Range
- Target
- Status

---

Target Types

- all_students
- grade
- class
- individual_student

---

# ==========================
# PROFILE
# ==========================

GET

/teacher/profile

Return teacher profile.

---

PATCH

/teacher/profile

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

- Teacher Assignment
- Student Assignment
- Lesson Ownership
- Homework Ownership
- Assessment Ownership
- Timeline Event Ownership
- YouTube URL Format
- Video ID Extraction
- Notification Type
- Schedule Time
- Target Type
- Target ID
- File Type (DOCX)
- File Size Limits

---

# ==========================
# SECURITY
# ==========================

Teachers may only access:

- Assigned Students
- Assigned Grades
- Assigned Lessons

Teachers cannot:

- Access financial records
- Change system settings
- Manage administrators

---

# ==========================
# RATE LIMIT
# ==========================

Dashboard

60 Requests / Minute

Lesson Updates

30 Requests / Minute

Analytics

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

Lesson Management

<300ms

Analytics

<1 Second

Reports

Background Processing

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Lesson Created
- Lesson Updated
- Video URL Updated
- Lesson Document Uploaded
- Lesson Settings Updated
- Completion Rules Updated
- Timeline Event Created
- Timeline Event Updated
- Timeline Event Deleted
- Homework Toggled
- Assessment Toggled
- Live Session Created
- Notification Sent
- Notification Scheduled
- Notification Settings Updated
- Video URL Updated
- Video Metadata Retrieved
- Timeline Event Required/Optional Toggled

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Dashboard works.

✓ Student management works.

✓ Lesson management works.

✓ YouTube URL validation works.

✓ Video ID extraction works.

✓ Lesson document upload works.

✓ Lesson settings update works.

✓ Completion rules update works.

✓ Interactive timeline CRUD works.

✓ Timeline event toggle works.

✓ Required/Optional toggle works.

✓ Homework toggle works.

✓ Assessment toggle works.

✓ Notification send works.

✓ Notification schedule works.

✓ Notification targeting works.

✓ Live class management works.

✓ Analytics work.

✓ Reports work.

✓ Authorization works.

---

# Final Rule

The Teacher Dashboard API exists to help teachers deliver high-quality education while ensuring that every operation is limited to the educational content and students assigned to that teacher.

End of Document.