# CURRICULUM_API.md

# El-bannawy Platform
## Curriculum API Specification

Version: 1.0.0

---

# Purpose

This document defines the Curriculum APIs responsible for managing the educational structure of the El-bannawy Platform.

The Curriculum API provides access to:

- Educational Stages
- Grades
- Units
- Lessons
- Lesson Progress
- Continue Learning

This API is one of the core educational APIs.

---

# Base Endpoint

/api/v1/curriculum

---

# Authentication

Required

JWT Access Token

Role-Based Authorization

---

# Supported Roles

Student

Teacher

Administrator

Secretary (Read Only)

---

# ==========================
# STAGES
# ==========================

GET

/curriculum/stages

Description

Return all educational stages.

Response

```json
[
  {
    "id": "",
    "name": "Primary"
  }
]
```

---

GET

/curriculum/stages/{id}

Return one educational stage.

---

# ==========================
# GRADES
# ==========================

GET

/curriculum/grades

Return all grades.

Filters

- stage
- academicYear

---

GET

/curriculum/grades/{id}

Return grade details.

---

# ==========================
# UNITS
# ==========================

GET

/curriculum/units

Return all available units.

Filters

- grade
- stage
- completed
- locked

Response

```json
[
  {
    "id": "",
    "title": "",
    "progress": 65,
    "status": "current"
  }
]
```

---

GET

/curriculum/units/{id}

Return complete unit details.

Includes

- Lessons
- Progress
- Estimated Duration

---

POST

/curriculum/units

Authentication

Teacher

Administrator

Create new unit.

---

PATCH

/curriculum/units/{id}

Update unit.

---

DELETE

/curriculum/units/{id}

Soft Delete.

Administrator only.

---

# ==========================
# LESSONS
# ==========================

GET

/curriculum/lessons

Return lessons.

Filters

- unit
- status
- completed

---

GET

/curriculum/lessons/{id}

Return lesson details.

Includes

- Videos (one or more, each with timeline events and activities)
- Vocabulary
- Homework
- Quiz
- Files

---

POST

/curriculum/lessons

Teacher

Administrator

---

PATCH

/curriculum/lessons/{id}

Update lesson.

---

DELETE

/curriculum/lessons/{id}

Soft Delete.

---

# ==========================
# CONTINUE LEARNING
# ==========================

GET

/curriculum/continue-learning

Student only.

Return:

Current Lesson

Last Active Video

Video Positions (per video)

Homework Status

Quiz Status

Example

```json
{
    "lessonId": "",
    "unitId": "",
    "resumeAt": 534,
    "progress": 72
}
```

---

# ==========================
# LESSON PROGRESS
# ==========================

GET

/curriculum/progress

Return:

- Completed Lessons

- Completed Units

- Progress Percentage

---

GET

/curriculum/progress/{lessonId}

Return lesson progress.

---

PATCH

/curriculum/progress/{lessonId}

Update progress.

Server-side validation required.

---

# ==========================
# SEARCH
# ==========================

GET

/curriculum/search

Parameters

search

grade

unit

lesson

---

# ==========================
# VALIDATION
# ==========================

Validate

- Grade Exists

- Unit Exists

- Lesson Exists

- Student Authorization

---

# ==========================
# PAGINATION
# ==========================

Supported

page

limit

sort

order

Maximum

100

---

# ==========================
# SECURITY
# ==========================

Students may only access:

Their assigned grade.

Teachers may manage:

Assigned grades.

Administrators

Full Access.

---

# ==========================
# STATUS CODES
# ==========================

200

201

204

400

401

403

404

409

422

500

---

# ==========================
# PERFORMANCE
# ==========================

Average Response Time

<300ms

Continue Learning

<150ms

---

# ==========================
# AUDIT LOGS
# ==========================

Record

- Unit Created

- Unit Updated

- Lesson Created

- Lesson Updated

- Lesson Deleted

- Progress Updated

---

# ==========================
# ACCEPTANCE CRITERIA
# ==========================

✓ Stage APIs work.

✓ Grade APIs work.

✓ Unit APIs work.

✓ Lesson APIs work.

✓ Continue Learning works.

✓ Progress APIs work.

✓ Search works.

✓ Authorization works.

---

# Final Rule

The Curriculum API is the official gateway for all educational navigation inside the El-bannawy Platform.

Educational content must always be served according to the student's assigned educational stage and grade.

End of Document.