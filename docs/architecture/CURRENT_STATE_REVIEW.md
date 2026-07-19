# CURRENT_STATE_REVIEW

Last updated: 2026-07-10  
Scope: Prompt 0 only inside `D:\keeta operations portal`

## 1. Executive summary

المشروع الحالي ليس نقطة بداية فارغة، لكنه أيضا ليس حالة مستقرة يمكن اعتبارها منتهية على مستوى roadmap.

الحالة الفعلية بعد هذه المراجعة:

- يوجد runtime فعلي يعمل محليا وبشكل offline.
- توجد مكتبة من محركات المنطق داخل `src/lib/` بجانب runtime أقدم داخل `keeta_operations_portal_logic.js`.
- توجد ملفات UI shell وملفات redesign سابقة داخل المشروع، لكنها ليست ضمن نطاق هذه المراجعة ولا يتم اعتبارها اعتمادا نهائيا لـ Prompt 1.
- توجد أصول بيانات حقيقية وقوية تكفي لفهم التشغيل، HR، المركبات، والإقفال الشهري.
- كانت تقارير Prompt 0 ناقصة جزئيا وبعضها يحتوي على افتراضات قديمة؛ تم استكمالها وتصحيحها في هذه الجولة.

## 2. Files and folders reviewed

### Runtime and logic

- `keeta_operations_portal_starter_v4.html`
- `keeta_operations_portal_app_v4.js`
- `keeta_operations_portal_logic.js`
- `src/lib/formulaEngine.js`
- `src/lib/statusReviewEngine.js`
- `src/lib/normalizeOverallPerformance.js`
- `src/lib/vdaEngine.js`
- `src/lib/faceVerificationEngine.js`
- `src/lib/deliveryExperienceEngine.js`
- `src/lib/oprEngine.js`
- `src/lib/monthlyClosingEngine.js`
- `vendor/xlsx.full.min.js`

### Tests

- `tests/keeta_operations_portal_tests.js`
- `tests/keeta_operations_portal_v6_tests.js`
- `tests/keeta_operations_portal_v9_tests.js`

### Primary workbooks

- `نسخة من تشغيل كيتا جدة شهر مايو.xlsx`
- `data/raw/operations/jeddah/2026-07/تشغيل كيتا جدة شهر يوليو.xlsx`
- `البوابة المقبلة.xlsx`
- `Updata_Vehicles (2).xlsx`
- `data/raw/vehicles/Updata_Vehicles (5).xlsx`
- `Keeta Shifts Scheduling Tool V1.2 (3-Shifts) - AD (2).xlsm`

### Monthly closing samples

- `فاتورة كيتا جدة 05-2026 م.xlsx`
- `Albwaba almoqbla Company ( Jeddah )#2026-05#نظام الشرائح الفاتورة1781040180288 (1).xlsx`
- `EXPRESS GATE Company ( Jeddah)#2026-05#نظام الشرائح الفاتورة1781618262314.xlsx`
- `data/raw/monthly_closing/jeddah/2026-06/*`

### Storage placeholders

- `storage/imports/import_manifest.json`
- `storage/exports/export_manifest.json`
- `storage/archive/archive_manifest.json`
- `storage/runtime/session_state.template.json`

## 3. Actual current architecture

### Runtime shape

- التطبيق ما زال browser-first وoffline.
- لا يوجد backend أو قاعدة بيانات منفذة داخل هذا المستودع.
- توجد طبقتان منطقيتان حاليا:
  - runtime أقدم ومجمع داخل `keeta_operations_portal_logic.js`
  - محركات أحدث ومفصولة داخل `src/lib/`

### Storage state

- manifests الحالية فارغة:
  - `storage/imports/import_manifest.json`
  - `storage/exports/export_manifest.json`
  - `storage/archive/archive_manifest.json`
- `storage/runtime/session_state.template.json` ما زال template بسيطا فقط.

الاستنتاج: طبقة التخزين موجودة كهيكل، لكنها ليست import registry فعلي بعد.

## 4. Data source families confirmed

