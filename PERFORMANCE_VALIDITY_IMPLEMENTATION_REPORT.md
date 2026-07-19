# Performance Validity Implementation Report

Date: 2026-07-12

## Main implementation files

### New performance modules

- `src/performance/performanceCommon.js`
- `src/performance/performanceRuleResolver.js`
- `src/performance/dailyPerformanceEngine.js`
- `src/performance/mandatoryDaysEngine.js`
- `src/performance/faceVerificationAdapter.js`
- `src/performance/vdaAdapter.js`
- `src/performance/deliveryExperienceAdapter.js`
- `src/performance/monthlyValidityEngine.js`
- `src/performance/performanceRecalculationService.js`

### UI integration

- `keeta_operations_portal_performance_extension.js`
- `keeta_operations_portal_starter_v4.html`

### Data / import / runtime integration

- `src/data/entitySchemas.js`
- `src/data/repositories.js`
- `src/import/headerMapper.js`
- `src/import/importNormalizer.js`
- `src/import/importBatchService.js`
- `src/data/browserRuntime.js`
- `src/auth/rbac.js`
- `package.json`

## Storage model added

- New schema entities:
  - `validityResults`
  - `performanceIssues`

- Expanded schema entities:
  - `performanceDaily`
  - `performanceMonthly`

- New repositories:
  - `validityResults`
  - `performanceIssues`

## Import integration

- Performance-related imports now normalize richer fields:
  - platform
  - workMode
  - completedOrders
  - cancelledOrders
  - rejectedOrders
  - workingHours
  - attendanceStatus
  - ATA metrics
  - month/date helpers

- `importBatchService` now triggers scoped recalculation for performance imports.
- Save path records `performance_import_processed`.
- Failure path records `performance_recalculation_rejected`.

## Recalculation service behavior

`runPerformanceRecalculationForScope(scope, user)` now:

1. Enforces RBAC.
2. Normalizes daily rows inside the selected scope.
3. Groups daily rows into monthly rider/user scopes.
4. Resolves applicable rules per scope.
5. Calculates:
   - daily validity
   - mandatory attendance
   - monthly projection
   - salary eligibility
   - incentive eligibility
   - face/VDA/delivery dependencies
6. Saves:
   - `performanceMonthly`
   - `validityResults`
   - `performanceIssues`
7. Resolves stale issues that no longer apply.
8. Writes audit events.

## Audit coverage added by Prompt 7

- `performance_daily_normalized`
- `performance_monthly_calculated`
- `validity_result_created`
- `validity_result_updated`
- `performance_issue_created`
- `performance_issue_resolved`
- `validity_recalculated`
- `performance_import_processed`
- `performance_recalculation_rejected`

## UI delivered in Prompt 7

The Performance page now includes:

- results / issues tabs
- month + status + vehicle + mandatory + severity + query filters
- KPI cards
- CSV export
- recalculation action
- result details drawer
- audit / reason / daily breakdown display

## Storage and architecture note

`monthlyRules` and Prompt 7 outputs continue to be stored through `DataStore` and repositories. No direct service write path to browser `localStorage` was introduced.
