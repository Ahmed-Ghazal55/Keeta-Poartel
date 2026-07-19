# CODEX PROMPT V9 — Immediate Full Implementation Without Breaking Current Project

أنت تعمل على المشروع الحالي:

`D:\keeta operations portal`

والمشروع القديم الموجود هنا يستخدم كمرجع فقط:

`D:\KEETA OPR`

المطلوب الآن: **تنفيذ فوري شامل ومنظم** لكل التعديلات التالية، لكن على مراحل آمنة حتى لا تضرب المشروع أو تكسر الواجهة.

---

## 0) قواعد تشغيل إجبارية قبل التنفيذ

### ممنوع تعمل Rewrite كامل للمشروع
لا تعيد بناء المشروع من الصفر.  
اشتغل على الموجود داخل:

`D:\keeta operations portal`

### التنفيذ يكون على مراحل قصيرة
بعد كل مرحلة:
1. احفظ التعديل.
2. شغل الاختبارات.
3. افتح الواجهة أو شغل Build إن وجد.
4. اكتب النتيجة في `IMPLEMENTATION_REPORT.md`.

### لا تقف عند التوثيق فقط
في آخر تنفيذ تم إنشاء modules واختبارات، لكن الموديولات لم يتم ربطها بالواجهة.  
في هذا البرومبت المطلوب **تنفيذ وربط فعلي داخل UI**، وليس فقط ملفات توثيق.

### لا تحذف قبل المراجعة
لا تحذف أي ملف قبل:
- `PROJECT_FILE_AUDIT.md`
- `DELETE_CANDIDATES.md`
- تشغيل المشروع بعد النقل للأرشيف.

### استخدم تاريخ الجهاز
النظام يحتاج التعامل مع دورة شهرية. استخدم تاريخ الجهاز الحالي Local System Date.  
لا تعتمد على الإنترنت إلا إذا المشروع نفسه فيه مصدر وقت خارجي.  
لو اليوم قبل نهاية الشهر + يوم، اعرض Warning أن التقارير النهائية غالبًا لم تصدر بعد.

---

# 1) مراجعة التنفيذ السابق وربط الموديولات بالواجهة

حسب آخر تنفيذ، تم إنشاء modules داخل:

`src/lib`

مثل:
- `formulaEngine.js`
- `normalizeOverallPerformance.js`
- `vdaEngine.js`
- `faceVerificationEngine.js`
- `deliveryExperienceEngine.js`
- `statusReviewEngine.js`
- `oprEngine.js`

وقد نجحت الاختبارات:
- `keeta_operations_portal_tests.js`
- `keeta_operations_portal_v6_tests.js`

لكن الفجوة المهمة:
- الموديولات لم يتم ربطها بالواجهة `keeta_operations_portal_starter_V4.html`.

## المطلوب فورًا
1. اقرأ `IMPLEMENTATION_REPORT.md`.
2. اقرأ `POST_V6_REVIEW.md` لو موجود.
3. تأكد أن modules موجودة.
4. اربطها فعليًا بواجهة المشروع.
5. أنشئ أو حدّث صفحة:
   - Data Import Center
   - Dashboard
   - VDA / Validity
   - Face Verification
   - Delivery Experience
   - Monthly Closing
   - Shift Scheduler
   - OPR Management
   - Export Center

## مخرجات هذه المرحلة
- `POST_V9_INTEGRATION_REVIEW.md`
- تحديث `IMPLEMENTATION_REPORT.md`
- تشغيل الاختبارات الحالية.

---

# 2) ترتيب مصادر البيانات داخل المشروع

رتّب أمثلة الملفات المرجعية داخل المشروع بهذا الشكل إن لم يكن موجودًا:

```text
D:\keeta operations portal
  references
    monthly_closing_samples
      2026-05
        jeddah
          original_company_invoices
          internal_final_settlement
          vda_validity
          expected_outputs
      2026-06
        jeddah
          face_verification
          vda_validity
          invoices
          expected_outputs
```

