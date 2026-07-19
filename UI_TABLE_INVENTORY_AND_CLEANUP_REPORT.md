# UI Table Inventory And Cleanup Report

## Goal

Prompt 8 continuation reviewed which tables belong to operational shells and which legacy prototype surfaces should stay out of the primary grouped sidebar experience.

## Inventory

| Selector / area | Current page | Purpose | Decision | Target page |
| --- | --- | --- | --- | --- |
| `#uiOperationsUsersBody` | `page-dashboard` | dashboard summary sample operational list | keep | dashboard only |
| `.table-wrap table` inside `page-operations-shell` | operations shell | dashboard users, assignment, swap, termination, review history | keep | operations shell |
| `.perf-table-wrap table` inside `page-performance-shell` | performance shell | daily/overall/per-issue result tables | keep | performance shell |
| `.monthly-table-wrap` inside `page-monthly-rules-shell` | monthly rules shell | rule registry, version comparisons, validation views | keep | monthly rules shell |
| `.table-wrap table` inside `page-fleet-shell` | fleet shell | operating vehicles, available/full, movement, matching, issues | keep | fleet shell |
| `.table-wrap table` inside `page-hr-shell` | HR shell | HR master listing | keep | HR shell |
| `.table-wrap table` inside `page-rider-master` | rider master | riders cross-platform view | keep | rider master / HR module |
| `.table-wrap table` inside `page-archive-shell` | archive shell | historical rider/archive events | keep | archive shell |
| legacy `page-validation` tables | validation prototype | QA/issues/test matrix | move out of primary operational navigation | diagnostics / QA |
| legacy `page-excel` tables | workbook review prototype | sheet/formula inspection | move out of primary operational navigation | diagnostics / analysis |
| legacy `page-salary`, `page-monthly-closing`, `page-shifts`, `page-vehicles`, `page-vda`, `page-face`, `page-delivery`, `page-opr` prototypes | prototype pages | older isolated prototype flows | keep in code for compatibility, hide from main grouped modules | future diagnostics or later module prompts |

## Current cleanup outcome

- The grouped sidebar exposed by `keeta_operations_portal_ui_redesign.js` is now the primary module navigation.
- Old HTML prototype pages still exist for compatibility and legacy test coverage.
- Most prototype pages are no longer the primary user path in the redesign shell.

## Important note

This continuation did not delete legacy prototype code outright.

The cleanup strategy used was:

- keep legacy pages available for compatibility
- route the user through grouped module shells first
- reduce accidental exposure of unrelated prototype pages in the main operational flow
