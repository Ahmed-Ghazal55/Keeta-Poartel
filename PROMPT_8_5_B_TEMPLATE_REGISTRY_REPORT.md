# Prompt 8.5-B Template Registry Report

## Scope reviewed
- `src/import/importTemplateRegistry.js`
- `src/import/headerMapper.js`

## Confirmed templates

### `external_riders`
- Target entity: `externalRiders`
- Supported types:
  - `external_riders_workbook`
  - `external_riders_csv`
- Exact lifecycle columns are present, including:
  - `Timestamp`
  - `رقم اقامة المندوب`
  - `اسم المندوب`
  - `رقم جوال التواصل`
  - `نوع المندوب / نوع البديل`
  - `نوع المركبة`
  - `كارت بنزين`
  - `عهدة الادوات`
  - `الجنسية`
  - `رقم الجوال المسجل بالتطبيق للمندوب`
  - `رقم الايبان البنكي`
  - `المعرف`
  - `Email Address`

### `current_assignments`
- Target entity: `assignments`
- Supported types:
  - `current_assignments_workbook`
  - `current_assignments_csv`
- Required operational columns are present, including:
  - `السجل`
  - `المدينة`
  - `التطبيق`
  - `Courier ID / User ID`
  - `رقم إقامة صاحب اليوزر`
  - `اسم صاحب اليوزر`
  - `رقم إقامة المندوب المستخدم فعليًا`
  - `اسم المندوب المستخدم فعليًا`
  - `نوع المندوب: كفالة / خارجي`
  - `رقم جوال المندوب الفعلي`
  - `نوع التشغيل: راتب / بالطلب / خارجي / بديل`
  - `تاريخ بداية التسكين`
  - `تاريخ الاستلام للمندوب المستخدم`
  - `تاريخ أول يوم عمل للأيدي`
  - `حالة التسكين: نشط / موقوف / تبديل / إقالة`
  - `المركبة المسجلة على اليوزر`
  - `المركبة المستخدمة فعليًا`
  - `نوع المركبة`
  - `رقم اللوحة`
  - `الرقم التسلسلي`
  - `المشرف`
  - `ملاحظات`

## Header alias completion
- `ownerIqama` / `OwnerIqama`
- `actualRiderIqama` / `ActualRiderIqama`
- Arabic owner and actual-rider iqama labels
- `Courier ID`
- `User ID`
- `Courier ID / User ID`

## Important collision fix
- The partial run exposed a header alias collision where `vehicleType` could swallow:
  - `رقم اللوحة`
  - `الرقم التسلسلي`
- `FIELD_ALIASES.vehicleType` was tightened so `plateNumber` and `vehicleSerial` can map independently.
- This changed `current_assignments` template matching from `review` to `auto`.

## Result
- Lifecycle templates now auto-match their official headers correctly.

## Verification
- `tests/lifecycleTemplateRegistry.test.js` passed.
- `tests/importTemplateRegistry.test.js` passed.
