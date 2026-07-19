# Notification Issue Linking Report

## Result

Route metadata and issue-driven navigation wiring are implemented for operations and import flows without creating business audit rows.

## Linked targets covered in code/tests

- Dashboard Users
  - `linkedPage = operations-shell`
  - `linkedSubPage = dashboard_users` or `needs_assignment`
  - filters include `courierId`, `ownerIqama`, readiness/lifecycle, and scope
- Current Assignments
  - `linkedPage = operations-shell`
  - `linkedSubPage = current_assignments`
  - filters include `actualRiderIqama`, `assignmentId`, `vehicleSerial`, `courierId`, and scope
- Import Center
  - `linkedPage = import-center`
  - filters include `batchId`, import type, and template id where available

## UI behavior implemented

- Opening a notification routes to the correct shell/subpage.
- Opening a linked drawer is explicit only.
- Notification focus can highlight the matching row in operations UI.
- Import batches can be focused in Import Center.

## Browser verification outcome

- Manual target-page visual verification was completed for:
  - Operations Dashboard Users target
  - Operations Current Assignments target
  - Import Center target
- Live browser cards for operations issue sources were not present in the current seed, so direct live card-click proof for those two routes was not available in this run.

## Browser artifacts

- `artifacts/prompt-8-9/prompt-8-9-dashboard-user-link.png`
- `artifacts/prompt-8-9/prompt-8-9-current-assignment-link.png`
- `artifacts/prompt-8-9/prompt-8-9-import-link.png`

## Validation

- `tests/notificationIssueLinking.test.js`
- `tests/currentAssignmentsIssuesNotifications.test.js`
- `tests/dashboardUsersUi.test.js`
- `tests/currentAssignmentsUi.test.js`

All passed in this run.
