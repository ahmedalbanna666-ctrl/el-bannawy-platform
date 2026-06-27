# BUSINESS_RULES.md

# El-bannawy Platform
## Business Rules

Version: 1.0.0

---

# Purpose

This document defines the official business rules of the El-bannawy Platform.

Business Rules are immutable.

AI Agents and developers MUST NEVER modify these rules unless documentation is updated first.

---

# General Rules

The platform is designed around learning progression.

Students must progress through content sequentially.

No feature may allow bypassing documented learning flow.

---

# Authentication Rules

A user must authenticate before accessing any protected resource.

Every request must be authenticated and authorized.

---

# Student Registration Rules

A student must provide:

- Full Name
- Mobile Number
- Password

Optional:

- Parent Mobile Number
- Profile Picture

---

# Academic Rules

Students choose only:

- Educational System
- Stage
- Grade

Students NEVER choose:

- Academic Term

The academic term is assigned by teachers.

---

# Lesson Rules

A Lesson consists of:

- Lesson Videos (one or more)
- Activities (generated from uploaded Word document, per video)
- Homework (optional — teacher enabled)
- End Lesson Assessment (optional — teacher enabled)

The Word document is the only source of lesson content.

Teachers upload only a Microsoft Word Document and provide YouTube URLs for one or more lesson videos.

The system automatically converts the uploaded Word document into structured lesson content.

---

# Lesson Content Rules

Teachers provide:

- Lesson Videos (one or more YouTube URLs)
- Microsoft Word Document

The Word document is the only source of lesson content.

The system automatically converts the Word document into structured lesson activities.

Teachers do not manually create activities inside the dashboard.

---

# Lesson Unlock Rules

The next lesson remains locked until:

All configured lesson completion requirements are satisfied.

The teacher configures:

- Lesson completion requirements
- Passing score
- Retry limit
- Unlock behavior

---

# Interactive Video Rules

The platform does NOT upload or store lesson video files.

Lesson videos are hosted on YouTube as Unlisted videos.

Teachers provide YouTube Unlisted URLs — one or more per lesson.

Each lesson video has its own URL, Video ID, and metadata.

The video provider must be abstract so it can be replaced without changing lesson logic.

Each lesson video supports:

- Play
- Pause
- Resume
- Seek forward
- Seek backward

---

# Multi-Video Lesson Rules

A lesson may contain one or more videos.

Each video has its own Interactive Timeline and activities.

Timeline events and activities belong to the video — not the lesson.

Teachers choose between two modes:

- Sequential Mode: Videos must be completed in order. A video remains locked until the previous video is completed.
- Any-Order Mode: Students may choose which video to watch first.

Lesson completion requires all required videos to be completed.

---

# Interactive Timeline Rules (Per Video)

Interactive Timeline Events are configured at any timestamp in each video.

Each video has its own independent Interactive Timeline.

When playback reaches a configured timeline event:

Video pauses automatically.

The configured activity opens automatically.

For Required activities:

The student cannot bypass that activity.

After completing the activity, the lesson video resumes from the same position.

For Optional activities:

The student may skip the activity.

---

# Interactive Timeline Rules

Timeline events are fully configurable by the teacher.

Teachers can:

- Add events
- Edit events
- Remove events
- Enable events
- Disable events
- Configure events as Required or Optional

Each timeline event is associated with an activity.

Teachers may enable or disable the Interactive Timeline globally.

---

# Activity Engine Rules

All lesson activities are rendered dynamically.

The architecture must support unlimited activity types.

Examples:

- Vocabulary
- Multiple Choice
- True / False
- Matching
- Fill in the Blanks
- Drag & Drop
- Reading
- Story Questions
- Conversation
- Speaking
- Writing
- Paragraph
- Homework
- End Lesson Assessment

The architecture must allow adding new activity types in the future without changing the lesson architecture.

---

# AI Assessment Rules

Activities that require subjective grading are evaluated by the AI Assessment Engine.

Examples:

- Paragraph
- Writing
- Conversation
- Speaking
- Story Questions
- Reading Questions
- Essay
- Email Writing

The AI Assessment Engine is responsible for:

- Scoring
- Grammar correction
- Vocabulary evaluation
- Feedback
- Personalized recommendations

Activities only collect student responses.

The AI Assessment Engine evaluates them.

---

# Homework Rules

