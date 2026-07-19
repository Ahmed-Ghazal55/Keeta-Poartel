# Import Templates Report

Date: 2026-07-12

## Delivered Registry

Official template registry added in `src/import/importTemplateRegistry.js`.

Registered templates:

1. Dashboard Users
2. HR Master
3. Vehicles
4. Daily Performance
5. Overall Performance
6. VDA
7. Face Verification
8. Delivery Experience
9. Company Invoice
10. Internal Settlement
11. Shift Schedule

## Included Per Template

Each template now defines:

- target entity
- supported import types
- required headers
- optional headers
- sample row
- supported aliases from the shared header map
- validation rule summary

## UI Actions Added

Inside Import Center:

- `Download Template`
- `Download All Templates`
- `View Template Requirements`

Inside Preview:

- `Download Template`
- `View Template Requirements`
- `اعتماد المراجعة`

## Matching Behavior

- Full match: auto-maps columns and can proceed without manual review.
- Partial match: shows confidence, keeps save disabled until review is applied.
- Unknown structure: remains blocked until manual review / mapping is confirmed.

## Automated Coverage

- `tests/importTemplateRegistry.test.js`
- `tests/importBatchService.test.js`
- `tests/uiLayering.test.js`

All of the above passed on 2026-07-12.
