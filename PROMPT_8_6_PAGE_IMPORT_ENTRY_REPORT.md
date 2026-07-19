# Prompt 8.6 Page Import Entry Report

## Entry points added
- Rider Master / External Riders page:
  - `data-hr-import-route="external_riders_import"`
- Operations page:
  - `data-ops-import-route="dashboard_users_import"`
  - `data-ops-import-route="current_assignments_import"`

## Routing path
- Prompt 8.6 used `Portal.ImportEntryPoint.openRouteImport(...)` from `keeta_operations_portal_stabilization.js`.
- Route metadata is resolved from `src/data/lifecycleRegistry.js`.
- Import Center receives route-specific defaults instead of mutating any master entities during preview.

## Route defaults now supported
- `external_riders_import`
  - template: `external_riders`
  - default import type: `external_riders_workbook`
  - target entity: `externalRiders`
- `current_assignments_import`
  - template: `current_assignments`
  - default import type: `current_assignments_workbook`
  - target entity: `assignments`

## Mutation safety
- Opening Import Center from page-level entry is read-only.
- Preview/validation remains non-mutating.
- Approved save remains the only entity mutation path.

## Evidence
- `tests/externalRidersWorkflow.test.js` passed for entry-point presence.
- Visual evidence in `artifacts/prompt-8-6/prompt-8-6-normal.png` captured the toast:
  - `تم فتح مركز الاستيراد على مدخل Current Assignments Import`
- Operations Log visible count remained `0` in the same captured browser session, supporting that read-only entry did not create phantom audit rows.
