# Termination Rules

## Service

- `src/operations/terminationService.js`

## Required Permission

- `operations.terminate`

## Required Input

- `reason` is mandatory

## Supported Actions

- `terminate`
- `stop_without_replacement`
- `mark_missing_from_dashboard`
- `cancel_assignment`

## Result Mapping

- `terminate` -> `statusAfter = terminated`
- `stop_without_replacement` -> `statusAfter = not_working`
- `mark_missing_from_dashboard` -> `statusAfter = missing_from_latest_import`
- `cancel_assignment` -> `terminationType = duplicate_cleanup`

## Assignment Handling

If an active assignment exists:

- it is closed
- status becomes `ended` or `cancelled` depending on action

No dashboard user or rider record is deleted.

## Writes Performed

Successful termination flow creates or updates:

- `assignments`
- `dashboardUsers`
- `terminations`
- `assignmentHistory`
- `riderArchiveEvents` when a rider link exists
- `auditLogs`

## Dashboard User State After Success

- `currentAssignmentId` cleared
- `returnDate` set
- `reviewStatus` updated according to action
- `recommendedAction` updated according to action

## Audit Actions

- `terminate_user`
- `stop_without_replacement`

Validation rejections are recorded as:

- `operation_rejected_validation`
