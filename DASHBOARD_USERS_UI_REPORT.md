# Dashboard Users UI Report

## Scope
- Updated only the Operations module Dashboard Users experience.
- No global redesign was started in this prompt.

## KPI cards confirmed
- `إجمالي يوزرات الداشبورد`
- `جديد`
- `جاهز للتسكين`
- `مسكن`
- `قيد المراجعة`
- `مرفوض`
- `مقال / مختفي`
- `يحتاج مراجعة`

## Filters confirmed
- search input:
  - `opsSearchInput`
- selects:
  - `opsRegisterFilter`
  - `opsCityFilter`
  - `opsPlatformFilter`
  - `opsLifecycleFilter`
  - `opsReadinessFilter`
  - `opsReviewFilter`
  - `opsEmploymentFilter`
  - `opsModeFilter`
  - `opsVehicleFilter`

## Dashboard Users table columns confirmed
- `Courier ID`
- `الاسم الكامل`
- `رقم إقامة صاحب اليوزر`
- `الجوال`
- `السجل`
- `المدينة`
- `التطبيق`
- `Employment`
- `Review`
- `Document`
- `Lifecycle`
- `Assignment Readiness`
- `المندوب المستخدم فعليًا`
- `نوع المندوب الفعلي`
- `حالة التسكين`
- `المركبة`
- `آخر ظهور`
- `الإجراءات`

## Operational tabs confirmed
- `يوزرات الداشبورد`
- `تحتاج تسكين`
- `تعمل حاليًا`
- `المناديب التي تعمل`
- `تحتاج مراجعة`
- `التبديلات`
- `الإقالات`
- `سجل العمليات`

## Browser confirmation
- Normal mode showed the Dashboard Users tab as reachable and active.
- KPI cards, filter row, and dashboard users table were visible.
- Sample browser session displayed `2` dashboard users in the current seed dataset.
- Visual artifact:
  - `artifacts/prompt-8-7/prompt-8-7-normal.png`

## Supporting tests
- `tests/dashboardUsersUi.test.js`
