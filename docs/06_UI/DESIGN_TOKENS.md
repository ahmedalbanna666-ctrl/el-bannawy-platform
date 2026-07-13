# DESIGN_TOKENS.md

# El-bannawy Platform
## Design Tokens

Version: 1.0.0

---

# Purpose

Defines all reusable design tokens used throughout the platform.

Tokens are the single source of truth for visual styling.

---

# Token Categories

Colors | Typography | Spacing | Radius | Shadows | Animation | Z-Index

---

# Naming Convention

Tokens follow Tailwind CSS v4 `@theme` convention in `globals.css`.

- `${category}-${variant}` → `--color-primary-500`, `--radius-xl`
- `${category}` → `--color-surface`, `--shadow-glass`
- CSS custom properties override in `.dark body` for dark-mode variants

---

# Color Tokens

## Primary (Cyan/Teal — brand accent)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary-50` | `#ecfeff` | Lightest bg tint |
| `--color-primary-100` | `#cffafe` | Hover bg light |
| `--color-primary-200` | `#a5f3fc` | Border light |
| `--color-primary-300` | `#67e8f9` | Accent text light |
| `--color-primary-400` | `#22d3ee` | Active text, icons, glow borders |
| `--color-primary-500` | `#06b6d4` | Primary buttons, links |
| `--color-primary-600` | `#0891b2` | Button hover, dark mode accent |
| `--color-primary-700` | `#0e7490` | Active state |
| `--color-primary-800` | `#155e75` | Deep bg |
| `--color-primary-900` | `#164e63` | Darkest |

## Secondary (Blue)
Standard Tailwind blue palette — used for secondary CTAs.

## Success (Green)
| Token | Value |
|-------|-------|
| `--color-success-500` | `#22c55e` |

## Warning (Orange)
| Token | Value |
|-------|-------|
| `--color-warning-500` | `#f97316` |

## Danger (Red)
| Token | Value |
|-------|-------|
| `--color-danger-500` | `#ef4444` |

## Info (Cyan — same as primary)
| Token | Value |
|-------|-------|
| `--color-info-500` | `#06b6d4` |

## Neutral (Gray scale)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-neutral-50` | `#fafafa` | Page bg light |
| `--color-neutral-100` | `#f5f5f5` | Card bg light |
| `--color-neutral-200` | `#e5e5e5` | Borders light |
| `--color-neutral-300` | `#d4d4d4` | Input borders light |
| `--color-neutral-400` | `#a3a3a3` | Muted text light |
| `--color-neutral-500` | `#737373` | Secondary text |
| `--color-neutral-600` | `#525252` | Muted text dark |
| `--color-neutral-700` | `#404040` | Borders dark |
| `--color-neutral-800` | `#262626` | Hover bg dark |
| `--color-neutral-900` | `#171717` | Text dark, sidebar bg |

## Surface Tokens (light / dark)
| Token | Light | Dark |
|-------|-------|------|
| `--color-surface` | `#ffffff` | `#0c121e` |
| `--color-surface-elevated` | `#ffffff` | `#0e1422` |
| `--color-surface-muted` | `#f5f5f5` | `#1e293b` |
| `--color-muted-foreground` | `#737373` | `#a3a3a3` |
| `--color-ring` | `#06b6d4` | `#22d3ee` |
| `--color-input` | `#d4d4d4` | `#525252` |

---

# Typography Tokens

| Token | Value |
|-------|-------|
| `--font-sans` | `var(--font-inter), "system-ui", "Arial", "sans-serif"` |
| `--font-arabic` | `var(--font-cairo), "Noto Sans Arabic", "sans-serif"` |

Inter for Latin text, Cairo for Arabic — loaded via Next.js `next/font/google`.

---

# Radius Tokens

| Token | Value |
|-------|-------|
| `--radius-sm` | `8px` |
| `--radius-md` | `12px` |
| `--radius-lg` | `16px` |
| `--radius-xl` | `24px` |
| `--radius-full` | `9999px` |

---

# Shadow Tokens

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` |
| `--shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` |
| `--shadow-glass` | `0 8px 32px 0 rgb(0 0 0 / 0.08)` |

---

# Motion Tokens

| Token | Value |
|-------|-------|
| `--animate-duration-fast` | `150ms` |
| `--animate-duration-normal` | `250ms` |
| `--animate-duration-slow` | `300ms` |

Reduced motion: all animations/transitions disabled when `prefers-reduced-motion: reduce`.

---

# Z-Index Tokens

| Token | Value | Used By |
|-------|-------|---------|
| `--z-dropdown` | `50` | Dropdown menus |
| `--z-modal` | `100` | Dialog overlays |
| `--z-toast` | `150` | Toast notifications |
| `--z-tooltip` | `200` | Tooltips |
| `--z-overlay` | `300` | Fullscreen overlays |

---

# Page Layout Tokens

| Token | Value |
|-------|-------|
| `--max-width-page` | `1200px` |
| `--gutter-page` | `16px` (→ `24px` at md, `32px` at lg) |

---

# Theme System

- Dark mode first: `<html className="dark">`
- Light mode: toggle via `useTheme()` provider → adds `.light` / removes `.dark`
- Variants: `dark:`, `light:`, `rtl:` custom variants in globals.css
- Storage: `localStorage("el-bannawy-theme")`

---

# Component Convention

All `@/components/ui/` primitives:
- Use `cn()` from `@/lib/utils` for class merging
- Use CVA (`class-variance-authority`) for variant props
- Use `forwardRef` with `displayName`
- Support `dark:`, `light:`, `rtl:` variants
- Include `aria-*`, `role`, keyboard interaction
- Use `--color-ring` token for focus rings

---

# Prohibited Patterns

- Hardcoded hex/rgb values in JSX — use tokens only
- `slate-*`, `gray-*`, `zinc-*`, `stone-*` — use `neutral-*`
- Raw `z-50` — use `--z-*` tokens
- Duplicate CSS class implementations (prefer React component + CVA)

---

# Migration Guide

When migrating a page to design tokens:

1. Replace `slate-*` → `neutral-*`
2. Replace `#22D3EE` → `primary-400` (text/icons) or `primary-500` (bg)
3. Replace `#ef4444` → `danger-500`
4. Replace `#10B981` → `success-500`
5. Replace `text-\[#...\]` with nearest semantic token
6. Replace `bg-\[#...\]` with nearest surface/neutral token
7. Use `focus-visible:ring-2 focus-visible:ring-primary-500` for focus
8. Verify dark mode and RTL on every migrated surface

End of Document.
