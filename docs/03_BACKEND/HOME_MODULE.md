# HOME_MODULE.md

# El-bannawy Platform
## Home Module Requirements

Version: 1.0.0

---

# Purpose

The Home Module is the primary landing page after user authentication.

It acts as the student's central dashboard and provides quick access to all important platform features.

The Home Module is the most frequently visited screen in the platform.

---

# Objectives

The Home page must:

- Help students continue learning immediately.
- Display personalized information.
- Minimize navigation.
- Increase daily engagement.
- Promote platform features.
- Encourage consistency.

---

# Target User

Student

Only students access this version of Home.

Teachers, Secretaries and Administrators have different dashboards.

---

# Entry Point

Login

↓

Authentication

↓

Home Dashboard

---

# Home Layout

The Home page contains the following sections in order.

1. Ask El-bannawy AI

2. Book Live Class

3. Continue Learning

4. Curriculum Units

5. Story

6. Final Review

7. Learn From Mistakes

8. Educational Games

This order is mandatory.

---

# Section 1

## Ask El-bannawy AI

Priority:

Highest

Purpose:

Provide instant AI assistance.

Capabilities:

- Ask questions
- Explain lessons
- Explain grammar
- Explain vocabulary
- Solve exercises
- Upload images
- Upload PDF
- Voice interaction

Navigation:

Home

↓

Ask AI

---

# Section 2

## Book Live Class

Purpose

Allow students to reserve live sessions.

Display:

- Next available class
- Available seats
- Teacher
- Date
- Time

Actions:

Book

Cancel

View Schedule

---

# Section 3

## Continue Learning

Purpose

Resume the student's progress.

Display:

- Current Unit
- Current Lesson
- Lesson Progress
- Completion Percentage

Button

Continue Lesson

If no lesson exists

Display

Start Learning

---

# Dynamic Behavior

Continue Learning must always display:

The latest unfinished lesson.

Never display completed lessons.

---

# Section 4

## Curriculum Units

Purpose

Open all curriculum units.

Display:

- Unit Name
- Progress
- Locked Status
- Completed Status

Navigation

Home

↓

Units

---

# Section 5

## Story

Purpose

Open curriculum story.

Display

- Story Progress
- Current Chapter

---

# Section 6

## Final Review

Behavior

Default

Locked

Message

Final Review will become available during the official revision period.

Teachers control visibility.

Students cannot unlock it.

---

# Section 7

## Learn From Mistakes

Purpose

Display incorrect answers.

Display

- Number of mistakes
- Last reviewed
- Progress

Actions

Review

Retry

---

# Section 8

## Educational Games

Purpose

Provide educational entertainment.

Games improve:

- Vocabulary
- Grammar
- Reading
- Listening

Games may award XP.

Games never unlock lessons.

---

# Personalization

The Home page must display personalized content.

Examples

Student Name

Current Grade

Current Unit

Current Lesson

XP

Coins

Achievements

Attendance

Notifications

---

# Daily Reminder

The platform may display one daily reminder.

Examples

Invite a Friend

Complete Today's Lesson

Book Live Class

Continue Learning

Only one reminder should appear at a time.

---

# Notification Badge

Icons may display badges.

Examples

Unread Notifications

Homework

Live Classes

Reports

---

# Performance

The Home page should load in less than two seconds under normal conditions.

Data should be loaded asynchronously.

Skeleton loading is required.

---

# Empty States

If the student has no lessons:

Display

Start Your Learning Journey

If no mistakes exist:

Display

Excellent!
No mistakes yet.

---

# Security

Only authenticated students may access the Home page.

All displayed data must belong to the authenticated user.

---

# Future Enhancements

Potential future additions:

- Daily Challenge
- AI Study Plan
- Learning Streak
- Calendar Widget
- Weekly Goals
- Achievement Showcase

These features are outside Version 1.

---

# Acceptance Criteria

The Home Module is complete when:

✓ Personalized dashboard loads successfully.

✓ Continue Learning works correctly.

✓ AI shortcut is functional.

✓ Live Class booking shortcut works.

✓ Units navigation works.

✓ Story navigation works.

✓ Final Review respects teacher settings.

✓ Learn From Mistakes displays correct data.

✓ Educational Games open successfully.

✓ Mobile and Desktop layouts are fully responsive.

---

# Final Rule

The Home page must always guide the student toward learning.

Entertainment and secondary features must never distract from the primary learning journey.

End of Document.