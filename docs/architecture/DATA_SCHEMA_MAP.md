# Data Schema Map

Schema mapping date: 2026-07-09  
Scope: datasets inside `D:\keeta operations portal`

Current-note:

- This file contains useful legacy mapping context, but the currently approved phase-one source-of-truth documents are:
  - `SHEETS_DEEP_ANALYSIS.md`
  - `DATA_MODEL_PROPOSAL.md`
- The exact current workbook filenames in the workspace are:
  - `نسخة من تشغيل كيتا جدة شهر مايو.xlsx`
  - `البوابة المقبلة.xlsx`
  - `Updata_Vehicles (2).xlsx`
  - `Keeta Shifts Scheduling Tool V1.2 (3-Shifts) - AD (2).xlsm`

## Integration Rules

- `Updata_Vehicles (5).xlsx` contains both Jeddah and Riyadh-related data and should be partitioned explicitly by city during import.
- `تشغيل كيتا جدة شهر يوليو.xlsx` is a Jeddah-focused monthly operations workbook and should not be mixed with Riyadh imports.
- `Per Order Mode` is structurally offset by one column relative to the main OPR sheets and needs a dedicated mapper.
- Workbook sheets and exported CSV snapshots overlap; the workbook should remain the richer source because it preserves formulas and cross-sheet relationships.

## Schema Table

