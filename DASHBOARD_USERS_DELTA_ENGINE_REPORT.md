# Dashboard Users Delta Engine Report

## Files involved
- `src/operations/dashboardImportSnapshot.js`
- `src/import/importNormalizer.js`
- `src/import/importBatchService.js`
- `src/data/entitySchemas.js`

## Confirmed delta behavior

### Existing user appears in new upload
- Latest dashboard fields are refreshed.
- `firstSeenAt` is preserved.
- `lastSeenAt` is updated.
- `sourceBatchId` / `lastSeenImportBatchId` are updated.
- `latestImportPresence` becomes `present`.
- `missingFromLatestImport` becomes `false`.
- Lifecycle is recalculated from the new dashboard state.

### New user appears in upload
- A new `dashboardUsers` record is created.
- `__snapshotMeta.isNew` is set for first-import evaluation.
- First accepted in-service appearance becomes:
  - `lifecycleStatus = new`
  - `assignmentReadiness = ready_for_assignment`
- Pending review becomes:
  - `lifecycleStatus = pending_review`
  - `assignmentReadiness = under_review`
- Rejected review/documents become:
  - `lifecycleStatus = rejected`
  - `assignmentReadiness = rejected`

### Existing user missing from latest upload
- The record is preserved and not deleted.
- Existing links such as assignment/history remain intact.
- Runtime flags are applied:
  - `latestImportPresence = missing`
  - `missingFromLatestImport = true`
  - `reviewStatus = missing_from_latest_import`
  - `forceStatusReview = true`
- Lifecycle becomes `missing_from_latest_snapshot` by default.
- UI marks the row as review-needed instead of physically removing it.

## Verified by tests
- `tests/dashboardUsersDeltaEngine.test.js`
  - existing user update preserves `firstSeenAt`
  - new accepted user becomes `new` + `ready_for_assignment`
  - pending user becomes `pending_review`
  - rejected user becomes `rejected`
  - missing user is preserved and becomes `missing_from_latest_snapshot`
