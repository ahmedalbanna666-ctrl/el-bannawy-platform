# SIDEBAR_SPECIFICATION.md

# El-bannawy Platform
## Sidebar Specification

Version: 1.0.0

---

# Purpose

Defines the official sidebar behavior.

Desktop Primary Navigation.

Tablet Optional.

Hidden on Mobile.

---

# Width

Expanded

280px

Collapsed

72px

---

# Sections

Top

- Logo

- Search

Middle

- Navigation

Bottom

- Settings

- Help

- Profile

---

# Student Sidebar

Home

My Courses

Vocabulary

Homework

Quizzes

Stories

Live Classes

Games

Leaderboard

Achievements

Ask El-bannawy AI

Learn From Mistakes

Support

Profile

---

# Teacher Sidebar

Dashboard

Students

Lessons

Homework

Quizzes

Videos

Reports

Live Classes

AI

Settings

---

# Administrator Sidebar

Dashboard

Users

Payments

Analytics

Reports

Content

Notifications

Audit Logs

Monitoring

System Health

Settings

## Role-Based Module Visibility

Student-facing modules are hidden for non-student roles regardless of granted permissions.

Implementation: `NavModule.roles` in `lib/nav-registry.ts`. Modules restricted to `["STUDENT"]` do not appear in the sidebar or dashboard cards for `TEACHER`, `STAFF`, `SUPPORT`, `SECRETARY`, or `ADMINISTRATOR`.

Restricted (student-only) modules:

- Ask El-bannawy AI (chat) — management UI lives at `admin/ai` settings/knowledge-base
- Games — management lives at `teacher/games` ("إدارة الألعاب")
- Learn From Mistakes
- Achievements
- Leaderboard
- Saved PDFs
- Shop

Both `getSidebarModules(can, role)` and `getDashboardModules(can, role)` apply this role filter.

---

# Behavior

Collapsible

Desktop Only

Remember Last State

Yes

---

# Accessibility

Keyboard

Supported

ARIA

Required

---

# Performance

Instant Expand

No Layout Shift

---

# Acceptance Criteria

✓ Responsive

✓ Accessible

✓ RTL Ready

✓ Theme Aware

---

# Final Rule

Sidebar provides fast access to platform features without overwhelming users.

End of Document.