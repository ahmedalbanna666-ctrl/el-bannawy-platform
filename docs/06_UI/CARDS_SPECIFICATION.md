# CARDS_SPECIFICATION.md

# El-bannawy Platform
## Cards Specification

Version: 1.0.0

---

# Purpose

This document defines the official Card System used throughout the El-bannawy Platform.

Cards are the primary containers for displaying educational content, statistics, actions and interactive elements.

Every content block must be represented using standardized card components.

---

# Design Philosophy

Cards must be:

- Clean
- Modern
- Interactive
- Responsive
- Accessible
- Reusable

Cards should guide the student's attention without overwhelming the interface.

---

# Card Categories

Educational Cards

Dashboard Cards

Interactive Cards

Statistics Cards

Media Cards

Administrative Cards

System Cards

AI Cards

---

# Supported Cards

Lesson Card

Unit Card

Video Card

Homework Card

Quiz Card

Vocabulary Card

Story Card

Review Card

AI Card

Live Class Card

XP Card

Coins Card

Achievement Card

Leaderboard Card

Statistics Card

Teacher Card

Student Card

Notification Card

Report Card

Payment Card

Subscription Card

---

# Card Structure

Header

↓

Content

↓

Actions

↓

Footer

Each section is optional except Content.

---

# Card Sizes

Extra Small

120px

Small

180px

Medium

240px

Large

320px

Flexible Height

Preferred

---

# Border Radius

Default

24px

Compact

16px

Large

32px

---

# Padding

Internal

20px

Header

20px

Footer

16px

---

# Elevation

Default

Soft Shadow

Hover

Medium Shadow

Active

Large Shadow

Glass Cards

Glow Shadow

---

# Card Variants

Default

Outlined

Elevated

Glass

Gradient

Compact

Interactive

Featured

Premium

---

# Interactive States

Default

Hover

Focused

Pressed

Disabled

Loading

Selected

Completed

Locked

---

# Educational Cards

Lesson Card

Displays

- Lesson Name

- Duration

- Progress

- Completion Status

- Start Button

---

Unit Card

Displays

- Unit Name

- Lesson Count

- Progress

- XP Reward

---

Vocabulary Card

Displays

- Word

- Pronunciation

- Meaning

- Audio Button

- Favorite Button

---

Homework Card

Displays

- Homework Status

- Due Date

- Submission Button

---

Quiz Card

Displays

- Question Count

- Time Limit

- Difficulty

- Start Quiz

---

Story Card

Displays

- Story Title

- Reading Time

- Progress

---

# Dashboard Cards

Statistics

KPI

Progress

Today's Lesson

Recent Activity

Learning Streak

Upcoming Live Class

Quick Actions

---

# AI Cards

Conversation Preview

Suggested Question

AI Recommendation

Learning Tips

Mistake Analysis

---

# Live Class Card

Displays

- Teacher

- Date

- Time

- Remaining Seats

- Join Button

- Countdown

---

# XP Card

Displays

- Current XP

- Next Level

- Progress Bar

- Level Badge

---

# Achievement Card

Displays

- Achievement Icon

- Name

- Description

- Unlock Date

---

# Payment Card

Displays

- Product

- Price

- Status

- Invoice

---

# Card Actions

Primary Action

Secondary Action

Context Menu

Favorite

Share

Download

Delete

---

# Loading State

Skeleton Card

Maintain Dimensions

No Layout Shift

---

# Empty State

Illustration

Title

Description

Primary Action

---

# Error State

Friendly Message

Retry Button

Help Link

---

# Responsive Rules

Mobile

One Card Per Row

Tablet

Two Cards

Desktop

Three to Four Cards

Adaptive Width

---

# Accessibility

Keyboard Navigation

Required

ARIA Labels

Required

Touch Target

44px Minimum

Focus Ring

Visible

---

# Animation

Allowed

Fade

Scale

Elevation

Glow

Progress

Duration

150–250ms

Forbidden

Bounce

Flash

Continuous Motion

---

# Performance

Lazy Rendering

Required

Memoization

Required

Virtualization

Large Lists

Image Lazy Loading

Required

---

# Naming Convention

LessonCard

UnitCard

VideoCard

HomeworkCard

QuizCard

VocabularyCard

StoryCard

AIRecommendationCard

XPCard

AchievementCard

PaymentCard

StatisticsCard

---

# Folder Structure

components/

cards/

LessonCard.tsx

UnitCard.tsx

VideoCard.tsx

HomeworkCard.tsx

QuizCard.tsx

VocabularyCard.tsx

StoryCard.tsx

LiveClassCard.tsx

XPCard.tsx

AchievementCard.tsx

PaymentCard.tsx

StatisticsCard.tsx

card.types.ts

card.styles.ts

---

# Acceptance Criteria

✓ Responsive

✓ Accessible

✓ Theme Aware

✓ RTL Ready

✓ Interactive

✓ Mobile First

✓ Reusable

✓ Production Ready

---

# Final Rule

Cards are the primary visual building blocks of the El-bannawy Platform.

Every card must communicate information clearly, encourage interaction and maintain complete visual consistency across all platform modules.

End of Document.