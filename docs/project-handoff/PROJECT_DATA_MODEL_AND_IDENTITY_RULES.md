# Project Data Model and Identity Rules

## Scope key

The governing scope is register + city + platform + month/cycle. Cycle start/end dates refine the monthly window. Builders must filter or block scope mismatches rather than merge them. Source: `PROMPT_8_14_ARCHIVE_MODEL_REPORT.md`; `PROMPT_8_15_CLOSING_PREPARATION_MODEL_REPORT.md`.

## People and account identity

`dashboardUserId` / `courierId` identifies the platform account. `ownerIqama` identifies the account owner. `actualRiderIqama` identifies the rider who worked a dated assignment, with `actualRiderSource` stating HR or External. `assignmentId`, `periodStart`, and `periodEnd` bind attribution to time. Missing actual-rider evidence must remain missing. Source: `PROMPT_8_12_PERFORMANCE_ATTRIBUTION_REPORT.md`; `PROMPT_8_15_RIDER_PERIOD_SPLIT_REPORT.md`.

## Vehicle identity

`registeredVehicleSerial` is the dashboard-user registered vehicle and `actualVehicleSerial` is the vehicle used in the period. Serial is primary; plate is secondary. Never overwrite one with the other. Source: `PROMPT_8_11_B_FINAL_REPORT.md`, “Root causes”; `PROMPT_8_15_RIDER_PERIOD_SPLIT_REPORT.md`.

## HR versus external

HR profiles and External Riders are separate collections and resolver sources. External Riders must not duplicate an HR record; unresolved identities do not silently become owners. Source: `PROMPT_8_6_FINAL_REPORT.md`; project conversation context for the no-duplicate rule.

## Evidence identity

Imports retain `sourceModule`, `sourceBatchId`, `sourceFileName`, and `sourceRowNumber`. Archive and closing runs retain their run IDs and source batches. Finance staging retains those references plus the rider/user/vehicle/period fields and uses `amountPreviewAllowed=false`, `finalAmountCalculated=false`, and `requiresExplicitImport=true`. Source: `PROMPT_8_13_IMPORT_BATCH_TRACEABILITY_REPORT.md`; repository inspection of `src/finance/financeInputModel.js`.

## Privacy

Identifiers in documentation and verification must be synthetic or masked. No private workbook row, real identity number, rider name, phone number, IBAN, environment value, or local database record belongs in reports or tracked fixtures. Source: `README.md`; `PROMPT_8_16_GITHUB_PUBLISH_REPORT.md`.
