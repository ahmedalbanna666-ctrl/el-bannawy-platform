# User Roles And Permissions

Version: 2.0.0

## Database Roles

The Prisma `UserRole` enum currently contains:

- `STUDENT`
- `TEACHER`
- `STAFF`
- `SECRETARY`
- `SUPPORT`
- `ADMINISTRATOR`

The shared permission ceiling and delegated-permission implementation currently define effective permission behavior for `STUDENT`, `TEACHER`, `STAFF`, and `ADMINISTRATOR`. `SECRETARY` and `SUPPORT` remain database/API roles where explicitly supported by module guards, but they do not have a complete shared permission map yet.

## Effective Permission Model

Authorization is server-side and may use both role guards and permission guards.

- Administrators receive the complete permission set.
- Students receive learning, units/lessons, stories, final review, live, AI, coins, mistakes, and competition viewing/practice permissions as defined in `packages/shared/src/permissions/roles.ts`.
- Teachers receive a content and operational ceiling. Their effective grants are persisted in `UserPermissionGrant` and are initialized idempotently when a teacher is created or backfilled.
- Staff are linked to a managing teacher through `managedByTeacherId`. A staff permission is effective only when it is within the staff ceiling and also granted to the managing teacher.
- A teacher may delegate only an allowed staff permission and only to staff they manage.
- Permission grants and revocations create audit records.

## Role Responsibilities

### Student

Can consume published learning content, submit learning work, use student features, book live sessions, use support, and manage personal profile/preferences. Cannot manage curriculum or users.

### Teacher

Can manage assigned curriculum and learning content, vocabulary, assessments, stories, final review, live sessions, reports, competitions, notifications, and permitted coins/unlocks. Teacher permissions may be reduced by administrator configuration.

### Staff

Provides a constrained operational role for work delegated by a teacher, including selected lesson/content, support, notifications, reports, live viewing, and learning-access permissions.

### Secretary

Exists in the persisted role model for operational workflows. Only capabilities explicitly guarded in current controllers should be considered implemented; no broad secretary dashboard contract is promised.

### Support

Can work with support workflows where the endpoint explicitly allows the role, including ticket resolution. Financial and curriculum administration is not implied.

### Administrator

Can manage users, settings, content, permissions, financial access configuration, support contacts, unlock requests, and system operations exposed by the current API.

## Security Rules

- Client-side navigation visibility is not authorization.
- Every protected endpoint must use JWT authentication and the relevant role/permission guard.
- Delegation must fail closed for unknown roles or permissions.
- Passwords, tokens, secrets, and private user data must not be logged.

End of Document.
