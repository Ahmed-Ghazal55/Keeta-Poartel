# Current Assignment Actions Workflow Report

## Files in scope
- `src/operations/assignmentService.js`
- `src/operations/swapService.js`
- `src/operations/terminationService.js`
- `src/operations/assignmentWorkflowSupport.js`
- `src/riders/riderResolverFacade.js`
- `tests/assignmentService.test.js`
- `tests/swapService.test.js`
- `tests/terminationService.test.js`

## First assignment workflow
- Resolver-backed rider selection remains the entry point.
- Service stores:
  - actual rider identity
  - normalized operation mode
  - receive date
  - first online date
  - actual vehicle details
  - dashboard linkage
- Service opens a matching `riderVehicleUsageHistory` period when vehicle data exists.
- Service updates dashboard-user current rider / current assignment state.

## Swap workflow
- Current active assignment is closed.
- Replacement rider is resolved through the shared workflow support.
- A new active assignment period is opened.
- Vehicle usage is closed for the old rider/vehicle period and opened for the new vehicle period when changed.
- Duplicate-active-rider assignment is rejected.

## Stop without replacement workflow
- Active assignment is closed through `terminationService`.
- Current actual rider fields are cleared from dashboard-user active state.
- Active vehicle usage is closed.
- A reason and effective date are required in the stop UI flow.

## Dismissal / termination workflow
- Assignment history is preserved instead of being overwritten.
- Dashboard user lifecycle is transitioned into termination or dismissal follow-up state.
- Service-layer audit remains the only write source.

## Shared safety rules preserved
- Opening action drawers does not audit.
- Resolver lookup does not audit.
- Assignment is blocked when the replacement rider is already active elsewhere.
- HR riders are not duplicated into `externalRiders`.

## Test coverage used for this report
- `tests/assignmentService.test.js`
- `tests/swapService.test.js`
- `tests/terminationService.test.js`
- `tests/currentAssignmentsAuditSafety.test.js`

## Residual note
- Browser verification directly exercised swap and stop confirmation drawers.
- First-assignment browser proof remained data-limited in the seeded UI state, but the service workflow is covered by automated tests.
