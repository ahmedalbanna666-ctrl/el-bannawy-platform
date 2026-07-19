# MISTAKES_API.md

# El-bannawy Platform
## Learn From Mistakes & Mini-Exam API

Version: 1.0.0

---

# Purpose

This module lets a student review every question they answered incorrectly ("mistakes")
across the whole term or just today, filter them by unit or story/chapter, and generate a
self-paced **mini-exam** built exclusively from those mistakes. The student controls the
number of questions and the time limit.

Mistakes are derived from wrong answers recorded by:

- Assessment attempts (`AssessmentAnswer.isCorrect = false`)
- Quiz attempts (`QuizAnswer.isCorrect = false`)
- Homework attempts (`HomeworkAnswer.isCorrect = false`)
- Story attempts (`StoryChapterAnswer.isCorrect = false`)

Each mistake is de-duplicated per `questionId` (the most recent wrong attempt is kept).

---

# Base Endpoint

/api/v1/mistakes

---

# Authentication

Required: JWT Access Token (`JwtAuthGuard`).
Ownership is enforced server-side (a student only sees their own mistakes).

Permissions:

- `mistakes.view` — view mistakes list & filters
- `mistakes.practice` — generate / submit a mini-exam

Both are granted to STUDENT and TEACHER.

---

# ==========================
# LIST MISTAKES
# ==========================

GET /mistakes

Query Parameters

