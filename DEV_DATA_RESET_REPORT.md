# DEV Data Reset Report

## Scope

Prompt 8 continuation added a safe developer reset path for browser data and Node local JSON data without deleting source files, templates, schemas, or reference workbooks.

## Files

- `src/data/devDataReset.js`
- `server/resetLocalDb.js`
- `tests/devDataReset.test.js`
- `keeta_operations_portal_stabilization.js`
- `package.json`

## Browser reset behavior

Browser reset is implemented through `createDevDataResetService(...)` and clears operational collections through `DataStore`.

Primary resettable entities include:

- `importBatches`
- `dashboardUsers`
- `hrProfiles`
- `riders`
- `riderIdentities`
- `riderPlatformAccounts`
- `riderArchiveEvents`
- `vehicles`
- `vehicleAssignments`
- `vehicleCapacityReviews`
- `vehicleComplianceIssues`
- `vehicleImportSnapshots`
- `vehicleMovementEvents`
- `assignments`
- `assignmentHistory`
- `operationalStatusReviews`
- `terminations`
- `performanceDaily`
- `performanceMonthly`
- `validityResults`
- `performanceIssues`
- `monthlyRules`
- `auditLogs`
- `notifications`

Core notes:

- browser reset does not delete code files
- browser reset sets demo-seed skip metadata
- browser reset records reset metadata in `DataStore`

## Node local DB reset behavior

Node reset is implemented in `server/resetLocalDb.js`.

It:

- clears only known JSON entity collections
- preserves the data directory structure
- can create a backup before reset
- re-seeds core auth collections unless `--no-reseed` is passed

It does not delete:

- `data/seed`
- `data/schema`
- templates
- uploaded reference files
- project source files

## UI integration

`keeta_operations_portal_stabilization.js` injects a Settings section:

- `Developer Data Tools`

The section renders:

- current storage mode
- reset browser data
- reset Node local DB
- reset all dev data
- backup-before-reset toggle
- confirmation flow

## Audit coverage

Reset actions record:

- `dev_data_reset_requested`
- `dev_data_reset_completed`
- `dev_data_reset_failed`

## Tests

Verified by:

- `npm run test:reset`
- `npm run test:all`

Covered scenarios:

- browser reset clears operational collections
- browser reset keeps demo-seed skip metadata
- node JSON reset clears target collections
- node JSON reset reseeds core auth data
- service safely falls back when Node local DB reset is unavailable
