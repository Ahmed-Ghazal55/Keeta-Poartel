# Prompt 8.11-B Precheck Report

Date: 2026-07-29
Project: `/home/ghazal/Projects/keeta operations portal`

## Starting decision

- Latest fully accepted prompt: `Prompt 8.10-B - Operations Cleanup Regression Fix`
- Prompt 8.11 decision: `B) Need Prompt 8.11-B`
- Exact remaining gap: browser-visible end-to-end activation of the five Operations row-menu actions into their distinct HR/Fleet targets.

## Confirmed green baseline

- Prompt 8.11 HR and Fleet model/UI cleanup files are present.
- Operations dropdown exposes distinct owner, actual-rider, registered-vehicle, actual-vehicle, and usage-history contexts.
- All 123 JavaScript test files passed from the current Ubuntu workspace during the read-only audit on 2026-07-29; the two tests that bind local ports passed outside the restricted network sandbox.
- Normal and safe shell proofs from Prompt 8.11 exist, but the five click-through paths were not fully proved.

## Required browser paths

1. `owner-details` -> HR owner `2444000077`.
2. `actual-rider-details` -> actual rider `2999000011`.
3. `registered-vehicle-details` -> `JED-CAR-7007 / JED-7007`.
4. `actual-vehicle-details` -> `JED-BIKE-9009 / JED-9090`.
5. `vehicle-usage-history` -> Fleet `vehicle_usage_history` with actual rider/vehicle usage context.

## Files in scope

- `package.json`
- `keeta_operations_portal_operations_extension.js`
- `keeta_operations_portal_hr_extension.js`
- `keeta_operations_portal_fleet_extension.js`
- `src/runtime/verificationProfiles.js`
- focused HR/Fleet/Operations regression tests
- Prompt 8.11-B reports and browser artifacts

## Explicitly out of scope

- Prompt 8.12 and Prompt 9
- payroll, finance, monthly closing, and shift scheduler work
- backend/database migration
- broad shell redesign
- destructive repository/data cleanup
- business mutations or new audit writes for read-only navigation

## Repository/data safety snapshot

- Branch: `main`, tracking `origin/main`.
- Starting tree is dirty with 56 modified/untracked entries.
- Existing changes are preserved; no reset, checkout, commit, bulk line-ending conversion, or destructive cleanup is authorized.
- Existing CRLF-only noise in reference files is separate from Prompt 8.11-B and must not be normalized during this work.
