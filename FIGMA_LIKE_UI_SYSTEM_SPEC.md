# Figma-Like UI System Spec

Date: 2026-07-14
Scope: planning specification for Prompt 8.5 through 8.14

## Product posture

The portal should feel like a serious logistics operations console for Saudi delivery operations:

- Arabic-first and RTL by default
- dense but readable
- fast to scan
- structured around actions, status, and exceptions
- visually consistent across operations, HR, fleet, performance, rules, imports, and closing

## Shell anatomy

The future shell should be composed of these stable regions:

1. `app-shell`
   - root layout container

2. `app-topbar`
   - brand
   - current organization context trigger
   - runtime chips
   - notifications trigger
   - current user chip

3. `app-sidebar`
   - module accordion only
   - one active route at a time
   - no organization selectors inside it

4. `app-context-bar`
   - current city scope
   - current register scope
   - platform or mode chips when relevant
   - breadcrumbs when the route has subpages

5. `app-page-header`
   - page title
   - short operational description
   - page-local actions only

6. `app-filter-bar`
   - filter fields that change by module
   - search
   - reset
   - saved or pinned filter chips later if needed

7. `app-page-body`
   - KPI strip
   - primary table or primary board
   - optional secondary panels

8. `app-drawer-layer`
   - details drawers
   - action drawers
   - confirm flows

## Component families

### 1. Brand and topbar components

- `topbar-brand`
  - logo mark
  - company name
  - optional platform scope chip

- `organization-context-trigger`
  - shows compact current selection
  - opens tree selector modal or drawer
  - must support all cities, single city, multi-city, all registers, single register, multi-register, and work mode

- `runtime-chip-row`
  - live time
  - last update
  - storage mode
  - current user
  - notification trigger

### 2. Navigation components

- `sidebar-group`
  - module label
  - collapse or expand affordance

- `sidebar-item`
  - route label
  - optional issue count badge
  - strong active state

- `breadcrumb-strip`
  - appears only when useful
  - reflects module > subpage path

### 3. Page scaffolding components

- `page-header`
  - compact height
  - no landing-page treatment

- `kpi-strip`
  - 2 to 6 compact KPI cards
  - each card answers one operational question
  - cards may link to filtered tables

- `section-toolbar`
  - title
  - row count
  - small actions like export or refresh

### 4. Filter and search components

- `filter-select`
- `filter-search`
- `filter-date-range`
- `filter-chip`
- `filter-reset`
- `filter-presets` later if needed

Rules:

- Filters are page-local.
- Global organization context is not duplicated as a normal filter control.
- Search inputs must be debounced.
- Filter state must not create audit events.

### 5. Data display components

- `app-table`
  - sticky key columns when necessary
  - density options later if needed
  - pagination or load-more
  - column visibility
  - sort indicators
  - empty states

- `status-pill`
  - working
  - stopped
  - pending
  - terminated
  - valid
  - invalid
  - warning
  - issue

- `metric-card`
  - label
  - main number
  - delta or qualifier
  - click target only when meaningful

- `inline-action-menu`
  - swap
  - assign
  - terminate
  - review
  - open details
  - should stay consistent across modules

### 6. Drawer system

- `details-drawer`
  - summary header
  - identity block
  - tabbed content or stacked sections
  - audit section when relevant

- `action-drawer`
  - mutation form
  - explicit validation
  - confirm step when needed

Rules:

- Drawers are preferred over route changes for row detail.
- Drawers must use centralized layering values from `src/ui/layering.js`.
- Closing a drawer must not trigger unnecessary rerenders or audits.

### 7. Import Center components

- `import-batch-dropzone`
- `template-match-summary`
- `header-mapping-panel`
- `validation-summary`
- `raw-preview-table`
- `save-import-action`
- `template-requirements-drawer`

Rules:

- Import Center is the only place where raw input should dominate the UI.
- Unknown headers require review before save.
- Curated pages never display header-mapping UI.

### 8. Issue and notification components

- `notification-bell`
- `notification-drawer`
- `issue-summary-card`
- `issue-severity-pill`
- `issue-link-chip`

Rules:

- Notifications are derived indicators.
- Viewing them does not create an audit event.
- Issue rows should deep-link to the exact module or record context.

### 9. Empty, loading, recovery, and safe-mode states

- `inline-loading-state`
- `table-empty-state`
- `recoverable-error-panel`
- `safe-mode-banner`

Rules:

- Safe mode remains a recovery layer, not the normal browsing experience.
- Normal mode should present stable, compact UI without debug clutter.

## Density and spacing model

- Topbar: compact application-toolbar style
- Page header: compact summary only
- Filters: one row on desktop whenever possible
- KPI strip: shallow cards, not stacked marketing tiles
- Tables: operational density first, with enough breathing room for Arabic text
- Drawers: clear sectional separation with compact headers

## Visual behavior rules

- Use strong contrast for status and risk only, not everywhere.
- Reserve gold or accent emphasis for alerts, counts, and key actions.
- Keep cards flat or lightly elevated rather than heavily decorative.
- Motion should be subtle and limited to drawer, dropdown, and context changes.

## Responsive expectations

### Desktop

- Sidebar visible
- Topbar runtime stays in one compact row
- Filter bars stay horizontal when possible
- Main page shows KPI strip plus one primary table comfortably

### Tablet

- Sidebar may collapse
- Filter bar can wrap to two rows
- Drawer width becomes medium

### Mobile

- Header remains compact
- Runtime chips wrap without becoming tall cards
- Sidebar becomes off-canvas
- Tables may switch to horizontal scroll or key-column priority

## Consistency rules for every module

- One page title
- One page-local action cluster
- One primary table or primary board
- One consistent row action pattern
- One drawer standard
- One issue surfacing pattern

## Anti-patterns explicitly prohibited

- Landing-style heroes inside working pages
- Repeating the same counts in multiple card rows
- Mixing raw import mapping controls into business pages
- One subpage route reusing the exact same table body as several unrelated subpages without visible differentiation
- Topbar widgets rendering outside their container
- New overlay z-index values outside `src/ui/layering.js`
