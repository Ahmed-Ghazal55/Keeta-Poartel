# Performance Test Results

Date: 2026-07-12

## Prompt 7 test command

Command:

```powershell
npm run test:performance
```

Result: Passed

### Included test files

- `tests/performanceRuleResolver.test.js`
- `tests/dailyPerformanceEngine.test.js`
- `tests/mandatoryDaysEngine.test.js`
- `tests/monthlyValidityEngine.test.js`
- `tests/faceVerificationRulesAdapter.test.js`
- `tests/vdaRulesAdapter.test.js`
- `tests/deliveryExperienceRulesAdapter.test.js`
- `tests/performanceImportIntegration.test.js`
- `tests/performanceRbac.test.js`
- `tests/performanceProjection.test.js`

## Additional regression commands

### `npm run test:rules`

- Passed

### `npm run test`

- Passed
- Confirms V4 / V6 / V9 regression coverage stayed green

### `npm run test:all`

- Passed
- Includes:
  - core legacy tests
  - data
  - RBAC
  - API
  - import
  - HR
  - operations
  - monthly rules
  - performance

## Prompt 7 issues caught and fixed during execution

1. Daily valid-day rule precedence for bikes
   - Fixed by prioritizing explicit `validDayRules` values over default `vehicleRules`.

2. Delivery incentive precedence
   - Fixed by prioritizing monthly-rule `gradeScores` over imported `estimatedBonusAmount`.

3. Performance page syntax failure
   - Fixed by replacing the broken browser extension file with a clean Prompt 7 implementation.
