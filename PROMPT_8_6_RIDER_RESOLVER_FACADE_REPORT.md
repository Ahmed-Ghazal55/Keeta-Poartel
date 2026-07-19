# Prompt 8.6 Rider Resolver Facade Report

## Scope reviewed
- `src/hr/riderIdentityResolver.js`
- `src/operations/operationsCommon.js`
- `src/operations/assignmentService.js`
- `src/operations/swapService.js`
- `src/operations/terminationService.js`

## Implemented facade/service layer
- Added `src/riders/riderResolverFacade.js`.
- Added `src/riders/riderOperationalProfileService.js`.
- Wired both into `src/data/browserRuntime.js`.
- Exposed them through runtime so HR and Operations UI can consume one shared resolver contract.

## Repository/runtime wiring completed
- Added repository/entity support for:
  - `externalRiders`
  - `riderOperationalProfiles`
  - `riderVehicleUsageHistory`
- Added runtime seed data for all three entities in browser mode.
- Added page-scoped loading coverage so resolver-dependent pages do not need full-app hydration.

## Required resolver behavior now covered
- Iqama is normalized before lookup.
- Resolution order is:
  - HR first
  - External second
  - Unknown third
- HR riders cannot be duplicated into `externalRiders`.
- Shared operational fields are stored in `riderOperationalProfiles`.
- External identity create/update is separated from shared operational profile updates.
- Assignment/swap preparation can allow inline external creation only when the iqama is unknown.

## View-model contract delivered
- Resolver outputs the shared UI contract with identity, operational fields, warnings/issues, current assignment summary, and current vehicle summary.
- Current links and vehicle usage are exposed through the same facade path, so HR and Operations draw from the same logic.

## Evidence
- `tests/riderResolverFacade.test.js` passed.
- `tests/riderOperationalProfileService.test.js` passed.
- `tests/riderIdentityResolver.test.js` still passed, confirming no regression in older HR logic.
