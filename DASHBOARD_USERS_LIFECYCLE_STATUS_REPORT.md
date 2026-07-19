# Dashboard Users Lifecycle Status Report

## Shared lifecycle mapper
- Primary module: `src/operations/dashboardUserLifecycle.js`

## Supported statuses
- `new`
- `ready_for_assignment`
- `active_assigned`
- `active_unassigned`
- `pending_review`
- `rejected`
- `dismissed`
- `missing_from_latest_snapshot`
- `frozen`
- `needs_review`

## Inputs used by the mapper
- `Employment Status`
- `Review Status`
- `Document change status`
- `Please note`
- existing assignment state
- current assignment status
- latest import presence
- manual/status-review flags

## Confirmed mapping rules
- Not present in latest import:
  - `missing_from_latest_snapshot`
  - or `dismissed` if policy says missing means dismissal
- Out of service:
  - `dismissed`
- Frozen / hold:
  - `frozen`
- Rejected review or rejected documents:
  - `rejected`
- Manual review conflict or blocked document state:
  - `needs_review`
- Pending review:
  - `pending_review`
- Accepted + active + active assignment:
  - `active_assigned`
- New accepted + active + no assignment on first import:
  - `new`
- Accepted + active + no active assignment after first import:
  - `ready_for_assignment`
  - or `active_unassigned` if there is assignment history

## Important fix completed in 8.7
- `normalizeDocumentState()` now checks `No Change` / `clear` before generic `change` / `update`.
- This prevents `"No Change"` rows from being incorrectly pushed into blocked/manual-review lifecycle states.

## Verified by tests
- `tests/dashboardUserLifecycleStatus.test.js`
