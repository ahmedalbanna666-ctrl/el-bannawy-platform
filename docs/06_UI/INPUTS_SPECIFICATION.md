# INPUTS_SPECIFICATION.md

# El-bannawy Platform
## Input Components Specification

Version: 1.0.0

---

# Purpose

This document defines the official Input System used throughout the El-bannawy Platform.

Every form, search field and user input must use the standardized input components defined in this specification.

Custom input implementations are prohibited unless officially approved.

---

# Design Philosophy

Inputs must be:

- Simple
- Fast
- Accessible
- Responsive
- Consistent
- Error Friendly

Users should always understand:

- What to enter
- Why it is needed
- Whether the input is valid

---

# Supported Input Types

Text

Password

Email

Phone

Number

Search

URL

Date

Time

OTP

Textarea

Select

Multi Select

Autocomplete

Checkbox

Radio Button

Switch

Range Slider

Rating

File Upload

Image Upload

Audio Upload

Color Picker

Future Components

---

# Standard Heights

Small

40px

Medium

48px

Large

56px

Textarea

Minimum 120px

Auto Resize

Optional

---

# Width

Default

100%

Maximum

Container Width

Fixed Width

Allowed only when required

---

# Border Radius

Small

8px

Medium

12px

Large

16px

---

# Labels

Every input requires:

Visible Label

Except

Search Bars

When placeholder clearly explains purpose.

Labels remain visible.

Never use placeholders as labels.

---

# Placeholder

Optional

Short

Helpful

Examples

Search lessons...

Enter your email...

Type your question...

---

# Helper Text

Displayed below input.

Examples

Password requirements

Accepted formats

Maximum length

---

# Validation

Supported

Required

Minimum Length

Maximum Length

Pattern

Email

Phone

Password Strength

Custom Rules

Server Validation

---

# Validation States

Default

Focused

Success

Warning

Error

Disabled

Read Only

Loading

---

# Error Messages

Must

Explain the problem

Explain how to fix it

Avoid technical language

Example

Incorrect

Invalid value.

Correct

Please enter a valid email address.

---

# Success Messages

Used sparingly.

Examples

Email verified.

Homework uploaded successfully.

---

# Search Input

Supports

Search Icon

Clear Button

Suggestions

Recent Searches

Voice Search (Future)

---

# Password Input

Supports

Show Password

Hide Password

Strength Indicator

Caps Lock Warning

---

# OTP Input

Supports

Auto Focus

Paste Entire Code

Auto Submit

Resend Timer

---

# File Upload

Supported Types

PDF

Image

Audio

Maximum Size

Defined by API

Supports

Drag & Drop

Browse Files

Upload Progress

Preview

Cancel Upload

Retry Upload

---

# Image Upload

Supports

Crop

Preview

Replace

Delete

Compression

Future

---

# Select Components

Supports

Single Select

Multi Select

Searchable

Grouped Options

Lazy Loading

---

# Checkbox

Minimum Size

20px

Supports

Indeterminate State

Disabled

Validation

---

# Radio Button

Single Choice

Grouped

Keyboard Accessible

---

# Switch

Used only for

Settings

Preferences

Notifications

Never use switches for confirmations.

---

# Accessibility

Minimum Height

44px

Keyboard Accessible

Required

Screen Reader Labels

Required

Focus Ring

Visible

ARIA Support

Required

---

# Mobile Rules

Large Touch Targets

Auto Zoom Prevention

Optimized Keyboard Types

Examples

Email Keyboard

Numeric Keyboard

Phone Keyboard

---

# RTL Support

Arabic

RTL Layout

English

LTR Layout

Automatic Direction Switching

Supported

---

# Animation

Allowed

Fade

Focus Glow

Border Transition

Validation Transition

Forbidden

Bounce

Flash

Shaking

Except critical validation feedback.

---

# Performance

Debounced Search

Memoized Components

Lazy Loaded Dropdowns

Optimized Validation

---

# Naming Convention

TextInput

PasswordInput

SearchInput

EmailInput

PhoneInput

OTPInput

Textarea

SelectInput

Checkbox

RadioGroup

Switch

FileUploader

ImageUploader

---

# Folder Structure

components/

inputs/

TextInput.tsx

PasswordInput.tsx

SearchInput.tsx

EmailInput.tsx

PhoneInput.tsx

OTPInput.tsx

Textarea.tsx

Select.tsx

Checkbox.tsx

RadioGroup.tsx

Switch.tsx

FileUploader.tsx

ImageUploader.tsx

input.types.ts

input.styles.ts

---

# Acceptance Criteria

✓ Responsive

✓ Accessible

✓ RTL Ready

✓ Theme Aware

✓ Validation Supported

✓ Mobile First

✓ Production Ready

---

# Final Rule

Input components are the primary communication channel between users and the platform.

Every input must minimize user effort, prevent errors before submission and provide immediate, meaningful feedback throughout the interaction.

End of Document.