لا تنقل الملفات إذا كانت مستخدمة بالفعل في مكان آخر إلا بعد توثيق ذلك.

---

# 3) ملفات الفواتير الأصلية والصلاحية التي يجب تحليلها

تمت إضافة أمثلة حقيقية من فواتير الشركة وملفات الصلاحية. استخدمها كـ Source of Truth لتصحيح منطق النظام.

## أمثلة يونيو
- `EXPRESS GATE FR full data 1 Jun (3).xlsx`
  - Sheets:
    - `Partner Details (MTD)`
    - `Courier Details (MTD)`
    - `Courier Details (Daily)`
  - يستخدم للتحقق من Face Recognition في بداية الشهر.

- `EXPRESS GATE FR full data 30 Jun.xlsx`
  - Sheets:
    - `Partner Details (MTD)`
    - `Courier Details (MTD)`
    - `Courier Details (Daily)`
  - يستخدم للتحقق من Face Recognition في نهاية الشهر.

- `Albwaba almoqbla Company ( Jedd (38).xlsx`
  - Sheet:
    - `Albwaba almoqbla Company ( Jedd`
  - يحتوي VDA / تشغيل يومي للشركة.

- `EXPRESS GATE Company ( Jeddah) (36).xlsx`
  - Sheet:
    - `EXPRESS GATE Company ( Jeddah)`
  - يحتوي VDA / تشغيل يومي للشركة.

## أمثلة مايو — فواتير الشركة الأصلية
- `Albwaba almoqbla Company ( Jeddah )#2026-05#نظام الشرائح الفاتورة1781040180288 (1).xlsx`
  - Sheets:
    - `تفاصيل الشركاء`
    - `تفاصيل سائق التوصيل`

- `EXPRESS GATE Company ( Jeddah)#2026-05#نظام الشرائح الفاتورة1781618262314.xlsx`
  - Sheets:
    - `تفاصيل الشركاء`
    - `تفاصيل سائق التوصيل`

## ملف التسوية الداخلية النهائي
- `فاتورة كيتا جدة 05-2026 م.xlsx`
  - Sheets يجب تحليلها:
    - `التحويل`
    - `Express`
    - `Albwaba`
    - `تعديلات`
    - `FR 3PL`
    - `VDA`
    - `Short VDA`
    - `VDA_Report`
    - `الاقالات`
    - `حالة نتيجة تجربة التوصيل`

---

# 4) تحليل أعمدة الفواتير الأصلية من الشركة

## 4.1 Sheet: تفاصيل الشركاء
الأعمدة المهمة:
- `معرف الشريك`
- `اسم الشريك`
- `دورة الفوترة`
- `التسعير حسب الطلب`
- `المسافة من ارتفاع السعر.`
- `حوافز سعة الطلب المتاحة الصالحة (زيادة)`
- `حوافز تجربة التوصيل`
- `DXGY`
- `الإعانة`
- `الأنشطة والمكافآت الأخرى`
- `الخصم`
- `تعويض عن تلف الطعام`
- `رسوم خدمة التسجيل`
- `تعديل آخر`
- `مبلغ الضريبة`
- `خصم TGA`
- `مبلغ الفاتورة`
- `إجمالي المبلغ المستحق`

المطلوب:
- بناء Partner Invoice Summary.
- مقارنة إجمالي الشريك مع مجموع تفاصيل السائقين.
- إظهار أي فروقات.

## 4.2 Sheet: تفاصيل سائق التوصيل
الأعمدة المهمة:
- `معرف الشريك`
- `اسم الشريك`
- `دورة الفوترة`
- `معرّف سائق التوصيل`
- `اسم سائق التوصيل`
- `صالح`
- `السبب`
- `أيام الاتصال-صالحة`
- `ساعات الاتصال اليومي-صالحة`
- `ساعات الاتصال اليومي خلال وقت الذروة-صالحة`
- `الطلبات المُسلمة`
- `مسافة التوصيل`
- `التسعير حسب الطلب`
- `المسافة من ارتفاع السعر.`
- `حوافز سعة الطلب المتاحة الصالحة (زيادة)`
- `حوافز تجربة التوصيل`
- `المركبة`
- `المستوى التقديري الحالي`
- `المبلغ التقديري الحالي للمكافأة`
- `الفرق`
- `الخصم`
- `تعويض عن تلف الطعام`

