# Prompt 8.5-B Rider Resolver Wiring Report

## Scope reviewed
- `src/hr/riderIdentityResolver.js`
- `src/import/importNormalizer.js`
- `src/operations/operationsCommon.js`
- `src/operations/assignmentService.js`
- `src/operations/swapService.js`
- `src/operations/terminationService.js`

## Resolver contract
- Resolution priority is:
  1. HR
  2. External rider master
  3. Optional external creation only when the action/import path allows it

## Confirmed wiring points
- External riders import calls `resolveRiderIdentity(...)` before deciding whether to create `externalRiders`.
- Current assignments import calls `resolveRiderIdentity(...)` before deriving `riderSource`, building rider profiles, and writing lifecycle outputs.
- Shared operational resolution logic was centralized in `src/operations/operationsCommon.js`.
- `assignmentService` now uses the shared operational rider resolver instead of the old placeholder-only lookup flow.
- `swapService` now uses the same shared resolver and can create external identity/profile when that path is allowed.
- `terminationService` preserves lifecycle status updates and assignment closure logic without reintroducing blind rider creation.

## Result
- HR-first rider identity resolution is now shared across imports and real operation flows.
- External identity creation remains opt-in by action path, not a blind default.

## Verification
- `tests/riderIdentityResolver.test.js` passed.
- `tests/assignmentService.test.js` passed.
- `tests/swapService.test.js` passed.
- `tests/terminationService.test.js` passed.
