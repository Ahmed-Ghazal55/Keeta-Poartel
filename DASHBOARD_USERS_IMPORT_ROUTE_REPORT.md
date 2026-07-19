# Dashboard Users Import Route Report

## Route contract
- Route id: `dashboard_users_import`
- Lifecycle registry source: `src/data/lifecycleRegistry.js`

## Confirmed defaults
- template: `dashboard_users`
- import type: `dashboard_users_workbook`
- target entity: `dashboardUsers`
- scope: `operations`

## UI entry point
- Operations page button:
  - `data-ops-import-route="dashboard_users_import"`
- Companion button preserved:
  - `data-ops-import-route="current_assignments_import"`

## Expected behavior confirmed
- Opening the import route is read-only.
- Preview does not mutate dashboard users.
- Validation does not mutate dashboard users.
- Confirmed save routes through import batch service and delta engine.
- Repeated save with the same batch id does not duplicate the audit row.

## Browser verification
- Clicking `Import Dashboard Users` opened the Import Center view.
- The page showed:
  - `مركز رفع وتحليل الملفات`
  - `مدخل الصفحة الحالي: Dashboard Users Import`
- This verified the page-level entry route reached the correct import flow.

## Automated verification
- `tests/dashboardUsersImportRoute.test.js`
  - preview/validation stay read-only
  - approved save mutates `dashboardUsers`
  - approved save audits once
  - repeated approved save is idempotent
