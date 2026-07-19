# Prompt 2 Test Review

## Current Test Files

1. `tests/keeta_operations_portal_tests.js`
- Covers salary, shift assignment, rider ID parsing, vehicle conflicts, and fleet reporting.
- Uses sample and deterministic in-memory test data.

2. `tests/keeta_operations_portal_v6_tests.js`
- Covers formula engine, status review engine, performance normalization, VDA logic, face verification logic, delivery experience logic, and OPR normalization/actions.
- Uses sample and synthetic test data.

3. `tests/keeta_operations_portal_v9_tests.js`
- Covers real workbook family detection plus real monthly-closing normalization and settlement/export/archive behavior.
- Uses real local workbook inputs already placed in the workspace.

4. `tests/dataStore.test.js`
- Covers `save`, `getAll`, `upsert`, `remove`, `query`, adapter metadata/fallback behavior, and migration summary exposure.
- Uses sample test data.

5. `tests/localDb.test.js`
- Covers `readCollection`, `writeCollection`, `upsert`, `backup`, and invalid entity rejection for the Node JSON database.
- Uses local temp/runtime test data.

6. `tests/rbac.test.js`
- Covers city access, role permission checks, row scope filtering, and register alias matching.
- Uses synthetic RBAC fixtures.

7. `tests/apiSmoke.test.js`
- Covers `/api/health`, `/api/data/users`, `/api/auth/login`, and `/api/audit`.
- Uses local dev server runtime plus local JSON collections.

## Current Coverage Assessment

1. UI redesign coverage
- There is no dedicated automated browser test file for the full UI redesign.
- Current UI assurance comes from manual smoke verification plus behavior-level Node tests.

2. Organization context coverage
- Partial coverage exists through RBAC row filtering and manual UI smoke.
- There is no dedicated automated browser test for modal selection flows.

3. Storage coverage
- Covered by `tests/dataStore.test.js` and `tests/localDb.test.js`.

4. Permissions coverage
- Covered by `tests/rbac.test.js`.
- Also manually verified in-browser with `ops.jeddah` and `viewer.demo`.

5. Monthly closing coverage
- Covered by `tests/keeta_operations_portal_v9_tests.js`.

## Commands Verified

1. `node .\tests\keeta_operations_portal_tests.js`
2. `node .\tests\keeta_operations_portal_v6_tests.js`
3. `node .\tests\keeta_operations_portal_v9_tests.js`
4. `node .\tests\dataStore.test.js`
5. `node .\tests\localDb.test.js`
6. `node .\tests\rbac.test.js`
7. `node .\tests\apiSmoke.test.js`
8. `npm run test:all`

## Latest Results

`npm run test:all` passed on 2026-07-10.

Summary:
- legacy tests: passed
- data layer tests: passed
- RBAC tests: passed
- API smoke tests: passed

## Coverage Gaps

1. No automated browser/UI regression suite for:
- organization selector modal interactions
- header context rendering
- sidebar navigation states
- Prompt 2 cards inside settings shell

2. No automated tests yet for:
- audit log rendering in the browser
- import registry duplicate review UI
- logout edge cases in the UI
- export side effects in the browser shell

3. No API auth-hardening tests
- expected, because current API is explicitly dev-only

## Recommended Next Tests

1. Add a browser automation smoke suite for:
- super admin
- `ops.jeddah`
- `viewer.demo`

2. Add a dedicated organization selector test for:
- all cities
- single city
- multi-register selection
- out-of-scope options disabled

3. Add UI-level audit log assertions:
- login switch
- export event
- import open/select event

4. Add a test for operations row scoping against register label/code aliases
- this bug was found during Prompt 2 smoke and fixed
