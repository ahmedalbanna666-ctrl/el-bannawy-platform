# BUTTONS_SPECIFICATION.md

# El-bannawy Platform
## Buttons Design Specification

Version: 1.0.0

---

# Purpose

This document defines the official Button System used throughout the El-bannawy Platform.

Buttons are the primary interaction mechanism between users and the platform.

Every clickable action must use an official button component.

---

# Design Philosophy

Buttons must be:

- Clear
- Consistent
- Accessible
- Responsive
- Fast
- Touch Friendly

Buttons should communicate priority through appearance.

---

# Button Hierarchy

Level 1

Primary Button

Highest Priority

---

Level 2

Secondary Button

Medium Priority

---

Level 3

Outline Button

Supporting Actions

---

Level 4

Ghost Button

Low Emphasis

---

Level 5

Text Button

Inline Actions

---

Level 6

Icon Button

Compact Actions

---

Level 7

Floating Action Button

Special Mobile Actions

Used Sparingly

---

# Supported Variants

Primary

Secondary

Outline

Ghost

Danger

Success

Warning

Info

Link

Icon

Floating

Loading

Disabled

---

# Sizes

Extra Small

32px

Small

40px

Medium

48px

Large

56px

Extra Large

64px

---

# Width Rules

Auto

Preferred

Full Width

Forms

Authentication

Checkout

Responsive Pages

Minimum Width

120px

---

# Border Radius

Small

8px

Medium

12px

Large

16px

Pill

999px

---

# Icons

Supported

Left Icon

Right Icon

Icon Only

Loading Icon

Icons

20px

Default

---

# States

Every button supports

Default

Hover

Focused

Pressed

Disabled

Loading

Success

Error

---

# Loading State

Disable Click

Show Spinner

Keep Width Fixed

Prevent Layout Shift

---

# Disabled State

Reduced Opacity

No Hover

No Pointer Events

Accessible Label Required

---

# Colors

Primary

Brand Color

Secondary

Neutral

Success

Green

Danger

Red

Warning

Orange

Info

Blue

Ghost

Transparent

---

# Typography

Font

Inter

Arabic

Cairo

Weight

600

Minimum Size

14px

Maximum Size

16px

---

# Padding

Horizontal

16px

24px

Vertical

12px

16px

---

# Elevation

Primary

Medium Shadow

Secondary

Light Shadow

Ghost

No Shadow

Danger

Medium Shadow

Floating Button

Large Shadow

---

# Interaction Rules

Hover

Increase Elevation

Pressed

Reduce Elevation

Focused

Visible Focus Ring

Loading

Disable Interaction

---

# Accessibility

Minimum Height

44px

Keyboard Navigation

Required

ARIA Labels

Required

Visible Focus Ring

Required

---

# Mobile Rules

Touch Friendly

Minimum Height

48px

Full Width Buttons

Preferred inside forms

Floating Button

Bottom Right

---

# Usage Guidelines

Primary Button

One per screen whenever possible.

Examples

- Login

- Continue

- Submit

- Save

---

Secondary Button

Supporting actions.

Examples

- Cancel

- Preview

- Retry

---

Danger Button

Only for destructive actions.

Examples

- Delete

- Remove

- Reset

Confirmation dialog required.

---

Success Button

Used after achievements.

Examples

- Claim Reward

- Continue Learning

---

Floating Button

Allowed only when it provides clear value.

Examples

- Ask El-bannawy AI

- Quick Support

Never more than one floating button per screen.

---

# Animation

Allowed

Fade

Scale

Elevation

Ripple

Duration

150–250ms

Forbidden

Bounce

Flash

Infinite Pulse

---

# Performance

Memoized

Yes

Tree Shake

Required

Reusable

Required

---

# Naming Convention

Button

PrimaryButton

SecondaryButton

GhostButton

DangerButton

IconButton

FloatingButton

LoadingButton

---

# File Structure

components/

buttons/

Button.tsx

PrimaryButton.tsx

SecondaryButton.tsx

GhostButton.tsx

DangerButton.tsx

IconButton.tsx

FloatingButton.tsx

LoadingButton.tsx

button.types.ts

button.styles.ts

---

# Acceptance Criteria

✓ Responsive

✓ Accessible

✓ Mobile First

✓ Theme Aware

✓ RTL Ready

✓ Loading State

✓ Keyboard Accessible

✓ Production Ready

---

# Final Rule

Buttons guide user actions.

Every button must clearly communicate its importance, provide immediate visual feedback and remain fully accessible across all supported devices and themes.

End of Document.