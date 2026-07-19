# Audit Write Callsite Review

Date: 2026-07-14

## Summary

The hotfix removed or guarded every known audit write path that could behave like runtime telemetry instead of a real business mutation log.

## Reviewed callsites

| File | Function / Path | Old behavior | Decision | Reason |
| --- | --- | --- | --- | --- |
| [keeta_operations_portal_ui_redesign.js](D:/keeta%20operations%20portal/keeta_operations_portal_ui_redesign.js) | `recordAuditEvent(...)` and legacy callers | Attempted audit writes for UI-only actions such as open import center, export, open archive, and legacy demo actions | `guard` | Helper now returns early unless event type is allowlisted and source is not forbidden; it also re-renders the audit card only if a row was really created |
| [src/auth/devSession.js](D:/keeta%20operations%20portal/src/auth/devSession.js) | `login(...)`, `logout(...)` | Dev session changes attempted audit writes | `remove` | Dev login/logout are not business operations for operations log |
| [src/import/importBatchService.js](D:/keeta%20operations%20portal/src/import/importBatchService.js) | import save flow | One import save could create multiple audit rows per entity and recalculation path | `guard + reduce` | Imports now create one allowlisted batch-level audit row only |
| [src/import/importAudit.js](D:/keeta%20operations%20portal/src/import/importAudit.js) | import audit mapping | Older generic/legacy action names | `keep with remap` | Import audit now maps to allowlisted business event types only |
| [src/fleet/fleetOperationsIntegration.js](D:/keeta%20operations%20portal/src/fleet/fleetOperationsIntegration.js) | `rebuildDerivedCollections(...)` | Derived rebuild path could create audit-like rows | `remove` | Derived fleet rebuild is read/compute work, not a business mutation |
| [src/fleet/fleetOperationsIntegration.js](D:/keeta%20operations%20portal/src/fleet/fleetOperationsIntegration.js) | `markVehicleUnderReview(...)`, `excludeVehicle(...)` | Real mutation paths | `keep` | Both are true business mutations and remain allowlisted |
| [src/performance/performanceRecalculationService.js](D:/keeta%20operations%20portal/src/performance/performanceRecalculationService.js) | recalculation/derived row writes | Derived performance/validity steps could create multiple audit rows | `guard + reduce` | Only explicit finalization may create one allowlisted row; startup/import recalculation remains audit-silent |
| [src/rules/monthlyRulesService.js](D:/keeta%20operations%20portal/src/rules/monthlyRulesService.js) | create/update/clone/activate/lock/archive/export/unlock | Legacy actions included export/unlock/validation-style audit writes | `keep selective` | Only `created`, `published`, `locked`, and `archived` remain audited; export/unlock/validation failure do not |
| [src/data/devDataReset.js](D:/keeta%20operations%20portal/src/data/devDataReset.js) | reset requested/completed/failed | Reset could emit more than the required business lifecycle | `keep selective` | Only `dev_data_reset_requested` and `dev_data_reset_completed` remain |
| [keeta_operations_portal_operations_extension.js](D:/keeta%20operations%20portal/keeta_operations_portal_operations_extension.js) | `buildDataModel()` | Page read path could trigger fleet rebuild side effects | `remove` | Opening Operations Log must stay read-only |
| [src/notifications/notificationCenter.js](D:/keeta%20operations%20portal/src/notifications/notificationCenter.js) | derived notification sync | Could be confused with audit lifecycle | `keep separate` | Notification derivation stores notifications only; it does not create audit rows |
| [src/data/browserRuntime.js](D:/keeta%20operations%20portal/src/data/browserRuntime.js) | startup bootstrap, cleanup, derived rebuild bootstrap | Runtime bootstrap could be mistaken for an audit source | `keep with silent behavior` | Startup may clean/quarantine or rebuild derived data, but it does not create business audit rows |

## Net result

- Operations Log page is read-only.
- Startup/runtime paths no longer create audit rows.
- Real mutation services still create one allowlisted row with a stable idempotency key.
