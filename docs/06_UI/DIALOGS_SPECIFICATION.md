# DIALOGS_SPECIFICATION.md

# El-bannawy Platform
## Dialogs Specification

Version: 1.0.0

---

# Purpose

This document defines all dialog components used throughout the platform.

Dialogs interrupt the current workflow only when user confirmation or immediate attention is required.

---

# Design Philosophy

Dialogs must be:

- Minimal
- Focused
- Accessible
- Non-intrusive
- Easy to dismiss

---

# Dialog Types

Confirmation Dialog

Delete Dialog

Success Dialog

Error Dialog

Warning Dialog

Information Dialog

Session Timeout Dialog

Permission Dialog

---

# Standard Layout

Header

↓

Body

↓

Actions

---

# Header

Contains

- Title
- Close Button (Optional)

---

# Body

Contains

- Description
- Optional Icon
- Optional Additional Information

---

# Footer

Primary Button

Secondary Button

Danger Button (If Needed)

---

# Sizes

Small

400px

Medium

600px

Large

800px

Fullscreen

Mobile Only

---

# Closing Rules

Escape Key

Supported

Backdrop Click

Optional

Critical Dialogs

Cannot close without explicit action

---

# Accessibility

Focus Trap

Required

Keyboard Navigation

Required

ARIA Labels

Required

---

# Animation

Fade

Scale

Duration

200ms

---

# Acceptance Criteria

✓ Accessible

✓ Responsive

✓ Theme Aware

✓ RTL Ready

---

# Final Rule

Dialogs should interrupt users only when absolutely necessary.

End of Document.