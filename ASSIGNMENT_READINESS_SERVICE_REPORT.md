# Assignment Readiness Service Report

## Service module
- `src/operations/assignmentReadinessService.js`

## Main responsibilities
- Calculate assignment readiness per dashboard user.
- Keep owner identity separate from actual rider identity.
- Read active assignments before allowing assign/swap/stop decisions.
- Derive issues for notifications and review queues.
- Decorate dashboard user rows for UI usage without writing audit records.

## Returned readiness shape
- `courierId`
- `platform`
- `register`
- `city`
- `ownerIqama`
- `ownerName`
- `lifecycleStatus`
- `readinessStatus`
- `readinessReason`
- `hasActiveAssignment`
- `currentAssignmentId`
- `actualRiderIqama`
- `actualRiderName`
- `riderSource`
- `canAssign`
- `canSwap`
- `canStop`
- `canDismiss`
- `issues`

## Supported readiness statuses
- `ready_for_assignment`
- `already_assigned`
- `under_review`
- `rejected`
- `dismissed`
- `missing_from_latest_snapshot`
- `blocked_missing_owner_iqama`
- `blocked_missing_required_documents`
- `blocked_register_city_scope`
- `needs_manual_review`

## Confirmed behavior
- Accepted active user with HR owner and no assignment:
  - `ready_for_assignment`
- Accepted active user with active assignment:
  - `already_assigned`
- Pending review:
  - `under_review`
- Rejected:
  - `rejected`
- Missing from latest snapshot:
  - `missing_from_latest_snapshot`
- Terminated/dismissed:
  - `dismissed`
- Missing owner iqama:
  - `blocked_missing_owner_iqama`
- Owner not found in HR:
  - `needs_manual_review` unless the record is still in the initial `new` state

## Derived issue codes
- `new_user_needs_assignment`
- `user_pending_review`
- `user_rejected_documents`
- `user_missing_from_latest_snapshot`
- `blocked_missing_owner_iqama`
- `owner_not_found_in_hr`
- `accepted_user_without_assignment`
- `assignment_exists_for_dismissed_user`
- `actual_rider_missing_profile`
- `register_city_scope_mismatch`

## Verified by tests
- `tests/assignmentReadinessService.test.js`
