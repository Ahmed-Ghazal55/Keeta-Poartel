# Prompt 8.6 Test Results

## Commands executed
- `npm run test:hr`
- `npm run test:operations`
- `npm run test:import`
- `npm run test:audit`
- `npm run test:ui`
- `npm run test:all`

## Final result
- All listed commands passed.
- `npm run test:all` passed on `2026-07-15`.

## Prompt 8.6-specific coverage now passing
- `tests/riderResolverFacade.test.js`
  - HR resolves first
  - External resolves second
  - current assignment and vehicle usage are surfaced
  - operational profile updates round-trip
- `tests/riderOperationalProfileService.test.js`
  - external rider create/update audits once
  - HR rider cannot be duplicated into External Riders
  - HR operational profile save path works
- `tests/assignmentWorkflowRiderResolver.test.js`
  - HR assignment uses resolver output
  - unknown rider can be created as External before assignment
  - swap consumes resolver output for External rider
- `tests/externalRidersWorkflow.test.js`
  - Rider Resolver UI sections exist
  - page-level import entry buttons exist
  - page-scoped loading includes resolver entities
- `tests/uiAuditCallsiteHardening.test.js`
  - no phantom UI-side audit writes
  - legacy phantom action names are removed from active UI modules

## Regression coverage preserved
- Legacy V4/V6/V9 suites inside `npm run test` passed.
- Audit flood protection suites passed.
- Runtime/UI containment and idempotency suites passed.
