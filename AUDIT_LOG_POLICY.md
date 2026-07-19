# Audit Log Policy

Date: 2026-07-14
Source of truth: [src/audit/auditPolicy.js](D:/keeta%20operations%20portal/src/audit/auditPolicy.js) and [src/audit/auditLogService.js](D:/keeta%20operations%20portal/src/audit/auditLogService.js)

## Policy goal

The Operations Log is a business mutation audit trail only. Read-only viewing, rendering, syncing, filtering, and runtime maintenance are not audit events.

## Allowed business event types

```text
import_batch_saved
import_batch_rejected
dashboard_user_created
dashboard_user_updated
dashboard_user_status_changed
assignment_created
assignment_updated
assignment_cancelled
swap_confirmed
stop_without_replacement_confirmed
termination_created
termination_cancelled
rider_profile_updated
hr_profile_updated
vehicle_created
vehicle_updated
vehicle_plate_changed
vehicle_status_changed
vehicle_assigned
vehicle_unassigned
vehicle_marked_under_review
vehicle_excluded
monthly_rule_created
monthly_rule_published
monthly_rule_locked
monthly_rule_archived
performance_report_imported
performance_calculation_finalized
validity_result_approved
vda_report_imported
face_verification_imported
delivery_experience_imported
invoice_imported
invoice_review_saved
internal_settlement_saved
shift_assignment_confirmed
shift_assignment_removed
dev_data_reset_requested
dev_data_reset_completed
```

## Forbidden audit categories

Never create audit rows for:

```text
page_opened
page_rendered
table_rendered
row_rendered
sidebar_clicked
route_changed
filter_changed
search_typed
search_executed
drawer_opened
modal_opened
notification_panel_opened
notification_sync
notification_derived
live_clock_tick
topbar_rendered
hero_rendered
kpi_rendered
storage_status_refresh
storage_bridge_health_check
data_hydrated
data_loaded
data_read
computed_fields_rebuilt
fleet_derived_rebuilt
performance_projection_rebuilt
safe_mode_started
normal_mode_started
browser_verification
debug_boot
```

## Validation rules in `createAuditEvent(...)`

An audit event is ignored unless all required rules pass:

1. `eventType` must be in the allowlist.
2. `entityType` must exist.
3. At least one reference must exist:
   - `entityId`
   - `operationId`
   - `importBatchId`
4. User-triggered mutations must include an actor with `userId`.
5. `source` must not match runtime/read-only patterns such as:
   - `render`
   - `route`
   - `clock`
   - `sync`
   - `notification`
   - `storage_status`
   - `health_check`
   - `data_read`
   - `page_open`
   - `filter`
   - `search`
   - `runtime`
6. Idempotency key is required for allowlisted mutation events.
7. Duplicate idempotency keys return the existing row instead of creating a new one.

## Actor format

```js
actor: {
  userId,
  email,
  name,
  role
}
```

Notes:

- Demo users are allowed when no full auth system exists yet.
- Fake email values are not generated.

## Context format

```js
context: {
  city,
  register,
  platform,
  page,
  subPage,
  month,
  scope
}
```

## Classification rules for cleanup

Records are classified as phantom when one or more of these conditions apply:

- event type is not allowlisted
- entity type is missing
- actor is missing for user-triggered events
- source matches runtime/render/sync/clock/read-only patterns
- reason/note indicates page open, render, refresh, notification sync, search, filter, modal, or drawer activity
- duplicate idempotency key is detected
- repeated identical signature exists without idempotency

## Policy decision

Viewing data is not an audit event.

Rendering data is not an audit event.

Filtering/searching data is not an audit event.

Derived notifications are not audit events.

Rebuilding cached/derived collections is not an audit event.
