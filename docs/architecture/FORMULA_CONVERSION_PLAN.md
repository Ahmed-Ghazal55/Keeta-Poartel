# Formula Conversion Plan

Plan date: 2026-07-09  
Scope: workbook and script logic found inside the current project

Current-note:

- This plan remains useful as a conversion strategy reference.
- The current approved detailed references for the phase-one build are:
  - `SHEETS_DEEP_ANALYSIS.md`
  - `FORMULA_LOGIC_MAP.md`
  - `CONDITIONAL_FORMAT_RULES_MAP.md`

## Workbook Formula Profile

Most frequent functions observed in `تشغيل كيتا جدة شهر يوليو.xlsx`:

- `IFERROR`: 88,108
- `DUMMYFUNCTION`: 47,008
- `XLOOKUP`: 31,581
- `ARRAYFORMULA`: 15,695
- `FILTER`: 13,078
- `TRIM`: 11,847
- `IF`: 9,051
- `VALUE`: 8,057
- `ROUNDUP`: 6,860
- `TO_TEXT`: 6,765
- `MAX`: 6,236
- `IFS`: 4,574
- `LET`: 2,755
- `DATE`: 2,156
- `COUNTIF`: 2,024
- `XMATCH`: 1,926
- `SUMIF`: 1,353

Most frequent functions observed in `Updata_Vehicles (5).xlsx`:

- `IFERROR`
- `DUMMYFUNCTION`
- `XLOOKUP`
- `TRIM`
- `IFS`
- `LET`
- `FILTER`
- `IFNA`
- `HSTACK`
- `INDEX`
- `TEXTJOIN`
- `COUNTUNIQUE`
- `UNIQUE`
- `ROWS`
- `TRANSPOSE`
- `SWITCH`
- `TODAY`

Implication:

- The future JS engine should not attempt to emulate all spreadsheet runtime behavior generically on day one.
- It should support a reusable core function layer, then replace the highest-value business flows with dedicated JS engines.

## Conversion Strategy

1. Build `src/lib/formulaEngine.js` for common lookup, filter, coercion, and date helpers.
2. Build dedicated domain engines for the workbook areas with the most business value.
3. Unwrap Google Sheets import wrappers such as `__xludf.DUMMYFUNCTION(...)` and convert the underlying logic, not the wrapper itself.
4. Normalize wide report sheets before applying VDA, face verification, or ranking logic.

## Conversion Table

