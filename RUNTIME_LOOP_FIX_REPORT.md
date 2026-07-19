# Runtime Loop Fix Report

Date: 2026-07-13
Scope: Prompt 8.3

## Root cause

The main stack overflow came from re-entrant fleet derived rebuilds:

1. Fleet rebuild wrote derived collections.
2. The patched DataStore wrapper dispatched `keeta:data-changed`.
3. Fleet extension listened to every `keeta:data-changed`.
4. Fleet rebuild was triggered again before the previous rebuild had completed.

This created recursive `save/upsert -> rebuild -> save/upsert` loops until `Maximum call stack size exceeded`.

## Fixes applied

- Removed `vehicleComplianceIssues` from fleet source-hash inputs.
- Added `fleetDerivedRebuildInFlight` guard in shared runtime state.
- Set the fleet source hash before the rebuild write cycle starts.
- Limited data-change-triggered rebuilds to source entities only.
- Kept derived-entity events render-safe without re-entering rebuild.
- Notification center already uses hash-based no-op dedupe and `notificationSyncInFlight`.
- Hydration already uses a page/entity hydration key to avoid repeated full reads.

Files changed

- `src/runtime/fleetRebuildPolicy.js`
- `keeta_operations_portal_fleet_extension.js`
- `src/notifications/notificationCenter.js`
- `keeta_operations_portal_stabilization.js`

## Result

- The stack overflow is no longer reproduced.
- Normal mode opens successfully in the in-app browser.
- Fleet render tests and full regression suite both pass.
