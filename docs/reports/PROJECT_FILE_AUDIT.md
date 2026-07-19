# Project File Audit

Audit date: 2026-07-09  
Scope: current workspace only at `D:\keeta operations portal`  
Rule applied: no files were deleted or moved during this audit.

## Key Findings

- The active runtime is the V4 chain: `keeta_operations_portal_starter_v4.html` -> `keeta_operations_portal_app_v4.js` -> `keeta_operations_portal_logic.js` -> `vendor/xlsx.full.min.js`.
- The older `keeta_operations_portal_starter.html` and `keeta_operations_portal_app.js` are still useful as baseline references, but they are not the primary runtime anymore.
- The workspace contains several reference artifacts that are not wired into the runtime: downloaded dashboard HTML bundles, shift-planner mockups, Apps Script snippets, and form HTML mockups.
- Data assets are split across two main families:
  - `Updata_Vehicles*` for vehicle, branch, and HR-style joins.
  - `تشغيل كيتا جدة شهر يوليو*` for rider operations, OPR, VDA, face verification, performance, and status review.
- No archive action was executed. The rows marked `Archive Candidate` should be rechecked after V6 parity is reached.

## Audit Table

| File Path | Type | Role | Important? | Reason | Action |
|---|---|---|---|---|---|
| `.agents/` | Directory | Need Review | No | Hidden workspace metadata; not used by the portal runtime. | Ignore from app runtime |
| `.codex/` | Directory | Need Review | No | Codex app metadata only. | Ignore from app runtime |
| `.git/` | Directory | Need Review | No | Version-control metadata only. | Ignore from app runtime |
| `sample-data/` | Directory | Current Data Sample | Yes | Small CSV fixtures used by the current vehicle flow and quick testing. | Keep |
| `vendor/` | Directory | Core Current App | Yes | Ships the offline XLSX reader used by the current portal. | Keep |
| `Welcome_files/` | Directory | Reference in Current Project | Maybe | Downloaded asset bundle for the `Welcome.html` dashboard reference. | Keep as reference |
| `Shift Scheduler - Intelligent Rider Assignment_files/` | Directory | Reference in Current Project | Maybe | Downloaded asset bundle for the shift scheduler reference page. | Keep as reference |
| `README.md` | Markdown | Core Current App | Yes | Describes the offline portal and current execution model, but contains one stale note about `Updata_Vehicles (5).xlsx`. | Keep and refresh later |
| `KEETA_PORTAL_V6_EXECUTION_ORDER.md` | Markdown | Core Current App | Yes | Current execution-order guardrail for the V6 migration. | Keep |
| `CODEX_PROMPT_KEETA_OPERATIONS_PORTAL.md` | Markdown | Reference in Current Project | Maybe | Earlier migration prompt; useful for lineage only. | Keep as reference |
| `CODEX_PROMPT_KEETA_OPERATIONS_PORTAL_V4.md` | Markdown | Reference in Current Project | Maybe | Explains the V4 build direction. | Keep as reference |
| `CODEX_PROMPT_KEETA_OPERATIONS_PORTAL_V6.md` | Markdown | Reference in Current Project | Yes | Current V6 migration prompt and acceptance criteria. | Keep |
| `EXCEL_FORMULAS_REPORT.md` | Markdown | Reference in Current Project | Maybe | Earlier formula-conversion note; partly stale because the referenced workbook is now present. | Keep and supersede with V6 docs |
| `keeta_operations_portal_starter_v4.html` | HTML | Core Current App | Yes | Primary UI entrypoint for the current portal. | Keep active |
| `keeta_operations_portal_app_v4.js` | JavaScript | Current Logic Module | Yes | Primary browser controller for the V4 entrypoint. | Keep active |
| `keeta_operations_portal_logic.js` | JavaScript | Current Logic Module | Yes | Shared engine layer used by the browser runtime and Node tests. | Keep active |
| `vendor/xlsx.full.min.js` | JavaScript | Core Current App | Yes | Offline workbook parser required for XLSX/XLS review. | Keep active |
| `keeta_operations_portal_tests.js` | JavaScript | Core Current App | Yes | Current Node test launcher for `TestEngine`. | Keep active |
| `keeta_operations_portal_starter.html` | HTML | Duplicate | Maybe | Older portal entrypoint preserved as baseline; overlaps heavily with V4 starter. | Keep as baseline until V6 parity |
| `keeta_operations_portal_app.js` | JavaScript | Duplicate | Maybe | Older controller preserved as baseline; superseded by V4 controller. | Keep as baseline until V6 parity |
| `Welcome.html` | HTML | Reference in Current Project | Maybe | Large dashboard reference for UI ideas only; not connected to the current portal. | Keep as reference |
| `Welcome_files/*.css` | CSS Assets | Reference in Current Project | No | Styling bundle for `Welcome.html`, not the portal runtime. | Keep as reference |
| `Welcome_files/*.js.download` | JS Assets | Reference in Current Project | No | Downloaded vendor/application scripts for the reference dashboard. | Keep as reference |
| `Welcome_files/*.png` | Image Assets | Reference in Current Project | No | Static assets for `Welcome.html`. | Keep as reference |
| `Welcome_files/logo.svg` | SVG | Reference in Current Project | No | Logo asset for the reference dashboard. | Keep as reference |
| `Welcome_files/courier.html` | HTML | Reference in Current Project | Maybe | Additional downloaded page from the reference dashboard bundle. | Keep as reference |
| `Welcome_files/js` | Asset File | Reference in Current Project | No | Downloaded opaque asset, not runtime code for the current app. | Review before archive |
| `Welcome_files/tmap-i18n` | Asset File | Reference in Current Project | No | Downloaded opaque asset, not runtime code for the current app. | Review before archive |
| `Shift Scheduler - Intelligent Rider Assignment.html` | HTML | Reference in Current Project | Maybe | Rich reference for shift assignment UX and scheduling outputs. | Keep as reference |
| `Shift Scheduler - Intelligent Rider Assignment_files/index-b4104547.css` | CSS | Reference in Current Project | No | Styling bundle for the scheduler reference page. | Keep as reference |
| `Shift Scheduler - Intelligent Rider Assignment_files/index-03a57bc1.js.download` | JS | Reference in Current Project | No | Downloaded JS bundle for the scheduler reference page. | Keep as reference |
| `Shift Scheduler - Intelligent Rider Assignment_files/logo.svg` | SVG | Reference in Current Project | No | Logo asset for the scheduler reference page. | Keep as reference |
| `Shift Scheduler - Intelligent Rider Assignment_files/js` | Asset File | Reference in Current Project | No | Downloaded opaque asset from the scheduler reference export. | Review before archive |
| `Keeta_Shift_Capacity_Planner_V11.html` | HTML | Reference in Current Project | Yes | Strong reference for shift-capacity planning and scheduler logic. | Keep as reference |
| `Updata_Vehicles (5).xlsx` | XLSX Workbook | Current Data Sample | Yes | Primary vehicle-and-HR workbook with heavy formulas and both Jeddah/Riyadh tabs. | Keep for analysis and migration |
| `Updata_Vehicles (3).zip` | ZIP Archive | Reference in Current Project | Maybe | Archived companion package for the vehicle workbook family. | Review before archive |
| `Updata_Vehicles - Operating Vehicles (1).csv` | CSV | Current Data Sample | Yes | Extracted operating-vehicles source used by the vehicle engine. | Keep |
| `Updata_Vehicles - Update Branches (2).csv` | CSV | Current Data Sample | Yes | Extracted branch/register agreement feed. | Keep |
| `Updata_Vehicles - Update VehicleS.csv` | CSV | Current Data Sample | Yes | Extracted vehicle update feed used for reconciliation. | Keep |
| `تشغيل كيتا جدة شهر يوليو.xlsx` | XLSX Workbook | Current Data Sample | Yes | Primary Jeddah operations workbook covering rider master, OPR, VDA, performance, and face verification. | Keep for analysis and migration |
| `تشغيل كيتا جدة شهر يوليو.zip` | ZIP Archive | Reference in Current Project | Maybe | Archived companion package for the July workbook family. | Review before archive |
| `تشغيل كيتا جدة شهر يوليو - بيانات المناديب.csv` | CSV | Current Data Sample | Yes | Rider master dataset with Iqama, phone, bank, and current user ID. | Keep |
| `تشغيل كيتا جدة شهر يوليو - Dash_EXPRESS.csv` | CSV | Current Data Sample | Yes | Dash rider registry backing Express OPR and account status joins. | Keep |
| `تشغيل كيتا جدة شهر يوليو - EXPRESS OPR.csv` | CSV | Current Data Sample | Yes | Main Express OPR assignment sheet snapshot. | Keep |
| `تشغيل كيتا جدة شهر يوليو - HR (1059).csv` | CSV | Current Data Sample | Yes | HR register feed used in lookup logic for rider/register classification. | Keep |
| `تشغيل كيتا جدة شهر يوليو - Per Order Mode.csv` | CSV | Current Data Sample | Yes | Separate OPR-style dataset with shifted columns that must stay specially mapped. | Keep |
| `تشغيل كيتا جدة شهر يوليو - VDA.csv` | CSV | Current Data Sample | Yes | Derived validity analysis sheet with target and eligibility logic. | Keep |
| `تشغيل كيتا جدة شهر يوليو - VDA_kEETA.csv` | CSV | Current Data Sample | Yes | Raw performance/online dataset feeding VDA calculations. | Keep |
| `تشغيل كيتا جدة شهر يوليو - الاداء الكلى.csv` | CSV | Current Data Sample | Yes | Wide-format overall performance sheet that needs normalization. | Keep |
| `تشغيل كيتا جدة شهر يوليو - الاقالات.csv` | CSV | Need Review | Maybe | Appears to be a manual/exported HR status sheet with nonstandard header layout. | Review before use |
| `تشغيل كيتا جدة شهر يوليو - التحقق الكلي من الوجة.csv` | CSV | Current Data Sample | Yes | Wide-format face-verification dataset with lookup-driven outputs. | Keep |
| `تشغيل كيتا جدة شهر يوليو - التقرير اليومي.csv` | CSV | Current Data Sample | Yes | Daily operations metrics feed. | Keep |
| `تشغيل كيتا جدة شهر يوليو - المتابعة اليومية.csv` | CSV | Current Data Sample | Yes | Daily follow-up and supervisor action sheet. | Keep |
| `تشغيل كيتا جدة شهر يوليو - حالة نتيجة تجربة التوصيل.csv` | CSV | Current Data Sample | Yes | Delivery-experience ranking and incentive dataset. | Keep |
| `تشغيل كيتا جدة شهر يوليو - مراجعة الحالة.csv` | CSV | Current Data Sample | Yes | Status review dataset and source for `updateStatus()` conversion. | Keep |
| `sample-data/operating_vehicles.csv` | CSV | Current Data Sample | Yes | Lightweight fixture for the current vehicle engine. | Keep |
| `sample-data/update_vehicles.csv` | CSV | Current Data Sample | Yes | Lightweight update feed fixture for the current vehicle engine. | Keep |
| `sample-data/update_branches.csv` | CSV | Current Data Sample | Yes | Lightweight branch agreement fixture for the current vehicle engine. | Keep |
| `sample-data/riders.csv` | CSV | Current Data Sample | Yes | Lightweight rider fixture for the current vehicle engine. | Keep |
| `New Text Document.txt` | Text / Apps Script | Reference in Current Project | Yes | Contains `updateStatus()` and Arabic date parsing logic that should be migrated to JS. | Keep as reference |
| `New Text Document (2).txt` | Text / Apps Script | Reference in Current Project | Yes | Large ERP script reference with OPR mapping details and archive flow. | Keep as reference |
| `New Text Document (3).txt` | Text / Apps Script | Reference in Current Project | Yes | Variant of the ERP script reference with the same mapping family. | Compare, then archive candidate |
| `New Text Document (4).txt` | Text / HTML | Reference in Current Project | Maybe | Rider form UI reference extracted from Apps Script HTML. | Keep as reference |
| `New Text Document (5).txt` | Text / HTML | Reference in Current Project | Maybe | Swap form UI reference extracted from Apps Script HTML. | Keep as reference |

## Audit Decisions To Carry Into V6

- Treat the V4 starter/app pair as the live baseline.
- Treat the older starter/app pair as fallback references only.
- Treat the downloaded dashboard bundles and form/text exports as references, not source of truth.
- Keep all workbook and CSV artifacts in place until the V6 engines can reproduce the required outputs.
- Defer archive moves until after V6 modules, tests, and parity checks are in place.
