# DATABASE_SCHEMA.md

# El-bannawy Platform
## Database Schema Specification

Version: 1.0.0

---

# Purpose

This document defines the logical database schema of the El-bannawy Platform.

It specifies every major entity, its responsibility, relationships, ownership and lifecycle.

This document does NOT define SQL tables.

It defines the business data model.

Detailed Prisma models will be generated from this document.

---

# Database Domains

The database is divided into independent domains.

Each domain owns its own entities.

Domains communicate through Services rather than direct coupling.

Domains:

- Authentication
- User Management
- Academic Structure
- Learning
- Assessments
- Gamification
- AI
- Communication
- Financial
- Administration
- Reporting
- Analytics

---

# Authentication Domain

Entities

- User
- Session
- RefreshToken
- LoginHistory
- Device
- PasswordReset

Relationships

User

↓

Sessions

↓

Refresh Tokens

↓

Login History

---

# User Domain

Entities

- Student
- Teacher
- Secretary
- Support
- Administrator
- Parent
- Profile
- Avatar

Relationships

User

↓

Profile

↓

Role

↓

Permissions

---

# Academic Domain

Entities

- AcademicYear
- EducationalSystem
- Stage
- Grade
- Unit
- Lesson
- Story
- StoryChapter

Relationships

Stage

↓

Grade

↓

Unit

↓

Lesson

---

# Lesson Domain

Entities

- Lesson
- LessonVideo
- LessonDocument (Word Document)
- LessonVocabulary
- LessonHomework
- LessonAssessment
- LessonFile (optional additional resources)
- LessonSettings
- LessonCompletionRule

Relationships

Lesson

↓

Videos (one or more)

  ├── Video 1
  │   ├── Timeline Events
  │   ├── Activities
  │   └── Student Progress
  │
  ├── Video 2
  │   ├── Timeline Events
  │   ├── Activities
  │   └── Student Progress
  │
  └── Video N

↓

Document (Word)

↓

Vocabulary

↓

Homework

↓

Assessment

↓

Settings

↓

Completion Rules

---

# Interactive Video Domain

Entities

- Video
- TimelineEvent
- TimelineEventActivity
- VideoProgress

Relationships

Video

↓

TimelineEvent

↓

TimelineEventActivity

↓

Student Progress

---

# Activity Domain

Entities

- Activity
- ActivityType
- ActivityQuestion
- StudentActivityProgress
- StudentActivityResponse

Relationships

Video

↓

Activity

↓

ActivityType

↓

Student Progress

Each activity belongs to exactly one video, not directly to the lesson.

The Activity Domain supports unlimited activity types.

New activity types can be added without changing the lesson architecture.

AI Assessment evaluates subjective activity responses.

---

# AI Assessment Domain

Entities

- AIAssessment
- AIAssessmentScore
- AIAssessmentFeedback
- AIAssessmentGrammarCorrection
- AIAssessmentVocabularyEvaluation
- AIAssessmentRecommendation

Relationships

StudentActivityResponse

↓

AIAssessment

↓

Score

↓

Feedback

↓

Grammar Correction

↓

Vocabulary Evaluation

↓

Recommendation

---

# Vocabulary Domain

Entities

- Vocabulary
- VocabularyAudio
- VocabularyImage
- StudentVocabularyProgress

---

# Homework Domain

Entities

- Homework
- HomeworkQuestion
- HomeworkAttempt
- HomeworkAnswer

---

# Lesson Assessment Domain

Entities

- Assessment
- AssessmentQuestion
- AssessmentAttempt
- AssessmentAnswer

---

# Story Domain

Entities

- Story
- Chapter
- StoryLesson
- StoryHomework
- StoryQuiz

---

# Learning Progress Domain

Entities

- LessonProgress
- UnitProgress
- StoryProgress
- CourseProgress
- CompletionHistory

---

# Learn From Mistakes Domain

Entities

- Mistake
- MistakeAttempt
- MistakeMastery

---

# Final Review Domain

Entities

- ReviewUnit
- ReviewLesson
- ReviewExam
- ReviewAttempt

---

# Educational Games Domain

Entities

- Game
- GameCategory
- GameAttempt
- GameScore

---

# Live Classes Domain

Entities

- LiveClass
- Booking
- Attendance
- LiveRecording

---

# AI Domain

Entities

- Conversation
- ConversationMessage
- UploadedDocument
- UploadedImage
- AIRecommendation
- AIUsage

---

# Gamification Domain

Entities

- XPTransaction
- XPLevel
- Achievement
- Badge
- Leaderboard
- CoinWallet
- CoinTransaction

---

# Referral Domain

Entities

- Referral
- ReferralReward
- ReferralCampaign

---

# Payment Domain

Entities

- Payment
- Invoice
- Transaction
- CoinPackage
- Coupon

---

# Notification Domain

Entities

- Notification
- NotificationTemplate
- NotificationLog
- NotificationPreference
- NotificationSchedule
- NotificationTarget
- DeliveryChannel
- PushQueue

---

# Reports Domain

Entities

- Report
- ReportExport
- ScheduledReport

---

# Analytics Domain

Entities

- EventLog
- DashboardMetric
- KPI
- StudentAnalytics
- TeacherAnalytics

---

# Administration Domain

Entities

- Role
- Permission
- AuditLog
- SystemSetting
- FeatureFlag

---

# General Rules

Every entity must contain:

- id
- created_at
- updated_at

Optional

- deleted_at

---

# Relationships

Relationship Types

One-to-One

One-to-Many

Many-to-One

Many-to-Many

Every relationship must be documented.

---

# Primary Keys

UUID

Mandatory.

---

# Foreign Keys

Always enforced.

Never optional unless documented.

---

# Soft Delete

Applied to:

Educational Content

Users

Notifications

Not applied to:

Payments

Audit Logs

Transactions

---

# Versioning

Educational content should support future versioning.

Old student progress must remain compatible.

---

# Future Expansion

Prepared for:

- Multi-School
- Multi-Country
- Multi-Currency
- Multi-Language
- AI Agents
- Plugin Architecture

---

# Acceptance Criteria

Database Schema is complete when:

✓ Every module owns its entities.

✓ Relationships are documented.

✓ Ownership is clear.

✓ Expansion is possible.

✓ No duplicated responsibilities exist.

---

# Final Rule

Business entities define the database.

The physical schema must always follow the business model—not the opposite.

End of Document.