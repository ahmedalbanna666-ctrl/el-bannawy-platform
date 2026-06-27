# UNITS_MODULE.md

# El-bannawy Platform
## Curriculum Units Module Requirements

Version: 1.0.0

---

# Purpose

The Units Module is responsible for organizing the educational curriculum into structured learning paths.

It provides students with a clear visual roadmap showing their current position, completed units, locked units and future progress.

This module represents the primary navigation point for educational content.

---

# Objectives

The Units Module must:

- Organize curriculum content.
- Visualize learning progress.
- Encourage sequential learning.
- Increase student motivation.
- Prevent skipping educational content.

---

# Supported Users

Primary User

- Student

Management Users

- Teacher
- Administrator

---

# Navigation Flow

Home

↓

Curriculum Units

↓

Unit Details

↓

Lessons

↓

Lesson Page

---

# Layout

The Units page displays all curriculum units using a Gamified Zigzag Path.

The path should resemble a game map instead of a traditional list.

Students should feel they are progressing through levels.

---

# Unit Card

Each Unit Card contains:

- Unit Number
- Unit Name
- Unit Thumbnail
- Progress Percentage
- Total Lessons
- Completed Lessons
- Status
- Estimated Duration

---

# Unit Status

Each unit must have one status only.

Possible statuses:

- Locked
- Current
- Completed

---

# Locked Unit

Characteristics:

- Dimmed appearance
- Lock icon
- Non-clickable

Students cannot access locked units.

---

# Current Unit

Characteristics:

- Highlighted
- Animated
- Active Button
- Progress Ring

Only one Current Unit exists.

---

# Completed Unit

Characteristics:

- Check Icon
- Green Status
- Completion Badge

Completed units remain accessible.

---

# Progress Calculation

Progress is based on:

Completed Lessons

÷

Total Lessons

×

100

Progress updates automatically.

---

# Lesson Count

Each Unit displays:

- Total Lessons
- Completed Lessons
- Remaining Lessons

---

# Unit Completion

A Unit is completed when:

Every Lesson inside the Unit is completed.

Completion requires:

- Interactive Video
- Homework
- Lesson Quiz

---

# Unlock Rules

Students cannot unlock units manually.

A new unit becomes available automatically after completing the previous unit.

Teachers may manually unlock units.

---

# Unit Details

Selecting a Unit opens:

- Unit Header
- Unit Description
- Lesson List
- Unit Progress
- Estimated Study Time

---

# Lesson List

Lessons display:

- Lesson Name
- Completion Status
- Locked Status
- Estimated Duration

---

# Continue Learning

If the current lesson belongs to a unit,

Continue Learning opens that lesson directly.

---

# Visual Indicators

Each Unit displays:

- Progress Ring
- Completion Badge
- Lock Badge
- Current Indicator

---

# Gamification

Completing a Unit rewards:

- XP
- Achievement Badge
- Progress Update

Coins are never awarded automatically unless documented.

---

# Search

Students may search units by:

- Unit Number
- Unit Name

---

# Filters

Future versions may include:

- Completed
- Current
- Locked

Not included in Version 1.

---

# Empty State

If no units exist:

Display:

No curriculum has been assigned yet.

---

# Error State

Display a friendly message.

Provide Retry Button.

---

# Loading State

Use Skeleton Loading.

Never display empty white screens.

---

# Performance

The Units page should load in less than two seconds.

Progress should be calculated efficiently.

---

# Security

Students may only access units assigned to their grade.

Cross-grade access is prohibited.

---

# Teacher Permissions

Teachers may:

- Create Units
- Edit Units
- Delete Units
- Reorder Units
- Lock Units
- Unlock Units

---

# Administrator Permissions

Administrators may:

- Manage all Units
- Manage ordering
- Configure visibility

---

# Future Enhancements

Potential future additions:

- Unit Difficulty
- Unit Rewards
- AI Recommended Unit
- Weekly Unit Challenge
- Unit Leaderboards

---

# Acceptance Criteria

The Units Module is complete when:

✓ Zigzag path is implemented.

✓ Unit progression works.

✓ Locked units cannot be opened.

✓ Progress updates automatically.

✓ Continue Learning opens the correct lesson.

✓ Responsive layout works.

✓ Gamification indicators work.

✓ Security rules are enforced.

---

# Final Rule

The Units Module must always provide a clear, motivating and game-like learning path.

Students should instantly know:

- Where they are.
- What they completed.
- What comes next.

End of Document.