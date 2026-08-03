# Design System

> Last Updated: 2026-07-29

## Overview

Tokens are defined in `apps/web/src/app/globals.css` via the TailwindCSS v4 `@theme` directive.

## Color Tokens

### Brand Palettes

| Token | Range | Usage |
|-------|-------|-------|
| `primary-{50..900}` | Cyan scale | Primary brand elements, CTAs, active states |
| `secondary-{50..900}` | Blue scale | Secondary buttons, links, info cards |

### Semantic Colors

| Token | Range | Usage |
|-------|-------|-------|
| `success-{50..900}` | Green | Positive states, completion, correct answers |
| `warning-{50..900}` | Orange | Warnings, pending states, medium priority |
| `danger-{50..900}` | Red | Errors, destructive actions, incorrect answers |
| `info-{50..900}` | Sky | Informational banners, tips, neutral notifications |

### Extended Colors

| Token | Range | Usage |
|-------|-------|-------|
| `amber-{50..900}` | Amber | Achievements, badges, rewards |
| `yellow-{50..900}` | Yellow | Highlights, XP displays |
| `purple-{50..900}` | Purple | Premium features, AI branding (Ask El Bannawy) |
| `teal-{50..900}` | Teal | Progress bars, stats, charts |
| `rose-{50..900}` | Rose | Error highlights, sensitive actions |

### Neutral Palette

| Token | Value | Usage |
|-------|-------|-------|
| `neutral-50` | `#fafafa` | Page background (light) |
| `neutral-100` | `#f5f5f5` | Card backgrounds, dividers |
| `neutral-200` | `#e5e5e5` | Borders, dividers |
| `neutral-300` | `#d4d4d4` | Disabled, placeholder borders |
| `neutral-400` | `#a3a3a3` | Muted text, disabled text |
| `neutral-500` | `#737373` | Secondary text |
| `neutral-600` | `#525252` | Body text (dark mode) |
| `neutral-700` | `#404040` | Borders (dark mode) |
| `neutral-800` | `#262626` | Card backgrounds (dark mode) |
| `neutral-900` | `#171717` | Primary text (light mode) |

### Surface Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-surface` | `#ffffff` | `#0c121e` | Page background |
| `--color-surface-elevated` | `#ffffff` | `#0e1422` | Card, modal, elevated surface |
| `--color-surface-muted` | `#f5f5f5` | `#1e293b` | Muted background |
| `--color-muted-foreground` | `#737373` | `#a3a3a3` | Muted text |
| `--color-ring` | `#06b6d4` | `#22d3ee` | Focus ring |
| `--color-input` | `#d4d4d4` | `#525252` | Input borders |

**Tailwind usage:**
```tsx
<div className="bg-surface dark:bg-surface-elevated" />
```

## Typography

### Font Families

| Token | CSS Custom Property | Usage |
|-------|-------------------|-------|
| `font-sans` | `--font-sans` | LTR text (Inter) |
| `font-arabic` | `--font-arabic` | RTL text (Cairo) |

Use `font-sans` or `font-arabic` classes. RTL body automatically uses Cairo via `[dir="rtl"] body { font-family: var(--font-arabic); }`.

### Size Scale

| Class | Size | Line Height |
|-------|------|-------------|
| `text-xs` | 0.75rem (12px) | 1rem (16px) |
| `text-sm` | 0.875rem (14px) | 1.25rem (20px) |
| `text-base` | 1rem (16px) | 1.5rem (24px) |
| `text-lg` | 1.125rem (18px) | 1.75rem (28px) |
| `text-xl` | 1.25rem (20px) | 1.75rem (28px) |
| `text-2xl` | 1.5rem (24px) | 2rem (32px) |
| `text-3xl` | 1.875rem (30px) | 2.25rem (36px) |
| `text-4xl` | 2.25rem (36px) | 2.5rem (40px) |

### Font Weights

| Class | Value |
|-------|-------|
| `font-normal` | 400 |
| `font-medium` | 500 |
| `font-semibold` | 600 |
| `font-bold` | 700 |

## Spacing & Layout

### Border Radius

| Class | Value |
|-------|-------|
| `rounded-sm` | 8px |
| `rounded-md` | 12px |
| `rounded-lg` | 16px |
| `rounded-xl` | 24px |
| `rounded-full` | 9999px |

### Page Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--max-width-page` | 1200px | Max content width |
| `--gutter-page` | 16px (→24px md →32px lg) | Page padding |

Use `container-page` class for page-level containers.

### Shadows

| Class | Value |
|-------|-------|
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` |
| `shadow-glass` | `0 8px 32px 0 rgb(0 0 0 / 0.08)` |

### Z-Index Scale

| Token | Value |
|-------|-------|
| `z-dropdown` | 50 |
| `z-modal` | 100 |
| `z-toast` | 150 |
| `z-tooltip` | 200 |
| `z-overlay` | 300 |

## Animation

### Duration Tokens

| Token | Value |
|-------|-------|
| `animate-duration-fast` | 150ms |
| `animate-duration-normal` | 250ms |
| `animate-duration-slow` | 300ms |

### Keyframes (available in globals.css)

- `vocab-fade-in` — `opacity: 0 → 1`
- `vocab-fade-slide-down` — `opacity + translateY(-6px) → 0`
- `vocab-fade-slide-up` — `opacity + translateY(8px) → 0`
- `sidebar-slide-in` — `translateX(100%) → 0`
- `sidebar-backdrop-in` — `opacity: 0 → 1`

## Conventions

### Writing hardcoded color values is forbidden.
Use token classes (`text-neutral-900`, `bg-primary-500`, etc.) instead of raw hex/rgba.

### Avoid overriding background on Card components.
Cards already apply gradient backgrounds per variant (e.g., `bg-gradient-to-b from-white to-neutral-50` in light mode, `bg-[rgba(14,20,34,0.94)]` in dark). Remove explicit `bg-white dark:bg-neutral-900` on Card elements.

### Use Card `interactive` prop instead of manual cursor+hover classes.
Rather than `className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"`, use `interactive` on Card when the whole card is clickable.

