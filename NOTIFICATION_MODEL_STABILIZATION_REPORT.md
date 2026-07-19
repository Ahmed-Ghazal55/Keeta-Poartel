# Notification Model Stabilization Report

## Result

Prompt 8.9 stabilized a canonical notification shape and kept derived notifications deterministic, idempotent, and audit-safe.

## Canonical fields

The notifications schema and normalization path now cover:

- Identity: `id`, `issueId`, `type`, `status`, `severity`
- Source: `sourceModule`, `sourceType`, `entityType`, `entityId`
- Rider/assignment context: `courierId`, `ownerIqama`, `actualRiderIqama`, `assignmentId`
- Import context: `importBatchId`
- Scope: `city`, `register`, `platform`
- Routing: `linkedPage`, `linkedSubPage`, `linkedDrawer`, `linkedFilters`
- UX/action context: `suggestedAction`, `actionLabel`, `blocking`
- UI state: `readAt`, `readBy`, `lastSeenAt`, `lastOpenedAt`, `hiddenAt`, `hiddenBy`
- Timestamps: `createdAt`, `updatedAt`

## Stability behavior

- Re-derivation does not duplicate derived notifications.
- Read state survives re-derivation when the same deterministic notification reappears.
- Disappearing derived notifications resolve safely and can reopen as `unread` if they return.
- `markAsRead`, `markAsUnread`, `markAsSeen`, `markAsOpened`, and `hide` update UI state only.

## Files backing the model

- `src/notifications/notificationCenter.js`
- `src/notifications/notificationSourceMapping.js`
- `src/data/entitySchemas.js`
- `src/data/repositories.js`

## Validation

- `tests/notificationCenter.test.js`
- `tests/notificationStatePersistence.test.js`
- `tests/lifecycleEntitySchemas.test.js`

All passed in this run.
