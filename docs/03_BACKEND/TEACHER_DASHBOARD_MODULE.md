# TEACHER_DASHBOARD_MODULE.md

# El-bannawy Platform
## Teacher Dashboard Requirements

Version: 1.0.0

---

# Purpose

The Teacher Dashboard is the operational center for teachers inside the El-bannawy Platform.

It enables teachers to create educational content, manage students, monitor learning progress, schedule live classes, analyze performance, and communicate with students efficiently.

The dashboard is designed to minimize administrative work and maximize teaching efficiency.

---

# Objectives

The Teacher Dashboard must:

- Manage educational content.
- Track student progress.
- Monitor homework.
- Monitor quizzes.
- Schedule live classes.
- Analyze student performance.
- Communicate with students.
- Generate reports.

---

# Supported Users

Primary User

- Teacher

Administrator

- Full Access

---

# Dashboard Home

Display:

- Today's Classes
- Upcoming Live Sessions
- Students Online
- Homework Waiting for Review
- Recent Quiz Results
- Student Progress
- Platform Announcements
- Weekly Statistics

---

# Main Navigation

Dashboard

↓

Students

↓

Units

↓

Lessons

↓

Story

↓

Final Review

↓

Live Classes

↓

Reports

↓

Analytics

↓

Notifications

↓

Profile

---

# Student Management

Teachers can:

- View Students
- Search Students
- Filter Students
- View Student Reports
- View Progress
- View Attendance
- View Homework
- View Quiz Results
- View XP
- View Coins (Read Only)

Teachers cannot:

- Delete Students
- Change Student Grade
- Change Student Stage

---

# Units Management

Teachers can:

- Create Units
- Edit Units
- Hide Units
- Publish Units
- Reorder Units

Teachers cannot permanently delete published educational records without permission.

---

# Lesson Management

Teachers can:

- Create Lessons
- Edit Lessons
- Publish Lessons
- Unpublish Lessons
- Archive Lessons
- Configure Lesson Order
- Provide YouTube Unlisted URLs (one or more per lesson)
- Upload Lesson Word Document

Lesson creation requires only:

1. Provide YouTube Unlisted URLs (one or more per lesson)
2. Upload Microsoft Word Document

The platform does NOT upload or store lesson video files.

The platform automatically validates the YouTube URLs, extracts the Video IDs, and retrieves metadata.

The system automatically converts the Word document into structured lesson content.

Teachers do not manually create activities inside the dashboard.

---

# Lesson Settings

Teachers control:

- YouTube Lesson URLs (one or more per lesson)
- Free / Premium
- Published / Hidden
- Activities Enabled / Disabled (per video)
- Homework Enabled / Disabled
- End Lesson Assessment Enabled / Disabled
- Interactive Timeline Enabled / Disabled (per video)
- Sequential Mode / Any-Order Mode

All lesson behavior is configurable from the Teacher Dashboard.

---

# Lesson Completion Rules

Teachers configure:

Required for completion:

- Watching all lesson videos
- Completing required activities (per video)
- Completing homework (if enabled)
- Passing the End Lesson Assessment (if enabled)

Additional Controls:

- Passing score
- Retry limit
- Unlock behavior
- Required / Optional activity configuration

---

# Lesson Unlock Rules

Teachers configure:

The next lesson remains locked until all configured completion requirements are satisfied.

---

# Interactive Timeline Management (Per Video)

Teachers can configure timeline events at any timestamp in each lesson video.

Each video has its own independent Interactive Timeline.

Each timeline event contains:

- Timestamp
- Associated Activity
- Enabled / Disabled
- Required / Optional
- Video ID (owner)

Teachers can configure per video:

- Add events
- Edit events
- Remove events
- Enable events
- Disable events
- Configure events as Required or Optional

Required timeline events cause the video to auto-pause and open the configured activity.

Students cannot bypass required activities.

Optional activities may be skipped.

Teachers may enable or disable the Interactive Timeline per video.

---

# Vocabulary Management

Vocabulary is automatically generated from the uploaded Word document.

Teachers can view auto-generated vocabulary.

Teachers can:

- Edit Words
- Upload Pronunciation Audio
- Upload Images
- Reorder Vocabulary
- Delete Vocabulary

Teachers cannot manually add words.

---

# Homework Management

Homework is optional.

Teachers can:

- Enable Homework
- Disable Homework
- Configure Attempts
- Configure Passing Score
- Review Manual Answers

Homework is auto-generated from the Word document when enabled.

