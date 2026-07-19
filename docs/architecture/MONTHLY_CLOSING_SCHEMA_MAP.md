# Monthly Closing Schema Map

## Source Workbooks

| Source family | Workbook / sheets | Normalized output | Primary keys | Used for |
| --- | --- | --- | --- | --- |
| Company original invoice | `تفاصيل الشركاء`, `تفاصيل سائق التوصيل` | `companyPartners`, `companyCouriers` | register + riderId + iqama fallback | source-of-truth totals for company settlement |
| Internal final settlement | `Express`, `Albwaba`, `FR 3PL`, `VDA`, `Short VDA`, `VDA_Report`, `حالة نتيجة تجربة التوصيل` | `internal.*` arrays | register + riderId + iqama | matching, enrichment, work days, deductions |
| Face verification | `Partner Details (MTD)`, `Courier Details (MTD)`, `Courier Details (Daily)` | `partnerSummary`, `courierSummary`, `dailyRows` | riderId + dateKey | face pass/fail support and monthly diagnostics |
| Company daily VDA | first sheet of daily company file | normalized VDA rows | register + riderId + dateKey | validity calibration when internal VDA detail is missing |

## Matching Keys

The monthly matcher uses the following precedence:

1. `register + riderId + iqama`
2. `register + iqama`
3. `riderId + iqama`

The company courier invoice remains the leading row source. Internal data enriches and audits that source; it does not replace it.

## Final Settlement Output Groups

Identity and status:

- `المدينة`
- `الشهر`
- `السجل`
- `معرف الشريك`
- `اسم الشريك`
- `المعرف`
- `الاسم بالكامل`
- `رقم الهوية / الإقامة`
- `رقم الهاتف`
- `المركبة`
- `نوع المركبة`
- `نوع البديل`
- `الحالة`
- `صالح`
- `السبب`

Activity and validity:

- `أيام العمل`
- `أيام الاتصال-صالحة`
- `ساعات الاتصال اليومية`
- `الطلبات المُسلمة`
- `مسافة التوصيل`

Commercial amounts:

- `التسعير حسب الطلب`
- `المسافة من ارتفاع السعر`
- `التسعير + المسافة`
- `حوافز سعة الطلب المتاحة الصالحة`
- `حوافز تجربة التوصيل`
- `اجمالي الحوافز`
- `الخصم`
- `تعويض الطعام`
- `السلف`
- `المخالفات`
- `العمولة`
- `إيجار المركبة`
- `السكن`
- `إجمالي الخصومات`
- `إجمالي الاستحقاق`
- `الصافي`

Audit fields:

- `حالة المطابقة`
- `فرق الطلبات`
- `فرق المسافة`
- `فرق الحوافز`
- `فرق الصافي`
- `ملاحظات المطابقة`
- `مستوى تجربة التوصيل`
- `المكافأة التقديرية`

## Generated Reference Outputs

May 2026 sample outputs now live under:

- `references/monthly_closing_samples/2026-05/jeddah/expected_outputs`

June 2026 sample summaries now live under:

- `references/monthly_closing_samples/2026-06/jeddah/expected_outputs`
