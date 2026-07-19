# Monthly Rules Validation Rules

## Blocking Rules
- `month` يجب أن يكون بصيغة `YYYY-MM`.
- `platform` يجب أن تكون منصة مدعومة.
- `cityScope` و `registerScope` يجب أن تكون من القيم المدعومة.
- `single` scope يجب أن يحتوي عنصرًا واحدًا بالضبط.
- `multi` scope يجب أن يحتوي عنصرين أو أكثر.
- `validDayRules` يجب أن تحتوي Orders أو Hours على الأقل.
- `mandatoryDaysRules.minRequiredValidMandatoryDays` لا يجوز أن يتجاوز عدد `mandatoryDates`.
- شرائح الحوافز لا يجوز أن تتداخل.
- `tier.minOrders` لا يجوز أن يكون أكبر من `tier.maxOrders`.
- الـ open-ended tier يجب أن تكون آخر شريحة.
- `companyCommission.value` كنسبة يجب أن يكون بين `0` و `100`.
- `faceVerificationRules.passRateRequired` يجب أن يكون بين `0` و `100`.
- يمنع وجود `active` Rule أخرى لنفس الشهر/المنصة/النطاق.
- تعديل Rule `locked` بدون صلاحية `monthlyRules.unlock` مرفوض.

## Warning / Non-blocking Rules
- التاريخ الإلزامي خارج الشهر المختار يظهر `low warning`.
- التاريخ غير الصالح في `mandatoryDates` يظهر `medium warning`.

## ناتج الـ Validation
الخدمة ترجع:
- `isValid`
- `issues`
- `blockingIssues`
- `summary`

## الاستخدام في الواجهة
- `Validate` يعرض النتائج مباشرة داخل الصفحة.
- `Save Draft` و `Activate` يمران بالـ validation داخل الخدمة.
- بعد الحفظ تظهر آخر نتيجة validation في الـ banner العلوي.