المطلوب:
- هذه الورقة تعتبر **Source of Truth** لنتائج الشركة النهائية.
- استخدمها لمعايرة:
  - الطلبات
  - المسافة
  - الصلاحية
  - الحوافز
  - الخصومات
  - التعويضات
  - المركبة
  - مستوى تجربة التوصيل

---

# 5) تحليل ملف التسوية الداخلي `فاتورة كيتا جدة 05-2026 م.xlsx`

هذا الملف يمثل نموذج التقرير النهائي الذي نحتاج أن ينتجه النظام بنفس ترتيب قريب منه.

## 5.1 Sheet: Express
أعمدة مهمة:
- `المعرف`
- `اسم صاحب الايدي`
- `رقم هوية صاحب الايدي`
- `السجل`
- `المركبة`
- `الحالة`
- `صالح`
- `السبب`
- `أيام الاتصال-صالحة`
- `ساعات الاتصال اليومي-صالحة`
- `الطلبات المُسلمة`
- `مسافة التوصيل`
- `التسعير حسب الطلب`
- `المسافة من ارتفاع السعر.`
- `التسعير + المسافة`
- `حوافز سعة الطلب المتاحة الصالحة (زيادة)`
- `حوافز تجربة التوصيل`
- `اجمالي الحوافز`
- `الاجمالي`

## 5.2 Sheet: Albwaba
نفس منطق Express مع اختلاف السجل.

## 5.3 Sheet: FR 3PL
أعمدة مهمة:
- `السجل`
- `المعرف`
- `الاسم بالكامل`
- `رقم بطاقة الهوية`
- `رقم الهاتف`
- `المركبة`
- `الطلبات المُسلمة`
- `رسوم خدمة التوصيل`
- `دعم`
- `خصم رسوم الخدمة`
- `خصم مكافأة التوصيل على الموعد`
- `تعويض طعام`
- `استرداد الأموال نتيجة الاستئناف`
- `رسوم خدمة التسجيل`
- `تعديلات أخرى`
- `المبلغ المستحق`
- `رقم الهوية1`
- `البديل 1`
- `رقم التواصل`
- `نوع البديل`
- `نوع المركبة`
- `رقم كرت البنزين1`
- `الجنسية 1`
- `الايبان 1`
- `تاريخ الاستلام1`
- `تاريخ التسليم1`
- `الايام`
- `العمولة`
- `الطلبات`
- `سلف`
- `المخالفات`
- `ملاحظات 1`

## 5.4 Sheet: VDA
أعمدة مهمة:
- `3PL Name`
- `First online date`
- `Online Day`
- `Rider ID`
- `Vehicle Type`
- `VDA`
- `Shift Online hours`
- `Sum of Valid Shifts`
- `Should online days`
- `Sum of total delivered tasks`
- `Scheduled Late night shift`
- `Scheduled Early Morning shift`
- `Scheduled Breakfast shift`
- `Scheduled Lunch shift`
- `Scheduled Evening shift`
- `Scheduled Dinner shift`
- `Valid Late night shift`
- باقي أعمدة Valid Shifts حسب الشفتات.

## 5.5 Sheet: Short VDA
أعمدة مهمة:
- `Rider ID`
- `السجل`
- `نوع المركبة`
- `الترتيب`
- `رقم الاقامة 1`
- `اسم البديل 1`
- `الطلبات المسلمة`
- `صلاحية الطلبات`
- `الصلاحية بالنسبة لكيتا`
- `المدينة`

