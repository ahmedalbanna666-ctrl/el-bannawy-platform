# API Architecture

Version: 2.0.0
Status: Current runtime contract

## Runtime

The API is a NestJS modular monolith served under `/api/v1`. `apps/backend/src/main.ts` configures CORS, global validation, and the prefix. Modules are registered in `apps/backend/src/app.module.ts`.

```text
Client -> JWT guard -> role/permission guard -> DTO validation -> controller -> service -> Prisma
```

The current services access Prisma directly. A separate repository layer is an architectural improvement, not an existing runtime layer.

## Route Groups

`auth`, `home`, `curriculum`, `lessons`, `videos`, `video-questions`, `video-events`, `activities`, `execution`, `homework`, `quizzes`, `reports`, `payments`, `notifications`, `ai`, `profile`, `academic-context`, `stories`, `competitions`, `final-reviews`, `admin`, `teachers`, `support`, `grade-support`, `mistakes`, `coins`, and `live`.

## Request Rules

- Protected routes use `Authorization: Bearer <access-token>`.
- `ValidationPipe` uses `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- UUID route parameters are parsed with `ParseUUIDPipe` where implemented.
- File uploads are handled by lesson/document import routes and require separate size/type hardening before production.
- Clients never connect directly to PostgreSQL.

## Response Contract

Most controllers use:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "timestamp": "2026-07-21T00:00:00.000Z"
}
```

The helper is `common/helpers/response.helper.ts`. A small number of older controllers may still return a reduced shape; they must be normalized before being treated as a stable public contract.

## Error Contract

There is currently no project-wide exception filter. NestJS exceptions and validation errors therefore use the framework's default error shape in affected paths. Do not document a custom `{ requestId, error, timestamp }` error envelope as implemented.

## Pagination And Filtering

Pagination is not universal yet. Growing list endpoints in admin, live, support, notifications, reports, competitions, coins, and mistakes require pagination work before high-volume production use. Existing query filters are module-specific.

## Authentication And Authorization

- JWT access and refresh token flows are implemented.
- `RolesGuard` handles explicit role restrictions.
- `PermissionGuard` resolves effective delegated permissions through `DelegatedPermissionService`.
- Client navigation uses shared permissions but is never trusted for access control.

## Current API Gaps

- Swagger/OpenAPI is not wired in the backend package.
- Rate limiting is not globally wired.
- Redis cache and queue workers are not wired.
- Request correlation IDs, metrics, and global structured exception handling are not complete.
- Some controller bodies are inline objects instead of dedicated DTO classes.

End of Document.
