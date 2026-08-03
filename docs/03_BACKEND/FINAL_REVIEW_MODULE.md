# FINAL_REVIEW_MODULE.md

# El-bannawy Platform
## Final Review Module (المراجعة النهائية)

Version: 2.1.0

---

# Purpose

The Final Review Module delivers the official final review (المراجعة النهائية) to students as a dedicated revision path before exams.

The Final Review is a `Unit` with `unitType = FINAL_REVIEW`; every Review Lecture (محاضرة) is a `Lesson` that reuses the full lesson content engine.

---

# Architecture Overview

The Final Review is NOT a separate data model anymore. It reuses:

- `units` table with `unitType = FINAL_REVIEW`
- `lessons` table (one lesson per lecture)
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

A Final Review is a `Unit` row with:

```text
unitType = FINAL_REVIEW
published
displayOrder
isPremium
academicYearId / termId / gradeId / educationalSystem / bookId
```

A Review Lecture is a `Lesson` row scoped to the review unit. Lectures have no inner lessons — content lives directly on the lecture (lesson).

---

# Structure

A Final Review contains:

- Lectures (one `Lesson` per lecture): المحاضرة الأولى، المحاضرة الثانية، ...

Each Lecture contains:

- Interactive Videos (one or more, same engine)
- Vocabulary
- PDF Files
- Homework
- Quiz

The content order follows the standard lesson flow. The lecture video is displayed first with the rest of the content below it, exactly like a regular unit lesson.

---

# Navigation Flow

The student experience is only TWO pages — there is no zigzag and no intermediate level:

Home

↓

Lectures List (`/dashboard/final-reviews`)

↓

Lecture Content (`/dashboard/lessons/detail/:lectureId`)

- Page 1 is a flat list styled like the lessons list (قائمة الدروس) titled "محاضرات المراجعات". Each row is named "المحاضرة الأولى", "المحاضرة الثانية", ... and shows the lecture title, duration, and quiz/homework badges.
- Clicking a lecture navigates directly to its content page (video + remaining content blocks below).

The management flow keeps the review detail page for teachers/administrators:

- `/dashboard/final-reviews` — management list (reviews)
- `/dashboard/final-reviews/:reviewId` — management detail (lectures inside a review)
- `/dashboard/final-reviews/:reviewId/lectures/:lectureId` — lecture content management

Students and staff are redirected from the review detail route to the lectures list.

---

# Supported Users

Student

- Views the flat lectures list
- Opens a lecture directly to study its content (video, vocabulary, quiz, homework)

Teacher / Administrator

- Manage final reviews (create/edit/delete)
- Manage lectures (create/edit/delete)
- Manage lecture content blocks

Staff

- Read-only lectures list

---

# Progress And Completion

Progress is calculated per lecture (lesson) using the standard lesson progress engine.

Review completion is derived from the completion of its lectures (lessons).

---

# Continue Learning

Continue Learning uses the standard lesson-progress flow.

---

# API

Final Review reuses the curriculum endpoints:

- `GET /api/v1/curriculum?unitType=FINAL_REVIEW` — student lectures list (flat, across all reviews)
- `GET /api/v1/curriculum/units?unitType=FINAL_REVIEW` — management list
- `POST/PATCH/DELETE /api/v1/curriculum/units` — review CRUD (`unitType: "FINAL_REVIEW"`)
- `POST/PATCH/DELETE /api/v1/curriculum/lessons` — lecture CRUD
- `GET /api/v1/lessons/:lessonId` — lecture content

Permissions reuse `UNITS_*` permissions.

---

# Acceptance Criteria

✓ Final review lectures list loads as a flat list (no zigzag).

✓ Lectures are numbered "المحاضرة الأولى", "المحاضرة الثانية", ...

✓ Clicking a lecture opens its content page directly.

✓ Lecture content (video, vocabulary, quiz, homework, PDF) works.

✓ Review content is isolated from regular units.

✓ Progress updates correctly.

✓ Responsive design works.

✓ Dark mode works.

✓ RTL works.

---

# Future Enhancements

- Exam Readiness Indicator
- Scheduled Review Period
- PDF Notes Model
- Analytics Ledger

---

# Final Rule

The Final Review Module reuses the Curriculum architecture.

Documentation remains the source of truth.

End of Document.
