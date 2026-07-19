# Local DB Notes

هذا المجلد يجهز Node file database محلي للتجربة فقط.

## المسارات

- `data/local-db/` لتخزين JSON collections أثناء العمل المحلي.
- `data/seed/` لبيانات seed الوهمية والمسموح الاحتفاظ بها داخل المشروع.
- `data/backups/` لنسخ احتياطية عند استدعاء `localDb.backup()`.

## ملاحظات مهمة

- هذا التخزين ليس Production DB.
- لا تضع بيانات إقامة أو جوالات أو رواتب حقيقية داخل `data/local-db`.
- عند الحاجة لاختبار API محليًا استخدم:
  - `npm run dev:api`
- الـ API الافتراضي يعمل على المنفذ `4174`.
