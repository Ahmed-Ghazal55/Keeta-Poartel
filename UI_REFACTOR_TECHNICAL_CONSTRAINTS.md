# UI Refactor Technical Constraints

Date: 2026-07-14
Scope: mandatory constraints for Prompt 8.5 onward

## Core implementation boundary

Prompt 8.5 and later may change UI structure, shared components, and page composition, but must not casually rewrite stable business logic.

## Technology constraints

- Keep the current HTML, CSS, and vanilla JavaScript architecture.
- Do not introduce React, Vue, Angular, or a new application framework.
- Do not add a new state-management library for work that existing runtime state can handle.
- Do not add a new UI component framework that would compete with the current shell.

## Data and storage constraints

- All persistent writes must continue through `DataStore`, repositories, and service layers.
- Do not write directly to `localStorage`.
- Browser mode must continue using the approved browser storage path.
- Node local DB sync must remain optional and non-blocking.
- If local DB or dev API is unavailable, the UI must continue in fallback mode without retry storms.

## Audit constraints

- The audit policy established in Prompt `8.4-A` is permanent.
- UI rendering, route changes, safe-mode banners, notifications, page hydration, filters, and search must remain audit-silent.
- Only real business mutation services may request audit writes.
- Do not add direct audit writes inside UI click handlers or view-render helpers.
- If a new workflow needs auditing, the write belongs in the service layer and must be allowlisted intentionally.

## RBAC constraints

- Permission enforcement must stay in service and mutation layers, not UI alone.
- The UI may hide or disable actions for clarity, but that is not sufficient protection.
- Any new operation drawer or batch action added in later prompts must pass through existing RBAC patterns.

## Runtime constraints

- Runtime initialization must stay idempotent.
- Do not reintroduce duplicate interval, listener, notification-panel, or topbar injection problems.
- Live clock updates must stay text-only and lightweight.
- Page switching must not rebuild unrelated module pages.

## Rendering constraints

- Lazy-render only the active route or active subpage.
- Hidden tables must not render eagerly.
- Default large-table rendering must remain limited and paginated or load-more based.
- Search and filter controls must be debounced where appropriate.
- Do not recompute every derived field on every render pass.

## Routing constraints

- One sidebar item must map to one clear page or subpage state.
- Avoid route alias drift between menu definitions and route maps.
- Breadcrumbs and page titles should derive from one shared route definition where possible.
- Future refactor work should consolidate route metadata instead of duplicating labels in many places.

## Import constraints

- `importTemplateRegistry` remains the source of truth for known import types.
- Import Center continues to own template matching, header mapping, preview, validation, and save.
- Unknown files must not bypass mapping review and save directly.
- Curated pages should consume normalized entities only.

## Safe-mode constraints

- Safe mode remains a recovery path and debug aid.
- Normal mode is the default user experience target.
- New shell work must function in normal mode first and degrade safely in safe mode.
- Safe mode must not become the place where core data workflows work differently unless explicitly documented.

## CSS and layering constraints

- Overlay values must remain centralized in `src/ui/layering.js`.
- Do not hard-code new modal, drawer, dropdown, or toast z-index values.
- Page-specific CSS should consume shared tokens instead of inventing one-off layout constants.
- Header containment limits from Prompt 8.2 remain in force.

## Performance constraints

- Do not parse Excel files on page load.
- Do not scan all import templates during unrelated page renders.
- Do not pre-hydrate every collection for every module.
- Expensive computed caches must be invalidated by data change, not by clock ticks or route changes.

## Testing constraints

- Existing passing suites must remain green, especially:
  - `npm run test:audit`
  - `npm run test:ui`
  - `npm run test:all`
- Any new shared UI primitive introduced later should receive targeted tests when feasible.
- Browser verification remains required for shell-heavy changes because layout regressions are a primary risk.

## Prompt 8.5 design constraints distilled

- Rebuild the shell from stable primitives instead of patching random page fragments.
- Separate raw import experience from curated business views.
- Surface issues and notifications as derived states, not as direct storage artifacts from viewing a page.
- Standardize tables, filters, drawers, and headers before expanding business features.
