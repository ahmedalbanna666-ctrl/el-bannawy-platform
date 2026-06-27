# UI_RULES.md

# El-bannawy Platform
## UI / UX Design Standards

Version: 1.0.0

---

# Purpose

This document defines the mandatory UI and UX standards for the El-bannawy Platform.

Every screen must follow these rules.

No exceptions.

---

# Design Philosophy

The platform must feel like:

- Premium
- Modern
- Fast
- Interactive
- Educational
- Gamified

It must NEVER look like:

- Traditional LMS
- School Management System
- Government Website
- Outdated Dashboard

---

# Design Principles

Every interface should be:

- Simple
- Consistent
- Clean
- Responsive
- Accessible

---

# Design Language

The entire platform follows one unified Design System.

Never invent new components.

Never invent new colors.

Never invent new spacing.

Everything must follow the Design System.

---

# Mobile First

Every screen must be designed for mobile first.

Then scale to:

- Tablet
- Laptop
- Desktop

Never start from Desktop.

---

# Responsive Rules

Support:

- Mobile
- Tablet
- Laptop
- Desktop
- Ultra Wide

No horizontal scrolling.

---

# RTL Support

Arabic is the primary language.

RTL is mandatory.

Every component must support:

- RTL
- LTR

without duplication.

---

# Dark Mode

Dark Mode is the default experience.

Every component must support:

- Dark
- Light

Never create a component that works in one theme only.

---

# Layout Rules

Every page consists of:

Header

↓

Content

↓

Bottom Navigation (Mobile)

↓

Sidebar (Desktop)

Never break this structure.

---

# Navigation Rules

Bottom Navigation contains only:

- Home
- Units
- Live
- Ask El-bannawy AI
- Genius

Do not add extra items.

---

# Sidebar Rules

Sidebar contains secondary actions only.

Examples

- Profile
- Achievements
- Support
- Settings
- Learn From Mistakes

Never duplicate Bottom Navigation.

---

# Cards

Cards are the primary UI element.

Every card must have:

- Border Radius
- Consistent Padding
- Hover State
- Active State
- Loading State
- Disabled State

---

# Buttons

Buttons must support:

Primary

Secondary

Outline

Danger

Success

Ghost

Icon Button

Never invent new button styles.

---

# Icons

Use one icon library only.

Lucide Icons.

Never mix icon libraries.

---

# Typography

Use one font family across the project.

Typography hierarchy:

Display

Heading

Title

Subtitle

Body

Caption

Label

Never create random font sizes.

---

# Colors

Use semantic colors only.

Primary

Secondary

Success

Warning

Danger

Info

Never hardcode colors.

Always use Design Tokens.

---

# Spacing

Use an 8px spacing system.

Examples

8

16

24

32

40

48

Never use random spacing.

---

# Animations

Animations should be:

Fast

Natural

Purposeful

Avoid excessive animations.

Animation duration:

150ms

250ms

300ms

Maximum.

---

# Loading States

Every async action must have:

Loading

Success

Error

Empty

States.

Never leave blank screens.

---

# Empty States

Every module must provide an Empty State.

Include:

- Illustration
- Message
- Action Button

---

# Error States

Every page must gracefully handle errors.

Never crash the UI.

---

# Forms

Every form must include:

Validation

Helper Text

Error Messages

Loading State

Success Feedback

---

# Inputs

Every input must support:

Focus

Hover

Error

Disabled

Readonly

Loading

---

# Accessibility

Every interactive element must support:

Keyboard Navigation

Screen Readers

Focus Visibility

Color Contrast

---

# Video Player

Interactive Videos are the center of the lesson page.

A lesson may contain one or more videos, each with its own timeline events and activities.

Rules:

Students cannot skip mandatory questions per video.

Students cannot fast-forward before answering.

Playback resumes only after the correct answer.

---

# Lesson Page Layout

Lesson Page contains:

Video 1 (timeline events + activities)

↓

Video 2 (timeline events + activities)

↓

Video N (timeline events + activities)

↓

Homework (if enabled)

↓

End Lesson Assessment (if enabled)

In Sequential Mode: videos must be completed in order.

In Any-Order Mode: students choose which video to watch.

Never change this order.

---

# Gamification

Gamification should feel rewarding.

Always display:

XP

Achievements

Progress

Completion

Rewards

---

# Home Screen

Priority order:

1. Ask El-bannawy AI

2. Book Live Class

3. Continue Learning

4. Units

5. Story

6. Final Review

7. Learn From Mistakes

8. Educational Games

Never reorder without documentation approval.

---

# Performance

Avoid:

Heavy Shadows

Heavy Blur

Large Images

Large Animations

Unnecessary Re-renders

---

# Component Rules

Components must be:

Reusable

Independent

Configurable

Documented

Never duplicate components.

---

# Final Rule

Consistency is more important than creativity.

Every screen in El-bannawy must look like it belongs to the same product.

End of Document.