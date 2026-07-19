# Legacy Project Comparison

Comparison date: 2026-07-09  
Current project under migration: `D:\keeta operations portal`  
Legacy reference only: `D:\KEETA OPR`

## Decision Rule

- The legacy project is a reference, not the source of truth.
- Reuse is allowed only when the legacy part improves structure or UX without overwriting the spreadsheet-first business logic already present in the current project.

## Comparison Table

| Area | Current Project | Legacy Project | Reuse Decision | Reason |
|---|---|---|---|---|
| Dashboard layout | Single-file V4 dashboard with KPI cards and section navigation; useful but still prototype-like. | Angular shell with sticky toolbar, sidenav, notifications, permission-aware navigation, and cleaner app framing. | Reuse concept only | Legacy has stronger app-shell ideas, but transplanting Angular UI code into the current offline HTML app would be expensive and risky. |
| Routing / Tabs | Button-driven single-page sections inside one HTML file. | Real Angular routes with `roleGuard` and permission metadata. | Reuse information architecture only | The route map is a good checklist for V6 page structure, but the code itself does not fit the current runtime. |
| Data import | Browser uploads plus local XLSX parsing; good for ad hoc review, limited central orchestration. | `apps/api/src/store/sheet-data.ts` reads multiple Excel inputs, chooses header rows, normalizes fields, and builds seed datasets. | Reuse logic patterns selectively | Legacy's header-row detection and workbook seeding are valuable references for V6 import modules. |
| Shift scheduler | Current project already has an actual rider-to-shift assignment engine and CSV export. | Legacy `shifts` page is mostly CRUD/table scaffolding backed by mock/API data. | Keep current, no code reuse | Current logic is more operationally relevant than the legacy mock shift screen. |
| Salary calculator | Current project has real salary and commission logic in `SalaryEngine`. | No dedicated salary calculator found in the legacy app. | Keep current | Legacy offers no stronger implementation here. |
| VDA logic | Current project has the real source workbook/CSV family but no dedicated V6 engine yet. | Legacy computes a simplified validity status from seeded workbook data and exposes `/performance/validity`. | Reuse only as heuristic reference | Legacy validity rules are too simplified for spreadsheet parity, but its seeded-data shaping is still useful. |
| Face verification logic | Current project has the real face-verification workbook/CSV inputs but no dedicated engine yet. | Legacy only derives a heuristic `facialPercentage` inside seed generation; no deep face-verification workflow. | Keep current data source, do not reuse logic | The legacy heuristic is not strong enough to become source logic. |
| OPR management | Current project has the raw OPR datasets plus Apps Script references, but no dedicated V6 OPR module yet. | Legacy has `couriers`, `keeta-users`, and vehicle history APIs with audit logging and action endpoints. | Reuse workflow concepts only | The action model and audit naming are useful, but the data model is already detached from the spreadsheet-native OPR reality. |
| Export functions | Current project already exports CSV, markdown, JSON, and copyable summaries from the browser. | No meaningful export layer found in the legacy UI/API. | Keep current | Current implementation is more complete for offline operations. |
| UI styling | Current project is readable and branded, but still mostly functional sections. | Legacy Angular shell has stronger navigation framing, toolbar polish, and consistent card treatment. | Reuse visual direction selectively | The legacy shell is a good design reference for V6 layout polish. |
| Search / filter tables | Current project has per-table search in several sections, but no pagination yet. | Legacy pages render tables but do not show implemented search/filter/pagination behavior. | Keep current and extend | Current project is already ahead here for practical operator use. |
| LocalStorage / IndexedDB | Current project uses `localStorage` to persist operational UI state; no `IndexedDB`. | Legacy uses `localStorage` for auth session only; no `IndexedDB` found. | Keep current approach for now | No stronger storage strategy exists in legacy. |
| Tests | Current project has a Node test runner tied to real engine behavior. | No project-owned tests found; only dependency tests under `node_modules`. | Keep current, add V6 tests locally | Legacy does not provide a reusable test suite. |

## Reusable Legacy Assets

Best candidates for selective reuse:

1. `apps/web/src/app/app.component.ts`
   App-shell layout, sidenav structure, notification framing, and responsive navigation ideas.
2. `apps/web/src/app/app.routes.ts`
   Good V6 page inventory and permission-based route planning.
3. `apps/api/src/store/sheet-data.ts`
   Header detection, workbook seeding, and field-normalization patterns.
4. `apps/api/src/routes/*.routes.ts`
   Naming ideas for audit events and CRUD-style action boundaries.

## Legacy Parts To Avoid Copying Directly

- Angular page components as-is
- Express/Prisma backend scaffolding as-is
- Mock-data-driven performance validity rules as-is
- `dist/`, `.angular/`, and `node_modules/` outputs

## Net Decision

For V6, the current project remains the source of truth because it already carries:

- the live offline runtime,
- the current spreadsheet families,
- the working salary/shift/vehicle logic,
- and the operator-facing exports.

The legacy project is still useful, but mainly for:

- shell/navigation inspiration,
- import-pipeline ideas,
- and CRUD/audit workflow concepts.
