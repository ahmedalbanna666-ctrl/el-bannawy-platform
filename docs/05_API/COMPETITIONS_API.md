# Competitions API

Version: 1.0.0
Source: `apps/backend/src/competition/competition.controller.ts`

Base path: `/api/v1/competitions`

## Management

- `GET /teacher`
- `POST /`
- `GET /teacher/:id`
- `PATCH /teacher/:id`
- `DELETE /teacher/:id`
- `PATCH /teacher/:id/status`
- `POST /teacher/:id/invite`
- `POST /teacher/:id/finalize`

Management requires teacher/administrator role and `competition.manage`.

## Student And Shared Read

- `GET /student`
- `GET /student/:id`
- `POST /student/:id/accept`
- `POST /student/:id/submit`
- `GET /:id/leaderboard`
- `GET /:id`

These routes require JWT and `competition.view`. All success responses use the standard response helper.

End of Document.
