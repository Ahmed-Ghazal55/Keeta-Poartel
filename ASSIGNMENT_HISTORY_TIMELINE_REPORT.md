# Assignment History Timeline Report

## Files in scope
- `src/operations/currentAssignmentsViewModel.js`
- `keeta_operations_portal_operations_extension.js`
- `tests/currentAssignmentsViewModel.test.js`
- `tests/currentAssignmentDetailDrawer.test.js`

## Timeline sources merged
- assignment history rows
- audit log rows
- termination rows

## Confirmed timeline payload support
Derived timeline rows preserve the required operational fields, including:
- `eventTime`
- `eventType`
- `courierId`
- `ownerIqama`
- old rider iqama
- new rider iqama
- `operationMode`
- `assignmentStatus`
- `vehicleSerial`
- `plateNumber`
- `reason`
- `performedBy`
- `sourceBatchId`
- `auditEventId`

## UI exposure
- Recent timeline rows are available from the Current Assignment details flow.
- History links surface:
  - assignment history
  - swap history
  - termination history
  - vehicle usage history
  - audit-linked history

## Preservation behavior
- Old periods remain preserved.
- Swap and termination events are additive, not destructive.
- History/timeline reads are read-only and non-auditing.

## Verification
- `tests/currentAssignmentsViewModel.test.js`
  - confirmed merged timeline generation from history, terminations, and audit logs
- `tests/currentAssignmentDetailDrawer.test.js`
  - confirmed timeline builder and history drawer references are wired into the UI

## Result
- Prompt 8.8 achieved visible timeline/history support sufficient for the Current Assignments workflow without prematurely building the full archive module.