## 5.6 Sheet: VDA_Report
أعمدة مهمة:
- `الحالة`
- `نوع الايدي`
- `السجل`
- `معرّف السائق`
- `الاسم بالكامل`
- `رقم الهوية`
- `رقم الهاتف`
- `الحالة2`
- `رقم الاقامة 1`
- `اسم البديل 1`
- `رقم جوال البديل 1`
- `نوع البديل 1`
- `المركبة`
- `الأستلام`
- `الطلبات المسلمة`
- `فرق التارجت`
- `تارجت الطلبات`
- `التارجت المستهدف`
- `الهدف الحالي`
- `بداية عمل الايدي`
- `الأيام الصالحة`
- `مسموح ضياع`
- `ايام الغياب`
- `عدد الايام الغير صالحة`
- `عدد الأيام علشان يكون صالح`

## 5.7 Sheet: حالة نتيجة تجربة التوصيل
أعمدة مهمة:
- `السجل`
- `المركبة`
- `معرِّف سائق التوصيل`
- `الاسم`
- `المستوى التقديري الحالي`
- `التصنيف التقديري الحالي`
- `النسبة المئوية لتصنيف سائق التوصيل`
- `الدرجة الحالية للتعيين الإجباري`
- `المبلغ التقديري الحالي للمكافأة`
- `معدل التوصيل في الموعد`
- `نسبة اكتمال الطلبات`
- `حجم الطلبات`
- `اجمالي الكيلوات`

---

# 6) Source of Truth Hierarchy

عند وجود أكثر من مصدر لنفس القيمة، استخدم هذا الترتيب:

1. فواتير الشركة الأصلية النهائية:
   - `تفاصيل سائق التوصيل`
   - `تفاصيل الشركاء`

2. ملفات VDA و VDA_Report النهائية من الشركة.

3. ملف التسوية الداخلي النهائي:
   - `فاتورة كيتا جدة 05-2026 م.xlsx`

4. تقارير الأداء اليومية / الكلية.

5. الحسابات المتوقعة داخل النظام.

## قواعد المقارنة
- لو رقم النظام لا يطابق رقم الشركة:
  - لا تعدل رقم الشركة.
  - اعرض فرق واضح.
  - اكتب سبب محتمل:
    - اختلاف مصدر المسافة
    - خصم/تعويض
    - تعديل آخر
    - اختلاف أيام العمل
    - بدلاء
    - سلف/مخالفات
    - بيانات ناقصة

---

# 7) بناء Monthly Closing Engine

أنشئ أو حدّث:

`src/lib/monthlyClosingEngine.js`

## Functions مطلوبة
- `detectMonthlyFileType(fileName, workbookSheets, headers)`
- `normalizeCompanyPartnerInvoice(rows)`
- `normalizeCompanyCourierInvoice(rows)`
- `normalizeInternalSettlementWorkbook(workbook)`
- `normalizeFr3plSettlement(rows)`
- `normalizeExpressSettlement(rows)`
- `normalizeAlbwabaSettlement(rows)`
- `normalizeVdaReport(rows)`
- `normalizeShortVda(rows)`
- `normalizeDeliveryExperience(rows)`
- `matchCompanyVsInternal(companyRows, internalRows)`
- `buildFinalMonthlySettlement(context)`
- `buildMonthlyArchive(context)`
- `validateMonthlyClosing(context)`
- `exportMonthlyReports(context)`

## Required Output: Final Monthly Settlement
الأعمدة النهائية:
- المدينة
- الشهر
- السجل
- معرف الشريك
- اسم الشريك
- المعرف
- الاسم بالكامل
- رقم الهوية / الإقامة
- رقم الهاتف
- المركبة
- نوع المركبة
- نوع البديل
- الحالة
- صالح
- السبب
- أيام الاتصال-صالحة
- ساعات الاتصال اليومية
- الطلبات المُسلمة
- مسافة التوصيل
- التسعير حسب الطلب
- المسافة من ارتفاع السعر
- التسعير + المسافة
- حوافز سعة الطلب المتاحة الصالحة
- حوافز تجربة التوصيل
- اجمالي الحوافز
- الخصم
- تعويض الطعام
- السلف
- المخالفات
- العمولة
- إيجار المركبة
- السكن
- إجمالي الخصومات
- إجمالي الاستحقاق
- الصافي
- المصدر
- حالة المطابقة
- فرق الطلبات
- فرق المسافة
- فرق الحوافز
- فرق الصافي
- ملاحظات المطابقة

