# COMPONENTS_SYSTEM.md

# El-bannawy Platform
## UI Components System

Version: 1.0.0

---

# Purpose

This document defines every reusable UI component used throughout the El-bannawy Platform.

All screens must be built using these shared components.

Creating custom components without approval is prohibited.

---

# Design Philosophy

Components must be:

- Reusable
- Accessible
- Responsive
- Performant
- Consistent
- Theme Aware

Every component must support:

✓ Dark Mode

✓ Light Mode

✓ RTL

✓ Mobile First

---

# Component Architecture

Application

↓

Layout Components

↓

Page Components

↓

Shared Components

↓

Primitive Components

---

# Component Categories

1.

Buttons

2.

Inputs

3.

Cards

4.

Navigation

5.

Feedback

6.

Data Display

7.

Media

8.

Dialogs

9.

AI Components

10.

Educational Components

---

# Buttons

Supported

Primary

Secondary

Ghost

Danger

Success

Outline

Icon Button

Loading Button

Every button supports

Hover

Focus

Disabled

Loading

Pressed

---

# Inputs

Supported

Text

Password

Search

Email

Phone

Number

OTP

Textarea

Select

Autocomplete

Date Picker

File Upload

Every input supports

Validation

Helper Text

Error Message

Success State

---

# Cards

Dashboard Card

Lesson Card

Unit Card

Story Card

Homework Card

Quiz Card

Video Card

AI Card

Live Card

Achievement Card

Statistics Card

Cards must never contain business logic.

---

# Navigation

Sidebar

Header

Bottom Navigation

Breadcrumb

Tabs

Pagination

Stepper

Navigation Drawer

---

# Feedback

Toast

Snackbar

Alert

Banner

Tooltip

Loading Spinner

Skeleton

Progress Bar

Circular Progress

---

# Data Display

Table

Data Grid

List

Timeline

Badge

Chip

Avatar

Tag

Accordion

Statistics Widget

---

# Media

Image

Avatar

Video Player

Audio Player

PDF Viewer

File Preview

Thumbnail

---

# Dialogs

Confirmation Dialog

Delete Dialog

Image Preview

File Preview

Success Dialog

Error Dialog

Modal

Bottom Sheet

---

# AI Components

AI Chat Bubble

AI Message

Typing Indicator

Prompt Suggestions

AI Thinking

Conversation List

Source References

---

# Educational Components

Lesson Progress

Vocabulary Card

Homework Question

Quiz Question

XP Progress

Coins Balance

Learning Streak

Mistake Card

Review Card

Flashcard

---

# Live Components

Live Countdown

Attendance Badge

Join Button

Schedule Card

Live Status

Meeting Card

---

# Reports

Charts

Statistics Cards

KPI Cards

Export Button

Filter Panel

---

# States

Every component supports

Default

Hover

Focused

Pressed

Disabled

Loading

Empty

Error

Success

---

# Accessibility

Every component must support

Keyboard Navigation

Screen Readers

Focus Ring

ARIA Labels

Touch Targets

Minimum Touch Size

44px

---

# Responsiveness

Every component must support

Mobile

Tablet

Desktop

No desktop-only components.

---

# Animation

Allowed

Fade

Slide

Scale

Opacity

Progress

Forbidden

Flash

Bounce

Infinite Animation

Unless explicitly required.

---

# Performance

Lazy Load

Heavy Components

Memoization

Required

Virtualization

Large Lists

Code Splitting

Required

---

# Naming Convention

Examples

Button

ButtonPrimary

LessonCard

VideoPlayer

AIChat

XPBadge

HomeworkQuestion

QuizCard

Component names must be PascalCase.

---

# Folder Structure

components/

shared/

buttons/

cards/

inputs/

navigation/

feedback/

education/

ai/

reports/

layout/

---

# Acceptance Criteria

✓ Reusable

✓ Responsive

✓ Accessible

✓ RTL Ready

✓ Theme Aware

✓ Mobile First

✓ Production Ready

---

# Final Rule

Every UI element in the El-bannawy Platform must be built from the official Component System.

Screens assemble components.

Components must never be duplicated or redesigned independently.

End of Document.