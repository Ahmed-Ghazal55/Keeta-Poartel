# Prompt 8.5-B Import Types Report

## Scope reviewed
- `src/import/importTypes.js`

## Confirmed import types
- `external_riders_workbook`
- `external_riders_csv`
- `current_assignments_workbook`
- `current_assignments_csv`

## Completion details
- The four lifecycle import types were already registered and were completed with Arabic term overrides through `applyImportTypeOverrides(...)`.
- This approach preserved existing detector behavior while adding reliable direct-Arabic detection terms for:
  - file names
  - sheet names
  - lifecycle column headers
- The overrides now include the operational Arabic contract for:
  - external riders
  - current assignments / `التسكين`

## Why this change was needed
- The partial run left lifecycle detection terms in mixed legacy encoding.
- Template matching and file detection needed direct Arabic terms so real Google-Sheets-exported files can match without depending on mojibake fallbacks.

## Result
- Lifecycle file detection remains backward-compatible with older aliases.
- Direct Arabic headers are now part of the runtime detector contract.

## Verification
- `tests/fileDetector.test.js` passed.
- `tests/importTemplateRegistry.test.js` passed.
- Runtime inspection confirmed the lifecycle import types expose the Arabic terms at execution time.
