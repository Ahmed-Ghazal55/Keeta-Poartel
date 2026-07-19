# Prompt 8.8-B Test Consolidation Report

## Dedicated tests added
- `tests/currentAssignmentActionsWorkflow.test.js`
- `tests/assignmentHistoryTimeline.test.js`
- `tests/currentAssignmentsVehicleUsageLink.test.js`

## Package wiring updated
- Added the three tests into `package.json` under:
  - `npm run test:operations`

## Coverage now consolidated

## `currentAssignmentActionsWorkflow.test.js`
- first assignment stores normalized assignment state
- vehicle usage opens when vehicle details are provided
- swap closes old assignment and opens new assignment
- stop without replacement closes active state correctly
- confirmed mutations audit once
- read-only preparation remains phantom and UI-side audit free

## `assignmentHistoryTimeline.test.js`
- timeline merges assignment history rows
- timeline merges terminations
- timeline merges relevant audit rows
- operational fields remain preserved in timeline output
- timeline reads do not create audit rows

## `currentAssignmentsVehicleUsageLink.test.js`
- first assignment opens vehicle usage period
- swap closes prior usage and opens new usage when vehicle changes
- stop closes active usage
- missing company vehicle falls back safely in display without destroying prior history

## Consolidation outcome
- Prompt 8.8 workflow behavior is no longer only implied by older distributed service tests.
- The requested Current Assignments workflow surfaces now have dedicated named test files aligned to the prompt contract.