Homework belongs to one lesson.

Homework is optional.

Teachers may enable or disable homework.

Homework may contain:

- Multiple Choice
- True / False
- Matching
- Fill in the Blank

Homework can be:

- Automatically graded
- Teacher reviewed

---

# End Lesson Assessment Rules

Every lesson may have one End Lesson Assessment.

The End Lesson Assessment is optional.

Teachers may enable or disable it.

Assessment completion may be required for lesson completion based on teacher configuration.

---

# Vocabulary Rules

Vocabulary belongs to one lesson.

Vocabulary is generated from the uploaded Word document.

Each vocabulary item contains:

- Word
- Pronunciation
- Meaning
- Example

---

# Story Rules

Story lessons are independent from curriculum units.

They follow the same learning flow.

---

# Final Review Rules

Final Review is disabled by default.

Only teachers can enable it.

Students cannot access it before activation.

---

# Learn From Mistakes Rules

Every incorrect answer is automatically stored.

Stored questions remain available until:

- Student answers correctly.
- Teacher removes them.

Students cannot manually delete mistakes.

---

# Educational Games Rules

Games are optional.

Games may reward XP.

Games never unlock lessons.

Games never replace quizzes.

---

# Ask El-bannawy AI Rules

AI answers educational questions only.

AI responses must rely on approved educational content.

AI must never invent educational information.

---

# Live Class Rules

Students book available sessions.

Attendance is recorded automatically.

Teachers may approve or reject bookings.

---

# Communication & Notification Rules

## Centralized Engine

All communication between the platform and students is handled by the Communication & Notification Engine.

The engine must support multiple delivery channels.

Current channels:

- Mobile Push Notifications
- In-App Notifications

Future channels must be supported without redesign:

- Email
- SMS
- WhatsApp
- Browser Push

## Notification Types

Supported notification types:

- Live Lesson Reminder
- Homework Reminder
- Lesson Reminder
- End Lesson Assessment Reminder
- Motivational Messages
- Daily Study Tips
- Achievement Notifications
- Teacher Announcements
- New Lesson Published
- New Homework Available
- Upcoming Live Session
- Weekly Progress Summary

Future notification types must be supportable without changing the engine architecture.

## Teacher Controls

Teachers have complete control over notifications.

Teachers may:

- Enable or Disable notifications
- Send immediately
- Schedule notifications
- Target all students
- Target specific grades
- Target specific classes
- Target individual students

## Student Preferences

Students may manage notification preferences.

Supported preference toggles:

- Lesson Reminders
- Homework Reminders
- Live Session Reminders
- Achievement Notifications
- Motivational Messages
- Study Tips
- Teacher Announcements

Critical notifications cannot be disabled.

---

# Coins Rules

Coins are premium virtual currency.

Coins can be:

- Purchased
- Rewarded

Coins may be used for:

- Lesson Access
- Unit Access
- Full Course Access

Coins NEVER affect rankings.

Coins NEVER increase XP.

---

# XP Rules

XP measures student progress.

XP is earned from:

- Completing Lessons
- Passing Quizzes
- Homework
- Educational Games
- Challenges

XP cannot be:

- Purchased
- Transferred
- Shared

---

# Leaderboard Rules

Leaderboard ranking depends only on:

- XP

Coins have no effect.

---

# Referral Rules

Each student owns one referral link.

Rewards are granted only after successful registration according to referral policy.

Duplicate referrals are prohibited.

---

# Attendance Rules

Attendance is tracked for:

- Live Classes

Attendance affects reports.

Attendance does not affect XP unless documented.

---

# Reports Rules

Reports include:

- Progress
- Attendance
- Quiz Scores
- Homework
- XP
- Coins
- Achievements

Reports may be exported as PDF.

---

# Parent Rules

Parents receive:

- Progress Reports
- Attendance Reports
- Important Notifications

Parents cannot modify student progress.

---

# Security Rules

Every business operation must validate:

- Identity
- Permissions
- Input Data

Never trust client-side validation.

---

# Administrative Rules

Only Administrators may:

- Modify Platform Settings
- Manage Roles
- Configure Integrations
- Manage Security Policies

---

# Future Features

Undocumented future ideas must never be implemented before official documentation.

---

# Final Rule

Business Rules have higher priority than implementation.

Implementation must always follow documented business rules.

End of Document.