# Current Assignments Import Route Report

## Files in scope
- `src/data/lifecycleRegistry.js`
- `src/import/importBatchService.js`
- `tests/currentAssignmentsImport.test.js`
- `tests/externalRidersWorkflow.test.js`
- browser verification tab for `current_assignments_import`

## Route contract confirmed
- Route id: `current_assignments_import`
- Expected behavior remains aligned with Prompt 8.6 / 8.5-B:
  - template: `current_assignments`
  - target entity: `assignments`
  - scope: operations

## Verified behavior
- Opening the route is read-only.
- Import Center renders without mutating assignments during open, preview, or validation.
- Approved save persists lifecycle data only through the import service path.
- Current assignments import persists:
  - `assignments`
  - `riderOperationalProfiles`
  - `riderVehicleUsageHistory`
- The import does not directly create:
  - `externalRiders`
  - `riders`
  - `dashboardUsers`

## Audit behavior
- Approved save creates one `import_batch_saved` audit event.
- Preview and validation remain non-auditing.
- Import audit idempotency remains governed by the shared `importBatchService` protections already passing in broader import tests.

## Browser verification
- The Current Assignments page-level import route opened the Import Center.
- Visible sections confirmed:
  - `مركز رفع وتحليل الملفات`
  - `جودة البيانات واكتشاف النوع`
  - `Imported Files Inventory`
  - `معاينة الملف قبل الحفظ`
  - `Import Batch History`

## Result
- Current Assignments import routing is operational and remains lifecycle-safe.
