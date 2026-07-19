# Design Tokens Proposal

Date: 2026-07-14
Scope: planning proposal only

## Token goals

- support Arabic RTL operational density
- keep the interface professional and calm
- make status states instantly scannable
- keep shell and module pages visually consistent
- avoid ad-hoc per-page color or spacing choices

## Color tokens

### Brand foundation

- `--color-brand-navy-900`
  - primary shell background and high-emphasis surfaces
- `--color-brand-navy-800`
  - sidebar and topbar secondary surfaces
- `--color-brand-gold-500`
  - highlight, focus accent, important counters
- `--color-brand-green-600`
  - positive operational state and completion

### Neutral scale

- `--color-surface-base`
- `--color-surface-muted`
- `--color-surface-elevated`
- `--color-surface-overlay`
- `--color-border-subtle`
- `--color-border-strong`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-text-muted`

### Semantic status tokens

- `--color-success-bg`
- `--color-success-fg`
- `--color-warning-bg`
- `--color-warning-fg`
- `--color-danger-bg`
- `--color-danger-fg`
- `--color-info-bg`
- `--color-info-fg`
- `--color-neutral-status-bg`
- `--color-neutral-status-fg`

### Module accent tokens

These should be subtle identifiers, not full page theme swaps.

- `--color-module-operations`
- `--color-module-performance`
- `--color-module-rules`
- `--color-module-hr`
- `--color-module-fleet`
- `--color-module-shifts`
- `--color-module-imports`
- `--color-module-settings`

## Typography tokens

- `--font-family-ui`
  - Arabic-capable UI font stack
- `--font-family-mono`
  - IDs, serials, plates, timestamps

- `--font-size-2xs`
- `--font-size-xs`
- `--font-size-sm`
- `--font-size-md`
- `--font-size-lg`
- `--font-size-xl`

- `--font-weight-regular`
- `--font-weight-medium`
- `--font-weight-semibold`
- `--font-weight-bold`

- `--line-height-tight`
- `--line-height-normal`
- `--line-height-relaxed`

## Spacing tokens

- `--space-1`
- `--space-2`
- `--space-3`
- `--space-4`
- `--space-5`
- `--space-6`
- `--space-8`
- `--space-10`
- `--space-12`

Usage guidance:

- topbar runtime chips should use the smaller spacing steps
- filter bars and section toolbars should use mid-range spacing
- drawers and content sections should use larger spacing between logical blocks

## Radius tokens

- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--radius-pill`

Usage guidance:

- tables and cards: small to medium radius
- drawers and panels: medium radius
- status pills and runtime chips: pill radius

## Shadow tokens

- `--shadow-xs`
- `--shadow-sm`
- `--shadow-md`
- `--shadow-lg`

Usage guidance:

- default cards should use minimal or no shadow
- overlays and drawers should use elevated shadow tokens

## Layout tokens

- `--topbar-height`
  - target compact runtime-contained topbar
- `--sidebar-width`
- `--sidebar-collapsed-width`
- `--page-max-width`
- `--page-gutter`
- `--filter-bar-min-height`
- `--kpi-card-min-width`
- `--drawer-width-md`
- `--drawer-width-lg`

Recommended planning ranges:

- `--topbar-height`: 88px to 104px normal target
- large screens must still respect the previously established header containment limit

## Table tokens

- `--table-row-height-compact`
- `--table-row-height-regular`
- `--table-header-height`
- `--table-cell-padding-x`
- `--table-cell-padding-y`
- `--table-sticky-shadow`

## Motion tokens

- `--motion-fast`
- `--motion-normal`
- `--motion-slow`
- `--easing-standard`
- `--easing-emphasized`

Usage guidance:

- drawer open or close
- dropdown reveal
- notification panel reveal

Do not animate table rerenders, KPI recomputation, or page data refresh in a way that hides slow logic.

## Z-index and layering tokens

Do not create separate ad-hoc z-index tokens in CSS.

The single source of truth remains:

- `src/ui/layering.js`

CSS may mirror semantic names, but runtime values must stay aligned with that file.

## State tokens

- `--focus-ring-color`
- `--focus-ring-width`
- `--disabled-opacity`
- `--loading-opacity`
- `--selected-outline-color`
- `--danger-outline-color`

## Token governance rules

- No new page may invent custom spacing or color variables if a shared token exists.
- Status pills must use semantic tokens, not arbitrary per-module colors.
- Module accents must never override danger, warning, or success semantics.
- Topbar, sidebar, and drawer sizing must stay token-driven.
- Prompt 8.5 should define tokens centrally before large layout rewrites start.
