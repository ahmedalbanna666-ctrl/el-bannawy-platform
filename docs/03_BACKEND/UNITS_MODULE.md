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

# Unit Types

Every unit carries a `unitType` discriminator:

- `UNIT` — regular curriculum unit (default)
- `STORY` — the curriculum story (قصة المنهج); its lessons are story chapters
- `FINAL_REVIEW` — the final review (المراجعة النهائية); its lessons are review sections

Students, teachers and administrators browse and manage each type through its own list page (`/dashboard/units`, `/dashboard/stories`, `/dashboard/final-reviews`). Content always stays isolated per unit type.

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

# Certificates

A student receives an automatic Certificate of Achievement (شهادة تقدير) when a unit's progress reaches the percentage threshold configured by the administrator.

Rules:

- Threshold is stored in `system_settings` under key `certificate_threshold` (default `80`).
- The certificate is generated on the student frontend as a PDF (HTML → PNG via html2canvas → PDF via jspdf) and uploaded to the backend for storage.
- Certificates are stored in `unit_certificates` (one per student + unit, idempotent).
- The certificate appears on the completed unit card in the units map (شهادة button).
- Certificates are listed on the Achievements page (الإنجازات) with view + PDF download.
- The uploaded PDF must not exceed `MAX_FILE_SIZE` (5 MB); the frontend embeds a JPEG (quality 0.92) at scale 3.125 to keep the file well under the limit.

Certificate design (v3 — premium international standard):

- English language (CERTIFICATE OF ACHIEVEMENT), optimized for A4 landscape printing at 300 DPI (canvas 3506×2478 px) and CMYK-friendly light backgrounds.
- Colors: premium ivory paper (`#F8F4E8` primary / `#FFFDF9` secondary) with a soft radial gradient, deep navy text (`#102A5A`), and gold accent (`#C8A95B`) used only for borders, icons, decorations, lines, and the seal. No saturated yellow, no dark backgrounds, no cyan.
- Background: very subtle paper texture, faint geometric pattern, soft gold wave lines top/bottom, and an almost invisible watermark (huge transparent AB logo at 4% opacity, no blur) behind the student name.
- Double gold border (outer 1.5px, inner 1px) with small classic ornaments in the four corners only.
- Fonts (maximum three): Cinzel (serif — platform name, title, student name, seal, serial capsule), Inter (sans — labels, recognition text, metadata), Great Vibes (signature — founder signature). Loaded from Google Fonts.
- Header: enlarged logo (86px, +~15%) with breathing space, "EL-BANNAWY PLATFORM" in wide-tracked navy Cinzel, "AI-POWERED ENGLISH LEARNING" in small light gray-gold, then "CERTIFICATE OF ACHIEVEMENT" reduced ~10% in elegant gold serif.
- Student area: "PROUDLY PRESENTED TO", the student name in large navy serif with decorative gold dividers above and below, then "in recognition of outstanding dedication and successful completion of".
- Course information: course name (e.g. "English Language") and "UNIT N" on two separate lines — never duplicating names.
- Result cards: thin gold border, rounded corners, light ivory fill, small gold line icons (✓ for Completion, trophy for Result), no heavy shadows.
- Information row (one elegant row): Issue Date, Academic Year, Course, Grade, Stage — equal spacing with small premium gold icons.
- Verification seal: circular gold-metallic embossed seal centered with "EL-BANNAWY / VERIFIED / AI POWERED".
- QR section: QR code, "SCAN TO VERIFY", and "verify.el-bannawy.com" centered below.
- Certificate ID: placed in a premium rounded gold capsule (official serial look).
- Signature: "Mr. Ahmed El-Banna" in Great Vibes script with thinner line and "FOUNDER & CEO" below.
- Student name: uses the student's English name (`englishName`) from the profile; falls back to the Arabic name (`fullName`) when no English name is set.
- Shows: course, unit number, completion percentage, derived grade label, stage, grade, academic year, and issue date.
- Grade label is derived from the completion percentage: `Excellent` ≥ 90, `Very Good` ≥ 80, `Good` ≥ 70, `Pass` ≥ 60, otherwise `Needs Improvement`.
- Includes the signature block, the gold verification seal, the certificate ID capsule, and a QR code linking to the public verification page.

Verification:

- Every issued certificate receives a unique verification code (`EB-XXXX-XXXX`, e.g. `EB-8KF2-MXQ4`) stored in `unit_certificates.verificationCode` (`@unique`, `VARCHAR(32)`).
- The QR code encodes the public URL `<site>/certificates/verify/<code>`.
- Public endpoint (no authentication): `GET /certificates/verify/:code` → returns the certificate details when valid, otherwise a `verified: false` payload. No student personal data is exposed beyond the display name.
- Public web page `apps/web/src/app/certificates/verify/[code]/page.tsx` renders the verification result.
- The backend list/eligible endpoints enrich the payload with `gradeLabel`, `stageName`, `gradeName`, `termName`, `academicYearName`, and `courseName` used by the certificate template.

Display:

- Unit Card badge
- Certificate modal
- Achievements page section
- Public verification page (QR)

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