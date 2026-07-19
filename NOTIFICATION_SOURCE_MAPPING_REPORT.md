# Notification Source Mapping Report

## Result

Issue source mapping now covers stable notification content plus route metadata for Dashboard Users, Current Assignments, and Import batches.

## Dashboard Users issue coverage

Mapped issues include:

- `new_user_needs_assignment`
- `user_pending_review`
- `user_rejected_documents`
- `user_missing_from_latest_snapshot`
- `owner_not_found_in_hr`
- `accepted_user_without_assignment`
- `assignment_exists_for_dismissed_user`
- `actual_rider_missing_profile`
- `register_city_scope_mismatch`
- `blocked_missing_owner_iqama`

Each mapped notification carries:

- severity
- title/message
- `linkedPage = operations-shell`
- `linkedSubPage` such as `needs_assignment` or `dashboard_users`
- routing filters like `courierId`, `ownerIqama`, lifecycle/readiness, and scope fields

## Current Assignments issue coverage

Mapped issues include:

- `duplicate_active_rider`
- `owner_missing_hr_profile`
- `missing_actual_rider`
- `assignment_state_mismatch`
- `vehicle_linkage_mismatch`
- `assignment_needs_review`

Each mapped notification carries:

- severity
- title/message
- `linkedPage = operations-shell`
- `linkedSubPage = current_assignments`
- routing filters like `actualRiderIqama`, `assignmentId`, `vehicleSerial`, `courierId`, and scope fields

## Import batch mapping

Import warnings and successful saved batches now carry:

- `linkedPage = import-center`
- `importBatchId`
- `linkedFilters.batchId`
- template/import type metadata when available

## Files

- `src/notifications/notificationSourceMapping.js`
- `src/notifications/notificationRules.js`

## Validation

- `tests/notificationSourceMapping.test.js`
- `tests/currentAssignmentsIssuesNotifications.test.js`
- `tests/notificationCenter.test.js`

All passed in this run.
