# TEST_COVERAGE_REVIEW

Last updated: 2026-07-10  
Scope: current automated coverage observed during Prompt 0

## 1. Executed test files

| Test file | Result | What it currently validates |
| --- | --- | --- |
| `tests/keeta_operations_portal_tests.js` | `10 / 10 passed` | legacy runtime `TestEngine` scenarios for salary, shifts, and vehicles |
| `tests/keeta_operations_portal_v6_tests.js` | `7 / 7 passed` | separated V6 logic engines: formulas, status review, performance normalization, VDA, face verification, delivery experience, OPR |
| `tests/keeta_operations_portal_v9_tests.js` | `8 / 8 passed` | monthly closing normalization and archive outputs using real sample files |

## 2. Covered modules

### Legacy runtime coverage

Covered via `tests/keeta_operations_portal_tests.js`:

- salary calculation behavior
- shift assignment behavior
- rider ID parsing / dedupe
- vehicle city mismatch
- vehicle capacity violation
- vehicle utilization summary

### `src/lib/` coverage

Covered via `tests/keeta_operations_portal_v6_tests.js`:

- `formulaEngine.js`
- `statusReviewEngine.js`
- `normalizeOverallPerformance.js`
- `vdaEngine.js`
- `faceVerificationEngine.js`
- `deliveryExperienceEngine.js`
- `oprEngine.js`

Covered via `tests/keeta_operations_portal_v9_tests.js`:

- `monthlyClosingEngine.js`

## 3. Strengths of the current test suite

- real workbook samples are already used for monthly closing
- domain logic is not only smoke-tested; it includes expected row counts and business outcomes
- V6 tests already verify Arabic-specific logic such as status updates and weekday derivation
- legacy runtime tests still protect the offline browser logic from silent regression in core calculators

## 4. Coverage gaps confirmed in Prompt 0

### Missing import-registry coverage

No current automated tests verify:

- batch creation
- dataset-role detection
- latest-vs-superseded import handling
- import conflict persistence

### Missing workbook-audit coverage

No current automated tests verify:

- operations workbook sheet classification
- HR workbook sheet classification
- fleet workbook sheet classification
- conditional-format extraction mapping
- formula-family extraction reporting

### Missing storage/persistence coverage

No current tests validate:

- `storage/imports/import_manifest.json`
- `storage/exports/export_manifest.json`
- `storage/archive/archive_manifest.json`
- runtime state persistence beyond ad hoc browser behavior

### Missing multi-register scenario coverage

July operations workbook introduced:

- `TOGARY OPR`
- `Dash_Togary`

There are no explicit tests yet proving import classification and downstream joins handle that third register path safely.

### Missing shift parity coverage

The `.xlsm` workbook structure was reviewed, but there is no direct parity suite yet for:

- sheet-based combination counts
- slot balancing edge cases against the workbook's visible formulas
- VBA-source parity

## 5. Risk interpretation

Current tests are good enough to continue with architecture work, but not enough to declare import and workbook parity complete.

Most important missing layer:

- import + normalization + lineage tests against operations, HR, and fleet workbooks

## 6. Minimum tests to add in Prompt 2

1. detect file family from real workbook samples
2. classify dataset role from sheet names and headers
3. reject mixed city/register imports when scope is ambiguous
4. persist batch and dataset metadata to storage manifests
5. verify supersession when a newer import of the same scope is added

## 7. Prompt 0 conclusion on coverage

Current test status is a positive signal:

- all existing suites passed during this review
- no blocking failures were found

But Prompt 2 should be expected to add a new test family around import lineage before operations UI logic grows further.
