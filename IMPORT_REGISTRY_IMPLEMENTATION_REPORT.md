# Import Registry Implementation Report

Date: 2026-07-10
Workspace: `D:\keeta operations portal`

## Scope

Prompt 3 implemented a real import pipeline for the current offline portal without replacing the existing V4, V6, or V9 architecture.

The work focused on:

- file-type registration
- file detection
- preview generation
- validation
- normalization foundation
- batch persistence
- audit logging
- RBAC-aware save and reject flows

## Final Architecture Decision

The import-registry logic now lives in `src/import/importRegistry.js` as the Prompt 3 core.

`src/data/importRegistry.js` was kept as a thin adapter so Prompt 2 runtime wiring continues to work without breaking earlier page boot logic.

This keeps the responsibility split clear:

- `src/import/*` owns Prompt 3 import behavior
- `src/data/*` keeps runtime and storage integration stable

## Files Added For Prompt 3

- `src/import/importTypes.js`
- `src/import/headerMapper.js`
- `src/import/csvReader.js`
- `src/import/workbookReader.js`
- `src/import/fileDetector.js`
- `src/import/importPreview.js`
- `src/import/importValidator.js`
- `src/import/importNormalizer.js`
- `src/import/importAudit.js`
- `src/import/importRegistry.js`
- `src/import/importBatchService.js`
- `tests/fileDetector.test.js`
- `tests/headerMapper.test.js`
- `tests/importValidator.test.js`
- `tests/importBatchService.test.js`
- `tests/importRegistry.test.js`

## Existing Files Updated

- `src/data/importRegistry.js`
- `src/data/browserRuntime.js`
- `src/data/repositories.js`
- `src/data/entitySchemas.js`
- `src/auth/rbac.js`
- `tests/rbac.test.js`
- `package.json`
- `keeta_operations_portal_starter_v4.html`
- `keeta_operations_portal_v9_extension.js`

## Import Registry Responsibilities

The registry core now provides:

- import type listing through `listTypes()`
- import type lookup through `getType(typeId)`
- target entity lookup through `getTargetEntity(typeId)`
- supported target entity listing through `getSupportedTargetEntities()`
- confidence state resolution through `getConfidenceState(confidence)`
- duplicate batch detection based on file name, type, city, register, and month
- batch sanitization before persistence
- recent batch history listing

All batches are stored in the `importBatches` entity.

## Batch Lifecycle

The implemented save path is:

1. Analyze uploaded file into workbook or table summary.
2. Detect import type, city, register, and month.
3. Build preview batch with warnings and validation.
4. Require manual mapping when confidence is too low or type is unknown.
5. Re-validate in save mode.
6. Enforce RBAC and city/register/domain scope.
7. Normalize rows into target entities.
8. Save normalized records into the current `DataStore`.
9. Record `import_file` in the audit log.
10. Persist final batch status as `saved`.

Reject flow is also implemented and persists a `rejected` batch plus audit metadata.

## Entities Reached By Prompt 3

Prompt 3 can now write normalized records into:

- `dashboardUsers`
- `riders`
- `hrProfiles`
- `vehicles`
- `performanceDaily`
- `performanceMonthly`
- `vdaResults`
- `faceVerification`
- `deliveryExperience`
- `invoicePartnerSummary`
- `invoiceCourierDetail`
- `internalSettlement`
- `shiftSchedules`
- `monthlyRules`
- `importBatches`

## Runtime Integration

`src/data/browserRuntime.js` now exposes:

- `Portal.Runtime.importRegistry`
- `Portal.Runtime.importBatchService`

This means the Import Center UI can use the same runtime object already introduced in Prompt 2.

## Audit Integration

`src/import/importAudit.js` records:

- action: `import_file`
- entity: selected target entity
- entityId: import batch id
- file name
- detected type
- source row count
- saved record count
- city
- register
- note
- source: `import_center`

## RBAC Integration

Prompt 3 now depends on Prompt 2 RBAC and uses these permissions:

- `imports.create`
- `imports.review`
- `imports.save`
- `imports.reject`
- `audit.view`

Save scope rules were enforced in `src/import/importBatchService.js`:

- `super_admin` can save everything
- `operations_admin` can save operations, performance, and shifts imports
- `city_supervisor` is restricted by city/register plus allowed domains
- `hr_officer` can save only `hr`
- `fleet_officer` can save only `fleet`
- `finance_officer` can save only `finance`
- `viewer` cannot save imports

## What Was Deliberately Not Implemented Yet

Prompt 3 does not yet do the following:

- ZIP extraction
- final payroll logic
- final monthly closing reconciliation flows
- full HR CRUD
- full operations CRUD
- full fleet module CRUD
- deep formula parity for every workbook

That boundary was preserved intentionally to keep Prompt 3 focused on the import gateway foundation.
