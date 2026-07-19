# SHEETS_DEEP_ANALYSIS

Last updated: 2026-07-10  
Scope: real workbook review for Prompt 0 only

## 1. Important baseline

These workbooks are not ordinary Excel-first files.

- a large part of the business logic originated in Google Sheets
- many exported formulas are wrapped as `__xludf.DUMMYFUNCTION(...)`
- conditional formatting is frequently used as a decision layer
- therefore the portal must rebuild logic intentionally instead of trying to "run Excel inside JS"

## 2. Workbook inventory reviewed

| Workbook | Location | What it represents |
| --- | --- | --- |
| `نسخة من تشغيل كيتا جدة شهر مايو.xlsx` | workspace root | baseline operations workbook |
| `data/raw/operations/jeddah/2026-07/تشغيل كيتا جدة شهر يوليو.xlsx` | raw operations | current operations workbook with extra register coverage |
| `البوابة المقبلة.xlsx` | workspace root | HR, archive, IDs, compliance, multi-platform reference |
| `Updata_Vehicles (2).xlsx` | workspace root | fleet and assignment rules engine |
| `data/raw/vehicles/Updata_Vehicles (5).xlsx` | raw vehicles | newer fleet workbook variant |
| `Keeta Shifts Scheduling Tool V1.2 (3-Shifts) - AD (2).xlsm` | workspace root | shift balancing reference |
| monthly closing family | root + `data/raw/monthly_closing/` | invoices, settlement, FR and VDA settlement evidence |

## 3. Operations workbook: May baseline

File: `نسخة من تشغيل كيتا جدة شهر مايو.xlsx`  
Sheet count: `30`

### What this workbook covers

- rider master
- user/account movement history
- OPR by register
- status review
- resignations
- HR mirrors by register
- dash sheets
- daily follow-up
- daily performance
- monthly overall performance
- face verification
- VDA raw and final
- weekly shifts

### Highest-value sheets confirmed

| Sheet | Evidence from analysis | Meaning |
| --- | --- | --- |
| `VDA_kEETA` | `8884` rows, `35` cols, `0` formulas | raw fact table feeding VDA |
| `VDA` | `983` rows, `4416` formulas, `13` conditional-format rules | core validity / target engine |
| `Per Order Mode` | `182` rows, `20` formulas, `10` conditional-format rules | separate operations mode with its own counts and statuses |
| `EXPRESS OPR` | `259` rows, `91` formulas, `14` conditional-format rules | active user assignment and status dataset |
| `Albwaba OPR` | `263` rows, `113` formulas, `13` conditional-format rules | parallel OPR dataset for another register |

### Formula behaviors confirmed directly

Examples from `VDA`:

- `IFS(XMATCH(...))` to infer register from OPR membership
- `SUMIF('الاداء اليومي'!...)` to total delivered orders
- `ROUND(...)` and `IF(...)` to compare against target
- target threshold split by date, for example `IF(VALUE(R2) <= 20260515, 600, 420)`

Examples from OPR sheets:

- equality checks like `=G2=C2` to validate linked identifiers
- summary counters using `COUNTIF`

### Conditional-format meanings confirmed

- duplicates on rider ID, Iqama, and linked identifiers
- full-row states like `مقال`, `مقيد بالايام`, `مقيد هيئة النقل`
- operational status coloring on OPR blocks

## 4. Operations workbook: July live sample

File: `data/raw/operations/jeddah/2026-07/تشغيل كيتا جدة شهر يوليو.xlsx`  
Sheet count: `31`

### Important structural differences from May

- contains `TOGARY OPR`
- contains `Dash_Togary`
- contains `تقرير البيانات`
- preserves the same operations spine as May

### Confirmed VDA evolution

`VDA` in July:

- `983` rows
- `42` columns
- `4584` formulas
- `13` conditional-format rules

Confirmed formula samples:

- register inference across `EXPRESS OPR`, `Albwaba OPR`, and `TOGARY OPR`
- `SUMIF('الاداء اليومي'!...)`
- target status with `IF(...)`
- date threshold like `IF(VALUE(T2) <= 20270515, 600, 420)`

Meaning:

- the data model must support more than one register family inside one monthly import
- July should not be treated as just a filename refresh of May

## 5. HR / archive workbook

File: `البوابة المقبلة.xlsx`  
Sheet count: `24`

### What this workbook really is

It is not only HR. It combines:

