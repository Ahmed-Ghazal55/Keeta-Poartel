# CODEX PROMPT V6 — KEETA Operations Portal Migration Plan

أنت مهندس Frontend + Data Engineer + Spreadsheet Migration Specialist.  
المطلوب تطوير المشروع الحالي الموجود على الجهاز في المسار:

`D:\keeta operations portal`

وهذا هو **المشروع الأساسي والحالي** الذي يجب أن تبدأ منه وتراجعه أولًا.

يوجد مشروع قديم في المسار:

`D:\KEETA OPR`

وهذا المشروع القديم يتم استخدامه **كمرجع فقط** بعد فهم المشروع الحالي. لا تبدأ منه، ولا تنقل منه ملفات أو كود قبل عمل Audit كامل للمشروع الحالي وفهم هيكله.

---

## القاعدة الأساسية

1. المشروع الحالي الأساسي:
   - `D:\keeta operations portal`

2. المشروع القديم المرجعي:
   - `D:\KEETA OPR`

3. الملفات والاسكربتات المرفقة سابقًا:
   - تعتبر References إضافية.
   - تستخدم لفهم المعادلات، الشفتات، Google Apps Script، Dashboard UI، وOPR.
   - لا يتم دمجها مباشرة قبل تحليل المشروع الحالي.

4. ممنوع حذف أي ملف من المشروع الحالي مباشرة.
   - أي ملف غير مستخدم ينقل إلى `archive_unused/YYYY-MM-DD/`.
   - قبل النقل يجب تسجيله في `PROJECT_FILE_AUDIT.md`.

---

# المرحلة 1 — Current Project Audit أولًا

ابدأ من:

`D:\keeta operations portal`

نفذ Scan كامل لكل الملفات والمجلدات داخل المشروع الحالي:

- HTML
- CSS
- JS / TS
- React / Vite إن وجد
- package.json
- src / public / assets
- CSV / XLSX / XLSM
- JSON
- أي ملفات Dashboard
- أي ملفات Tests
- أي ملفات Documentation
- أي ملفات قديمة داخل المشروع الحالي

أنشئ ملف:

`PROJECT_FILE_AUDIT.md`

وفيه جدول:

| File Path | Type | Role | Important? | Reason | Action |
|---|---|---|---|---|---|

التصنيفات:
- `Core Current App`
- `Current Data Sample`
- `Current UI Component`
- `Current Logic Module`
- `Reference in Current Project`
- `Duplicate`
- `Broken/Unused`
- `Archive Candidate`
- `Need Review`

لا تنتقل للمشروع القديم إلا بعد كتابة هذا التقرير.

---

# المرحلة 2 — فهم بنية المشروع الحالي

بعد الـ Audit، أنشئ ملف:

`CURRENT_PROJECT_ARCHITECTURE.md`

اكتب فيه:

1. نوع المشروع:
   - Single HTML
   - Vanilla JS
   - React/Vite
   - Next.js
   - أو غير ذلك

2. نقطة الدخول الرئيسية:
   - `index.html`
   - `src/main.jsx`
   - `src/App.jsx`
   - أو غيره

3. الصفحات الموجودة حاليًا.

4. الموديولات الموجودة.

5. طرق قراءة الملفات الحالية.

6. طرق التصدير الحالية.

7. الثغرات والنواقص.

8. هل النسخة الحالية مبنية على Starter V4 أم لا.

---

# المرحلة 3 — Data & Formula Discovery داخل المشروع الحالي

افحص كل ملفات البيانات الموجودة داخل المشروع الحالي أولًا.

أنشئ ملف:

`DATA_SCHEMA_MAP.md`

لكل Dataset أو Sheet أو CSV اكتب:

| Dataset | File | Sheet/Tab | Primary Key | Required Columns | Optional Columns | Joins | Notes |
|---|---|---|---|---|---|---|---|

المفاتيح الأساسية المتوقعة:
- `User ID`
- `Keeta ID`
- `Courier ID`
- `رقم الإقامة`
- `Iqama`
- `Phone`
- `Vehicle Serial`
- `Plate`
- `City`
- `Register / Company`

ابحث داخل الملفات الحالية عن معادلات أو دوال:
- Google Sheets formulas
- Excel formulas
- JavaScript functions
- Apps Script fragments
- Lookup / XLOOKUP logic
- COUNTIFS / SUMIFS / FILTER logic
- VDA / VDA_kEETA logic
- Face verification logic
- Delivery experience logic
- OPR assignment logic