| Dataset | File | Sheet/Tab | Primary Key | Required Columns | Optional Columns | Joins | Notes |
|---|---|---|---|---|---|---|---|
| Operating Vehicles sample | `sample-data/operating_vehicles.csv` | CSV | `vehicle_serial` | `vehicle_serial`, `plate`, `city`, `register`, `vehicle_type`, `operating_status`, `transport_mode` | `notes` | `update_vehicles`, riders by `current_vehicle_serial` | Small fixture used by the current vehicle engine. |
| Update Vehicles sample | `sample-data/update_vehicles.csv` | CSV | `vehicle_serial` | `vehicle_serial`, `city`, `register`, `vehicle_type`, `operating_status`, `transport_mode` | `notes` | `operating_vehicles` by `vehicle_serial` | Sample reconciliation feed for vehicle assignment. |
| Update Branches sample | `sample-data/update_branches.csv` | CSV | `city + register` | `city`, `register`, `allowed_registers`, `direct_agreement` | `notes` | vehicle/register agreement checks | Current vehicle engine already uses this shape. |
| Riders sample | `sample-data/riders.csv` | CSV | `user_id` | `user_id`, `iqama`, `rider_name`, `city`, `register`, `current_vehicle_serial`, `vehicle_type` | `dashboard_transport_mode` | `operating_vehicles` by `current_vehicle_serial` | Fixture for assignment and validation scenarios. |
| Operating Vehicles export | `Updata_Vehicles - Operating Vehicles (1).csv` | CSV | `الرقم التسلسلي` | `رقم اللوحة`, `الرقم التسلسلي`, `مدينة المركبة الفعلية`, `الوضع الفعلي للمركبة`, `نوع المركبة` | `نوع التسجيل`, `الماركة`, `الطراز`, `OPC`, `السجل`, `السجل المالك`, `السجلات المتاحه للاستخدام`, `الاجراء المستهدف من التحديث` | joins to update vehicle sheets by serial, joins to branch/register policy by city/register | Closest raw operating-vehicles truth source in the full dataset family. |
| Update Branches export | `Updata_Vehicles - Update Branches (2).csv` | CSV | mixed register key | register/company fields, city fields, update status fields | courier and descriptive columns | joins to vehicle and rider sheets through city/register rules | Header is mixed Arabic/English; needs canonical field mapping during import. |
| Update Vehicles export | `Updata_Vehicles - Update VehicleS.csv` | CSV | vehicle serial | vehicle/register/status columns | occupancy and descriptive columns | joins to `Operating Vehicles` by serial | Used to validate that update rows match active vehicles. |
| Vehicle workbook family | `Updata_Vehicles (5).xlsx` | `VehicleS`, `Update VehicleS`, `UpDate_VehicleS`, `UpDate_-VehicleS` | `Vehicle Serial / الرقم التسلسلي` | serial, city, register, vehicle type, operating status | plate, brand, model, action notes, availability fields | joins to `Operating Vehicles`, branch sheets, rider master sheets | Formula-heavy duplicate family; tabs likely represent different export stages and should be profiled before consolidation. |
| Branch workbook family | `Updata_Vehicles (5).xlsx` | `Branches`, `Update Branches` | `City + Register` | city, register/company, agreement columns | descriptive and action columns | joins to vehicle sheets and rider/company classification | Contains agreement logic used to allow or reject cross-register assignments. |
| Driver card workbook | `Updata_Vehicles (5).xlsx` | `Drivers_Card` | likely `Courier ID / Iqama` | rider identity, vehicle, card fields | operational metadata | joins to HR and rider master | Appears to support rider/vehicle card reconciliation. |
| HR register workbook | `Updata_Vehicles (5).xlsx` | `HR Express`, `HR Albwaba`, `Muasasat Al-bawabah` | `رقم الهوية` or platform rider ID | identity, employment, register/company, city/app ID columns | license and status columns | joins to rider master, OPR, and company detection formulas | Core source for sponsor/register inference. |
| City rider data workbook | `Updata_Vehicles (5).xlsx` | `بيانات كيتا جدة`, `بيانات كيتا الرياض` | rider ID family | rider identity, company/register, city, app/account fields | delivery and vehicle metadata | joins to city-partitioned operational imports | Important because the workbook already separates Jeddah and Riyadh. |
| Vehicle delivery handover workbook | `Updata_Vehicles (5).xlsx` | `تسليم المركبات`, `تسليم مركبات الرياض` | vehicle or rider handover key | handover date, rider, vehicle | notes | joins to vehicle and rider master data | Strong candidate for future asset-tracking workflows. |
| Rider master | `تشغيل كيتا جدة شهر يوليو.xlsx` | `بيانات المناديب` | `المعرف` with `رقم اقامة المندوب` fallback | `رقم اقامة المندوب`, `اسم المندوب`, `رقم جوال التواصل`, `نوع البديل`, `نوع المركبة`, `الرقم المسجل بالتطبيق للمندوب`, `المعرف` | `كارت بنزين`, `عهدة الادوات`, `الجنسية`, `رقم الايبان البنكي`, email columns | joins to `HR (*)`, `EXPRESS OPR`, `Albwaba OPR`, `Per Order Mode`, `مراجعة الحالة`, historical month sheets | The main rider entity table for OPR and status flows. |
| OPR sheets | `تشغيل كيتا جدة شهر يوليو.xlsx` | `EXPRESS OPR`, `Albwaba OPR`, `TOGARY OPR` | `المعرف` | `المعرف`, `الاسم بالكامل`, `رقم بطاقة الهوية`, `رقم الهاتف`, `المركبة`, `الحالة` | replacement rider fields, bank, tools, notes, status-by-days columns | joins to rider master, dash sheets, vehicle sheet, status review | Shared structure across the three main OPR tabs. |
| Per-order OPR | `تشغيل كيتا جدة شهر يوليو.xlsx` | `Per Order Mode` | `المعرف` | `السجل`, `المعرف`, `الاسم بالكامل`, `رقم بطاقة الهوية`, `رقم الهاتف`, `المركبة`, `الحالة` | replacement fields, daily/penalty note fields, restriction columns | joins to rider master, status review, dash per-order sheet | Columns are shifted compared with the other OPR tabs; keep separate normalization logic. |
| Dash rider registries | `تشغيل كيتا جدة شهر يوليو.xlsx` | `Dash_EXPRESS`, `Dash_Togary`, `Dash_Albwaba`, `Dash FR _ Per Order` | `معرّف السائق` | rider ID, name, phone, vehicle, employment/review status, register | qualification and card columns | joins to OPR tabs and rider master | Used as the operational account truth source for app/platform status. |
| HR monthly sheets | `تشغيل كيتا جدة شهر يوليو.xlsx` | `HR (1059)`, `HR (8094)`, `HR (Togary)` | `رقم الهوية` or platform app ID | employment number, identity, name, register/company, app IDs | license, sponsorship, notes, city | joins to rider master and OPR sheets | Lookup source for sponsor and register inference. |
| Historical archive | `تشغيل كيتا جدة شهر يوليو.xlsx` | `سجل حركة اليوزرات التاريخي` | archive event key | archived rider/user movement fields | notes | joins to OPR engine archive actions | Required for future OPR archive and swap workflows. |
| Status review | `تشغيل كيتا جدة شهر يوليو.xlsx` | `مراجعة الحالة` | `المعرف` | `المعرف`, `الحالة`, `تاريخ التقييد`, `عدد الايام` | account type | joins to OPR sheets, VDA, face verification, Apps Script `updateStatus()` logic | Primary source for temporary restriction lifecycle. |
| Resignations / exits | `تشغيل كيتا جدة شهر يوليو.xlsx` | `الاقالات` | manual identity key | rider identity and exit fields | notes | joins to rider status and HR review | Exported CSV has a nonstandard header row and needs manual parsing rules. |
| Daily report | `تشغيل كيتا جدة شهر يوليو.xlsx` | `التقرير اليومي` | `التاريخ + معرّف السائق` | date, rider ID, supervisor, online duration, delivered tasks, rejection, cancellation, ATA-style metrics | late delivery fields | joins to overall performance and VDA support tables | Strong raw daily KPI feed. |
| Daily follow-up | `تشغيل كيتا جدة شهر يوليو.xlsx` | `المتابعة اليومية` | date column set + rider/supervisor axis | daily action columns, supervisor fields, monthly totals | notes | joins to `الاداء الكلى` by date/rider | Formula sheet that already references the overall performance matrix. |
| Daily performance | `تشغيل كيتا جدة شهر يوليو.xlsx` | `الاداء اليومي` | rider/date composite | rider ID, per-day delivered totals, validity flags | derived matching columns | joins to OPR sheets and `VDA` | Intermediate layer for VDA and ranking logic. |
| Overall performance | `تشغيل كيتا جدة شهر يوليو.xlsx` | `الاداء الكلى` | wide matrix, needs long key `courier_id + date_key` | rider identity block plus repeated daily metric columns | register, phone, vehicle, supervisor fields | joins to face verification, VDA support, daily follow-up | Must be normalized from wide format to long format before reliable JS analytics. |
| Face verification | `تشغيل كيتا جدة شهر يوليو.xlsx` | `التحقق الكلي من الوجة` | wide matrix, target long key `courier_id + date_key` | rider block, repeated daily verification result columns | summary and deduction columns | joins to `الاداء الكلى`, `VDA_kEETA`, `مراجعة الحالة`, OPR tabs | Also wide-format and formula-heavy; needs its own normalization pipeline. |
| Delivery experience | `تشغيل كيتا جدة شهر يوليو.xlsx` | `حالة نتيجة تجربة التوصيل` | `Courier ID` or `معرِّف سائق التوصيل` | register, vehicle, courier ID, name, current level/classification, incentive amount, performance rates | problem labels, reject types, daily result | joins to `VDA`, OPR, vehicle type | Incentive output must be zeroed for invalid riders. |
| VDA source | `تشغيل كيتا جدة شهر يوليو.xlsx` | `VDA_kEETA` | `Rider ID` | `Rider ID`, `Online Day`, `First online date`, `Vehicle Type`, delivered/accepted/order-distance metrics | shift-hour breakdowns and valid-shift flags | joins to `VDA`, face verification, overall performance | Raw import-style dataset; no formulas found in workbook copy. |
| VDA derived | `تشغيل كيتا جدة شهر يوليو.xlsx` | `VDA` | `معرّف السائق` | rider ID, register, identity, vehicle, delivered orders, target deltas, start date, valid/invalid day counters | face verification %, distance, duplicate iqama flag | joins to `VDA_kEETA`, `الاداء اليومي`, `مراجعة الحالة`, OPR tabs | Main validity/eligibility calculation target for JS migration. |
| Reporting tab | `تشغيل كيتا جدة شهر يوليو.xlsx` | `تقرير البيانات` | reporting row key | summarized reporting columns | notes | joins to monthly analytics | Likely a final-report aggregation tab. |
| Jeddah CSV snapshots | `تشغيل كيتا جدة شهر يوليو - *.csv` | CSV exports | varies by sheet | same as source sheet columns | workbook-derived summaries | mirror workbook joins above | Useful for lightweight import tests, but workbook remains richer because formulas are lost in CSV. |

## High-Value Join Keys

Primary key families that appear repeatedly across the current data:

- `المعرف` / `User ID`
- `معرّف السائق` / `Rider ID` / `Courier ID`
- `رقم اقامة المندوب` / `رقم الهوية` / `Iqama`
- `رقم الهاتف`
- `Vehicle Serial`
- `رقم اللوحة`
- `City`
- `Register / Company / السجل`
- `date_key` after wide-sheet normalization

## Migration Notes

- City separation must be explicit in the normalized model, even when the raw workbook mixes multiple cities.
- OPR, VDA, face verification, and delivery experience all depend on stable identity normalization across Arabic and English headers.
- Several workbook tabs are export-stage duplicates rather than clean source tables; profiling should happen before one tab is chosen as the canonical import source.
