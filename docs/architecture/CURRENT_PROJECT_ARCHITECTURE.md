# Current Project Architecture

Architecture snapshot date: 2026-07-09  
Scope: `D:\keeta operations portal` only

## 1. Project Type

The current project is:

- `Single HTML`
- `Vanilla JavaScript`
- `Offline / client-side`
- `No package.json`
- `No React/Vite`
- `No Next.js`

The runtime is intentionally browser-first and does not require a server or CDN.

## 2. Main Entry Point

Primary entrypoint:

- `keeta_operations_portal_starter_v4.html`

Primary runtime chain:

1. `keeta_operations_portal_starter_v4.html`
2. `vendor/xlsx.full.min.js`
3. `keeta_operations_portal_logic.js`
4. `keeta_operations_portal_app_v4.js`

Older but still present baseline:

- `keeta_operations_portal_starter.html`
- `keeta_operations_portal_app.js`

These older files are useful for regression comparison, but they are not the current main entry anymore.

## 3. Current Pages

The current starter now serves two layers at once:

### Phase-one shell pages

1. `لوحة المرحلة` (`page-dashboard`)
2. `Import Center` (`page-import-center`)
3. `Data Model` (`page-data-model`)
4. `قاعدة المناديب` (`page-rider-master`)
5. `التشغيل` (`page-operations-shell`)
6. `الأداء والصلاحية` (`page-performance-shell`)
7. `HR` (`page-hr-shell`)
8. `المركبات` (`page-fleet-shell`)
9. `الشفتات` (`page-shifts-shell`)
10. `الأرشيف` (`page-archive-shell`)
11. `تحليل الشيتات` (`page-excel`)

### Existing prototypes still kept in the runtime

1. `إقفال الشهر` (`page-monthly-closing`)
2. `حاسبة الراتب` (`page-salary`)
3. `الشروط والحوافز` (`page-rules`)
4. `توزيع الشفتات` (`page-shifts`)
5. `توزيع المركبات` (`page-vehicles`)
6. `VDA / Validity` (`page-vda`)
7. `Face Verification` (`page-face`)
8. `Delivery Experience` (`page-delivery`)
9. `OPR Management` (`page-opr`)
10. `Validation Dashboard` (`page-validation`)
11. `Export Center` (`page-exports`)

Interpretation:

- The shell pages are the approved direction for the current build phase.
- The prototype pages remain useful as reference behavior, but they are not the current sequencing priority.

## 4. Existing Modules

The shared engine file `keeta_operations_portal_logic.js` contains the current domain modules:

- `Config`
  Holds salary tiers, shift templates, vehicle rules, and constants.
- `Utils`
  Shared formatting, CSV helpers, and common utilities.
- `SampleData`
  Embedded fixture data for quick browser testing.
- `SalaryEngine`
  Salary, commission, rent, housing, validity, and experience calculations.
- `ShiftEngine`
  Shift template handling and rider-to-shift assignment logic.
- `DataEngine`
  CSV parsing and row normalization helpers.
- `VehicleEngine`
  Vehicle assignment, capacity checks, city/register enforcement, and issue generation.
- `ExcelEngine`
  Workbook inspection, formula extraction, and markdown report generation.
- `ValidationEngine`
  Cross-feature issue summarization for the validation page.
- `TestEngine`
  Built-in assertions and scenario coverage for Node-based checks.

The browser controller file `keeta_operations_portal_app_v4.js` is responsible for:

- Reading inputs from the DOM
- Persisting UI state in `localStorage`
- Running the engines
- Rendering tables and KPI cards
- Handling search and copy/export actions
- Reading CSV/XLSX files from the browser

## 5. Current File Reading Methods

Current import/read strategy:

- `FileReader.readAsText(...)`
  Used for CSV and TXT uploads.
- `FileReader.readAsArrayBuffer(...)`
  Used for `XLSX / XLS`.
- `window.XLSX.read(buffer, { type: "array", cellFormula: true })`
  Parses workbook data and preserves formulas for analysis.
- `window.XLSX.utils.sheet_to_csv(sheet)`
  Converts uploaded worksheet data to CSV text for downstream parsing.
- `Portal.DataEngine.parseCsvRows(...)`
  Converts CSV text into JS row objects used by the current engines.

Current data sources:

- User uploads from `<input type="file">`
- Textareas with pasted CSV content
- Embedded `sample-data/*.csv`
- Browser-local state restored from `localStorage`

Current persistence:

- `localStorage` only
- No `IndexedDB`
- No backend storage

## 6. Current Export Methods

The current export pattern is entirely client-side:

- `Blob` + temporary `<a download>`
  Used by `downloadText(...)` to export files.
- UTF-8 BOM prepended for CSV/text exports
  Helps Excel open Arabic CSV correctly.
- CSV exports
  Salary, shift assignments, shift summary, vehicle assignments, vehicle issues, vehicle utilization, validation, tests.
- Markdown export
  Workbook conversion report.
- JSON export
  Full runtime snapshot.
- Clipboard copy
  Shift results and operational summaries.

## 7. Gaps and Weaknesses

The current version is a strong offline prototype, but it is still missing the V6 target architecture.

Main gaps:

- No `src/` module tree yet.
- No dedicated `formulaEngine.js`.
- No normalized long-form performance layer for `الاداء الكلى`.
- No separate VDA engine.
- No face-verification engine.
- No delivery-experience engine.
- No status-review engine.
- No OPR engine.
- No import center with dataset auto-detection and city isolation.
- No city partitioning beyond the vehicle page's `strictCity` rule.
- No pagination in tables.
- No global drilldown search by `User ID / Iqama / Name / Phone / Vehicle / Register`.
- No normalized import registry yet for the newly approved phase-one model.
- No production-grade Rider Master / Operations State persistence layer yet.
- No scheduler module fully wired to the workbook-based 3-shifts system spec yet.
- Tests are still stronger on prototype calculations than on the new phase-one data-flow contracts.
- Some older docs still describe earlier workbook names or pre-shell assumptions; the newest source of truth is:
  - `SHEETS_DEEP_ANALYSIS.md`
  - `FORMULA_LOGIC_MAP.md`
  - `CONDITIONAL_FORMAT_RULES_MAP.md`
  - `DATA_MODEL_PROPOSAL.md`

## 8. Is The Current Version Based On Starter V4?

Yes.

Evidence:

- The active HTML file is explicitly `keeta_operations_portal_starter_v4.html`.
- The active controller is `keeta_operations_portal_app_v4.js`.
- The footer text in the current starter identifies the portal as `Keeta Operations Portal V4`.
- The older starter/app pair still exists beside the V4 pair, which makes the generation split visible.

## Recommended V6 Direction

To evolve safely without breaking the current offline app:

1. Keep the V4 runtime working as the regression baseline.
2. Add new reusable modules under `src/lib/`.
3. Move workbook-specific logic into dedicated engines.
4. Introduce dataset normalization before building more dashboards.
5. Treat reference HTML and Apps Script files as design and logic references only, not source of truth.