أنشئ ملف:

`FORMULA_CONVERSION_PLAN.md`

وفيه:
- اسم المعادلة أو المنطق.
- مكانها في الشيت/الكود.
- ماذا تفعل.
- كيف سيتم تحويلها إلى JavaScript.
- هل تحتاج بيانات إضافية أم لا.

---

# المرحلة 4 — مراجعة المشروع القديم بعد فهم الحالي

بعد الانتهاء من المراحل 1 و2 و3 فقط، افتح المشروع القديم:

`D:\KEETA OPR`

هدفك من المشروع القديم:
- المقارنة.
- استخراج أفضل المكونات.
- الاستفادة من أي Dashboard أو Components أو Engines.
- عدم استبدال المشروع الحالي بالكامل.

أنشئ ملف:

`LEGACY_PROJECT_COMPARISON.md`

وفيه:

| Area | Current Project | Legacy Project | Reuse Decision | Reason |
|---|---|---|---|---|

المجالات المطلوب مقارنتها:
- Dashboard layout
- Routing / Tabs
- Data import
- Shift scheduler
- Salary calculator
- VDA logic
- Face verification logic
- OPR management
- Export functions
- UI styling
- Search/filter tables
- LocalStorage / IndexedDB
- Any existing tests

قواعد مهمة:
- القديم Reference وليس Source of Truth.
- لو في كود أفضل في القديم، انقله بعد عزله وتنظيفه.
- لا تكسر الموجود في الجديد.
- لو في تعارض بين الجديد والقديم، اكتب القرار في التقرير قبل التنفيذ.

---

# المرحلة 5 — استخدام الملفات والاسكربتات المرفقة كـ References

بعد مراجعة الحالي والقديم، استخدم الملفات المرجعية التالية:

## ملفات الشفتات
- `Keeta Shifts Scheduling Tool V1.2 (3-Shifts) - AD.xlsm`
- `Keeta_Shift_Capacity_Planner_V11.html`

## أمثلة Dashboard
- `Welcome.html`
- أي HTML خاص بـ Keeta Management Center

## ملفات الأداء والصلاحية
- `تشغيل كيتا جدة شهر يوليو.xlsx`
- `VDA.csv`
- `VDA_kEETA.csv`
- `حالة نتيجة تجربة التوصيل.csv`
- `التحقق الكلي من الوجة.csv`
- `الاداء الكلى.csv`
- `التقرير اليومي.csv`
- `المتابعة اليومية.csv`

## ملفات التشغيل
- `Dash_EXPRESS.csv`
- `HR.csv`
- `الاقالات.csv`
- `مراجعة الحالة.csv`
- `EXPRESS OPR.csv`
- `Per Order Mode.csv`

## Apps Script / Forms
- ERP Google Apps Script
- RiderForm HTML
- SwapForm HTML
- `updateStatus()` script

---

# المرحلة 6 — خطة التنفيذ الصحيحة

نفّذ التطوير بالترتيب التالي، ولا تقفز مباشرة للكود النهائي:

## 6.1 حماية المشروع
- اعمل نسخة Backup أو Branch قبل التعديل.
- اكتب في `IMPLEMENTATION_REPORT.md` نقطة بداية التنفيذ.

## 6.2 Data Import Center
أضف أو طوّر صفحة مركز رفع الملفات:
- CSV
- XLSX
- XLSM
- TXT
- JSON إن وجد

Features:
- Auto-detect type by filename/sheet/header.
- City selector:
  - جدة
  - الرياض
- كل مدينة Dataset منفصل.
- ممنوع خلط جدة والرياض.
- Data quality report:
  - Missing columns
  - Duplicate IDs
  - Invalid dates
  - Empty rows
  - Unmapped columns

## 6.3 Formula Engine
أنشئ أو طوّر:
`src/lib/formulaEngine.js`

يدعم:
- XLOOKUP
- XMATCH
- COUNTIF / COUNTIFS
- SUMIF / SUMIFS
- FILTER
- UNIQUE
- IF / IFS
- IFERROR
- DATE
- TEXT
- WEEKDAY
- VALUE
- TRIM
- REGEXMATCH
- LET-like helper
- IMPORTRANGE replacement = uploaded datasets