| Formula / Logic | Location | What It Does | JavaScript Conversion Plan | Extra Data Needed? |
|---|---|---|---|---|
| `XLOOKUP + IFERROR` rider hydration | `بيانات المناديب` | Fills current app ID, rider status, and related fields from OPR and HR sheets. | Add `formulaEngine.xlookup()` plus a canonical identity map keyed by rider ID, iqama, and phone; expose through `oprEngine` and rider normalization helpers. | No, current workbook/CSV exports are enough |
| `LET + IFS` sponsor/register detection | `بيانات المناديب`, OPR sheets | Determines which HR/register sheet a rider belongs to and derives account type. | Convert to pure functions in `oprEngine` that test ordered register sources and return the first valid match with reason codes. | No |
| Historical month lookups | `بيانات المناديب` with `ابريل` and `مايو` | Pulls prior month IDs or account context. | Keep a month-scoped dataset registry and query by normalized rider identity; do not hardcode sheet names in UI code. | Yes, if later months are imported |
| OPR account mirroring | `EXPRESS OPR`, `Albwaba OPR`, `TOGARY OPR` | Syncs current rider details from Dash, Vehicle, rider master, and status review sheets. | Implement `oprEngine.buildPlatformAccount(platformName, row, datasets)` with per-platform adapters and shared field normalizers. | No |
| Shifted-column mapping | `Per Order Mode` | Uses similar OPR logic but with one-column structural offset. | Implement a dedicated `perOrderAdapter` instead of trying to force the main OPR column indexes onto it. | No |
| Google Sheets `ARRAYFORMULA(FILTER(...))` imports | `مراجعة الحالة`, `التحقق الكلي من الوجة`, vehicle workbook tabs | Bulk-generated sheet logic preserved as `DUMMYFUNCTION`. | Parse the wrapped formula text only as a migration reference; replace with deterministic JS transformations over normalized arrays. | No |
| `updateStatus()` lifecycle | `New Text Document.txt`, `مراجعة الحالة` | Converts `مقيد بالايام` to `شغال` when restriction days expire and writes a note. | Build `statusReviewEngine` with Arabic date parsing, date arithmetic, note generation, and changed-row logs. | No |
| Wide date header day-name derivation | `الاداء الكلى` | Converts `yyyymmdd` headers into Arabic weekday labels and supports month-wide performance matrices. | Build `normalizeOverallPerformance.js` to parse repeating date blocks into `{ rider, date_key, metric }` rows and derive weekday in JS. | No |
| Performance matrix normalization | `الاداء الكلى`, `المتابعة اليومية` | Feeds monthly and daily performance summaries. | Normalize wide sheets to long-form rows, then aggregate by rider, city, register, supervisor, and date. | No |
| `SUMIF` delivered totals | `VDA` from `الاداء اليومي` | Pulls delivered-order totals into validity analysis. | Add `formulaEngine.sumIf()` and also a pre-aggregated rider/day totals map for faster VDA computation. | No |
| `TODAY`, `ROUND`, `MIN`, threshold formulas | `VDA` | Calculates current target, expected target, missing days, validity status, and action needed. | Implement explicit `vdaEngine.computeEligibility()` and `vdaEngine.projectMonthEnd()` functions rather than generic formula text execution. | No |
| Platform detection via `IFS + XMATCH` | `VDA`, `حالة نتيجة تجربة التوصيل` | Detects which platform/source sheet the rider belongs to. | Use an ordered platform membership resolver backed by normalized OPR and Dash datasets. | No |
| Face verification lookup chain | `التحقق الكلي من الوجة` | Combines status review, performance, VDA source, and OPR context into pass/fail and deduction outputs. | Build `faceVerificationEngine` on top of normalized daily verification rows and rider identity maps. | No |
| Incentive ranking and invalidity zeroing | `حالة نتيجة تجربة التوصيل` | Assigns A/B/C level, ranking, incentive amount, and applies invalid rider penalty. | Build `deliveryExperienceEngine` that ranks by city and vehicle type, then zeroes incentive when VDA result is invalid. | No |
| Vehicle agreement logic | `Updata_Vehicles (5).xlsx`, current `VehicleEngine` | Enforces city/register/transport and operational-status compatibility. | Reuse current vehicle engine helpers, then move source parsing and agreement maps into dedicated `src/lib` modules. | No |
| Shift coverage formulas | `Keeta Shifts Scheduling Tool V1.2 (3-Shifts) - AD.xlsm` | Uses `COUNTIFS`, `SUM`, `ROUNDDOWN`, `MIN`, `MAX` for slot coverage planning. | Keep current assignment heuristics as baseline and add workbook-aligned capacity helpers for the 3-shifts V6 scheduler. | No |

## Core Functions To Support In `formulaEngine.js`

Priority support list from the current project requirements:

- `XLOOKUP`
- `XMATCH`
- `COUNTIF`
- `COUNTIFS`
- `SUMIF`
- `SUMIFS`
- `FILTER`
- `UNIQUE`
- `IF`
- `IFS`
- `IFERROR`
- `DATE`
- `TEXT`
- `WEEKDAY`
- `VALUE`
- `TRIM`
- `REGEXMATCH`
- `LET`-style helper composition

Suggested implementation approach:

- Array-first helpers that accept JS arrays of objects.
- Consistent string normalization for Arabic/English headers.
- Explicit coercion helpers for numbers, dates, and booleans.
- Deterministic error/fallback behavior instead of spreadsheet implicit coercion.

## Domain Engines To Build Beside The Formula Core

- `src/lib/normalizeOverallPerformance.js`
- `src/lib/vdaEngine.js`
- `src/lib/faceVerificationEngine.js`
- `src/lib/deliveryExperienceEngine.js`
- `src/lib/statusReviewEngine.js`
- `src/lib/oprEngine.js`

## Risks To Watch

- `DUMMYFUNCTION` formulas are not executable business logic by themselves; they are wrappers around imported Google Sheets formulas.
- Arabic headers vary between sheets and CSV exports and must be canonicalized.
- `Per Order Mode` cannot share the same fixed column indexes as the other OPR sheets.
- Wide monthly sheets are not safe for analytics until they are normalized into long records.
- City mixing must be blocked at the dataset registry layer, not left to later dashboard filters.
