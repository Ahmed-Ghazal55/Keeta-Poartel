# Import Validation Rules

Date: 2026-07-10
Workspace: `D:\keeta operations portal`

## Engine File

- `src/import/importValidator.js`

## Validation Severity Levels

Prompt 3 uses:

- `blocking`
- `high`
- `medium`
- `low`
- `info`

The validator returns:

- `issues`
- `blockingIssues`
- `warnings`
- `summary`

## General Validation Rules

The validator checks:

- ZIP files used as reference only
- missing headers
- empty files
- missing required headers for the detected type
- missing target entity during save
- unknown or low-confidence save without manual mapping
- missing city
- missing register
- invalid month format
- suspiciously small row counts
- suspiciously large row counts
- duplicate user ids inside the same file
- duplicate iqama values inside the same file
- mixed cities inside the same file
- mixed registers inside the same file
- unknown vehicle types
- invalid date values
- unsupported workbook formula functions
- explicit `DUMMYFUNCTION` usage

## Blocking Cases

The current implementation blocks save in these cases:

- `zip_reference_only` in save mode
- `headers_missing`
- `empty_file`
- missing required headers during save
- `target_entity_unknown`
- `unknown_save_without_mapping`
- `dummy_function_detected` in save mode

This matches the Prompt 3 requirement that suspicious imports must not be persisted silently.

## Workbook Special Cases

The validator allows some workbook families to pass structural checks without forcing ordinary row-table assumptions:

- `company_invoice_workbook`
- `internal_settlement_workbook`
- `face_verification_workbook`

These are handled because their real workbook structure is more specialized and the actual row extraction often depends on normalizer logic and legacy monthly-closing helpers.

## Formula Review Rule

Recognized formula families currently include:

- `IF`
- `COUNTIF`
- `COUNTIFS`
- `SUMIF`
- `SUMIFS`
- `VLOOKUP`
- `XLOOKUP`
- `INDEX`
- `MATCH`
- `FILTER`
- `UNIQUE`
- `SORT`
- `TEXT`
- `DATE`
- `TODAY`
- `IFERROR`
- `ROUND`
- `ROUNDUP`
- `ROUNDDOWN`
- `AVERAGE`
- `MIN`
- `MAX`

Unknown formula names do not block by default.

They currently raise a low-severity `unsupported_formulas` issue unless the workbook contains `DUMMYFUNCTION`, which is treated as a stronger signal.

## Save-Time Behavior

Validation runs twice:

1. preview mode during `createPreviewBatch()`
2. save mode during `saveImportBatch()`

This means the UI can show warnings early, but save still re-checks the batch before records are written.

## Test Coverage

Automated Prompt 3 tests verified:

- missing required headers
- duplicate user ids
- empty file detection
- mixed cities warning
- blocking unknown save without manual mapping

## Current Limitations

- the validator does not yet cross-check imported ids against the full historical archive
- the validator does not yet do payroll or invoice-level business-rule reconciliation
- vehicle-type normalization is still basic and meant as a foundation only