---

# End Lesson Assessment Management

End Lesson Assessment is optional.

Teachers can:

- Enable End Lesson Assessment
- Disable End Lesson Assessment
- Configure Passing Score
- Configure XP Rewards
- Configure Retry Limit

---

# Story Management

Teachers can:

- Create Story Chapters
- Create Story Lessons
- Provide Story YouTube URLs (one or more per lesson)
- Create Story Homework
- Create Story Quiz

---

# Final Review Management

Teachers can:

- Enable Final Review
- Disable Final Review
- Create Review Lessons
- Upload Review PDFs
- Create Final Exams

---

# Live Class Management

Teachers can:

- Create Live Sessions
- Edit Sessions
- Cancel Sessions
- Publish Sessions
- Monitor Attendance
- Download Attendance Reports

---

# Student Analytics

Teachers can view:

- Lesson Completion
- Homework Completion
- Quiz Performance
- Attendance Rate
- Learning Time
- XP Progress
- Weak Lessons
- Common Mistakes

---

# Learn From Mistakes Analytics

Teachers can identify:

- Frequently Missed Questions
- Difficult Lessons
- Weak Vocabulary
- Grammar Weaknesses

Individual student answers remain protected according to privacy rules.

---

# Reports

Teachers may generate:

- Student Progress Report
- Homework Report
- Quiz Report
- Attendance Report
- Class Performance Report
- Final Review Report

Reports support:

- PDF
- Excel

---

# Communication & Notification Engine

The Notification Engine is centralized and handles all communication between the platform and students.

Teachers have complete control over notifications.

Teachers can:

- Enable or Disable notifications
- Send immediately
- Schedule notifications
- Target all students
- Target specific grades
- Target specific classes
- Target individual students

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

Delivery Channels:

- Mobile Push Notifications
- In-App Notifications

Future channels are supported without redesign:

- Email
- SMS
- WhatsApp
- Browser Push

Notifications are limited to assigned students.

---

# Search

Teachers may search:

- Students
- Lessons
- Units
- Homework
- Quizzes

Search should return results instantly.

---

# Filters

Supported Filters

- Grade
- Unit
- Lesson
- Class
- Date
- Completion Status

---

# Performance

Dashboard Loading

Less than 2 seconds.

Analytics should load asynchronously.

---

# Security

Teachers may access only:

- Assigned Students
- Assigned Grades
- Assigned Educational Content

All actions must be authenticated.

Sensitive actions must be logged.

---

# Audit Logs

Record:

- Lesson Creation
- Lesson Editing
- Video URL Updated
- Document Uploaded
- Lesson Settings Updated
- Completion Rules Updated
- Unlock Rules Updated
- Timeline Event Created
- Timeline Event Edited
- Timeline Event Deleted
- Notification Sent
- Notification Scheduled
- Live Session Creation
- Final Review Activation

Logs cannot be modified.

---

# Future Enhancements

Future Versions

- AI Teaching Assistant
- AI Lesson Generator
- AI Homework Generator
- AI Quiz Generator
- AI Weak Student Detection
- AI Classroom Insights
- AI Attendance Prediction

---

# Acceptance Criteria

The Teacher Dashboard is complete when:

✓ Student management works.

✓ Unit management works.

✓ Lesson management works.

✓ YouTube URL validation works (per video).

✓ Video ID extraction works (per video).

✓ Video metadata retrieval works (per video).

✓ Lesson Word Document upload works.

✓ System generates activities from Word document.

✓ Lesson Settings (YouTube URLs, Free/Premium, Published/Hidden, Sequential/Any-Order) work.

✓ Multiple videos per lesson work.

✓ Video add, remove, reorder, enable/disable work.

✓ Activity enable/disable works (per video).

✓ Homework enable/disable works.

✓ End Lesson Assessment enable/disable works.

✓ Interactive Timeline management works.

✓ Required/Optional activity configuration works.

✓ Timeline events pause video and open activities.

✓ Lesson Completion Rules work.

✓ Lesson Unlock Rules work.

✓ Notification Engine works (send, schedule, target).

✓ Notification delivery channels work.

✓ Student notification preferences work.

✓ Story management works.

✓ Final Review management works.

✓ Live Classes management works.

✓ Reports work.

✓ Analytics work.

✓ Responsive design works.

---

# Final Rule

The Teacher Dashboard should empower teachers to focus on teaching rather than administration.

Every tool should reduce workload while improving educational quality.

End of Document.