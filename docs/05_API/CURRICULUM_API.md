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

- unitType (`UNIT` | `STORY` | `FINAL_REVIEW`) — management list filters by type; story/review content stays isolated
- academicYearId
- termId
- gradeId
- educationalSystem

Response

```json
[
  {
    "id": "",
    "title": "",
    "unitType": "UNIT",
    "progress": 65,
    "status": "current",
    "completed": false,
    "totalLessons": 5,
    "completedLessons": 3,
    "unlocked": true
  }
]
```

Unit status values

- `completed` — every published lesson in the unit is completed; rendered green
- `current` — the first non-completed unit; marked with "أنت هنا"
- `upcoming` — after the current unit

Unlock rules (students)

- A purchased unit (unit unlock) or a term the student bought (term unlock) is always open.
- Free units open sequentially: a free unit is unlocked only when the previous unit is completed.
- Completing the tests of the previous unit's lessons moves "أنت هنا" forward automatically.

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

Permission

UNITS_CREATE

Create new unit. Optional `unitType` field (`UNIT | STORY | FINAL_REVIEW`, defaults to `UNIT`) marks the unit as a regular unit, a curriculum story, or a final review.

---

PATCH

/curriculum/units/{id}

Update unit. Optional `unitType` field.

---

DELETE

/curriculum/units/{id}

Delete unit (cascades to lessons and content).

Administrator / Teacher with grade access.

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
# CERTIFICATES
# ==========================

GET

/certificates/config

Return the certificate threshold.

```json
{
  "threshold": 80
}
```

GET

/certificates

List the current student's unit certificates (one per unit), including unit title and earned date.

POST

/certificates/{unitId}

Issue a certificate.

Body

- fileName (`string`)
- mimeType (`string`, optional)
- data (`string`) — base64-encoded PDF generated client-side (html2canvas → jspdf)

Server-side rules

- Verifies the unit belongs to the student's grade.
- Verifies the unit progress is >= the configured `certificate_threshold`.
- Idempotent: returns the existing certificate if already issued.

GET

/certificates/{id}/download

Download the certificate PDF as an attachment.

GET

/certificates/{id}/view

View the certificate PDF inline.

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