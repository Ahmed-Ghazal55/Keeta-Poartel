# HR Validation Rules

## Scope

Prompt 4 validation is implemented in `src/hr/hrValidator.js` and is executed from the import flow through `src/import/importValidator.js`.

## Rule Catalog

| Code | Severity | Meaning |
| --- | --- | --- |
| `missing_iqama` | `medium` | profile has no usable iqama |
| `missing_phone` | `medium` | profile has no usable phone |
| `invalid_phone` | `medium` | phone is present but not normalized to Saudi format |
| `unknown_city` | `medium` | city value could not be normalized |
| `unknown_register` | `medium` | register value could not be normalized |
| `employment_type_unknown` | `low` | sponsorship / freelancer could not be inferred |
| `status_unknown` | `low` | HR status still needs review |
| `expired_license` | `medium` | license looks expired or invalid |
| `expired_health_card` | `medium` | health card looks expired |
| `duplicate_iqama_same_sheet` | `high` | same iqama repeated inside the same logical sheet |
| `duplicate_iqama_multiple_profiles` | `medium` | same iqama repeated across multiple profiles |
| `same_phone_multiple_iqamas` | `high` | one phone linked to more than one iqama |
| `same_user_id_multiple_iqamas` | `high` | one platform user ID linked to more than one iqama |

## Blocking Behavior

- Prompt 4 intentionally does not make `missing_iqama` always blocking.
- This matches the business reality that some recruiting or incomplete rider rows may still need to exist for review.
- The validator still returns `blockingIssues`, but the current real workbook baseline produced no blocking-only stop condition.

## Real Workbook Baseline Counts

From `البوابة المقبلة.xlsx`:

- `missing_iqama`: `218`
- `missing_phone`: `719`
- `unknown_city`: `218`
- `unknown_register`: `220`
- `employment_type_unknown`: `271`
- `status_unknown`: `173`
- `expired_health_card`: `83`
- `expired_license`: `3`

## Interpretation Notes

- `missing_phone` is not surprising in this workbook because official HR sheets often do not carry phone values, while phone values exist in the platform sheets.
- `unknown_city` and `unknown_register` usually indicate rows with incomplete scope or values living in columns the generic parser could not safely map.
- `employment_type_unknown` is mostly driven by rows that do not explicitly state sponsorship/freelancer status.

## Import Flow Integration

For import types:

- `hr_master_workbook`
- `rider_master_workbook`

the validator now:

1. normalizes the workbook
2. builds Prompt 4 HR entities in memory
3. runs `validateHrBundle(...)`
4. appends issues into the existing Prompt 3 preview/save validation flow

## Why This Matters

These rules let the project:

- keep incomplete HR rows visible instead of silently dropping them
- catch dangerous identity collisions before merge/save
- surface compliance risk like expired health cards and licenses
- preserve operator review rather than inventing unsafe merge logic
