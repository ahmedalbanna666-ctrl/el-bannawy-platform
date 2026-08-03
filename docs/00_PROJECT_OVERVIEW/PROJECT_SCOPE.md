# Project Scope

Version: 2.0.0
Status: Current implementation baseline

## In Scope And Implemented

### Shared

- JWT authentication, refresh tokens, sessions, password reset, and Google OAuth path
- Server-side role and permission checks
- Arabic/English-ready UI with RTL, dark/light themes, responsive states, and semantic design tokens
- Academic context filtering and role-aware dashboard navigation
- Audit records for important administrative and permission operations

### Student

- Dashboard, profile, units, lessons, progress, vocabulary, lesson documents, homework, quizzes, assessments
- Stories, final review, learn from mistakes, mini exams, games, achievements, leaderboard, competitions
- AI conversations/recommendations, notifications/preferences, support tickets
- Live-session discovery, subscriptions, booking, announcements, and attendance state
- Coin wallet, package purchase flow, activation codes, content unlocks, and unlock requests

### Teacher, Staff, And Administration

- Unit and lesson CRUD with publish/premium/lock controls
- Videos, timeline events, video questions, lesson documents, homework, quizzes, assessments
- DOCX question/vocabulary preview and persistence, including structured vocabulary relations
- Story and final-review management
- Live availability, sessions, booking control, attendance, announcements, and control logs
- Reports, competitions, support operations, coin packages, unlock codes, unlock requests, and grade support contacts
- Delegated permissions: administrators configure teachers; teachers may delegate an allowed subset to owned staff users

## Present In Code But Not Complete As A Product Integration

- Mobile feature parity
- External notification channels
- Payment gateway production certification
- Full AI/RAG platform
- Production operations, metrics, and distributed observability

## Out Of Scope For The Current Baseline

- Parent portal
- Desktop client
- Offline learning
- Marketplace and public plugin ecosystem
- Multi-tenant/school isolation
- Public API consumers
- Complete social/community features

Changes to scope require a documentation update and corresponding implementation/tests.

End of Document.