---

# 8) واجهة Monthly Closing / إقفال الشهر

أضف صفحة كاملة:

`Monthly Closing / إقفال الشهر`

## Inputs
- المدينة: جدة / الرياض
- الشهر: YYYY-MM
- تاريخ بداية الشهر
- تاريخ نهاية الشهر
- تاريخ توفر التقارير النهائية
  - Default = اليوم التالي لنهاية الشهر
- Upload:
  - فاتورة الشركة الأصلية Albwaba
  - فاتورة الشركة الأصلية Express
  - Face Recognition start/month-end reports
  - VDA
  - Short VDA
  - VDA_Report
  - ملف التسوية الداخلي إن وجد
  - ZIP يحتوي أكثر من تقرير

## Buttons
- Analyze Uploaded Reports
- Compare Company vs Internal
- Build Final Settlement
- Create Monthly Archive
- Lock Month
- Reopen Month
- Export All Reports

## KPI Cards
- إجمالي الطلبات
- إجمالي المسافة
- إجمالي التسعير
- إجمالي الحوافز
- إجمالي الخصومات
- إجمالي الاستحقاق
- عدد الصالحين
- عدد غير الصالحين
- عدد المطابق
- عدد غير المطابق
- عدد ناقص البيانات

## Tables
- Company Invoice Summary
- Courier Invoice Details
- Internal Settlement
- Match Differences
- Final Monthly Settlement
- Invalid / Missing Data
- Archive Log

---

# 9) دورة الشهر وحالة الإقفال

أضف Month Status:

- `Open`
- `Waiting Final Reports`
- `Reports Uploaded`
- `Analyzed`
- `Matched`
- `Settlement Built`
- `Closed`
- `Locked`
- `Reopened`

## Rules
- لا يتم إقفال الشهر بدون رفع تقارير نهائية.
- لو التقارير مرفوعة قبل نهاية الشهر + يوم:
  - اعرض Warning.
- يمكن بناء Preview في أي وقت.
- لا يتم Lock إلا بعد بناء Settlement.
- Reopen يفتح الشهر للتعديل مع تسجيل السبب.

---

# 10) الأرشيف الشهري

أنشئ نظام أرشفة:

```text
monthly_archive/
  YYYY-MM/
    Jeddah/
      source_reports/
      normalized_data/
      matching_reports/
      settlement/
      exports/
      logs/
    Riyadh/
      source_reports/
      normalized_data/
      matching_reports/
      settlement/
      exports/
      logs/
```

## Archive Must Include
- الملفات الأصلية المرفوعة.
- normalized JSON/CSV.
- تقرير المطابقة.
- Final Monthly Settlement.
- تقرير الصالحين.
- تقرير غير الصالحين.
- تقرير الطلبات والمسافة.
- تقرير السلف والمخالفات.
- تقرير الحوافز.
- Export ZIP.

---

# 11) ربط الإقفال الشهري بحاسبة الراتب

أضف خيار داخل حاسبة الراتب:

- Manual Estimate
- From Monthly Closing

لو اختار From Monthly Closing:
- يختار المدينة.
- يختار الشهر.
- يبحث بالمعرف / الإقامة.
- يتم جلب:
  - الطلبات
  - المسافة
  - الصلاحية
  - الحوافز
  - الخصومات
  - السلف
  - أيام العمل
  - نوع المركبة
  - السجل
- ثم يحسب الصافي النهائي.

