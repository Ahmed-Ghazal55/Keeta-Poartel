# Prompt 8.5 Next Step Decision

Date: 2026-07-15
Decision: `Decision B — Need 8.5-B Fix Prompt`

## Why Decision A is not valid

Prompt 8.5 is not ready for Prompt 8.6 yet because the review found all of the following:

- the expected Prompt 8.5 reports are missing
- exact Prompt 8.5 VCS diff reconstruction is blocked because the workspace is not a Git repository
- new lifecycle helper files exist, but they are not wired into the live import/services stack
- `external_riders` and `current_assignments` templates are missing from the template registry
- `external_riders_workbook` and `current_assignments_workbook` are missing from import types
- `externalRiders`, `riderOperationalProfiles`, `riderVehicleUsageHistory`, and `monthlyArchiveSnapshots` are missing from entity schemas
- `AssignmentPeriodResolver` is not used by the performance engine
- page-level import placeholders exist, but they only forward to the generic import center
- no tests cover the new 8.5 lifecycle helpers or contracts

## Why Decision C is not valid

Rollback/safety fix is not needed because:

- `npm run test:audit` passed
- `npm run test:ui` passed
- `npm run test:all` passed
- audit flood protection remains intact
- safe mode remains intact
- no normal-mode crash/freeze regression was detected

## Exact next prompt

```text
Prompt 8.5-B — Data Lifecycle Contract Fixes
```

## Required fixes for Prompt 8.5-B in priority order

1. Add the missing entity schemas:
   - `externalRiders`
   - `riderOperationalProfiles`
   - `riderVehicleUsageHistory`
   - `monthlyArchiveSnapshots`

2. Expand existing schemas to the required lifecycle contract:
   - enrich `dashboardUsers`
   - enrich `assignments`
   - preserve backward compatibility with current services/tests

3. Add missing import types and templates:
   - `external_riders_workbook`
   - `external_riders_csv`
   - `current_assignments_workbook`
   - `current_assignments_csv`
   - template registry entries for `external_riders`
   - template registry entries for `current_assignments`

4. Add import normalizers and save routing for:
   - external riders master
   - rider operational profile
   - current assignments
   - rider vehicle usage history where derivable

5. Wire the new helpers into live services:
   - use `RiderIdentityResolver` in import/assignment flows
   - use `AssignmentPeriodResolver` in performance attribution

6. Add dedicated tests for the new 8.5 contract:
   - external rider vs HR duplication prevention
   - current assignments import
   - actual rider attribution by date
   - new schema fields and template registration

7. Clean up remaining legacy direct UI audit callsites where possible, or leave them explicitly documented as policy-blocked technical debt

## Rebase prompt status

`CODEX_PROMPT_8_4_PROJECT_REBASE_PLANNING.md` should not be treated as the next implementation step now.

Best interpretation after this review:

- keep it as documentation/reference
- do not run it instead of 8.5-B

## Final decision summary

Prompt 8.5 preserved system safety but did not complete the requested lifecycle contract implementation.

The project should therefore move to:

```text
Prompt 8.5-B — Data Lifecycle Contract Fixes
```

and must not start Prompt 8.6 yet.
