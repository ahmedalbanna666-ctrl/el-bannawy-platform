# VIDEO_API.md

# El-bannawy Platform
## Interactive Video API Specification

Version: 1.0.0

---

# Purpose

This document defines all API endpoints related to the Interactive Video Engine.

The Video API is responsible for:

- Loading lesson videos
- Tracking video progress
- Managing interactive timeline events
- Recording student answers
- Preventing unauthorized skipping
- Synchronizing lesson progress

---

# Base Endpoint

/api/v1/videos

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
# VIDEO DETAILS
# ==========================

GET

/videos/{videoId}

Description

Return video details.

Response

```json
{
  "id": "",
  "lessonId": "",
  "provider": "youtube",
  "externalVideoId": "",
  "url": "https://www.youtube.com/watch?v=...",
  "duration": 1250,
  "thumbnail": "",
  "timelineEvents": 5
}
```

---

# ==========================
# VIDEO PROGRESS
# ==========================

GET

/videos/{videoId}/progress

Description

Return current video progress.

Response

```json
{
  "currentPosition": 584,
  "watchPercentage": 62,
  "completed": false,
  "lastTimelineEvent": 3
}
```

---

PATCH

/videos/{videoId}/progress

Description

Update current watching progress.

Request

```json
{
  "currentPosition": 612
}
```

Validation

Server validates:

- Position
- Timeline event completion
- Skip rules

---

# ==========================
# TIMELINE EVENTS
# ==========================

GET

/videos/{videoId}/timeline-events

Description

Return all timeline events.

Student receives only active (enabled) events.

Teachers receive complete configuration.

---

GET

/videos/timeline-events/{eventId}

Return timeline event details.

---

POST

/videos/timeline-events

Authentication

Teacher

Administrator

Create timeline event.

---

PATCH

/videos/timeline-events/{eventId}

Update timeline event.

---

DELETE

/videos/timeline-events/{eventId}

Delete timeline event.

Administrator

Teacher

---

# ==========================
# TIMELINE EVENT ACTIVITY
# ==========================

POST

/videos/timeline-events/{eventId}/complete

Description

Notify server that the timeline event activity was completed.

Validation

Server verifies:

✓ Event exists

✓ Activity was completed

Response

```json
{
    "completed":true,
    "resumeVideo":true
}
```

---

# ==========================
# VIDEO COMPLETION
# ==========================

POST

/videos/{videoId}/complete

Description

Mark video completed.

Validation

Server verifies:

✓ Video reached end

---

# ==========================
# RESUME PLAYBACK
# ==========================

GET

/videos/{videoId}/resume

Description

Return:

- Resume Position

- Last Completed Timeline Event

- Remaining Timeline Events

---

# ==========================
# TEACHER MANAGEMENT
# ==========================

PATCH

/videos/{id}/url

Set video URL.

Request

```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

Server validates URL, extracts provider and video ID, retrieves metadata.

---

PATCH

/videos/{id}

Update video metadata.

---

DELETE

/videos/{id}

Archive video.

Soft Delete.

---

# ==========================
# ANALYTICS
# ==========================

GET

/videos/{videoId}/analytics

Teacher

Administrator

Return:

- Watch Time
- Completion Rate
- Drop-off Points
- Average Watch Duration
- Timeline Event Completion Rate
- Retry Count

---

# ==========================
# VALIDATION
# ==========================

Validate

- Lesson Exists

- Video Exists

- Timeline Event Exists

- Student Enrollment

- Playback Position

- Timeline Event Order

- Activity Completion Status

---

# ==========================
# SECURITY
# ==========================

Students cannot:

- Skip timeline events

- Bypass timeline event activities

- Modify progress

- Complete video manually

- Access unpublished videos

All progress validation occurs server-side.

---

# ==========================
# RATE LIMIT
# ==========================

Timeline Event Completion

30 Requests / Minute

Progress Update

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

Video Load

<500ms

Checkpoint Validation

<150ms

Progress Save

<100ms

Resume Playback

<100ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Video Created

- Video Updated

- Timeline Event Created

- Timeline Event Updated

- Timeline Event Deleted

- Timeline Event Toggled

- Video Completed

- Progress Updated

- Timeline Event Activity Completed

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Video loads correctly.

✓ Progress updates correctly.

✓ Resume playback works.

✓ Timeline events load correctly.

✓ Timeline event activity completion works.

✓ Timeline event activity triggers video resume.

✓ Skip prevention works.

✓ Completion validation works.

✓ Analytics work.

✓ Authorization works.

---

# Final Rule

The Interactive Video API must guarantee that students actively participate in every lesson.

A lesson video is considered complete only after the student reaches the end of the video and completes every mandatory interactive timeline event activity.

End of Document.