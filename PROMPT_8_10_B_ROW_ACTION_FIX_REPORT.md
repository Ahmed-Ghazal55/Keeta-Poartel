# Prompt 8.10-B Row Action Fix Report

## Files changed

- `src/ui/actionDropdown.js`
- `keeta_operations_portal_ui_redesign.js`
- `keeta_operations_portal_stabilization.js`
- `keeta_operations_portal_operations_extension.js`
- `src/runtime/verificationProfiles.js`
- `package.json`
- `tests/actionDropdown.test.js`
- `tests/operationsAuditSafety.test.js`
- `tests/operationsNotificationRouteRegression.test.js`
- `tests/operationsRowActionBrowserModel.test.js`
- `tests/operationsDetailDrawerBrowserModel.test.js`
- `tests/operationsWorkflowDrawerRegression.test.js`

## Fix summary

- Stabilized the row dropdown as a real global overlay with browser-visible open-state markers.
- Prevented the menu from closing when the user scrolls inside the dropdown itself.
- Preserved viewport-constrained rendering so the menu does not overflow the screen.
- Exposed drawer open/closed state through explicit DOM attributes.
- Added a read-only `focusBatch(...)` import entry path so `Import Source Batch` can open Import Center and focus a real batch row instead of falling back silently.

## Import-source linkage hardening

- `keeta_operations_portal_stabilization.js` now exposes:
  - `Portal.ImportEntryPoint.focusBatch(...)`
- `keeta_operations_portal_operations_extension.js` now:
  - resolves source batch context from row metadata
  - opens Import Center on the linked batch when metadata exists
  - falls back to a read-only drawer if focus routing is unavailable

## Why the fix is safe

- No dropdown action was reimplemented as direct mutation code.
- No new audit callsites were introduced.
- The fix only improved:
  - overlay persistence
  - route focus
  - accessible state markers
  - browser-proof reliability

## Browser result after the fix

- The dropdown stayed open while scrolling to lower items.
- `source-batch` became visibly reachable and clickable.
- Detail and workflow drawers remained browser-visible.
- Notification regression remained clean.
