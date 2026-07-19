# Dashboard Users 8.7 Contract Report

## Confirmed template order
1. `Courier ID`
2. `Courier qualification type`
3. `First Name`
4. `Last Name`
5. `ID Number`
6. `Phone Number`
7. `Email`
8. `Vehicle`
9. `Employment Status`
10. `Review Status`
11. `Document change status`
12. `Please note`
13. `Settlement mode`
14. `Operations city`
15. `register`

## Contract decisions
- `Courier ID` remains the dashboard/platform user key.
- `First Name` and `Last Name` are stored separately.
- `fullName` is derived for display from `First Name + Last Name`.
- `ID Number` maps to the owner iqama.
- Records retain operational scope fields:
  - `register`
  - `city` / `operationsCity`
  - `platform`
  - `sourceBatchId`
  - `firstSeenAt`
  - `lastSeenAt`
  - `lifecycleStatus`

## Supporting implementation
- `src/import/headerMapper.js`
  - added/verified aliases for:
    - `Phone Number`
    - `Employment Status`
    - `Please note`
    - `Operations city`
- `src/import/importNormalizer.js`
  - normalizes Dashboard Users rows into `dashboardUsers`.
- `src/data/entitySchemas.js`
  - schema updated for Prompt 8.7 fields used by lifecycle/readiness/UI.

## Validation status
- Prompt 8.7 import contract is covered by:
  - `tests/importTemplateRegistry.test.js`
  - `tests/dashboardUsersImportRoute.test.js`
  - `tests/lifecycleEntitySchemas.test.js`
