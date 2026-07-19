# Dashboard Users Issues And Notifications Report

## Issue derivation source
- `src/operations/assignmentReadinessService.js`

## Issue codes prepared in Prompt 8.7
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

## Notification behavior
- Dashboard user issues now feed notification derivation.
- Derived notifications are emitted through the notification center path.
- This remains non-auditing behavior.

## Audit safety
- Issue derivation does not create audit rows.
- Notification derivation does not create audit rows.
- Audit remains reserved for confirmed mutations only.

## Verified by tests
- `tests/notificationCenter.test.js`
  - dashboard user readiness issues produce operations notifications
- `tests/dashboardUsersAuditSafety.test.js`
  - notification derivation leaves audit log count unchanged