## Existing Rules
- سعر الطلب الحالي = 6.5 ريال.
- سعر الكيلو = 0.60 ريال.
- عمولة الشركة = 2500 شهريًا.
- إيجار السيارة = 1800 شهريًا.
- إيجار الدباب = 800 شهريًا.
- السكن = 200 شهريًا.
- العمولة والإيجار والسكن نسبة وتناسب حسب الأيام.
- غير صالح = لا حافز صلاحية ولا حافز تجربة توصيل.

---

# 12) مراجعة وحذف الملفات غير المهمة

بعد إتمام الربط والتنفيذ:
1. حدّث `PROJECT_FILE_AUDIT.md`.
2. أنشئ/حدّث `DELETE_CANDIDATES.md`.
3. انقل غير المهم إلى:
   - `archive_unused/YYYY-MM-DD/`
4. شغل المشروع والاختبارات.
5. احذف أو اترك داخل الأرشيف حسب الأفضل.
6. وثّق كل ملف في `IMPLEMENTATION_REPORT.md`.

لا تحذف:
- ملفات الفواتير الأصلية.
- ملفات الصلاحية الأصلية.
- ملفات فيها معادلات لم تتحول.
- أي ملف مستخدم في Import/Tests.
- أي ملف غير متأكد منه.

---

# 13) Tests Required

أضف اختبارات:

- قراءة فاتورة Express الأصلية.
- قراءة فاتورة Albwaba الأصلية.
- قراءة `تفاصيل الشركاء`.
- قراءة `تفاصيل سائق التوصيل`.
- قراءة `فاتورة كيتا جدة 05-2026 م.xlsx`.
- قراءة Sheets:
  - Express
  - Albwaba
  - FR 3PL
  - VDA
  - Short VDA
  - VDA_Report
  - حالة نتيجة تجربة التوصيل
- بناء Final Monthly Settlement.
- مقارنة Company vs Internal.
- إنشاء Monthly Archive.
- Export All Reports.
- ربط Monthly Closing بحاسبة الراتب.
- اختبار عدم خلط جدة والرياض.
- اختبار Lock/Reopen.
- اختبار أن غير صالح = حوافز 0.

---

# 14) Final Reports

بعد التنفيذ اكتب/حدّث:

- `POST_V9_INTEGRATION_REVIEW.md`
- `MONTHLY_CLOSING_SCHEMA_MAP.md`
- `MONTHLY_CLOSING_IMPLEMENTATION_REPORT.md`
- `MATCHING_RULES.md`
- `DELETE_CANDIDATES.md`
- `IMPLEMENTATION_REPORT.md`

## في التقرير النهائي اكتب:
- ما تم تنفيذه فعليًا.
- الملفات المعدلة.
- الملفات الجديدة.
- الملفات المحذوفة/المؤرشفة.
- كيف تم تحليل فواتير الشركة.
- كيف تم تحليل ملف التسوية الداخلي.
- أين تم ربط الموديولات بالواجهة.
- نتائج الاختبارات.
- المشاكل المتبقية.
- خطوات التشغيل.

---

# 15) Acceptance Criteria

اعتبر المهمة ناجحة فقط إذا:

1. الواجهة تعمل بدون كسر.
2. الموديولات مربوطة بالواجهة.
3. يمكن رفع فواتير الشركة الأصلية.
4. يمكن رفع ملف التسوية الداخلي.
5. يمكن تحليل الصلاحية وVDA.
6. يمكن بناء Final Monthly Settlement.
7. يمكن مقارنة شركة vs داخلي.
8. يمكن تصدير تقارير نهاية الشهر.
9. يمكن إنشاء Monthly Archive ZIP.
10. حاسبة الراتب تستطيع استخدام نتائج الإقفال الشهري.
11. Search/Filters تعمل على الجداول.
12. جدة والرياض منفصلين تمامًا.
13. الاختبارات كلها ناجحة.
14. الحذف/الأرشفة موثقة.
15. لم يتم حذف أي ملف مهم.
