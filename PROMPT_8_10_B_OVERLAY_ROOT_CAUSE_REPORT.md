# Prompt 8.10-B Overlay Root Cause Report

## Files inspected

- `src/ui/actionDropdown.js`
- `keeta_operations_portal_operations_extension.js`
- `keeta_operations_portal_ui_redesign.js`
- `keeta_operations_portal_stabilization.js`
- `src/runtime/verificationProfiles.js`
- `tests/operationsRowActionBrowserModel.test.js`
- `tests/operationsDetailDrawerBrowserModel.test.js`

## Root cause

- The dropdown was already rendered into a global overlay host outside `.table-wrap`, so clipping by the table wrapper was not the final blocker.
- The actual blocker was reachability of lower menu items after viewport-safe `maxHeight` and `overflowY: auto` were applied.
- In browser verification, `source-batch` and other lower actions were below the visible fold.
- When the menu was scrolled, the capturing `window` scroll listener treated that internal menu scroll like a page scroll and closed the dropdown immediately.
- Result:
  - the overlay looked unstable
  - lower actions could not be clicked reliably
  - the detail/import proof chain could not complete in the previous headless pass

## Exact fix applied

- In `src/ui/actionDropdown.js`:
  - kept the global dropdown root
  - kept viewport-constrained menu sizing
  - added stable browser-visible state markers:
    - trigger `data-action-dropdown-open`
    - menu `data-action-dropdown-menu-state`
    - root `data-action-dropdown-state`
    - root `data-open-dropdown-id`
  - updated the global scroll-close handler to ignore scroll events originating inside `ACTIVE_MENU`
- In `keeta_operations_portal_ui_redesign.js`:
  - exposed drawer state for proof and accessibility checks through `data-drawer-state`

## Why this is UI-only and read-only

- No entity mutation logic changed.
- No assignment, swap, termination, import-save, or audit-save service path changed.
- The fix only stabilizes overlay visibility and drawer/browser observability.
- The linked import route still goes through existing read-only focus navigation, not through direct data writes.

## Why service-layer behavior remains unchanged

- Mutations still flow through:
  - `assignmentService.assignRider(...)`
  - `swapService.swapRider(...)`
  - `terminationService.terminateUser(...)`
- Read-only actions remain phantom and non-auditing by policy and by tests.
