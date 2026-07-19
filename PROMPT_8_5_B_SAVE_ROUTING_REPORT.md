# Prompt 8.5-B Save Routing Report

## Scope reviewed
- `src/import/importBatchService.js`
- `src/import/importAudit.js`

## Confirmed routing rules

### Preview
- Preview and validation do not directly mutate lifecycle master entities.
- Preview batch records remain metadata-only until approved save.

### Approved save: `external_riders`
- Only these entities are persisted:
  - `externalRiders`
  - `riderOperationalProfiles`

### Approved save: `current_assignments`
- Only these entities are persisted:
  - `assignments`
  - `riderOperationalProfiles`
  - `riderVehicleUsageHistory`

## Implementation details
- Approved save outputs are filtered through:
  - `filterOutputsForApprovedSave(batch, outputs)`
  - `getApprovedEntitiesForBatch(batch)`
- `previewBatch.persistedEntities` now reflects what was actually saved.
- Batch stats now include lifecycle entity create/update counts for:
  - `externalRiders`
  - `riderOperationalProfiles`
  - `riderVehicleUsageHistory`
  - `assignments`

## Audit behavior
- Approved save creates one `import_batch_saved` audit event via the import audit service.
- Repeated save with the same idempotency key does not duplicate audit rows.

## Result
- Lifecycle imports save only approved entities and stay inside the DataStore/repository path.

## Verification
- `tests/importBatchService.test.js` passed.
- `tests/currentAssignmentsImport.test.js` passed.
- `tests/externalRidersImport.test.js` passed.
