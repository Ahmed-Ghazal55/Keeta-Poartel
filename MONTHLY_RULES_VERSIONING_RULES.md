# Monthly Rules Versioning Rules

## القاعدة العامة
أي Rule شهرية لها lifecycle واضح:
- `draft`
- `active`
- `locked`
- `archived`

## قواعد النسخ والإصدارات
- إنشاء Rule جديدة يبدأ بـ `version = 1`.
- `cloneMonthlyRules(sourceRuleId, nextMonth)` ينشئ Rule جديدة Draft للشهر التالي.
- `previousVersionId` يربط النسخ ببعضها.
- `compareRuleVersions(old, new)` يعطي:
  - `changeCount`
  - `changedPaths`
  - `changes`
  - `previousVersionId`

## التعديل على Rule موجودة
- تعديل `draft` يتم على نفس `id`.
- تعديل `active` أو `locked` لا يكتب فوق النسخة الحالية.
- بدلًا من ذلك يتم إنشاء Draft جديدة:
  - `id` جديد
  - `previousVersionId = old.id`
  - `version = old.version + 1`

## القفل
- `lockMonthlyRules()` يحول Rule إلى `locked`.
- يتم حفظ:
  - `lockedAt`
  - `lockedBy`
  - `lockedFromStatus`

## الفتح
- `unlockMonthlyRules()` يعيد Rule إلى الحالة السابقة المخزنة داخل `lockedFromStatus`.

## الأرشفة
- `archiveMonthlyRules()` يحول Rule إلى `archived`.
- الـ archived Rule لا تدخل في `getActiveRules()` ولا `resolveRulesForContext()`.

## حل القاعدة Context Resolution
- `getActiveRules(criteria)` يرجع القواعد النشطة المطابقة مرتبة حسب specificity.
- `resolveRulesForContext(globalContext, date)` يرجع:
  - `month`
  - `matches`
  - `activeRule`
