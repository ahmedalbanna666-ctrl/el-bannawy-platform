# Business Rules

Version: 2.0.0
Status: Rules reflected by the current implementation

## Identity And Access

- Protected API routes require a valid JWT access token.
- Input is validated by the global NestJS validation pipe where DTOs are defined.
- Role and permission checks are enforced on the server; UI visibility is only a convenience.
- Teacher/staff delegation is bounded by role ceilings, ownership, and audit logging.

## Academic Context

- Learning content is scoped through academic year, term, educational system, stage, grade, unit, and lesson relationships.
- Student curriculum queries must respect the student's assigned academic context.
- Teachers and administrators may manage content according to their effective permissions.
- Published state and premium/lock state determine student availability; `lockedOverride` can explicitly override the default lock behavior.

## Lessons And Content

- A lesson belongs to one unit and may have multiple videos.
- A video stores provider metadata. The current provider is YouTube; the platform does not upload lesson video files.
- Timeline events and video questions belong to a specific video and may be enabled/disabled and required/optional.
- Lesson documents are persisted as metadata and served through a protected lesson document route.
- DOCX imports go through extraction, parsing, preview, optional editing, and persistence. Structured vocabulary supports standard and synonym/antonym sections.
- Homework and quiz entities are optional per lesson and support attempt limits, passing score, answer visibility, and XP reward settings.
- Reusable assessments support visibility, scheduling, sections, question assignment, attempts, time/attempt policies, scoring, and feedback policies.

## Progress And Practice

- Lesson, video, and activity progress are stored per user.
- Mistake practice and mini exams are separate practice flows and do not replace the original assessment.
- Games and competitions are supplementary. They must not be treated as a substitute for lesson completion.
- XP and achievements measure engagement/progress; coins do not affect ranking.

## Stories And Final Review

- Stories contain chapters with their own videos, vocabulary, questions, and attempts.
- Final review is separate from regular lesson progression and is exposed according to its publication and academic context.

## Coins And Unlocks

- A user has one coin wallet.
- Coin packages create pending payment/purchase records. Coins are credited only after verification.
- Coin unlock cost is configurable for `UNIT` and `TERM`; current defaults are 50 and 300 when no system setting exists.
- Lesson-level purchases are disabled; lessons inherit the lock state of their parent unit.
- An unlock records target type, target ID, method (`COINS` or `CODE`), and optional coin amount.
- Activation codes may add coins or unlock a specific target, may expire, and may have a usage limit.
- The same user cannot redeem the same code twice.
- Users may submit one pending unlock request per target; administrators resolve requests.

## Live Classes

- Teachers define availability and date blocks; concrete sessions are materialized automatically from those availability slots (and study schedules), with no manual session creation.
- Sessions support private/group type, capacity, external meeting URL or reserved Zoom SDK provider, publication/status transitions, bookings, announcements, control logs, and attendance.
- A student booking is unique per session and student.

## Support And Notifications

- Support tickets belong to the creating user and may contain messages, assignment, priority, status, and resolution.
- Notifications and preferences are persisted in-app. External delivery channels are not considered active until integrated.

## AI

- AI conversations belong to the authenticated user.
- Chat uses recent conversation messages and optional lesson title/unit/grade context.
- A configurable provider may be called; without a provider key the deterministic rule-based fallback is used.
- The current implementation is not a curriculum RAG system and must not be documented as one.

End of Document.