| Family | Real source files | Current role |
| --- | --- | --- |
| Operations | `نسخة من تشغيل كيتا جدة شهر مايو.xlsx`, `data/raw/operations/jeddah/2026-07/تشغيل كيتا جدة شهر يوليو.xlsx` | rider master, OPR, status review, daily performance, overall performance, face verification, VDA |
| HR / Compliance | `البوابة المقبلة.xlsx` | HR master, archive, inactive riders, transport licenses, driver cards, Keeta IDs, platform references |
| Fleet | `Updata_Vehicles (2).xlsx`, `data/raw/vehicles/Updata_Vehicles (5).xlsx` | vehicle ownership, branch matching, city/register conflicts, capacity release and review queues |
| Shifts | `Keeta Shifts Scheduling Tool V1.2 (3-Shifts) - AD (2).xlsm` | slot balancing and 3-shift scheduling reference |
| Monthly closing | May and June invoice / settlement / FR / VDA samples under root and `data/raw/monthly_closing/` | settlement normalization, matching, archive generation |

## 5. Strong findings from the real files

### Operations workbook is the real source of operational truth

Confirmed from `نسخة من تشغيل كيتا جدة شهر مايو.xlsx`:

- 30 sheets.
- `VDA_kEETA` is raw and formula-light.
- `VDA` is formula-heavy and depends on OPR + daily performance + date-based targets.
- `Per Order Mode`, `EXPRESS OPR`, and `Albwaba OPR` use duplicate detection and status coloring as business logic.

Confirmed from `data/raw/operations/jeddah/2026-07/تشغيل كيتا جدة شهر يوليو.xlsx`:

- same core model plus `TOGARY OPR` and `Dash_Togary`.
- this means multi-register support is no longer optional even within one city and one platform.

### HR workbook is not just HR

Confirmed from `البوابة المقبلة.xlsx`:

- 24 sheets.
- contains HR master tabs, archive, inactive-rider extraction, transport-license queue, Keeta IDs, driver cards, and platform-specific datasets like Hangar, Amazon, Ninja, and Jahez.
- `ارشيف البوابه واكسبرس ` alone carries very heavy conditional formatting and should be treated as historical logic, not just a backup sheet.

### Fleet workbook is a rules engine

Confirmed from `Updata_Vehicles (2).xlsx` and `Updata_Vehicles (5).xlsx`:

- heavy Google-Sheets-export formulas wrapped as `__xludf.DUMMYFUNCTION(...)`
- city mixing detection
- register/company mapping
- `To be Submitted`, `Under Review`, `Rejected`, `Approved`
- capacity-release logic such as `تفريغ السعة`

### Monthly closing logic already has real automated parsing coverage

Confirmed from `tests/keeta_operations_portal_v9_tests.js` plus real sample files:

- company invoices
- internal settlement workbook
- FR daily and summary workbooks
- company daily VDA workbooks
- archive export bundle generation

## 6. Test status at review time

Executed during this Prompt 0 pass:

| Test file | Result |
| --- | --- |
| `tests/keeta_operations_portal_tests.js` | 10 / 10 passed |
| `tests/keeta_operations_portal_v6_tests.js` | 7 / 7 passed |
| `tests/keeta_operations_portal_v9_tests.js` | 8 / 8 passed |

Interpretation:

- logic coverage exists and is useful
- but coverage is still engine-centric, not full import-registry or workbook-audit coverage

## 7. Outdated or incomplete assumptions corrected in this pass

- Prompt 0 was not fully complete before this pass because required reports were missing:
  - `IMPORT_REGISTRY_PROPOSAL.md`
  - `TEST_COVERAGE_REVIEW.md`
  - `PROMPT_0_FINAL_REVIEW.md`
- previous docs in the repo sometimes treated Prompt 1 as already fully completed; this review does not accept that as a governed roadmap fact.
- some older docs still describe architecture states older than the current `src/lib/` layout.

## 8. Current risks

- import lineage is not persisted yet
- city/register/version conflicts are still handled manually through file naming and operator knowledge
- Google Sheets export wrappers mean formula text cannot be trusted as a drop-in Excel engine
- the shift workbook was reviewed structurally, but full VBA-source parity was not established in this pass

## 9. Prompt 0 conclusion

Prompt 0 can now be considered complete after the reports updated in this pass.

Roadmap decision from this review:

- Prompt 1 can safely start after sign-off on these reports.
- Prompt 1 should be treated as a controlled UI shell phase, not as proof that existing redesign files are already accepted.
- Prompt 2 should start only after adopting the data model and import registry proposals documented here.
