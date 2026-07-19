# Current Assignments Issues and Notifications Report

## Files in scope
- `src/operations/currentAssignmentsViewModel.js`
- `src/notifications/notificationRules.js`
- `keeta_operations_portal_stabilization.js`
- `tests/currentAssignmentsIssuesNotifications.test.js`
- `tests/currentAssignmentsAuditSafety.test.js`

## Issue coverage confirmed
Current assignment issue derivation now covers the Prompt 8.8 operational issue family, including:
- duplicate active rider
- owner missing HR profile
- missing actual rider
- assignment-state mismatches
- vehicle linkage mismatches
- assignment records needing review

## Notification wiring
- `syncNotificationCenter()` now receives the lifecycle collections needed for assignment issues:
  - assignments
  - external riders
  - hr profiles
  - rider operational profiles
  - rider vehicle usage history
  - riders
  - terminations
- Current assignment issue notifications retain operations routing metadata.

## Audit safety preserved
- Issue derivation does not create audit rows.
- Notification derivation does not create audit rows.
- Read-only assignment issue inspection remains UI-safe.

## Verification
- `tests/currentAssignmentsIssuesNotifications.test.js`
  - verifies assignment issue notifications are derived without audit coupling
- `tests/currentAssignmentsAuditSafety.test.js`
  - verifies read-only interactions remain phantom-audit rejected by policy
- `npm run test:audit`
  - passed on the Prompt 8.8 closeout run

## Result
- Assignment issues now surface through notifications while preserving Prompt 8.4-A audit integrity rules.
