# Prompt 8.9-B Notification Seed Report

## Isolated verification profile

- Profile used: `prompt8_9_b_ops_notifications`
- URL form used:
  - normal: `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?storageProfile=prompt8_9_b_ops_notifications&verify=8_9_b_final`
  - safe: `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?safe=1&storageProfile=prompt8_9_b_ops_notifications&verify=8_9_b_final`

## Why these notifications are real derived notifications

- The scenario is injected through `src/runtime/verificationProfiles.js`.
- `NotificationRules.deriveNotifications(...)` creates the notifications from seeded lifecycle entities.
- The isolated profile keeps `payload.notifications = []`; cards are not hard-coded into the drawer.
- Validation exists in `tests/notificationLiveOperationsCards.test.js`.

## Seeded source families proven

- Dashboard Users
  - `new_user_needs_assignment`
  - `accepted_user_without_assignment`
  - `user_pending_review`
  - `user_rejected_documents`
  - `user_missing_from_latest_snapshot`
- Current Assignments
  - `assignment_duplicate_active_rider`
  - `assignment_pending_review_user`
- Import
  - warning batch `import_warning_batch_prompt_8_9_b_1`
  - saved batch `import_saved_batch_prompt_8_9_b_1`

## Required route metadata proven

- Dashboard Users cards carried:
  - `linkedPage = operations-shell`
  - `linkedSubPage = needs_assignment` or `dashboard_users`
  - filters including `courierId`, `ownerIqama`, readiness/lifecycle, `register`, `city`, `platform`
- Current Assignments cards carried:
  - `linkedPage = operations-shell`
  - `linkedSubPage = current_assignments`
  - filters including `assignmentId`, `actualRiderIqama`, `courierId`, `vehicleSerial`, `register`, `city`, `platform`
- Import cards carried:
  - `linkedPage = import-center`
  - filters including `batchId`, `importType`, `templateId`

## Default runtime behavior remains unchanged

- The isolated scenario only activates for the dedicated profile path.
- `default_runtime` still does not resolve this scenario.
- This continuation did not add fake production notifications or drawer-only shortcuts.

## Continuation patch

- `src/runtime/verificationProfiles.js` now explicitly accepts `verify=8_9_b_final` for `prompt8_9_b*` verification profiles.
- `tests/notificationLiveOperationsCards.test.js` now asserts the `8_9_b_final` path.
