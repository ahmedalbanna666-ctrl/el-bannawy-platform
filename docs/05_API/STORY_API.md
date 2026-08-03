# STORY_API.md

# El-bannawy Platform
## Story Module API Specification (قصة المنهج)

Version: 2.0.0

---

# Purpose

This document defines the API endpoints used by the Story Module.

Since version 2.0.0 the Story is modeled as `Unit` rows with `unitType = STORY` and its chapters as `Lesson` rows. The Story API therefore reuses the Curriculum and Lesson endpoints; there is no dedicated `/api/v1/story` route anymore.

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

- Student (read)
- Teacher (create/update/delete)
- Administrator (create/update/delete)
- Staff (read)

---

# Story CRUD

## List Stories (management)

GET /api/v1/curriculum/units?unitType=STORY

Roles: TEACHER, ADMINISTRATOR

Returns published and draft story units for the academic context.

## Get Story (management)

GET /api/v1/curriculum/units/:storyId

Roles: TEACHER, ADMINISTRATOR

Returns the story unit including its chapters (lessons).

## Create Story

POST /api/v1/curriculum/units

Roles: TEACHER, ADMINISTRATOR
Permission: UNITS_CREATE

Body (create a story):

```json
{
    "title": "قصة الأشكال الهندسية",
    "description": "...",
    "unitType": "STORY",
    "gradeId": "uuid",
    "academicYearId": "uuid",
    "termId": "uuid",
    "displayOrder": 1,
    "published": true,
    "isPremium": false
}
```

`unitType` accepts `UNIT | STORY | FINAL_REVIEW` and defaults to `UNIT`.

## Update Story

PATCH /api/v1/curriculum/units/:storyId

Roles: TEACHER, ADMINISTRATOR
Permission: UNITS_EDIT

## Delete Story

DELETE /api/v1/curriculum/units/:storyId

Roles: TEACHER, ADMINISTRATOR
Permission: UNITS_DELETE

---

# Chapter CRUD

## Create Chapter

POST /api/v1/curriculum/lessons

Roles: TEACHER, ADMINISTRATOR
Permission: LESSONS_CREATE

```json
{
    "title": "الفصل الأول",
    "unitId": "story-unit-id",
    "displayOrder": 1,
    "published": true
}
```

## Update Chapter

PATCH /api/v1/curriculum/lessons/:chapterId

Roles: TEACHER, ADMINISTRATOR
Permission: LESSONS_EDIT

## Delete Chapter

DELETE /api/v1/curriculum/lessons/:chapterId

Roles: TEACHER, ADMINISTRATOR
Permission: LESSONS_DELETE

---

# Student Story List

GET /api/v1/curriculum?unitType=STORY

Roles: any authenticated user

Returns the published story units scoped to the student's academic context (grade, academic year, term, educational system).

Response shape (existing curriculum contract):

```json
[
    {
        "id": "stage-id",
        "name": "...",
        "displayOrder": 1,
        "grades": [
            {
                "id": "grade-id",
                "name": "...",
                "displayOrder": 1,
                "units": [
                    {
                        "id": "story-id",
                        "title": "...",
                        "displayOrder": 1,
                        "isPremium": false,
                        "unlocked": true,
                        "lessons": [
                            {
                                "id": "chapter-id",
                                "title": "...",
                                "displayOrder": 1,
                                "estimatedDuration": 10
                            }
                        ]
                    }
                ]
            }
        ]
    }
]
```

The regular units page calls `GET /api/v1/curriculum` without the query param (defaults to `unitType=UNIT`), keeping story/review content isolated.

---

# Chapter Content

Reuses the Lesson endpoints:

- GET /api/v1/lessons/:chapterId
- GET /api/v1/lessons/:chapterId/quiz
- GET /api/v1/lessons/:chapterId/homework
- Lesson video / vocabulary / document endpoints

---

# Progress

Reuses the curriculum progress endpoints:

- PATCH /api/v1/curriculum/progress/:chapterId
- GET /api/v1/curriculum/progress/:chapterId

---

# Frontend Routes

- /dashboard/stories — story list
- /dashboard/stories/:storyId — chapters (zigzag layout)
- /dashboard/stories/:storyId/chapters/:chapterId — chapter content management

---

# Error Handling

Standard platform response contract:

```json
{
    "success": false,
    "message": "...",
    "statusCode": 400,
    "timestamp": "...",
    "requestId": "..."
}
```

---

End of Document.
