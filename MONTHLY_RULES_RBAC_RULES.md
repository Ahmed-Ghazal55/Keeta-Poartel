# Monthly Rules RBAC Rules

## Permissions
- `monthlyRules.view`
- `monthlyRules.create`
- `monthlyRules.edit`
- `monthlyRules.activate`
- `monthlyRules.lock`
- `monthlyRules.unlock`
- `monthlyRules.archive`
- `monthlyRules.export`
- `monthlyRules.import`

## Role Matrix

### `super_admin`
- كل الصلاحيات عبر `*`

### `operations_admin`
- View
- Create
- Edit
- Export
- Import

### `city_supervisor`
- View
- Create
- Edit
- Activate
- Export
- مع تقييد المدينة/السجل وفق user scope

### `finance_officer`
- View
- Export
- والواجهة تعرض له وضعًا ماليًا read-only

### `viewer`
- View فقط

## قواعد النطاق
- المشرف لا يمكنه تعديل Rule خارج `selectedCities` الخاصة به.
- المشرف لا يمكنه تعديل Rule خارج `selectedRegisters` الخاصة به.
- المشرف محدود النطاق لا يمكنه إنشاء Rule `cityScope = all` أو `registerScope = all`.
- Rule `locked` لا تعدل إلا إذا كان للمستخدم `monthlyRules.unlock`.

## Enforcement Points
- داخل الخدمة عبر `requirePermission()` و `ensureRuleScope()`.
- داخل الواجهة عبر إظهار/إخفاء/تعطيل الأزرار بحسب الصلاحية.
