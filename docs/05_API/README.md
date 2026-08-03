# API Documentation

Version: 2.0.0

## Runtime Contract

- Base path: `/api/v1`
- Framework: NestJS
- Authentication: JWT Bearer token
- Default success envelope: `{ success, message, data, timestamp }`
- Validation: global whitelist/transform/forbid-unknown-properties pipe

## Route Prefixes

`auth`, `home`, `academic-context`, `curriculum`, `lessons`, `videos`, `video-questions`, `video-events`, `activities`, `execution`, `homework`, `quizzes`, `reports`, `payments`, `notifications`, `ai`, `profile`, `stories`, `competitions`, `final-reviews`, `admin`, `teachers`, `support`, `grade-support`, `mistakes`, `coins`, and `live`.

## Current Specifications

- `COINS_SYSTEM_API.md`: actual wallet, package, code, and unlock routes
- `LIVE_CLASSES_API.md`: actual `/live` routes, not the old `/live-classes` proposal
- `COMPETITIONS_API.md`: competition management, participation, and leaderboard routes
- `SUPPORT_DASHBOARD_API.md`: current ticket routes, not the old incident/dashboard proposal
- `MISTAKES_API.md`: wrong-answer and mini-exam routes
- `FINAL_REVIEW_API.md`: current `/final-reviews` management/read routes
- `NOTIFICATIONS_API.md`: current persisted notification routes
- `AUTHENTICATION_API.md`: authentication routes and flow
- `CURRICULUM_API.md`, `HOMEWORK_API.md`, `LESSON_QUIZ_API.md`, `VOCABULARY_API.md`: learning routes

When a legacy module document conflicts with a controller, the controller and this index win until that document is updated.

## Known Contract Gaps

- No Swagger/OpenAPI runtime is currently wired.
- Pagination is not universal.
- A global exception envelope is not implemented.
- A few controllers use reduced/nonstandard response shapes.
- Some controller input objects are inline rather than dedicated DTOs.

End of Document.
