# Existing Rules Audit

## الهدف
تحديد أماكن القواعد الشهرية القديمة داخل المشروع قبل نقلها تدريجيًا إلى `monthlyRules`.

## المصادر القديمة المكتشفة

### 1. `keeta_operations_portal_logic.js`
- يحتوي القواعد الصريحة القديمة الخاصة بالتشغيل والحوافز.
- العناصر الأوضح:
  - `validityDaysRequired = 6`
  - `minimumOrders.car = 330`
  - `minimumOrders.bike = 350`
  - `validityTiers.car`
  - `validityTiers.bike`
  - `experienceLevels.car`
  - `experienceLevels.bike`
- هذا الملف ما زال هو المصدر الأساسي لمحركات الرواتب/الحوافز القديمة.

### 2. `src/lib/vdaEngine.js`
- يحتوي اعتمادًا مباشرًا على:
  - `minimumValidDays`
  - `minimumFaceRate`
- ما زال يستخدم إعدادات تشغيلية مباشرة بدل Rule شهرية محلولة.

### 3. `src/lib/deliveryExperienceEngine.js`
- يعتمد على `settings.incentiveByLevel`.
- ما زالت قواعد Delivery Experience خارج `monthlyRules`.

### 4. `src/lib/monthlyClosingEngine.js`
- يستهلك نتائج محولة من التقارير الشهرية.
- ليس مصدر القواعد الأساسي، لكنه سيتأثر لاحقًا عندما تصبح `monthlyRules` هي source-of-truth لمحرك الأداء والصلاحية.

## ما تم نقله الآن إلى Monthly Rules
- قواعد `valid day`.
- قواعد `mandatory days`.
- قواعد `vehicle targets`.
- شرائح `car/bike incentives`.
- قواعد `face verification`.
- قواعد `VDA`.
- قواعد `delivery experience`.
- قواعد `ATA`.
- قواعد `cancellation`.
- قواعد `compliance`.
- قواعد `salary eligibility`.
- النسخ الشهرية + التفعيل + القفل + الأرشفة + JSON import/export.

## ما بقي مؤقتًا في المحركات القديمة
- تطبيق القواعد فعليًا على محركات الأداء/الصلاحية/الراتب النهائية.
- ربط `monthlyRules` بحسابات Prompt 7 وما بعده.
- منطق الإقفال الشهري النهائي والفواتير.

## التعارضات أو النقاط الحساسة
- توجد قيم قديمة ثابتة داخل المحركات القديمة، بينما `monthlyRules` أصبحت الآن قاعدة الإدارة الجديدة.
- هذا مقصود مؤقتًا لتجنب كسر Prompt 5 وما قبله.
- أي تفعيل فعلي لهذه القواعد على الحسابات يجب أن يتم في Prompt 7 مع طبقة Rule Resolver موحدة.

## التوصية
1. الإبقاء على المحركات القديمة كما هي الآن.
2. استخدام `monthlyRules` كواجهة الإدارة والمصدر الإداري الرسمي من Prompt 6.
3. في Prompt 7 يتم إدخال `resolveRulesForContext()` داخل محركات الأداء والصلاحية خطوة بخطوة.
