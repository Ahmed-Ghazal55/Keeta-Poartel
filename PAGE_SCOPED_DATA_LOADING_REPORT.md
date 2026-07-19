# Page Scoped Data Loading Report

Date: 2026-07-13
Scope: Prompt 8.3

## Added runtime module

- `src/runtime/pageScopedDataLoading.js`

## Purpose

- Keep startup hydration narrow.
- Load only the entities needed by the active shell/page.
- Avoid repeated broad collection reads when the active page does not need them.

## Current behavior

- Startup uses `getStartupEntities()`.
- Route changes resolve the active page through `resolvePageEntities(pageKey)`.
- `hydrateCollections(...)` stores a hydration key and skips duplicate hydration requests.

## Result

- Hidden modules are no longer hydrated or rendered as if they were active.
- Safe mode avoids startup hydration entirely.
- UI tests confirm the dashboard and fleet scopes remain narrow.

## Test evidence

- `tests/pageScopedDataLoading.test.js`
- `tests/pageRenderController.test.js`
