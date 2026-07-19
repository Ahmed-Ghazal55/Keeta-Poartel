# Current Assignments Vehicle Usage Link Report

## Files in scope
- `src/operations/assignmentWorkflowSupport.js`
- `src/operations/assignmentService.js`
- `src/operations/swapService.js`
- `src/operations/terminationService.js`
- `src/operations/currentAssignmentsViewModel.js`
- `tests/assignmentService.test.js`
- `tests/swapService.test.js`
- `tests/terminationService.test.js`

## Confirmed linkage behavior
- Current assignment rows display the active vehicle usage summary when available.
- First assignment can open a vehicle usage period when vehicle details are present.
- Swap closes the old usage period and opens the new usage period when the vehicle changes.
- Stop / termination closes active vehicle usage periods.

## Display behavior
- Registered dashboard vehicle and actual operating vehicle remain distinct.
- Current row model exposes a combined actual vehicle summary for operations review.
- Missing company-vehicle linkage falls back to private / unknown display instead of deleting prior company vehicle history.

## Service coverage confirmed
- `tests/assignmentService.test.js`
  - verifies opened vehicle usage period and normalized assignment data
- `tests/swapService.test.js`
  - verifies old usage close + new usage open on replacement
- `tests/terminationService.test.js`
  - verifies usage close when assignment is ended
- `tests/currentAssignmentsViewModel.test.js`
  - verifies current row summary uses vehicle usage linkage in display state

## Result
- Vehicle usage linkage required by Prompt 8.8 is in place.
- Financial deduction logic is still intentionally out of scope.