ممنوع الاعتماد على Google Sheets Runtime.

## 6.4 Normalization Engines

أنشئ Modules واضحة:

### `src/lib/normalizeOverallPerformance.js`
يحول `الاداء الكلى` من Wide Format إلى Long Format:
- row per rider per day

Output:
- city
- register/company
- courier_id
- rider_name
- iqama
- phone
- vehicle
- day
- date_key
- orders
- driver_reject
- auto_reject
- cancel_rate
- online_time
- avg_delivery_time

### `src/lib/vdaEngine.js`
يحسب:
- أول يوم عمل
- عدد أيام العمل
- الأيام الصالحة
- الأيام غير الصالحة
- التارجت الحالي
- التارجت المتوقع
- صلاحية الطلبات
- صلاحية كيتا
- Valid / Invalid
- Reason
- Missing Days
- Action Needed

### `src/lib/faceVerificationEngine.js`
يحسب:
- Triggered Days
- Passed Days
- Failed Days
- Pass Rate
- Is >= 90%
- خصم التحقق
- أول يوم Online
- الأيام الفاشلة

### `src/lib/deliveryExperienceEngine.js`
يحسب:
- ترتيب المندوب داخل المدينة.
- Level A/B/C.
- الحافز حسب نوع المركبة.
- إذا غير صالح = الحافز 0.

### `src/lib/statusReviewEngine.js`
حوّل Apps Script `updateStatus()` إلى JavaScript:
- الحالة `مقيد بالايام`
- تاريخ التقييد
- عدد الأيام
- تاريخ الانتهاء
- إذا Today >= EndDate:
  - الحالة = `شغال`
  - كتابة ملاحظة:
    - `تاريخ اخر تقييد للمعرف: yyyy-MM-dd HH:mm:ss لمدة X يوم`

لازم تدعم:
- تاريخ عربي
- ص / م
- `/`
- `-`
- `.`
- الفاصلة العربية `،`

### `src/lib/oprEngine.js`
حوّل منطق ERP:
- بيانات المناديب
- EXPRESS OPR
- Albwaba OPR
- TOGARY OPR
- Per Order Mode
- أرشفة حركة اليوزرات
- تسكين
- تبديل
- إيقاف بدون بديل
- البحث بالاقامة
- البحث باليوزر

انتبه:
- Per Order Mode أعمدته مزاحة عمود واحد عن باقي OPR.
- لا تكسر Mapping الموجود.

---

# المرحلة 7 — Dashboard Pages المطلوبة

## A) Executive Dashboard
KPIs:
- إجمالي اليوزرات
- الشغالة
- المقيدة
- لا يعمل حاليًا
- الصالحين
- غير الصالحين
- إجمالي الطلبات
- متوسط الطلبات
- رفض السائق
- رفض تلقائي
- معدل الإلغاء
- ATA
- Face Pass Rate
- خصومات الوجه
- أقل من التارجت
- يحتاج متابعة
- الشفتات الموزعة
- غير موزعين

Filters:
- المدينة
- السجل
- نوع المركبة
- حالة الحساب
- المشرف
- التاريخ
- بحث عام

## B) Daily Performance Dashboard
مصادر:
- التقرير اليومي
- المتابعة اليومية
- الاداء الكلى

يعرض:
- اختيار يوم
- جدول يومي قابل للبحث
- KPIs يومية
- Export
- Actions للمشرف

## C) Overall Performance
- شهري
- يومي
- Heatmap
- Ranking
- أقل من التارجت
- Search / Filters / Export

## D) VDA / VDA_kEETA
- تحليل الصلاحية
- أسباب عدم الصلاحية
- الأيام الناقصة
- التوقع حتى نهاية الشهر
- Action Needed

## E) Face Verification
- Pass Rate
- أقل من 90%
- الأيام الفاشلة
- خصومات
- Export

## F) Delivery Experience
- A/B/C
- Ranking داخل المدينة
- الحافز
- ربطه بالصلاحية
- غير صالح = 0

## G) Status Review
- تحديث الحالات المقيدة بالأيام
- Export بعد التحديث
- سجل الحالات التي تغيرت

## H) OPR Management
- إدارة بيانات المناديب
- إضافة / تعديل
- تسكين
- تبديل
- إيقاف بدون بديل
- أرشفة

