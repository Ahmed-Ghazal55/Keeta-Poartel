# Prompt 8.5-B Performance Attribution Report

## Scope reviewed
- `src/operations/assignmentPeriodResolver.js`
- `src/performance/performanceRecalculationService.js`

## Confirmed attribution flow
- Performance recalculation now attempts assignment-period attribution first.
- Resolution inputs include:
  - `platform`
  - `register`
  - `city`
  - `dashboardUserId` / `courierId`
  - `performanceDate`

## Assignment-period behavior
- `AssignmentPeriodResolver.resolveAssignmentForRow(...)` is called before fallback logic.
- When an assignment period matches:
  - `actualRiderIqama` is injected into the performance row
  - `riderSource` is derived from the assignment
  - `assignmentLinkStatus` becomes `assignment_period_match`
- When no assignment period matches:
  - the service falls back to the old active-assignment logic
  - `assignmentFallbackUsed` is set
  - `assignmentLinkStatus` becomes `fallback_active_assignment` or `unresolved`

## Safety behavior
- The fallback preserves previous V4/V6/V9-compatible performance flows.
- Missing rider linkage no longer depends on lifecycle imports having pre-created canonical rider rows in all cases.

## Result
- Performance attribution is now lifecycle-aware without breaking legacy fallback behavior.

## Verification
- `tests/assignmentPeriodPerformanceAttribution.test.js` passed.
- `tests/performanceImportIntegration.test.js` passed.
- `npm run test:performance` passed.