- HR master data
- operational archive
- riders who are inactive but still relevant
- transport-license action queues
- Keeta account ID lookup tables
- driver-card follow-up
- city performance mirrors
- cross-platform sheets for other delivery companies

### Highest-value sheets confirmed

| Sheet | Evidence from analysis | Meaning |
| --- | --- | --- |
| `ارشيف البوابه واكسبرس ` | `1210` rows, `1481` formulas, `1728` conditional-format ranges | historical master archive, not a simple dump |
| `HR شركة البوابة المقبله` | `347` rows, `892` formulas, `75` conditional-format ranges | active HR + sponsor/account linkage |
| `HR اكبريس جايت` | `359` rows, `698` formulas, `11` conditional-format ranges | second HR register with leave/expiry linkage |
| `HR مؤسسة البوابة` | `96` rows, `320` formulas, `5` conditional-format ranges | third HR register |
| `مناديب لم تعمل` | `69` formulas, filter-driven | generated list of inactive internal riders |
| `رخص النقل` | `580` formulas, filter-driven | action queue built from HR conditions |

### Formula behaviors confirmed directly

- `IF(expiry<TODAY(), "انتهت", ...)` for document state
- `IFS(registerNumber=..., "البوابة المقبلة" / "اكسبرس الرئيسي" / "فرعي")`
- `LET + FILTER + XLOOKUP` into `ايديهات كيتا`
- generated lists of inactive riders and license cases via filter logic

### Structural conclusion

`البوابة المقبلة.xlsx` is the best source for:

- HR profile history
- sponsor/register ownership
- inactive rider archive
- compliance and document workflows

## 6. Fleet workbook family

Files:

- `Updata_Vehicles (2).xlsx`
- `data/raw/vehicles/Updata_Vehicles (5).xlsx`

### Shared structural finding

Both files expose the same business engine shape:

- `Operating Vehicles`
- `Update Branches`
- `Update VehicleS`
- `UpDate_-VehicleS`
- `UpDate_VehicleS`
- `VehicleS`
- `Branches`
- HR-linked and delivery-linked support sheets

### Highest-value findings already confirmed

| Sheet | Evidence | Meaning |
| --- | --- | --- |
| `Operating Vehicles` | register-to-company mapping via `IFS`, duplicate CF on serial/plate/OPC | vehicle master truth |
| `Update Branches` | `2600` formulas, `18` CF rules | assignment review queue from handover data |
| `Update VehicleS` | `1038` formulas, `23` CF rules | conflict/action recommendation engine |
| `VehicleS` | city-mix and occupancy formulas with `TEXTJOIN`, `FILTER`, `UNIQUE` | per-vehicle assignment health |
| `Branches` | `1040` formulas, `15` CF rules | account-to-branch compliance and transport type checks |

### Specific business signals seen in formulas / CF

- `اختلاط المدينة`
- `تفريغ السعة`
- `To be Submitted`
- `Under Review`
- `Approved`
- `Rejected`
- duplicate vehicle / duplicate plate / duplicate identity

## 7. Shift workbook

File: `Keeta Shifts Scheduling Tool V1.2 (3-Shifts) - AD (2).xlsm`  
Sheet count: `2`

Confirmed visible formula layer:

- `ROUNDDOWN`
- `MIN`
- `SUM`
- `COUNTIFS`
- `IFERROR`

Confirmed sheet purpose:

- counts booked combinations
- compares actual bookings to target totals
- distributes 3 shifts per rider under slot constraints

Note:

- this Prompt 0 pass confirmed workbook structure and formula layer
- full VBA-source reverse mapping was not the main output of this pass

## 8. Monthly closing workbook family

### May originals

- each company invoice workbook contains `تفاصيل الشركاء` and `تفاصيل سائق التوصيل`
- internal settlement workbook `فاتورة كيتا جدة 05-2026 م.xlsx` contains `Express`, `Albwaba`, `FR 3PL`, `VDA`, `Short VDA`, `VDA_Report`, delivery experience, resignations, and performance tabs

### June samples

`data/raw/monthly_closing/jeddah/2026-06/` confirms:

- face recognition workbooks
- company daily VDA workbooks
- invoice CSV exports

Meaning:

- monthly closing is not speculative here; it already has real reference bundles and test coverage

## 9. Deep-review conclusion

The workbook landscape resolves into five engines:

1. operations engine
2. HR / archive / compliance engine
3. fleet engine
4. shift engine
5. monthly closing engine

Prompt 1 should not change this understanding.  
Prompt 2 must encode it into import registry + normalized storage before feature expansion.
