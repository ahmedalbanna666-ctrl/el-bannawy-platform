# Enterprise UX/UI Master Specification (UXMS)

Version: 1.0.0
Status: ACTIVE — Official UX/UI Reference for all future frontend implementation

Phase: 4 — Enterprise UX/UI Master Specification
Preceded by:
- Phase 1 — Enterprise Project Audit V2
- Phase 2 — Enterprise Remediation Plan
- Phase 3 — Product Master Specification (PMS) — `docs/00_PROJECT_OVERVIEW/PRODUCT_MASTER_SPECIFICATION.md`

Design only. No code, no Figma, no implementation.

Source of truth priority:
1. Product Master Specification (PMS)
2. Business Rules (`docs/00_PROJECT_OVERVIEW/BUSINESS_RULES.md`)
3. Roles & Permissions (`packages/shared/src/permissions/roles.ts`)
4. This UXMS
5. Existing design system docs (`docs/06_UI/*`, `docs/design-system.md`)

---

# 0. Current UI Audit Summary

Before designing anything, the existing implementation was audited. The goal is EVOLUTION, not redesign.

## 0.1 What Already Exists (REUSE — satisfies PMS)

| Area | Current Implementation | Verdict |
|------|------------------------|---------|
| Design tokens | Tailwind v4 `@theme` in `globals.css` — full cyan-primary palette, semantic colors, radius, shadows, z-index, Cairo/Inter fonts | ✅ KEEP |
| Dark mode | `.dark` custom variant + `dark:` classes; deep navy gradient bg `#0b1628→#08111f` with starfield dots + primary glows; glass surfaces | ✅ KEEP |
| RTL | `[dir="rtl"]` custom variant + logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`); Cairo font switch in RTL | ✅ KEEP |
| App shell | `dashboard/layout.tsx`: desktop Sidebar (280px, collapsible→72px) + sticky glass Header + mobile BottomNav + mobile slide-in drawer | ✅ KEEP |
| Navigation | `nav-registry.ts` — 35 registered modules, permission-gated via `getSidebarModules(can)` | ✅ KEEP |
| Component library | `components/ui/` — Button, Card (6 variants), Badge, Input, Select, Textarea, Checkbox, RadioGroup, Switch, Dialog, Table, EmptyState, ErrorState, Skeleton | ✅ KEEP |
| Role-split pages | `dashboard/_components/{admin,teacher,staff,student}-dashboard.tsx` + `units/_components/*-view.tsx` pattern | ✅ KEEP |
| Student dashboard | Progress card, daily goal/streak/XP, grade-not-set warning, Units/Stories/Final-Review cards, 4 quick-tool cards (AI/Live/Mistakes/Games), upcoming live bookings | ✅ KEEP |
| AI chat | `dashboard/ai/page.tsx` — conversation sidebar, mobile drawer, credits pill, context banner, sources chips, typing indicator, empty state | ✅ KEEP (see gaps) |
| Live classes | `dashboard/live/page.tsx` — tabbed student hub (الخدمات dynamic plans / اشتراكاتي / حجوزاتي), teacher studio (`dashboard/live/studio/page.tsx`) tabbed (اليوم / الجدول الأسبوعي / الحصص والطلاب) | ✅ KEEP |
| Header | Greeting, theme toggle, history, notifications dropdown, student stat pills (streak/coins/level/XP/shop), academic context bar | ✅ KEEP |
| Auth | `(auth)/` — login/register/forgot/reset with shared layout | ✅ KEEP |

## 0.2 Audit Findings — UX Inconsistencies To Resolve

| # | Finding | Resolution |
|---|---------|-----------|
| F1 | Bottom-nav active color is **purple** (`text-purple-500`), contradicts brand primary cyan | Unify active state to `primary-500` |
| F2 | Header stat pills mix `streak`/`coins`/`level`/`XP` with inconsistent colors (amber/yellow/primary/purple) | Define canonical stat-pill component with fixed color mapping |
| F3 | `student-dashboard` uses `bg-purple-500` for progress bar; header uses purple for XP; AI is purple gradient | Define semantic "AI brand" = purple ONLY for AI; progress = primary/teal; XP = amber/yellow |
| F4 | Sidebar uses many inline `hover:-translate-x-1` and per-module icon color map (`iconColorMap`) | Keep icon color map (rich, differentiated) but standardize to 8 accent hues from token palette |
| F5 | AI chat input is a raw `<input>` not the `Input` component; no markdown rendering; no copy/retry/feedback; no streaming render | Evolve AI per §9 |
| F6 | Live "احجز حصة" buttons in SubscriptionHero/ServiceCards are inert (no handler) | Wire booking actions per §10 |
| F7 | Mobile app (Expo) has NO design tokens, light-only, English-only, LTR-only, hardcoded colors, inert buttons | Full mobile alignment is Phase 9 (Mobile MVP). This UXMS defines the source system to port |
| F8 | `Avatar` uses external `ui-avatars.com` (privacy + offline risk) | Replace with local initials avatar |
| F9 | Breadcrumbs absent on most pages; pages have ad-hoc "back to home" links | Introduce consistent breadcrumb/back pattern (§3.6) |
| F10 | Global search absent | Define §13 |
| F11 | Teacher bottom nav items route all to `/dashboard/units` with generic labels | Define role-correct bottom nav per §6 |
| F12 | No toast/notification-toast system | Define toast in §4 & §14 |

---

# 1. Design Philosophy

Premium. Minimal. Professional. Enterprise.

Dark Mode First. RTL First. Mobile First. Desktop Optimized.

Glassmorphism on a deep-navy canvas with a turquoise (cyan) brand accent. Fast, accessible, modern, elegant. Never childish.

- Every interaction reduces clicks.
- Every screen has a clear visual hierarchy.
- The product feels like "learning with a teacher", not "using software".
- AI is approachable (friendly, guided) but never a toy.

## 1.1 Design Personality Keywords

Premium, minimal, professional, enterprise, elegant, calm, confident, precise, warm-in-AI, clear hierarchy, high-contrast focus states, refined motion (150–300ms), generous whitespace, glass surfaces, turquoise signature.

## 1.2 Anti-Personality

- Never childish (no oversized mascots, no primary-color candy, no heavy confetti except milestone awards).
- Never cluttered (max 1 primary CTA per view).
- Never flat (depth via glass, subtle shadows, inset highlights).
- Never inconsistent (tokens only, no hardcoded colors).

---

# 2. Design Principles

Every decision below derives from the PMS. No decision may violate the PMS.

| # | Principle | Source (PMS) | Application |
|---|-----------|--------------|-------------|
| P1 | Documentation is source of truth | PMS §1.3 | This spec governs all frontend work |
| P2 | Arabic-first RTL | PMS §1.3 | All layouts RTL-first; logical properties everywhere |
| P3 | Dark mode first | PMS §1.3 | Dark is default experience; light fully supported |
| P4 | Mobile first | PMS §1.3 | Bottom nav + drawer on mobile; desktop enriches |
| P5 | Accessibility first | PMS §1.3 | WCAG AA; keyboard; screen readers; focus rings |
| P6 | Design tokens only | PMS §2 | No hardcoded colors/spacing/radius in any component |
| P7 | Pages thin; logic in hooks/services | PMS §2 | UI never fetches directly; components render data |
| P8 | RBAC everywhere | PMS §4 | Nav, actions, and page content gated by permissions; UI visibility is convenience only |
| P9 | Every screen has states | PMS §2 + existing docs | Loading / Success / Error / Empty on every async view |
| P10 | Consistency over creativity | PMS §1.3 | Reuse component library; one way to do things |
| P11 | Reduce clicks | PMS §1.3 | Quick actions, continue-learning, smart defaults |
| P12 | AI-first pipeline mirrored in UI | PMS §6 | Context shown, sources shown, credits shown, streaming shown |

---

# 3. Global Layout

## 3.1 Application Shell

```
┌──────────────────────────────────────────────────────────────┐
│ Sidebar (desktop, sticky)      │ Header (sticky, glass)      │
│ 280px / collapsed 72px         │  greeting · theme · history │
│                                │  notifications · stat pills │
│  ┌ Brand MR. AL-BANNA ┐        │  [academic context bar]     │
│  │ Profile card       │        ├─────────────────────────────┤
│  │ Nav (permission-   │        │                             │
│  │  gated)            │        │        MAIN CONTENT         │
│  │ Social icons       │        │      (container-page)       │
│  └────────────────────┘        │                             │
│                                │                             │
│   <── desktop only (lg) ──>    └─────────────────────────────┤
│                                │ BottomNav (mobile only)     │
└──────────────────────────────────────────────────────────────┘
```

- Desktop ≥1024px: fixed Sidebar + fluid main.
- Mobile <1024px: Sidebar hidden; hamburger opens slide-in drawer (280px, from start); BottomNav fixed bottom (72px + safe-area).
- Main content: `min-w-0 flex-1`, padding `p-3 lg:p-4`, bottom padding accounts for BottomNav on mobile (`pb-[calc(72px+safe-area+0.75rem)]`).

## 3.2 Sidebar (Desktop)

- Width 280px expanded, 72px collapsed (icons only). Collapse toggle top-right.
- Sticky, full height, `overflow-hidden`; nav area scrolls with thin custom scrollbar.
- Brand: `MR. AL-BANNA` in Cairo black-weight, `AL-BANNA` in primary-400 with cyan glow. Collapsed shows `B` mark.
- Compact profile card: initials avatar (F8 fix), first name, grade/role label. Click → profile.
- Navigation items from `getSidebarModules(can)`, ordered by `order`. Active item = `bg-primary-400/10 text-primary-400`.
- Logout item at end, `danger` variant.
- Social icons (platform-colored, from social-links API) at bottom.
- Teacher/Staff: academic context switcher below nav.
- Icon accent hues (token colors, from palette): home=cyan, units=blue, live=green, ai=purple, kb=indigo, ai-settings=slate, students=emerald, teachers=orange, reports=rose, mistakes=red, games=fuchsia, achievements=amber, leaderboard=yellow, competitions=violet, coins/yellow, payments/green, communication/cyan, saved-pdfs/teal, support/cyan, notifications/sky, shop/amber.

## 3.3 Header

- Sticky, `z-30`, glass (`bg-white/30 dark:bg-neutral-950/25 backdrop-blur-xl`), border-bottom.
- Row height 48px (`h-12`).
- Left (start): hamburger (mobile only) + greeting "مرحباً، {firstName}".
- Right (end): theme toggle → history → notifications dropdown → (student) stat pills.
- Below (student): horizontal scroll of stat pills — Streak (flame/amber), Coins (yellow), Level (primary), XP (purple), Shop (emerald, navigates to shop).
- Below (non-student): AcademicContextBar.
- Stat pill canonical component (§16 `StatPill`): fixed mapping — streak=amber, coins=yellow, level=primary, xp=purple, shop=emerald.

## 3.4 Footer

- Global page footer is not part of the authenticated shell (content is the focus).
- Landing/auth pages may include a minimal footer (brand, social links, contact).
- Sidebar bottom hosts social icons instead of a page footer (existing pattern).

## 3.5 Bottom Navigation (Mobile)

- Fixed bottom, `h-[72px] + safe-area`, glass, 5 items max.
- Student: الوحدات · اسأل البنا AI · الرئيسية · حصه مباشر · الدعم الفني (existing order).
- Administrator: الرئيسية · الوحدات · المستخدمون · طلبات الدفع · مواعيد الفرق · إدارة AI.
- Teacher/Staff: الرئيسية · الكورسات · الواجبات · الاختبارات · الحساب.
- **F1 fix:** active state uses `primary-500` (icon + label + pill bg `bg-primary-500/10`), not purple.
- Badge (e.g., unread count) appears top-end; `99+` cap.

## 3.6 Breadcrumbs & Back Pattern

- For nested flows (lesson → quiz, live → session), a top back-link `العودة للرئيسية` / `العودة` with `ArrowLeft` is the established pattern — keep it.
- Add breadcrumb trail for multi-level admin areas (e.g., الإعدادات › رموز التفعيل): text-sm, muted, `ChevronLeft` separator (RTL) between segments.
- Page title block: `<h1>` bold + optional subtitle paragraph — consistent at top of every page (already used in live page; apply everywhere).

## 3.7 Profile Menu

- The profile entry point is the sidebar profile card (desktop) and the "الحساب" bottom-nav (mobile).
- Profile page contains: personal info, academic context (grade/stage for students), password change, notification preferences link, language/theme preferences.

## 3.8 Notifications

- Header `NotificationsDropdown` (bell, unread badge, list, mark-all-read, link to full page).
- Full page `/dashboard/notifications` with filters (all/unread), grouping by day, priority, read/unread, delete.
- Preferences page `/dashboard/notifications/preferences` with per-type opt-in switches (per §14).

## 3.9 Search & Global Actions

- **F10 fix:** Add a global search entry in the header (icon button, opens command palette / search dialog) — see §13.
- Quick actions: on dashboard, primary quick-action cards (AI, Live, Mistakes, Games) already serve this role; keep priority order per UI_RULES: 1 AI → 2 Live → 3 Continue Learning → 4 Units → 5 Story → 6 Final Review → 7 Mistakes → 8 Games.

## 3.10 Responsive Rules

| Breakpoint | Behavior |
|-----------|----------|
| <640px (mobile) | Single column; BottomNav; drawer; cards stack; stat pills scroll |
| 640–1023px (tablet) | 2-col grids where sensible (`sm:grid-cols-2`); drawer nav; BottomNav |
| 1024–1279px (laptop) | Sidebar visible; 2–3 col grids; BottomNav hidden |
| 1280–1535px (desktop) | Sidebar; 3–4 col grids; `container-page` max 1200px |
| ≥1536px (ultra-wide) | Content capped at 1200px; whitespace on sides |

---

# 4. Design System

## 4.1 Color Palette (existing tokens — KEEP)

Primary (cyan brand): `primary-50..900` (500 `#06b6d4`, 400 `#22d3ee`).
Secondary (blue): `secondary-50..900` (500 `#3b82f6`, 600 `#2563eb`).
Semantic: `success` (green), `warning` (orange), `danger` (red), `info` (sky).
Extended: `amber` (achievements/badges), `yellow` (XP/highlights), `purple` (premium + AI), `teal` (progress/stats), `rose` (error highlights).
Neutral: `neutral-50..900` with dark surfaces `neutral-800/900`.
Surfaces: `--color-surface #ffffff / #0c121e`, `--color-surface-elevated`, `--color-surface-muted`, `--color-muted-foreground`, `--color-ring`, `--color-input`.

### Canonical semantic usage map

| Use | Token |
|-----|-------|
| Brand primary (CTAs, active, links, focus ring) | `primary-500/400` |
| Secondary action | `secondary-*` |
| Success / completed / positive | `success-*` |
| Warning / locked / needs attention | `warning-*` |
| Danger / destructive / errors | `danger-*` |
| Info / educational hints | `info-*` |
| AI brand (chat, credits, AI nav) | `purple-*` + gradient `from-purple-500 to-pink-500` (existing) |
| Premium / featured / coins | `amber-*` / `yellow-*` |
| Progress / stats / live | `teal-*` |
| XP | `amber-500`→`yellow` gradient |

## 4.2 Dark Theme

- Background: layered deep-navy space gradient (`#0b1628 → #091522 → #08111f`) with subtle starfield dots + cyan/indigo glows (existing `body.dark`). KEEP.
- Surface: `--ui-card-bg-dark: rgba(16,25,45,0.92)` with glass backdrop-blur.
- Text: `neutral-100` primary, `neutral-400/500` muted.
- Borders: `white/10` shell, `neutral-700` within dark.
- Cards: glass with inset cyan glow + ring `rgba(80,220,255,0.12)` (existing Card variants). KEEP.

## 4.3 Light Theme

- Background: soft `linear-gradient(#f2f7fa, #f7f9fc)`. KEEP.
- Surfaces: `#ffffff`, `--surface-muted #f5f5f5`.
- Text: `neutral-900` primary, `neutral-500` muted.
- Borders: `neutral-200`.
- Card accent: `[data-card-border] .ui-card` cyan border accent (existing) — kept for brand signature.

## 4.4 Typography

- Fonts: Inter (Latin), Cairo (Arabic). `[dir="rtl"] body { font-family: Cairo }` (existing). KEEP.
- Scale (existing tokens): xs 12 / sm 14 / base 16 / lg 18 / xl 20 / 2xl 24 / 3xl 30 / 4xl 36px.
- Weights: 400/500/600/700 (bold for nav items, headings; medium for labels; regular for body).
- Headings hierarchy: Page H1 = `text-2xl font-bold`; Section H2 = `text-lg font-bold`; Card H3 = `text-sm font-bold`; Body = `text-sm/base`.
- Line-height per token (16–40px). KEEP.
- Numeric/stat values: `font-black` or `font-bold`, tabular when in tables.

## 4.5 Grid, Spacing, Container

- 8px spacing system (existing, docs/06_UI/UI_RULES). Base unit 4px; gaps: 2/3/4 (8/12/16px); card padding sm 16 / md 20 / lg 24 / xl 32.
- Container: `.container-page` (max 1200px ≥lg, gutter 16/24/32). KEEP.
- Grid patterns: 1col mobile → `sm:grid-cols-2` → `lg:grid-cols-3/4`; dashboards use `grid gap-4`.

## 4.6 Elevation / Glass / Blur Levels

| Level | Token / Usage |
|-------|---------------|
| Flat | No shadow; surfaces `surface-muted` |
| sm | `shadow-sm` — small cards in lists |
| md | `shadow-md` — standard elevated card (Card `default`) |
| lg | `shadow-lg` — hover states, dropdowns |
| xl | `shadow-xl` — modals, drawers, mobile drawer |
| glass | `shadow-glass 0 8px 32px 0 rgb(0 0 0 / .08)` — glass panels |
| glow | cyan glow shadows (`rgba(6,182,212,…)`) — primary cards/active states |

Blur levels: `backdrop-blur-sm` (8px, subtle), `backdrop-blur-xl` (24px, header/drawer), `backdrop-blur-[8px]` (cards). Modal backdrop = `bg-black/50 backdrop-blur-sm`.

## 4.7 Radius

- `rounded-sm 8px` (badges, chips, small elements)
- `rounded-md 12px` (inputs, buttons default)
- `rounded-lg 16px` (cards, dropdowns)
- `rounded-xl 24px` (hero panels, featured cards)
- `rounded-2xl` (primary cards — Card base) / `rounded-full 9999px` (pills, avatars, icon buttons)

## 4.8 Iconography

- Single icon library: **Lucide** (established). No other icon source.
- Sizes: `h-3 w-3` (inline/meta), `h-4 w-4` (button/input), `h-5 w-5` (header/nav), `h-6 w-6` (bottom nav, feature icons), `h-16 w-16` (empty state hero).
- Icon container chips: `flex h-12 w-12 items-center justify-center rounded-xl bg-{hue}-500/10 text-{hue}-500` (feature cards).
- Stroke width default; no filled duplicates unless semantic (e.g., active bottom-nav icon).

## 4.9 Illustration Style

- No external illustrations. Use Lucide icons + CSS/linear gradients.
- Empty states: large icon in a soft tinted rounded square + title + description + optional CTA (`EmptyState` component).
- Error states: `ErrorState` with retry. Loading: `Skeleton`.

## 4.10 Components (token-level rules)

**Badges:** variants primary/secondary/success/warning/danger/info; pill `rounded-full`; text `text-[10px]/xs`.
**Tables:** `Table` component; header row muted uppercase `text-xs`; row hover `bg-neutral-50 dark:bg-neutral-800/50`; zebra optional; status via Badge.
**Cards:** Card variants `default|elevated|outline|glass|gradient|premium` (existing). Interactive via `interactive` prop, not manual hover classes.
**Forms:** Input/Select/Textarea with label, helperText, error, icons; Checkbox (indeterminate), RadioGroup, Switch.
**Buttons:** variants `primary|secondary|outline|ghost|danger|success|warning|link`; sizes `xs|sm|md|lg|xl|icon|icon-sm`; props `loading,leftIcon,rightIcon,fullWidth`. Loading shows spinner + disables.
**Dropdowns:** header dropdown pattern (notifications); select replacement where needed.
**Dialogs:** `Dialog` + DialogHeader/Content/Footer; centered; focus trap; Escape closes; backdrop closes on click; max width 480px (forms) / 640px (tables).
**Drawers:** mobile sidebar drawer + AI conversation drawer (end-side, w-72, slide-in).
**Tabs:** segmented control `rounded-xl bg-muted` with active tab pill (used in content views); underline tabs for admin sections.
**Accordions:** units browser (stage→grade→unit expand) — existing pattern, keep.
**Timeline:** lesson progress / live session history; vertical with dots.
**Calendar:** live availability editor (existing `availability` page pattern); date block lists; month grid.
**Charts:** reports — use lightweight SVG bars/lines (no heavy chart dep unless necessary); coin/XP progress bars exist.
**Tooltips:** `title` attribute or custom on hover for icon-only controls.
**Skeletons:** `Skeleton` component for all async containers.
**Loading:** button `loading` spinner; page skeletons; AI typing dots; full-page `ActivityIndicator`.
**Toast:** **NEW** — global toast system (F12) top-center or bottom (RTL-aware), success/error/info/warning, auto-dismiss 3–5s, aria-live. Toast stack at `z-toast`.
**Empty/Error states:** `EmptyState`/`ErrorState` components everywhere async data renders.

---

# 5. Student Experience

## 5.1 Dashboard

- **Purpose:** one glance at progress + fastest path to next learning action.
- **Layout (priority order per UI_RULES):**
  1. Progress card (تقدمك الدراسي) — completed/total lessons, progress bar (primary/teal), CTA "استكمل الدرس"/"ابدأ الآن".
  2. Daily goal strip — streak (flame/amber), level/XP progress (XP gradient).
  3. Grade-not-set warning (amber) with "تعديل البروفايل" (only when no grade).
  4. Units card, Stories card, Final Review card (list-style feature rows).
  5. Quick tools grid (2×2): Ask El-bannawy AI · Live · Mistakes · Games.
  6. Upcoming live bookings (max 2, "اليوم" highlight).
- **KPIs:** completion %, streak, XP/level, coins, upcoming bookings.
- **Empty/loading/error:** skeleton; ErrorState with retry; EmptyState when no data.

## 5.2 Continue Learning

- Represented by the dashboard progress card CTA (deep-link to lesson). Keep.
- Optionally surface "آخر درس" with lesson title + unit name when `continueLearning` present.

## 5.3 Units / Lessons / Vocabulary / Grammar / Reading / Listening / Writing

- Units browser (accordion stage→grade→unit): unit card shows order, lesson count, expand; lessons show icons (`▶`/`★`), duration, `• Quiz`/`• HW`, premium badge.
- Lesson detail: back link, grade/unit label, title, completion badge, progress, video player (YouTube embed), timeline events, vocabulary sections, settings card, homework/quiz action buttons (wire: currently inert F6-style in mobile only; web has quiz/homework pages).
- Content-type variants via `UnitType`: UNIT / STORY / FINAL_REVIEW (each gets its own list page + detail).
- Grammar/Reading/Listening/Writing are activity types inside lessons (not separate nav) — keep as in-lesson sections.

## 5.4 Homework

- `/dashboard/homework/[lessonId]`: homework header (title, due, attempts left, passing), questions, submit button with loading, result screen (score, feedback, retry if allowed).
- States: not started / in progress / submitted / graded / passed / failed.

## 5.5 Quizzes

- `/dashboard/quiz/[lessonId]`: quiz intro (rules, attempts, passing), question stepper, progress, submit, instant or after-submission feedback per policy.
- Attempt policy UI (single/multiple/unlimited/teacher-controlled).

## 5.6 Mistakes Review

- `/dashboard/mistakes`: list of past wrong answers grouped by lesson/type; "تدرب الآن" CTA; mini-exam creation; score improvement indicator.

## 5.7 Stories & Final Review

- `/dashboard/stories`, `/dashboard/stories/[storyId]`, `/dashboard/stories/[storyId]/chapters/[chapterId]`: chapter-based reader (video, vocab, questions).
- `/dashboard/final-reviews`, `/dashboard/final-reviews/[reviewId]`: lecture list per review; distinct from regular progression.

## 5.8 Certificates

- Unit/lesson completion → certificate generation (jsPDF/html2canvas). Page shows earned certificates grid, download button. Empty state when none.

## 5.9 Coins / Achievements / Leaderboard / Competitions / Games / Shop

- **Coins:** wallet balance pill (header + dashboard). `/dashboard/shop` sells coin packages; purchase flow; unlock UI on premium units (cost display + "افتح بالعملات" + request).
- **Achievements** (`/dashboard/achievements`): badge grid, locked (grayscale) vs unlocked.
- **Leaderboard** (`/dashboard/leaderboard`): rank list, current user highlighted.
- **Competitions** (`/dashboard/competitions`): weekly quiz competition cards, join, leaderboard, results.
- **Games** (`/dashboard/games`, `/games/memory`, `/games/listening-challenge`, `/games/pronunciation-challenge`): game launcher cards; full-screen game area; score + XP reward on completion.

## 5.10 Live Classes (student)

- See §10. Student sees: subscription hero, service cards, upcoming bookings, available sessions, booking action, join.

## 5.11 AI Tutor (student)

- See §9.

## 5.12 Reports (student)

- `/dashboard/reports`: own progress (lessons, homework, quiz attempts, XP transactions, live attendance). Export.

## 5.13 Notifications

- See §14.

## 5.14 Profile & Settings

- Profile: name, mobile, grade/stage (academic context), password change, avatar.
- Settings: notification preferences link, theme (default dark), language (Arabic default).

---

# 6. Teacher Experience

## 6.1 Teacher Dashboard

- Cards: إدارة الأوقات المتاحة · حصص اليوم (count) · الحصص القادمة (count). (Existing — keep.)
- Content management quick links: units/lessons/stories/final-review.
- Student/mistakes overview: recent activity, low-performance flags (future).

## 6.2 Courses / Lessons / Assignments

- Units manager (`units/_components/teacher-units-view`): unit list → lesson editor (title, video, vocab, questions, settings: passing, attempts, XP, premium/lock, publish).
- Story/final-review editors analogous.
- Assignment creation: lesson flags `homeworkEnabled`/`quizEnabled`.

## 6.3 Homework & Quizzes (teacher)

- Create/edit homework & quiz per lesson; question manager (MCQ, TF, matching, fill-blanks, drag-drop, reading, writing, speaking, paragraph, conversation).
- Attempt policy, feedback policy, passing score, XP reward, visibility window.
- Review submissions: grade list, per-student results, manual release of feedback.

## 6.4 Live Classes (teacher)

- See §10. Teacher view: availability editor, edit session dialog (title, capacity, date/time, provider EXTERNAL_URL/Zoom), publish/unpublish, control panel, attendance, countdown.

## 6.5 Availability

- `/dashboard/live/availability`: date blocks + time slots editor per day; recurring options.

## 6.6 Attendance

- Session control panel: mark attendees present; list of bookings; attendance rate.

## 6.7 Reports (teacher)

- `/dashboard/reports`: class-level performance, per-student drill-down (grade access enforced server-side), export.

## 6.8 Students

- View students in managed grades (`students` list, scoped by academic context + delegation).

## 6.9 Announcements

- Notifications send (POST /notifications/send) — compose to class/grade/individual; see §14.

## 6.10 Analytics / AI Tools

- AI tools: `ai.manage` grants teaching-use of AI (create explanations, draft questions) — surfaced as tool entries in content editors and AI settings where permitted.
- Analytics: teacher dashboard aggregates (live fill, homework completion, quiz pass rate).

## 6.11 Profile

- Same profile shell; role label "معلم"; academic context switcher visible.

---

# 7. Secretary Experience

- The secretary is an operational role (PMS §4, USER_ROLES doc): explicit capability only where controllers guard it. UI must not overpromise.
- Scope (per permissions): `notifications.send`, `learning.access`, `units.view`, `lessons.view`, `live.view`, `reports.view`, `coins.view`.
- Secretary UI (when secretary logs in):
  - **Dashboard:** operational snapshot — today's live sessions, pending bookings, pending payments (view), recent support.
  - **Bookings:** list of live bookings across teachers (view), status, waiting list (view).
  - **Payments/Transfers:** view manual transfer orders and payment requests (read-only unless granted); navigate to admin pages where permitted.
  - **Waiting Lists:** view pending waiters.
  - **Attendance:** view session attendance.
  - **Live Sessions:** read-only session list.
  - **Reports:** view-only.
  - **Support:** can send notifications / answer support if `support.answer` granted (SUPPORT role; secretary may not have it).
- No secretary-specific design tokens; reuse tables, badges, cards.
- **IMPORTANT:** nav must only render what `can()` returns true for (nav-registry already gates). Never fabricate management screens the role cannot access.

---

# 8. Admin Experience

## 8.1 Platform Dashboard

- Admin dashboard: platform KPIs — active students, teachers, sessions today, revenue (future), payment orders pending, unlock requests pending, AI usage (future). KPI cards grid + recent lists.

## 8.2 Users / Permissions / Roles

- `/dashboard/users`: user management hub — links to students (`/dashboard/students`) and teachers (`/dashboard/teachers`) management pages. Single entry point in sidebar/bottom nav.
- Students: `/dashboard/students` — search/filter by status & academic context, student detail (profile/progress/attendance/login-history/subscription), edit, phone/password reset, coins/XP adjust, status change, delete.
- Teachers: `/dashboard/teachers` — search/filter, create teacher, teacher detail (profile/grades/permissions), manage assigned grades, grant/revoke permissions, status change, delete.
- Permissions: view/edit role ceilings; delegation to staff; audit log of grants.

## 8.3 Curriculum

- Units/stories/final-review management with full content editors (shared with teacher but admin unrestricted).

## 8.4 Payments / Subscriptions / Coupons

- Coin packages & paid content (merged): `/dashboard/admin/coins` — tabs for coin packages (CRUD: name, coins, price, active), unlock pricing (UNIT/TERM coin costs), activation codes (generate coin/target codes, expiry, max uses, toggle, print/download charging card), and unlock requests (approve/reject + note).
- Payments (merged): `/dashboard/admin/payments` — tabs for payment orders review (verify/cancel manual orders; status badges) and transfer numbers management (wallet/instapay numbers).
- Subscriptions: (future) live subscription management.
- Coupons: (future) coupon CRUD.

## 8.5 Coins / Unlock Pricing / Codes / Requests

- Merged into `/dashboard/admin/coins` (see §8.4) — unlock pricing (UNIT/TERM coin costs), activation codes (coin/target, expiry, max uses, toggle, charging card print/export), and unlock requests resolution.

## 8.6 Live Classes (admin)

- Full live management: sessions across teachers, book/unbook, availability config, control panel override, attendance audit.

## 8.7 AI Management

- `/dashboard/ai/settings` (admin-only via `ai_settings.manage`):
  - **Knowledge Base manager** (`/dashboard/ai/knowledge-base`): upload documents, list sources, re-index, enable/disable, delete.
  - **Teaching style:** persona/system prompt config (guarded, never exposed to clients).
  - **Prompt management:** templates for question generation, explanation, translation, quiz.
  - **Credits:** plans (free credits, per-question/session, reset period DAILY/WEEKLY/MONTHLY, unlimited), per-student overrides.
  - **Packages:** AI credit purchase packages (new per PMS §8.1).
  - **Providers:** provider select + API key config (masked), model, temperature, streaming toggle.
- AI analytics: conversations, token usage, cost, credits consumed.

## 8.8 Reports / Analytics

- See §12.

## 8.9 Notifications (admin)

- `/dashboard/admin/notifications`: enable/disable notification types (config), templates per channel, WhatsApp config, test send, logs, analytics.

## 8.10 Audit Logs

- (Future) audit log viewer: permission grants, admin actions, payment verifications. Table + filters by actor/action/date.

## 8.11 Platform Settings

- `/dashboard/admin/settings`: platform config, communication & support (`/dashboard/admin/communication` — social links + per-grade support contacts), lesson schedules (`/dashboard/admin/lesson-schedules`), UI settings (`/dashboard/admin/ui-settings` — theme accent, background, card border, splash).
- UI settings editor: color accent pickers (token-scoped), card border side toggle, background image upload (governed by existing `ui-settings-api`), font family toggle.

## 8.12 Page Status & Maintenance (`/dashboard/admin/page-status`)

- **Purpose:** Admin controls availability of platform pages for students. When a page (or the whole platform) is disabled, students see a maintenance screen with a configurable message and a WhatsApp support button.
- **Behavior:** The gate applies to `STUDENT` role only — admins and teachers are never blocked.
- **Global toggle:** "إيقاف المنصة بالكامل للطلاب" disables every dashboard page for students; configurable title, message, and WhatsApp number.
- **Per-page toggles:** each page (units, stories, final-reviews, live, AI, mistakes, games, achievements, leaderboard, competitions, saved PDFs, shop, support, notifications, etc.) can be enabled/disabled independently with a custom title/message.
- **Student-facing screen (`MaintenanceScreen`):** warning icon, title (default «هذه الصفحة قيد التطوير» / global «المنصة قيد التطوير»), message, "متاح قريباً" badge, and "تواصل مع الدعم الفني عبر واتساب" button (wa.me link) when a WhatsApp number is configured (page → global → `NEXT_PUBLIC_WHATSAPP_NUMBER`).
- **Persistence:** stored in `system_settings` key `page_statuses` (JSON) via `GET/PATCH /page-status` endpoints (PATCH admin-only). No schema migration required.
- **Integration:** `dashboard/layout.tsx` wraps children with `PageStatusGate` which resolves the current page key from the pathname (`getPageKeyFromPath`) and renders `MaintenanceScreen` for blocked students.

---

# 9. AI Experience

## 9.1 AI Chat (`/dashboard/ai`)

- **Purpose:** Ask El-bannawy — personal AI tutor. Feel: helpful, fast, friendly, educational, non-intimidating.
- **Layout:** 
  - Desktop: left conversation sidebar (w-64) + chat area. 
  - Mobile: chat area + floating conversation button → end-side drawer (existing). Keep.
- **Header (chat top):** AI avatar (gradient purple→pink with Bot icon), conversation title, "محادثة جديدة" (+), history button. Keep existing, add title editing.
- **Context banner:** grade/term chip + lesson context chip (`BadgeInfo`). Show what the AI "sees" (academic context + optional lesson) — mirrors PMS §6.6 context builder.
- **Credits pill:** coins icon + remaining count + progress bar vs total; "غير محدود" when unlimited; click → shop/credits page. Keep existing; add low-credit warning state (amber) and zero-credits block state.
- **Message types:**
  - Student message: avatar (initials), bubble aligned end, primary-tinted (existing uses `bg-primary-500 text-white`), timestamp.
  - AI message: purple-gradient avatar, neutral bubble aligned start, markdown-rendered content, sources chips, action row (copy, like, dislike, regenerate).
- **Markdown & code:** render markdown (headings, bold, lists, tables, inline code) and code blocks with copy button. **NEW** — currently raw text.
- **Translation / grammar / vocabulary cards:** structured response blocks (translation pair, grammar correction diff, vocab cards with word/phonetic/translation/definition) as enhanced bubbles. **NEW**.
- **Sources used:** chips with title + relevance % (`FileText` + score). Keep existing.
- **Streaming:** as tokens arrive, render progressively; typing indicator (3 bouncing dots) while waiting. **NEW** (backend streaming per PMS §6.7).
- **Actions:** Copy (clipboard), Retry/Regenerate, Feedback (like/dislike + optional note) → analytics. **NEW**.
- **Empty state:** illustration (Sparkles icon in gradient square), title "اسأل البنا AI", description, quick suggested prompts ("اشرح هذا الدرس", "ساعدني في الواجب", "ترجم هذه الجملة", "أنشئ اختباراً", "لخص الدرس").
- **Input area:** text input + send button; character counter (2000 max per PMS §6.5); disabled while sending; voice (future), image/PDF upload (future).
- **Limits UI:** 50 messages/conversation progress indicator; max conversations (20) notice.
- **Conversation history:** recent list, search, delete; (future) favorites/pinned.
- **States:** skeleton (sidebar + message bubbles); error (Connection Lost / AI Busy / Rate Limit / Upload Failed) with retry; zero-credits block with "شراء رصيد" CTA.

## 9.2 AI Settings (`/dashboard/ai/settings`) — admin

- Sections (tabs): Knowledge Base · Teaching Style · Prompts · Credits · Packages · Providers · Analytics.
- Each as table/card form; save with success toast; never reveal secrets (masked inputs).

## 9.3 Knowledge Base Manager (`/dashboard/ai/knowledge-base`)

- Upload card (drag/drop + picker); source list table (title, type, status, chunk count, actions enable/disable/re-index/delete).
- Re-index action with progress; index status badge (queued/processing/ready/error).

## 9.4 AI Reports

- Admin AI analytics: total conversations, questions/week, tokens consumed, est. cost, credits used, RAG hit rate, per-provider split. Charts (bars/lines) + export.

---

# 10. Live Classes Experience

## 10.1 Student — Live Hub (`/dashboard/live`)

- **Purpose:** manage subscription, services, and bookings in a tabbed hub (less crowded, one focus at a time).
- **Sections:**
  1. Header hero + "اشترك الآن" shortcut, then a tab bar: `الخدمات` (default) / `اشتراكاتي` / `حجوزاتي`.
  2. الخدمات — dynamic plan grid from `useLivePlans` (active plans only), one `ProductCard` per `LivePricingPlan` row; type drives icon/link (PRIVATE → individual wizard, GROUP → group wizard, ONE_TIME → single booking, FREE → events).
  3. اشتراكاتي — active subscription cards (private/group/one-time), teacher name, remaining sessions `remaining/total`, progress bar, "تجديد" routed by type.
  4. حجوزاتي — `MyBookingsTabs` with join, reschedule-request, and cancel actions (dialogs at hub level).
- **Booking flow (`/dashboard/live/book`):** plan/service selection → available slots (teacher availability) → confirm booking → success toast + calendar entry. On capacity full → "انضم لقائمة الانتظار" (PMS §7.3 new).
- **Join flow:** session card → "انضم" opens meeting URL (new tab) or Zoom SDK room; pre-join lobby (title, teacher, countdown, camera/mic pre-check, join button).
- **Waiting room:** queue view with position, auto-promote notification (future).

## 10.2 Teacher — Live Management

- Availability editor: date blocks + time slots; list of published sessions.
- Edit session dialog: title, description, capacity, date/time/duration, provider (EXTERNAL_URL or Zoom SDK). No create-session flow — sessions are materialized from availability/schedule flows and only edited here.
- Session control panel (`/dashboard/live/sessions/[sessionId]`): status transitions (publish/unpublish/start/end), meeting link/password, bookings list, attendance marking, announcements, control log, countdown, recording (future).
- KPIs: today's sessions, upcoming, attendance rate, fill rate.

## 10.3 Secretary — Observer

- Read-only session list, bookings, waiting lists, attendance (per §7).

## 10.4 Zoom / Video Room

- External URL join (new tab, `noopener`).
- Zoom SDK room component exists (`zoom-meeting-room`); full integration when credentials available.

## 10.5 Session Status Badges

DRAFT · PUBLISHED · SCHEDULED · OPEN · FULL · ENDED · CANCELLED · ARCHIVED — token-mapped: draft=neutral, published/scheduled=info, open=success, full=warning, ended=neutral, cancelled=danger, archived=neutral.

---

# 11. Payments Experience

## 11.1 Products (`/dashboard/shop`)

- Coin package cards: name, coin amount, price, "اشترِ الآن".
- AI credit packages (new) and live subscription plans (new) listed alongside where active.

## 11.2 Subscriptions

- Live subscription cards (as in live hub); plan details, remaining sessions, renew/upgrade (future).

## 11.3 Checkout

- Steps: select package → choose payment method (Paymob/Fawry/InstaPay/manual transfer) → review → pay → verify.
- Manual transfer: show transfer numbers (admin-configured), "أرفق صورة الإيصال + رقم التحويل" form → creates manual_payment_order → status "بانتظار التحقق".
- Success state: "تمت العملية" + coins credited animation; failure state with retry; pending state "بانتظار التحقق".

## 11.4 Coupons (new)

- Coupon input at checkout; validation feedback inline; applied discount shown before confirm.

## 11.5 Invoices (new)

- Invoices list per user; view/download; status badge.

## 11.6 Wallet

- Coin wallet balance (header pill, dashboard, shop header). Purchase history (`/dashboard/shop` → سجل المشتريات / `my-purchases`). Unlock history (`my-unlocks`).

## 11.7 Manual Payments (admin `/dashboard/admin/payments` — merged)

- Two tabs: "طلبات الدفع" (payment orders review) and "أرقام التحويل" (transfer numbers management).
- Payment orders: order id, user, package, amount, method (transfer), receipt ref, status (pending/verified/rejected), admin note. Actions: verify (credits coins) / reject.
- Filter by status; pagination.

## 11.8 Payment Status

Global status badge set: `PENDING` (warning), `VERIFIED/COMPLETED` (success), `REJECTED/FAILED` (danger), `EXPIRED` (neutral), `REFUNDED` (info).

## 11.9 Refunds (new)

- Refund request/action UI on orders (admin) and history (student); restore coins/sessions per rules.

## 11.10 Payment History

- Student: chronological list of purchases/refunds with status badges + download invoice.

---

# 12. Reports Experience

## 12.1 Report Center (`/dashboard/reports`)

- Role-scoped views:
  - Student: تقدمك الدراسي — lessons, homework, quiz attempts, XP history, live attendance, mistakes.
  - Teacher: class performance — per grade/lesson aggregates, per-student drill-down (grade access), export.
  - Secretary/Staff/Support: view-only summary.
  - Admin: platform summary + financial + live + AI tabs (§12.2).
- Export: CSV/PDF button (`reports.export` gated). **NEW**.
- Filters: date range, grade, lesson, type. Sorting on columns. Pagination (page/limit clamped 1..100).

## 12.2 New Reports (PMS §10)

| Report | Content |
|--------|---------|
| Financial | revenue by product/gateway/period; coin/credit sales; refunds; manual transfers |
| Live | sessions, bookings, attendance rate, waitlist, cancellations |
| AI usage | conversations, token usage, cost, credit consumption, reset events |

- Charts: bar for period trends; line for usage over time; KPI stat cards on top.

## 12.3 Charts & Export

- Lightweight SVG charts (no heavy dependency unless justified). Download CSV/PDF via toast + progress.

---

# 13. Search Experience

## 13.1 Global Search (F10 — new)

- Entry: header search icon button. Opens command palette-style dialog (centered, top-aligned on mobile).
- Content: unified results — Units/Lessons, Stories, Final Reviews, Students (admin), Teachers (admin), Live sessions, Saved PDFs, Reports (admin), AI history.
- Role-scoped results (permissions applied server-side; UI only shows what `can()` allows).
- Behavior: type-ahead (debounced), keyboard navigation (↑↓ + Enter), Escape closes, "no results" empty state, recent searches (optional).

## 13.2 Contextual Search

- Students table: filter by name/mobile/grade.
- Teachers table: filter by name.
- Lesson/question editors: search within question bank.
- Live: filter sessions by status/date/teacher.
- AI: search conversation history.
- Reports: filter by date/grade/type.

All: `Input` with search icon, clear button, debounce, empty result state.

---

# 14. Notifications Experience

## 14.1 In-App Notification Center

- Header dropdown: bell icon + unread badge → panel (recent 20, mark all read, view all).
- Full page `/dashboard/notifications`: grouped by "اليوم/هذا الأسبوع/سابقاً"; filters (الكل/غير المقروءة); priority emphasis (danger/info); read/unread styling (unread = tinted bg + dot); delete; mark-read on click.
- Types (8 known config types): rendered with type icon + tinted chip.

## 14.2 Channel Matrix (PMS §9)

| Channel | UI Surface | Status |
|---------|-----------|--------|
| In-app | Notification center (above) | Existing |
| Push (FCM) | Device-token registration on login; badge sync | Existing |
| WhatsApp | Composer uses WhatsApp channel; admin config/logs | Existing |
| Email | New templates + preview in admin | New |
| SMS | New templates + preview in admin | New |

## 14.3 Preferences

- `/dashboard/notifications/preferences`: per-type opt-in switches (toggle list). `NotificationPreference` drives delivery.
- Channels per type: checkboxes (push/email/sms/whatsapp/in-app) where available.

## 14.4 Composer (send/schedule)

- Staff/teacher/admin send dialog: audience (all students / grade / individual), type, title, message, channel(s), schedule date/time (if scheduling). Preview render per channel template.
- Schedule list: pending scheduled items with cancel.

## 14.5 Admin

- `/dashboard/admin/notifications`: enable/disable types; templates table per type+channel (edit dialog with variable placeholders); WhatsApp config (account, credentials masked, test send, logs); analytics (sent/delivered/failed, open/read rate).

---

# 15. Screen Catalog

Legend: R = role(s) that see it. D = key dependencies. All screens are RTL + dark/light + mobile-first.

## Auth

| Route | R | Purpose |
|-------|---|---------|
| `/login` | Guest | Mobile + password sign-in |
| `/register` | Guest | Create account (name, mobile, password) |
| `/forgot-password` | Guest | Request verification code |
| `/reset-password` | Guest | Reset with code + new password |
| `/(auth)/layout` | Guest | Centered auth shell, brand, theme toggle |

## Student

| Route | R | Purpose |
|-------|---|---------|
| `/dashboard` | all | Role dashboard |
| `/dashboard/units` | all | Units browser (role-split views) |
| `/dashboard/units/[unitId]` | student/teacher/admin | Unit detail + unlock gate |
| `/dashboard/units/[unitId]/lessons/[lessonId]` | student/teacher/admin | Lesson editor/player |
| `/dashboard/lessons/detail/[lessonId]` | student | Lesson player (+/vocabulary, /pdf, /games) |
| `/dashboard/quiz/[lessonId]` | student | Quiz |
| `/dashboard/homework/[lessonId]` | student | Homework |
| `/dashboard/stories`, `/stories/[storyId]`, `/stories/[storyId]/chapters/[chapterId]` | student/teacher/admin | Story reader/editor |
| `/dashboard/final-reviews`, `/final-reviews/[reviewId]` | student/teacher/admin | Final review |
| `/dashboard/mistakes` | student/teacher | Mistakes + mini-exam |
| `/dashboard/ai` | student/teacher | AI chat |
| `/dashboard/ai/settings`, `/ai/knowledge-base` | admin | AI admin |
| `/dashboard/live`, `/live/book`, `/live/availability`, `/live/sessions/[sessionId]` | per role | Live hub |
| `/dashboard/games`, `/games/memory`, `/games/listening-challenge`, `/games/pronunciation-challenge` | student | Games |
| `/dashboard/achievements` | student | Badges |
| `/dashboard/leaderboard` | student | Rankings |
| `/dashboard/competitions` (+nested) | student/teacher | Competitions |
| `/dashboard/shop` | student | Coins shop |
| `/dashboard/payments` | student | Payments/history |
| `/dashboard/reports` | per role | Reports |
| `/dashboard/notifications`, `/notifications/preferences` | all | Notifications |
| `/dashboard/saved-pdfs` | student | Saved documents |
| `/dashboard/history` | student | Learning history |
| `/dashboard/support` | all | Support tickets |
| `/dashboard/profile` | all | Profile/settings |

## Teacher

| Route | R | Purpose |
|-------|---|---------|
| `/dashboard/teacher/games` | teacher | Game settings |
| `/dashboard/users` | admin | Users hub (students + teachers) |
| `/dashboard/students` | admin | Student management |
| `/dashboard/teachers` | admin | Teacher management |

## Admin

| Route | R | Purpose |
|-------|---|---------|
| `/dashboard/admin/settings` | admin | Platform settings |
| `/dashboard/admin/ui-settings` | admin | UI theming |
| `/dashboard/admin/coins` | admin | Coin packages + unlock pricing + codes + requests (merged) |
| `/dashboard/admin/payments` | admin | Payment orders + transfer numbers (merged) |
| `/dashboard/admin/notifications` | admin | Notification config |
| `/dashboard/admin/communication` | admin | Social links + support contacts (merged) |
| `/dashboard/admin/lesson-schedules` | admin | Lesson schedules |
| `/dashboard/teacher/*` (games) | teacher | Teacher-only tools |

## Shared components/routes

| Route/File | Purpose |
|-----------|---------|
| `/offline` | Offline fallback page |
| `dashboard/_components/*` | Role dashboards |
| `components/live/*` | Live components (session card, countdown, zoom) |
| `components/notifications/*` | Notification provider + dropdown |

---

# 16. Component Catalog

## 16.1 Core UI (existing — reuse)

`Button` · `Card`(+Header/Content/Footer) · `Badge` · `Input` · `Select` · `Textarea` · `Checkbox` · `RadioGroup` · `Switch` · `Dialog` · `Table` · `EmptyState` · `ErrorState` · `Skeleton` · `Sidebar` · `Header` · `BottomNav` · `ErrorBoundary` · `CardBorderScope` · `AcademicContextBar` · `AcademicContextInit` · `AcademicSettings` · `BackButton` · `GovernorateSelect` · `TeacherContextBanner`

## 16.2 Domain components (existing — reuse)

Live: `LiveSessionCard` · `LiveSessionCardSkeleton` · `CreateSessionDialog` · `LiveCountdown` · `ZoomMeetingManager` · `ZoomMeetingRoom` · `LessonLiveSessionCard`
Notifications: `NotificationsDropdown` · `NotificationProvider`

## 16.3 New components to introduce

| Component | Category | Spec |
|-----------|----------|------|
| `StatPill` | display | Header/dashboard stat pill; variants streak/coins/level/xp/shop; fixed token mapping |
| `Avatar` | display | Local initials avatar (replaces ui-avatars.com); sizes sm/md/lg; ring variant for active |
| `Toast` (+`ToastProvider`) | feedback | Global toast stack; success/error/info/warning; auto-dismiss; RTL-aware placement |
| `Breadcrumbs` | navigation | Trail for admin/nested pages |
| `MarkdownRenderer` | display | AI + content rich text; tables, code blocks, inline code |
| `CodeBlock` | display | Code block w/ copy button |
| `CopyButton` | action | Clipboard copy w/ feedback toast |
| `SearchCommandPalette` | navigation | Global search dialog (F10) |
| `SearchInput` | form | Debounced search field with icon + clear |
| `ProgressBar` | display | Canonical progress bar (used for lessons, XP, sessions) |
| `StatusBadge` | display | Wraps Badge for entity statuses (session, payment, order) |
| `SegmentedTabs` | navigation | Segmented control for in-page switching |
| `NotificationItem` | domain | Single notification row (icon tint, read dot, priority) |
| `ChatMessage` | domain | AI/student message bubble (markdown, actions, sources) |
| `TypingIndicator` | feedback | 3-dot bounce (existing inline → component) |
| `SourceChip` | domain | AI sources chip with score |
| `SuggestionChips` | domain | Quick prompt suggestions |
| `CountdownTimer` | display | Live countdown (extract from existing) |
| `UploadDropzone` | form | KB/document upload |
| `ChartBar` / `ChartLine` | display | Lightweight SVG charts for reports/AI analytics |
| `FilterBar` | form | Date-range + select filters for lists/reports |
| `EmptyInline` | feedback | Compact empty row for tables |

## 16.4 Component rules

- Every component: dark + light + RTL + disabled + focus-visible + loading where async.
- No hardcoded colors (tokens only).
- Single source: `components/ui/` for primitives; `components/{domain}/` for domain composites.
- Reuse before create. Never duplicate.

---

# 17. Dialog Specifications

## 17.1 Common Dialog Behavior

- Centered modal, max-width 480px (forms) / 640px (tables), `rounded-xl`.
- Title + close (X). Body scrolls if long. Footer: primary action + cancel.
- Focus trap; Escape closes; backdrop click closes; aria-modal.
- Loading state on primary button while submitting; success → close + toast; error → inline message.

## 17.2 Edit Session Dialog (existing)

Fields: title, description, capacity, date, start time, duration, provider (external URL / Zoom). Sessions are materialized from availability/schedule flows; this dialog only edits an existing session. Manual sessions are not linked to a grade/lesson.
Validation: required title/date/time; end > start; capacity > 0.
Buttons: حفظ (primary) / إلغاء.

## 17.3 Book Session / Confirm Booking

Fields: none (pre-filled session summary); shows session details + seats left.
Warning: none seats → disabled "انضم لقائمة الانتظار".
Confirmation: "تأكيد الحجز" → success toast + update list.

## 17.4 Coin Package Purchase / Checkout

Steps in dialog or page: package → payment method → review → confirm → verify status.
Warning: manual transfer → show numbers + receipt upload + "رقم التحويل" field.
Buttons: تأكيد الدفع / رجوع. Errors: payment failed (danger) / pending verification (warning).

## 17.5 Unlock Content

Fields: target (unit/term), cost shown, wallet balance, method (coins).
Warning: insufficient balance → "اشترِ عملات" CTA + "أرسل طلب فتح".
Confirmation: deduct coins → success + access granted.

## 17.6 Send / Schedule Notification

Fields: audience (all/grade/individual), type, title, message, channels (in-app/push/whatsapp/email/sms), schedule datetime (optional).
Validation: audience required; message required; schedule in future.
Buttons: إرسال الآن / جدولة / إلغاء.

## 17.7 Confirm Destructive Actions

Pattern for delete (code, package, conversation, notification, user ban): dialog with danger variant, typed confirmation for irreversible ops (optional), "حذف" (danger) / "إلغاء".

## 17.8 Payment Order Resolve (admin)

Fields: status (verified/rejected), admin note (required on reject).
Warning: verify credits coins (cannot undo except refund).
Buttons: تأكيد / إلغاء.

## 17.9 AI Knowledge Base Upload

Fields: file picker (pdf/doc/txt), optional title.
Validation: allowed mime types + size cap.
Buttons: رفع / إلغاء; progress bar during upload; result toast + list refresh.

## 17.10 UI Settings Editor

Fields: accent color (scoped presets), card border side, background upload.
Preview: live mini-preview. Save → toast + theme re-apply.

---

# 18. User Flows

## 18.1 Student Learning Journey
Login → dashboard (progress + continue) → units → lesson → video → vocab/activities → quiz → XP → complete → next unlocks → certificates.

## 18.2 Homework Journey
Teacher assigns → student notified → opens homework → answers → submit → evaluation → grade/feedback → wrong answers → mistakes pool.

## 18.3 Quiz Journey
Quiz enabled lesson → intro (rules/attempts) → question stepper → submit → feedback per policy → retry if allowed → XP.

## 18.4 Live Booking Journey (student)
Live hub → service/plan select → available slots → confirm → booking card + notify → reminder → join → attend → session consumed → attendance recorded.

## 18.5 Live Session Journey (teacher)
Availability/schedule → session materialized → publish → students book → control panel → start meeting → attendance → end → summary.

## 18.6 AI Learning Journey
AI chat → context shown → ask → streaming answer (sources) → feedback → credits decrement → history → (0 credits → purchase).

## 18.7 Teacher Lesson Journey
Units manager → create/edit lesson (video, vocab, questions, settings) → publish → students see it → monitor results.

## 18.8 Teacher Live Journey
Availability editor → session materialized → publish → today's list → start → attendance → reports.

## 18.9 Secretary Booking Journey
Log in → bookings view → waiting list → attendance view → reports (view) → support/notifications where permitted.

## 18.10 Admin Configuration Journey
Settings → users/roles/permissions → curriculum → AI (KB/teaching/prompts/credits/packages/providers) → payments (packages/orders/transfer numbers) → live config → notifications config → UI settings.

## 18.11 Payment Journey
Shop → package → method → pay/verify → coins credited → unlock content → history.

## 18.12 Support Journey
Support page → new ticket → messages → assignment → resolution → notify.

---

# 19. Motion System

## 19.1 Durations (existing tokens)
- fast 150ms (hover, micro-interactions), normal 250ms (transitions), slow 300ms (drawers, panels).

## 19.2 Easing
- Standard ease; hover lifts `-translate-y-0.5`; press scale `0.998` (Card interactive pattern).
- RTL-safe: translateX-based animations only on X where appropriate (drawer slide-in from start uses keyframes `sidebar-slide-in`).

## 19.3 Interactions
- Hover: card lift + shadow; nav item tint + slight translate; icon tint shift.
- Focus: visible `ring-primary` ring (WCAG).
- Success: toast slide/fade; coins/progress bar fill animate; completion check.
- Failure: inline error + toast (danger); shake optional (subtle).
- Loading: skeletons (shimmer), button spinner, typing dots (150ms stagger).
- Progress: bar width transition 300ms; XP count-up (subtle).
- Ripple: not applicable (no material ripple); use press scale instead.
- Motion: page containers fade/slide 250ms; dialog zoom/fade 250ms.
- Confetti: ONLY for milestone awards (certificate earned, level-up, competition win) — restrained, short (≤1s).

## 19.4 Reduced Motion
- `prefers-reduced-motion` global override already in globals.css (0.01ms). Respect it; no infinite animations except subtle pulse that must also respect reduced motion.

---

# 20. Responsive Rules

| Rule | Mobile (<640) | Tablet (640–1023) | Laptop (1024–1279) | Desktop (1280+) |
|------|--------------|-------------------|--------------------|-----------------|
| Nav | BottomNav + drawer | BottomNav + drawer | Sidebar | Sidebar (collapsible) |
| Header | greeting + icons | + context | + context | + context |
| Grids | 1 col | 2 col | 2–3 col | 3–4 col |
| Stat pills | horizontal scroll | fit | fit | fit |
| Dialogs | full-width bottom sheet | centered | centered | centered |
| AI chat | drawer conv | split | split | split |
| Tables | horizontal scroll | scroll | full | full |
| Forms | single col | single col | 2 col | 2–3 col |
| Container | 16px gutter | 24px | 32px + max 1200 | 32px + max 1200 |

Touch targets ≥44px on mobile (buttons, nav items, icon buttons). Cards full-bleed on mobile with safe-area padding.

---

# 21. Accessibility (WCAG AA)

- Keyboard: full navigation (sidebar, dropdowns, dialogs, command palette, tables), visible focus rings, focus trap in modals, Escape to close.
- Screen readers: aria-labels on all icon buttons; aria-modal; roles for list/nav/dialog; `aria-live` on toasts and AI streaming.
- Contrast: text meets 4.5:1 (neutral-900 on surface; neutral-100 on dark surfaces); muted text only for supplementary content.
- Focus states: `:focus-visible` rings in `ring-primary` (globals.css `:focus:not(:focus-visible){outline:none}` already exists).
- Reduced motion: global override.
- High contrast: ensure semantic colors + text not color-alone (icons + labels); provide `data-card-border` accent as non-color indicator where useful.
- Large fonts: Cairo/Inter scale supports 200% zoom; fluid layouts; no fixed min-width on content.
- Touch targets: ≥44px interactive; ≥8px gaps.
- RTL: logical properties everywhere; no mirrored absolute positioning.

---

# 22. Empty States

Every list/data view must define an empty state. Pattern: `EmptyState` icon (tinted) + title + description + optional action.

| View | Title | Description | Action |
|------|-------|-------------|--------|
| Dashboard no data | لا توجد بيانات | لا توجد بيانات متاحة | — |
| Units empty | لا توجد وحدات | لم تُضف وحدات بعد | إنشاء (admin) |
| Lessons empty | لا توجد دروس | — | — |
| Bookings empty | لا توجد حجوزات قادمة | احجز حصة مباشرة للبدء | احجز الآن |
| No subscription | لا يوجد اشتراك نشط | اشترك الآن للاستفادة من الحصص المباشرة | اشترك الآن |
| AI new chat | اسأل البنا AI | ابدأ محادثة جديدة للحصول على مساعدة | ابدأ محادثة جديدة |
| AI no messages | ابدأ المحادثة بكتابة رسالة أدناه | — | — |
| Mistakes empty | لا توجد أخطاء | رائع! لا توجد إجابات خاطئة حالياً | — |
| Certificates empty | لا توجد شهادات | أكمل الوحدات للحصول على شهادات | تصفح الوحدات |
| Saved PDFs empty | لا توجد ملفات محفوظة | احفظ ملفات PDF للوصول السريع | — |
| Search no results | لا توجد نتائج | جرّب كلمات مختلفة | — |
| Notifications empty | لا توجد إشعارات | — | — |
| Reports empty | لا توجد بيانات | — | — |
| Support tickets empty | لا توجد تذاكر | أنشئ تذكرة للتواصل مع الدعم | إنشاء تذكرة |

---

# 23. Loading States

| Context | Component | Behavior |
|---------|-----------|----------|
| Page shell | Skeleton blocks | Match layout shape (header, cards, rows) |
| Tables | Skeleton rows | 3–5 rows; sticky header |
| Buttons | `loading` prop | Spinner + disabled; label preserved |
| AI streaming | TypingIndicator | 3 dots bounce 150ms stagger; disable input during send |
| Upload | ProgressBar + status text | % + "جارٍ الرفع…" |
| Chart | Skeleton chart | Gray block |
| Live join | Countdown + spinner | Pre-join lobby loading |
| Refresh | pull-to-refresh (mobile) | existing |
| Dialogs | primary button loading | + body skeleton if heavy |

Global rule: never blank a section without a skeleton/loading affordance; never disable the whole page for a background refresh.

---

# 24. Error States

## 24.1 Global
- `ErrorBoundary` wraps page content (existing). Fallback screen: title "حدث خطأ غير متوقع" + "إعادة تحميل".
- Network failure: `ErrorState` with "إعادة المحاولة".
- API errors: toast (danger) + inline field errors where relevant.

## 24.2 Known Scenarios
| Scenario | UI |
|----------|-----|
| 401 session expired | Redirect to login with message |
| 403 no permission | ErrorState "ليس لديك صلاحية" + home link (hide nav items already) |
| 404 resource missing | ErrorState "غير موجود" |
| 429 rate limit | AI: ErrorState "أنت ترسل رسائل كثيرة" + retry timer |
| AI provider down | AI: ErrorState "المساعد مشغول، حاول لاحقاً" + retry |
| Payment failed | Checkout danger banner + retry |
| Payment pending | Warning banner "بانتظار التحقق" |
| Low AI credits | Amber warning + buy CTA |
| Zero AI credits | Block state + buy CTA |

## 24.3 Error Messaging Rules
- Never expose stack traces, SQL, internal exceptions, env vars (PMS §11).
- Actionable + user-friendly Arabic copy.
- Provide retry where idempotent.

---

# 25. Final Design Recommendations

## 25.1 Prioritized UI Work (evolve, don't redesign)

1. **Fix inconsistencies (F1–F4):** unify active colors (bottom nav → primary), canonical stat pills, define AI-purple-only rule, standardize progress bars (primary/teal).
2. **Wire inert actions (F6, mobile):** live "احجز حصة"/"اشترك الآن" handlers; mobile dashboard section links + homework/quiz buttons.
3. **AI chat evolution (§9):** markdown rendering, copy/retry/feedback, sources stay, streaming, suggestions, credits states, translation/grammar/vocab cards.
4. **Local avatar (F8):** replace `ui-avatars.com` with initials avatar (no external calls).
5. **Toast system (§16.3):** global toast provider; wire into all async actions.
6. **Global search (F10/§13):** command palette in header; role-scoped results.
7. **Breadcrumbs (F9/§3.6):** consistent back/breadcrumb pattern across pages.
8. **Live booking/checkout flows (§10/§11):** implement missing booking, waiting list, join lobby, checkout with manual transfer.
9. **Reports center (§12):** student/teacher views; admin tabs (financial/live/AI); export.
10. **Notifications full experience (§14):** center grouping/filters, preferences, composer, admin templates.
11. **Mobile parity (Phase 9):** port this design system (tokens, dark, RTL, Arabic, bottom nav) to Expo when Mobile MVP begins.
12. **Empty/loading/error completeness (§22–24):** audit every list view; add missing states.

## 25.2 Constraints
- No new feature work until P0 gate (migrations → commit → RAG → security → tests) per PMS §14. UI work that depends on new backend (email/SMS, refunds, coupons, live monetization) is gated accordingly.
- UI-only consistency fixes (F1–F8, toasts, avatar, breadcrumbs, search) can proceed alongside backend remediation.

## 25.3 Definition of Done (per screen)
- [ ] RTL + Arabic copy
- [ ] Dark + light mode
- [ ] Mobile + desktop responsive
- [ ] Loading / Success / Error / Empty states
- [ ] Keyboard + focus + screen-reader access
- [ ] Tokens only (no hardcoded values)
- [ ] Reuses existing components (no duplication)
- [ ] Permission-gated (no unauthorized actions visible)
- [ ] PMS + UXMS compliance

---

End of Document.
