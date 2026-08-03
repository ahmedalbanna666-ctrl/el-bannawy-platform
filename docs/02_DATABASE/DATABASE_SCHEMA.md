# Database Schema

Version: 2.0.0
Status: Prisma schema reference

## Physical Source Of Truth

The physical schema is `database/prisma/schema.prisma`. Applied changes are represented by replayable migrations in `database/prisma/migrations`. Do not invent tables from the original requirement documents and do not edit a production database manually.

## Database Configuration

- Engine: PostgreSQL
- ORM: Prisma 6
- Primary keys: UUID
- Connection: `DATABASE_URL`
- Package: `@el-bannawy/database`
- Commands: `generate`, `migrate`, `migrate:deploy`, `migrate:reset`, `seed`, `studio`

## Domains And Current Models

### Identity And Access

`User`, `Session`, `RefreshToken`, `LoginHistory`, `PasswordReset`, `UserPermissionGrant`, `AuditLog`, `SystemSetting`.

`User` stores profile, role, account status, academic context, teacher/staff relationship, and feature relations. Permission grants are unique by `(userId, permission)`.

### Academic Structure

`AcademicYear`, `Term`, `Stage`, `Grade`, `Book`, `TeacherGrade`, `Unit`, `Lesson`.

The primary content path is:

```text
AcademicYear -> Term
Stage -> Grade -> Book -> Unit -> Lesson
```

`Unit` carries a `unitType` discriminator (`UNIT`, `STORY`, `FINAL_REVIEW`). The platform Story (قصة المنهج) and Final Review (المراجعة النهائية) are modeled as units of type `STORY` and `FINAL_REVIEW`; their chapters/sections are regular `Lesson` rows that reuse the full lesson content engine (videos, vocabulary, quiz, homework, document import).

Several content relationships are optional to support legacy academic records and administrative authoring flows.

### Lesson Content And Progress

`LessonSettings`, `LessonDocument`, `LessonVideo`, `VideoEvent`, `TimelineEvent`, `VideoQuestion`, `VideoQuestionOption`, `Activity`, `ActivityQuestion`, `LessonVocabulary`, `VocabularySection`, `VocabularyRelation`, `VideoProgress`, `ActivityProgress`, `LessonProgress`.

Videos are provider references. The current provider is YouTube; lesson video files are not stored in PostgreSQL.

### Questions And Assessments

`QuestionGroup`, `Question`, `QuestionOption`, `QuestionHint`, `QuestionAttachment`, `QuestionTag`, `QuestionTagAssignment`, `Assessment`, `AssessmentSection`, `AssessmentQuestion`, `AssessmentAttempt`, `AssessmentAnswer`, `Homework`, `HomeworkQuestion`, `StudentHomeworkAttempt`, `HomeworkAnswer`, `Quiz`, `QuizQuestion`, `QuizAttempt`, `QuizAnswer`.

Question content is reusable for assessments. Attempts and answers are scoped to the authenticated student and preserve scoring/feedback state.

### Practice, Games, And Competition

`MiniExam`, `MiniExamAnswer`, `Competition`, `CompetitionParticipant`, `UserAchievement`, `XPTransaction`.

The current schema stores mistakes through the question/answer and mini-exam flows; there is no separate `Mistake` table in the current Prisma schema.

### Certificates

`UnitCertificate` (table `unit_certificates`).

One certificate per `(userId, unitId)`. Stores the generated PDF file reference (`fileName`, `fileUrl`, `fileSize`, `mimeType`) and the earned date. Files are stored on disk under `uploads/certificates/{userId}/` and served under `/files/certificates`. The certificate threshold percentage is stored in `system_settings` under key `certificate_threshold` (default `80`).

### Coins And Payments

`CoinWallet`, `CoinPackage`, `CoinPurchase`, `UnlockCode`, `CodeRedemption`, `ContentUnlock`, `UnlockRequest`, `Payment`, `Invoice`, `Coupon`, `LiveRefund`.

Coin purchase and unlock records are separate from learning progress. `ContentUnlock` is unique by `(userId, targetType, targetId)`.

`Payment.couponId` is a FK to `Coupon` (added in Phase 1B); orphan coupon references were scanned before the constraint was applied. Refunds are recorded in the `LiveRefund` ledger (unique by `paymentId`) instead of a bare `Payment.status` flip, mirroring the `XPTransaction` movement-ledger pattern.

### Live Learning

`LiveSession`, `LiveAnnouncement`, `LiveSessionControlLog`, `LiveBooking`, `LiveSubscription`, `LiveWaitingList`, `LiveAttendance`, `TeacherAvailability`, `TeacherDateBlock`, `TeacherLiveSettings`.

Availability and date blocks use soft-delete fields. A booking is unique by `(sessionId, studentId)`. A waiting-list entry is unique by `(sessionId, studentId)` and carries a `position` for first-in-first-out promotion. `LiveBooking` stores the reschedule request lifecycle (`rescheduleRequestedAt`, `rescheduleReason`, `rescheduleStatus`, `rescheduleResolvedAt`, `rescheduleResolvedById`) with status `REQUESTED` → `APPROVED`/`REJECTED`.

### Communication And AI

`Notification`, `NotificationPreference`, `Conversation`, `ConversationMessage`, `SupportTicket`, `SupportMessage`.

Notifications are currently persisted in-app. Scheduled notifications use the `scheduledAt` and `sentAt` columns: rows stay hidden from the inbox until a BullMQ worker sets `sentAt` at the target time. Conversation messages preserve user and assistant roles; external model/provider usage is not represented as a separate usage ledger in the current schema.

## Enums

Current Prisma enums include `UserRole`, `AccountStatus`, `LessonStatus`, `ActivityType`, `UnitType`, live-session and booking states, waiting-list state (`LiveWaitingListStatus`), reschedule state (`LiveBookingRescheduleStatus`), refund state (`LiveRefundStatus`), meeting provider, assessment type/visibility/policies, and vocabulary section kind.

Several operational fields remain strings, including payment, support, notification, unlock-request, competition, and code statuses. Treat their accepted values as service contracts until they are migrated to Prisma enums.

## Lifecycle Rules

- UUID foreign keys and Prisma relations are the default.
- Cascades are used for owned child content and user-owned progress where defined in the schema.
- Soft deletion is used selectively through `deletedAt`; it is not universal.
- Multi-step writes must use a Prisma transaction.
- Every schema change requires a migration, test coverage, and a documentation update.
- `current_schema.prisma` is an untracked/generated comparison artifact and is not the canonical schema; `schema.prisma` is canonical.

## Migration History Highlights

Recent migrations add delegated permissions, structured vocabulary, video provider fields, assessments and attempts, live classes, coins economy, locked overrides, competitions, support tickets, downloadable lesson documents, and the Phase 1B live-v2 migration (`20260804000000_add_phase1b_live_v2`) which adds the waiting list, reschedule fields, refund ledger, scheduled-notification columns, and the coupon FK. Run `prisma migrate status` before applying or repairing migrations.

End of Document.