| Param | Type | Description |
| --- | --- | --- |
| scope | "all" | "today" | "term" | Default "all". "today" = since local midnight. "term" = current academic term (all attempts). |
| unitId | string (uuid) | Filter by unit. |
| lessonId | string (uuid) | Filter by lesson. |
| storyId | string (uuid) | Filter by story. |
| chapterId | string (uuid) | Filter by story chapter. |
| source | "assessment" | "quiz" | "homework" | "story" | Filter by origin. |
| search | string | Case-insensitive search on prompt. |

Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "mistake-unique-per-question",
        "questionId": "q-1",
        "source": "assessment",
        "type": "MCQ",
        "prompt": "Choose the correct article...",
        "instruction": null,
        "explanation": "Because ...",
        "yourAnswer": "A",
        "correctAnswer": "B",
        "unitId": "u-1",
        "unitTitle": "Unit 1",
        "lessonId": "l-1",
        "lessonTitle": "Lesson 1",
        "storyId": null,
        "storyTitle": null,
        "chapterId": null,
        "chapterTitle": null,
        "occurredAt": "2026-07-19T10:00:00.000Z",
        "attemptCount": 2
      }
    ],
    "total": 14,
    "bySource": { "assessment": 8, "quiz": 4, "homework": 2, "story": 0 },
    "byUnit": [ { "unitId": "u-1", "unitTitle": "Unit 1", "count": 14 } ]
  },
  "message": "Mistakes retrieved"
}
```

Notes

- `correctAnswer` is the text/label of the correct option. For free-text question types it is the stored `answer`/expected value or null.
- `yourAnswer` is the student's last wrong answer text.
- Story-scoped mistakes require story attempts to exist; today they are typically empty until story answering is recorded.

---

# ==========================
# FILTER OPTIONS
# ==========================

GET /mistakes/filters

Returns the units and stories the student has mistakes in (for building filter dropdowns).

Response

```json
{
  "success": true,
  "data": {
    "units": [ { "id": "u-1", "title": "Unit 1" } ],
    "stories": [ { "id": "s-1", "title": "The Lion Story" } ],
    "sources": [ "assessment", "quiz", "homework", "story" ]
  }
}
```

---

# ==========================
# CREATE MINI-EXAM
# ==========================

POST /mistakes/mini-exam

Body

```json
{
  "unitId": "u-1",
  "storyId": null,
  "lessonId": null,
  "chapterId": null,
  "questionCount": 10,
  "durationMinutes": 15
}
```

Rules

- At least one scope filter (unitId / storyId / lessonId / chapterId) is required.
- `questionCount` (1-50) and `durationMinutes` (1-120) are required.
- Questions are pulled ONLY from the student's wrong-answer pool within the scope.
- If the pool is smaller than `questionCount`, the exam uses all available mistakes (and `usedCount` reflects that).
- Options are returned WITHOUT correct-answer flags. Questions within the exam are shuffled; options are shuffled.

Response

```json
{
  "success": true,
  "data": {
    "examId": "exam-1",
    "durationMinutes": 15,
    "usedCount": 10,
    "poolSize": 14,
    "questions": [
      {
        "id": "eq-1",
        "questionId": "q-1",
        "type": "MCQ",
        "prompt": "Choose the correct article...",
        "instruction": null,
        "options": [ { "id": "opt-2", "text": "B" }, { "id": "opt-1", "text": "A" } ]
      }
    ]
  },
  "message": "Mini-exam created"
}
```

---

# ==========================
# SUBMIT MINI-EXAM
# ==========================

POST /mistakes/mini-exam/:id/submit

Body

```json
{
  "answers": [ { "questionId": "q-1", "answer": "A" } ]
}
```

Grading

- Each answer is compared against the stored correct option/value (auto-graded).
- `isCorrect` per question is recorded.
- Score = correct / total * 100 (rounded).

Response

```json
{
  "success": true,
  "data": {
    "score": 60,
    "maxScore": 100,
    "correctCount": 6,
    "total": 10,
    "passed": false,
    "results": [
      {
        "questionId": "q-1",
        "correct": false,
        "yourAnswer": "A",
        "correctAnswer": "B",
        "explanation": "Because ..."
      }
    ]
  },
  "message": "Mini-exam submitted"
}
```

Submitting twice is rejected (exam already submitted).

---

# ==========================
# MINI-EXAM HISTORY
# ==========================

GET /mistakes/mini-exam/history

Returns the student's past mini-exams (most recent first).

Response

```json
{
  "success": true,
  "data": [
    {
      "id": "exam-1",
      "scope": { "unitId": "u-1" },
      "questionCount": 10,
      "durationMinutes": 15,
      "score": 60,
      "maxScore": 100,
      "passed": false,
      "createdAt": "2026-07-19T10:00:00.000Z"
    }
  ]
}
```

---

# ==========================
# STORY ATTEMPT RECORDING (supporting)
# ==========================

POST /stories/:storyId/attempt

Records a story practice attempt so its wrong answers become mistakes.

Body

```json
{
  "chapterId": "ch-1",
  "answers": [ { "questionId": "sq-1", "answer": "A" } ]
}
```

- Each answer is graded against `StoryChapterQuestionOption.isCorrect`.
- Returns the attempt with per-question `isCorrect`.

This endpoint exists so story questions can populate the mistakes pool; the story
player UI is a separate feature.

---

# ==========================
# DATA MODELS (new)
# ==========================

## StoryAttempt
- id, userId, storyId, chapterId?, score?, maxScore?, passed?, submitted (default false), startedAt, submittedAt?
- relations: story, user, answers: StoryChapterAnswer[]

## StoryChapterAnswer
- id, attemptId, questionId, answer?, isCorrect?, createdAt
- unique(attemptId, questionId)

## MiniExam
- id, userId, unitId?, storyId?, lessonId?, chapterId?, questionCount, durationMinutes, poolSize, usedCount, status ("CREATED"|"SUBMITTED"), score?, maxScore?, passed?, createdAt, submittedAt?
- answers: MiniExamAnswer[]

## MiniExamAnswer
- id, examId, questionId, answer?, isCorrect?, createdAt
- unique(examId, questionId)

---

# Final Rule

A student only ever sees their own mistakes. Coins are never granted or charged by this
module. The mini-exam is practice only and is built strictly from the student's previous
wrong answers.

End of Document.
