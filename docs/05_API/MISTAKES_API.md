# Mistakes And Mini-Exam API

Version: 2.0.0
Source: `apps/backend/src/mistakes`

## Base And Authorization

Base path: `/api/v1/mistakes`

JWT, role guard, and `mistakes.view`/`mistakes.practice` permission intent apply to the current student/teacher/admin paths. Ownership and service query rules are authoritative.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List wrong answers with `MistakeQueryDto` filters |
| GET | `/filters` | Return available mistake filters; optional `studentId` for authorized staff |
| POST | `/mini-exam` | Create a mini exam from the user's wrong-answer pool; returns 201 |
| GET | `/mini-exam/history` | List mini-exam history; optional `studentId` |
| GET | `/mini-exam/:id` | Read owned/authorized mini exam |
| POST | `/mini-exam/:id/submit` | Submit answers and score mini exam |

## Data Source

Mistakes are derived from recorded incorrect answers across assessment, quiz, homework, and story attempt models. There is no separate `Mistake` table in Prisma. Mini exams use `MiniExam` and `MiniExamAnswer`.

## Rules

- A mini exam is practice and does not charge or award coins.
- Questions and options are returned without exposing correctness before submission.
- Submissions are scored and persisted.
- Students must not read another student's mistakes.
- Lists require pagination work before high-volume usage.

End of Document.
