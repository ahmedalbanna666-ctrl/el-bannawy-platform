# FINAL_REVIEW_API.md

# El-bannawy Platform
## Final Review API (المراجعة النهائية)

Version: 2.0.0

---

# Overview

The Final Review no longer has a dedicated API surface. It reuses the curriculum endpoints with the `unitType=FINAL_REVIEW` discriminator.

There is no `/api/v1/final-reviews` namespace anymore.

---

# Student Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/curriculum?unitType=FINAL_REVIEW` | Final review list (with sections) |
| GET | `/api/v1/lessons/:lessonId` | Section content |
| GET | `/api/v1/lessons/:lessonId/quiz` | Section quiz |
| GET | `/api/v1/lessons/:lessonId/homework` | Section homework |

JWT-protected; filtered by the student's academic context (grade, academic year, term, educational system).

---

# Management Endpoints

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/api/v1/curriculum/units?unitType=FINAL_REVIEW` | Management view | List final reviews |
| POST | `/api/v1/curriculum/units` | Teacher/Administrator | Create final review (`unitType: "FINAL_REVIEW"`) |
| PATCH | `/api/v1/curriculum/units/:id` | Teacher/Administrator | Update final review |
| DELETE | `/api/v1/curriculum/units/:id` | Teacher/Administrator | Delete final review |
| POST | `/api/v1/curriculum/lessons` | Teacher/Administrator | Create lecture |
| PATCH | `/api/v1/curriculum/lessons/:id` | Teacher/Administrator | Update lecture |
| DELETE | `/api/v1/curriculum/lessons/:id` | Teacher/Administrator | Delete lecture |

Permissions reuse `UNITS_*` permissions.

---

# Query Parameters

`unitType` is a `UnitType` enum value (`UNIT`, `STORY`, `FINAL_REVIEW`). It defaults to `UNIT` so existing clients keep working unchanged.

---

# Removed API

The old `/api/v1/final-reviews` base path, management/section/publish/reorder routes, and review-exam/readiness routes are no longer exposed.

# Student Flow

`GET /api/v1/curriculum?unitType=FINAL_REVIEW` returns all final-review units. The web app flattens their lessons into a single "محاضرات المراجعات" list; each lecture opens at `/dashboard/lessons/detail/:lectureId`.

End of Document.
