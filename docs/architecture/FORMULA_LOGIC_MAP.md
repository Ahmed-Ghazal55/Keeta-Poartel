# FORMULA_LOGIC_MAP

Last updated: 2026-07-10  
Scope: direct mapping from observed workbook formulas to JS/domain logic

## 1. Migration rule

The correct conversion path is:

1. identify dataset role
2. normalize rows
3. map formula intent to explicit JS rules
4. keep original formulas only as audit evidence

Direct Excel emulation is not the right first step here.

## 2. Formula families confirmed in real files

| Family | Real examples seen | Meaning | JS target |
| --- | --- | --- | --- |
| `IFS / IF` | `VDA`, `Operating Vehicles`, HR sheets | ordered business decisions | enum classifiers and rule functions |
| `SUMIF / COUNTIF / COUNTIFS` | `VDA`, OPR, shifts | aggregations and duplicate detection | indexed counters and grouped summaries |
| `LET + FILTER + XLOOKUP / XMATCH` | HR, rider archive, vehicles | multi-step lookup pipelines | pure functions with explicit intermediate variables |
| `TEXTJOIN / TRANSPOSE / UNIQUE / FILTER` | `VehicleS`, `Update VehicleS` | conflict descriptions and occupancy summaries | derived review summaries, not base storage |
| `TODAY()` | HR and archive sheets | expiry-state generation | date helper layer |
| `IMPORTRANGE` inside `DUMMYFUNCTION` | HR mirrors, Keeta IDs, vehicle delivery tabs | Google-Sheets-origin imports | import-registry metadata, not runtime remote fetch |

## 3. Formula-to-domain mapping

### Rider identity and account ownership

Observed in:

- `بيانات المناديب`
- `EXPRESS OPR`
- `Albwaba OPR`
- `Per Order Mode`
- `HR (1059)`
- `HR (8094)`
- `HR (Togary)`
- `ايديهات كيتا`

Observed intent:

- determine sponsor/register owner
- determine current linked Keeta account
- detect whether rider is active, historical, external, or on another register

JS targets:

- `riderMasterEngine`
- `dashboardAccountEngine`
- `accountAssignmentEngine`

### Status review and resignation logic

Observed in:

- `مراجعة الحالة`
- `الاقالات`
- OPR sheets

Observed intent:

- unify current state from operations + resignation history
- distinguish `شغال`, `مقال`, `مقيد بالايام`, `مقيد هيئة النقل`, `لا يعمل حاليا`
- carry reason context and timing

JS targets:

- `statusReviewEngine`
- `riderStatusHistoryEngine`

### Daily and monthly performance normalization

Observed in:

- `الاداء اليومي`
- `الاداء الكلى`
- `اداء كيتا جدة`
- `اداء كيتا الرياض`

Observed intent:

- convert wide date-block matrices into daily long-form rows
- attach weekday labels
- aggregate delivered orders, rejection metrics, time, and duration

JS targets:

- `performanceImportEngine`
- `normalizeOverallPerformance`
- `performanceAggregationEngine`

### VDA and validity rules

Observed in:

- `VDA_kEETA`
- `VDA`
- `التحقق الكلي من الوجة`
- `الاداء اليومي`

Observed direct formulas:

- register inference via `IFS(XMATCH(...))`
- delivered total via `SUMIF('الاداء اليومي'!...)`
- target delta via `ROUND(total - target, 0)`
- validity label via `IF(total < target, "غير محقق للتارجت", "تحقق")`
- target change by date threshold via `IF(VALUE(dateCell) <= yyyymmdd, oldTarget, newTarget)`

JS targets:

- `vdaEngine`
- `monthlyRuleSetEngine`

### HR validity and compliance

Observed in:

- `HR شركة البوابة المقبله`
- `HR اكبريس جايت`
- `HR مؤسسة البوابة`
- `ارشيف البوابه واكسبرس `

Observed direct formulas:

- expiry state with `IF(expiry < TODAY(), "انتهت", ...)`
- register text classification with `IFS(registerNumber=...)`
- account linkage via `LET + FILTER('ايديهات كيتا'!...)`

JS targets:

- `hrProfileEngine`
- `complianceEngine`
- `documentValidityEngine`

### Fleet matching and conflicts

Observed in:

- `Operating Vehicles`
- `Update Branches`
- `Update VehicleS`
- `VehicleS`
- `Branches`

Observed direct formulas:

- company mapping by register number
- current-city extraction through lookup chains
- city mixing detection through `UNIQUE(FILTER(...))`
- occupancy counts and release-needed counts via `COUNTIF`
- human-readable action summaries through `TEXTJOIN`

JS targets:

- `fleetAssetEngine`
- `vehicleAssignmentEngine`
- `fleetConflictEngine`

### Shifts

Observed in:

- `Keeta Shifts Scheduling Tool V1.2 (3-Shifts) - AD (2).xlsm`

Observed direct formulas:

- capacity-derived base split with `ROUNDDOWN(MIN(...),0)`
- combination counts with `COUNTIFS`
- ratio calculations with `IFERROR`

JS targets:

- `shiftCapacityEngine`
- `shiftCombinationEngine`
- `shiftAssignmentEngine`

## 4. Dependency graph

### Operations chain

`HR + OPR + Keeta IDs` -> `بيانات المناديب`  
`OPR + الاقالات` -> `مراجعة الحالة`  
`الاداء اليومي + مراجعة الحالة + OPR` -> `التحقق الكلي من الوجة`  
`الاداء اليومي + VDA_kEETA + OPR + face verification` -> `VDA`

### HR chain

`HR tabs + ايديهات كيتا` -> active HR views  
`HR tabs` -> `مناديب لم تعمل`  
`HR tabs` -> `رخص النقل`

### Fleet chain

`تسليم المركبات + تسليم مركبات الرياض + Operating Vehicles` -> `Update Branches`  
`Update Branches + Branches` -> `Update VehicleS / UpDate_-VehicleS / UpDate_VehicleS`  
`fleet update sheets` -> `VehicleS`

## 5. What should become data, not formulas

The following should move into editable data structures:

- month-specific targets
- mandatory attendance days
- vehicle-type incentive ladders
- status code labels and priority
- register metadata and company ownership mapping

The following should stay as derived logic:

- duplicate detection
- city/register mismatch classification
- active/inactive status aggregation
- VDA delivered-vs-target checks
- expiry-state calculations

## 6. Conversion priority

1. rider/register/account identity
2. status review lifecycle
3. performance normalization
4. VDA and face-validation logic
5. HR compliance and archive logic
6. fleet conflict logic
7. shift capacity logic
8. monthly closing settlement layer

This order matches the actual workbook dependency structure confirmed in Prompt 0.
