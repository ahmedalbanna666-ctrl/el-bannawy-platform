# STORY_MODULE.md

# El-bannawy Platform
## Story Module (قصة المنهج)

Version: 2.0.0

---

# Purpose

The Story Module delivers the official curriculum story (قصة المنهج) to students as an independent learning path.

Version 2.0.0 rebuilds the Story on top of the existing Curriculum/Units architecture. A Story is a `Unit` with `unitType = STORY`; every Story Chapter is a `Lesson` that reuses the full lesson content engine.

---

# Architecture Overview

The Story is NOT a separate data model anymore. It reuses:

- `units` table with `unitType = STORY`
- `lessons` table (one lesson per chapter)
- Full lesson content engine:
  - Interactive videos
  - Vocabulary (structured sections)
  - Quiz
  - Homework
  - PDF document
  - Question/document import engine

Content is isolated per `lessonId`. No cross-contamination between story, review, and regular unit content.

---

# Data Model

`Unit` gains:

- `unitType` enum (`UNIT` | `STORY` | `FINAL_REVIEW`), default `UNIT`

A Story is a `Unit` row with:

```text
unitType = STORY
published
displayOrder
isPremium
academicYearId / termId / gradeId / educationalSystem / bookId
```

A Story Chapter is a `Lesson` row scoped to the story unit. Chapters have no inner lessons — content lives directly on the chapter (lesson).

---

# Structure

A Story contains:

- Chapters (one `Lesson` per chapter)

Each Chapter contains:

- Interactive Videos (one or more, same engine)
- Vocabulary
- PDF Files
- Homework
- Quiz

The content order follows the standard lesson flow.

---

# Navigation Flow

Home

↓

Stories List (`/dashboard/stories`)

↓

Story Chapters (zigzag layout, `/dashboard/stories/:storyId`)

↓

Chapter Content (`/dashboard/stories/:storyId/chapters/:chapterId`)

The chapters page uses the same zigzag connector layout as the student units map. Clicking a chapter opens its content directly — there is no nested lessons level.

---

# Supported Users

Student

- Views story list
- Opens chapters in zigzag layout
- Studies chapter content (videos, vocabulary, quiz, homework)

Teacher / Administrator

- Manage stories (create/edit/delete)
- Manage chapters (create/edit/delete)
- Manage chapter content blocks

Staff

- Read-only story list
- Read-only chapter navigation

---

# Progress And Completion

Progress is calculated per chapter (lesson) using the standard lesson progress engine.

Story completion is derived from the completion of its chapters (lessons).

---

# Continue Learning

Continue Learning uses the standard lesson-progress flow.

---

# API

Story reuses the curriculum endpoints:

- `GET /api/v1/curriculum?unitType=STORY` — student story list
- `GET /api/v1/curriculum/units?unitType=STORY` — management list
- `POST/PATCH/DELETE /api/v1/curriculum/units` — story CRUD (`unitType: "STORY"`)
- `POST/PATCH/DELETE /api/v1/curriculum/lessons` — chapter CRUD
- `GET /api/v1/lessons/:lessonId` — chapter content

Permissions reuse `UNITS_*` permissions.

---

# Acceptance Criteria

✓ Story list loads.

✓ Chapters render in zigzag layout.

✓ Chapter content (video, vocabulary, quiz, homework, PDF) works.

✓ Story content is isolated from regular units.

✓ Progress updates correctly.

✓ Responsive design works.

✓ Dark mode works.

✓ RTL works.

---

# Future Enhancements

- AI Story Summary
- Character Cards
- Timeline View
- Interactive Reading
- AI Reading Assistant
- Pronunciation Practice

---

# Final Rule

The Story Module reuses the Curriculum architecture.

Documentation remains the source of truth.

End of Document.