### Use semantic colors for meaning.
- Primary = brand actions (CTAs, links, active)
- Success = positivity, completion, correct
- Warning = caution, pending
- Danger = destructive, incorrect
- Info = neutral information

### Extended colors for accent only.
Use `purple-*` for AI features, `amber-*` for achievements, `teal-*` for progress charts.

### Dark mode
Always pair with `.dark:` variant. Most components in dark mode should use `neutral-800` or `neutral-900` for surfaces, `neutral-100` for primary text, `neutral-400`/`neutral-500` for muted text.

### RTL
- Use Tailwind logical properties: `ps-*`/`pe-*` instead of `pl-*`/`pr-*`, `ms-*`/`me-*` instead of `ml-*`/`mr-*`, `text-start`/`text-end` instead of `text-left`/`text-right`
- CSS transforms (`translate-x-*`, `-translate-x-*`) do NOT flip in RTL — use `rtl:-translate-x-*` variants when needed
- Use `inset-inline-start` / `inset-inline-end` (Tailwind: `start-*` / `end-*`) for absolute positioning

## Component API Reference

All components live in `src/components/ui/`. Every component supports:
- Light mode
- Dark mode (`.dark:` variants)
- RTL (logical properties)
- Disabled state (where applicable)
- Keyboard navigation (focus-visible ring)

### Button

```tsx
import { Button } from "@/components/ui/button";

// Variants: primary | secondary | outline | ghost | danger | success | warning | link
// Sizes: xs | sm | md | lg | xl | icon | icon-sm
// Props: loading, leftIcon, rightIcon, fullWidth
<Button variant="primary" size="md" loading={isLoading} leftIcon={<Plus />}>
  Add
</Button>
```

### Card

```tsx
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";

// Variants: default | elevated | outline | glass | gradient | premium
// Padding: none | sm | md | lg | xl
// Interactive: boolean (adds hover/active scale effect)
<Card variant="elevated" padding="md" interactive>
  <CardContent>Content</CardContent>
</Card>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge";

// Variants: primary | secondary | success | warning | danger | info
<Badge variant="success">Completed</Badge>
```

### Input

```tsx
import { Input } from "@/components/ui/input";

// Props: label, helperText, error, leftIcon, rightIcon
<Input label="Name" error="Required" leftIcon={<User />} />
```

### Select

```tsx
import { Select } from "@/components/ui/select";

// Props: label, helperText, error, options, placeholder, size (sm|md|lg)
<Select label="Grade" options={[{ value: "1", label: "Grade 1" }]} />
```

### Textarea

```tsx
import { Textarea } from "@/components/ui/textarea";

// Props: label, helperText, error
<Textarea label="Notes" />
```

### Checkbox

```tsx
import { Checkbox } from "@/components/ui/checkbox";

// Props: label, helperText, error, indeterminate
<Checkbox label="Agree" checked={true} />
```

### RadioGroup / RadioGroupItem

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// RadioGroup: name, value, onChange, label, error, helperText
// RadioGroupItem: value, label, helperText
<RadioGroup name="gender" value={gender} onChange={setGender} label="Gender">
  <RadioGroupItem value="male" label="Male" />
  <RadioGroupItem value="female" label="Female" />
</RadioGroup>
```

### Switch

```tsx
import { Switch } from "@/components/ui/switch";

// Props: label, helperText, checked, onChange
<Switch label="Notifications" checked={enabled} onChange={setEnabled} />
```

### Dialog

```tsx
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/ui/dialog";

// Props: open, onClose, title
<Dialog open={isOpen} onClose={() => setOpen(false)} title="Confirm">
  <DialogContent>Are you sure?</DialogContent>
  <DialogFooter>
    <Button onClick={handleConfirm}>Yes</Button>
  </DialogFooter>
</Dialog>
```

### Table

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### EmptyState

```tsx
import { EmptyState } from "@/components/ui/empty-state";

// Props: icon, title, description, actionLabel, onAction
<EmptyState
  icon={<BookOpen />}
  title="No data"
  description="No items found"
  actionLabel="Add"
  onAction={handleAdd}
/>
```

### ErrorState

```tsx
import { ErrorState } from "@/components/ui/error-state";

// Props: title, description, retryLabel, onRetry
<ErrorState title="Failed to load" description={error.message} onRetry={refetch} />
```

### Skeleton

```tsx
import { Skeleton } from "@/components/ui/skeleton";

// Single prop: className (for width/height)
<Skeleton className="h-12 w-full" />

// Full-page skeleton pattern:
function Loading() {
  return Array.from({ length: 3 }, (_, i) => (
    <Skeleton key={i} className="h-20 rounded-xl" />
  ));
}
```