## I) Shift Scheduler — 3 Shifts System
أضف نظام 3 شفتات للمندوب داخل توزيع الشفتات.

Inputs:
- المدينة
- رفع أو لصق User IDs
- 6 شفتات:
  1. 12 AM - 3 AM
  2. 3 AM - 8 AM
  3. 8 AM - 12 PM
  4. 12 PM - 4 PM
  5. 4 PM - 8 PM
  6. 8 PM - 12 AM
- Target لكل شفت
- Max لكل شفت
- عدد الشفتات لكل مندوب = 3
- طريقة التوزيع:
  - Back to Back
  - 1 Gap
  - 2 Gap
  - 1 Gap + 1 Gap
  - Auto Optimize

Rules:
- ممنوع تجاوز Max.
- كل مندوب يأخذ 3 شفتات إذا السعة تسمح.
- عند نقص المناديب: أفضل تغطية ممكنة.
- عند زيادة المناديب: الزائد في Unassigned.
- استخدم User IDs الحقيقية في النتائج.

Outputs:
- Shift Summary
- Rider Assignment
- Unassigned Riders
- Capacity Gaps
- Utilization %
- Export CSV / Excel
- Copy Results

---

# المرحلة 8 — Search / Filter / Export

كل جدول مهم لازم يحتوي:
- Search
- Column filters
- Sort
- Pagination
- Export CSV UTF-8 BOM
- Copy selected rows
- Drilldown عند الضغط على User ID

Global Search:
- User ID
- Iqama
- Name
- Phone
- Vehicle
- Register

---

# المرحلة 9 — UI/UX

استوحِ من:
- Welcome.html
- Keeta Dashboard
- المشروع الحالي

لكن لا تنسخ خام بشكل مضر.

المطلوب:
- RTL Arabic
- Sidebar واضح
- Header
- KPI Cards
- Tabs
- Responsive
- ألوان Keeta:
  - أصفر
  - أخضر
  - أبيض
  - رمادي
- Badges:
  - صالح
  - غير صالح
  - شغال
  - مقيد
  - لا يعمل حاليًا
  - يحتاج متابعة

---

# المرحلة 10 — الاختبارات

نفذ Tests أو Test Functions:

- تحميل CSV.
- تحميل XLSX.
- اكتشاف نوع الملف.
- تحويل الأداء الكلي Wide إلى Long.
- حساب VDA.
- حساب Face Pass Rate.
- تحديث حالة مقيد بالايام.
- توزيع 40 مندوب على 6 شفتات بدون تجاوز Max.
- استخدام User IDs الحقيقية.
- فصل جدة والرياض.
- Export صحيح.

---

# المرحلة 11 — المخرجات النهائية من Codex

أنشئ أو حدّث:

1. `PROJECT_FILE_AUDIT.md`
2. `CURRENT_PROJECT_ARCHITECTURE.md`
3. `DATA_SCHEMA_MAP.md`
4. `FORMULA_CONVERSION_PLAN.md`
5. `LEGACY_PROJECT_COMPARISON.md`
6. `IMPLEMENTATION_REPORT.md`

وفي `IMPLEMENTATION_REPORT.md` اكتب:
- ما الذي تم تنفيذه.
- الملفات التي تم تعديلها.
- الملفات التي تم إنشاؤها.
- الملفات التي تم أرشفتها.
- كيف تم استخدام المشروع القديم.
- كيف تم استخدام الملفات المرجعية.
- المعادلات المحولة.
- القيود المتبقية.
- طريقة التشغيل.

---

# قواعد نهائية لا تكسرها

- ابدأ من `D:\keeta operations portal`.
- لا تبدأ من `D:\KEETA OPR`.
- القديم مرجع بعد فهم الجديد.
- لا تحذف ملفات قبل Audit.
- لا تخلط جدة والرياض.
- غير صالح = لا يوجد حافز صلاحية ولا تجربة توصيل.
- Face Verification شرط مهم.
- VDA و VDA_kEETA مصدر تحليل الصلاحية.
- 3 شفتات لكل مندوب في Scheduler.
- Max لا يتم تجاوزه.
- Per Order Mode له Mapping مختلف.
- أي قرار غير واضح اكتبه في التقرير بدل التخمين.
