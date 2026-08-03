# Competition Module

Version: 1.0.0
Source: `apps/backend/src/competition`

## Responsibility

Provides teacher/admin-created academic competitions scoped to grade, academic year, and term, with invitations, student acceptance, submissions, scoring, XP/coin rewards, and leaderboard views.

## Persisted Model

`Competition` stores title, description, mode, academic context, creator, lifecycle status, visibility, schedule, time limit, rewards, and question payload. `CompetitionParticipant` stores invitation/join/submission state, score, correct count, duration, answers, and earned XP.

## Authorization

Teacher/admin management routes require `competition.manage`. Student/read routes require `competition.view`. The permission guard resolves effective delegated permissions server-side.

## Lifecycle

Teachers/admins can create, update, delete, change status, invite students, and finalize. Students can list/read, accept, submit, and view leaderboards.

## Limitations

Competition lists are not paginated and question payload is currently JSON rather than normalized question relations. Notifications and rewards should be tested for idempotency before production competition use.

End of Document.
