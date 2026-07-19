# UI Refactor Audit Safety Constraints

Date: 2026-07-14
Status: permanent design constraint for Prompt 8.5 onward

## Core rule

Audit logs may be created only through business mutation services.

The redesign layer is not an audit producer.

## Allowed audit creation paths

Allowed examples:

- assignment confirmed
- swap confirmed
- termination confirmed
- import batch saved/rejected
- vehicle status changed
- vehicle marked under review
- vehicle excluded
- monthly rule created/published/locked/archived
- performance calculation finalized
- validity result approved
- dev data reset completed

## Forbidden forever during UI refactor

Never create audit rows for:

```text
page_opened
page_rendered
table_rendered
sidebar_clicked
route_changed
filter_changed
search_typed
drawer_opened
modal_opened
notification_panel_opened
notification_sync
notification_derived
live_clock_tick
topbar_rendered
storage_status_refresh
data_hydrated
data_read
computed_fields_rebuilt
fleet_derived_rebuilt
performance_projection_rebuilt
safe_mode_started
normal_mode_started
debug_boot
```

## Required service-only contract

UI mutation controls must call domain services only:

- operations actions -> operations services
- vehicle actions -> fleet integration / fleet services
- monthly rules actions -> monthly rules service
- import save/reject -> import batch service
- reset actions -> dev data reset service
- performance finalization -> performance recalculation service

Direct UI calls to repository/storage/audit layers are forbidden for business mutations.

## Idempotency requirement

Each allowed mutation event must:

- use a stable idempotency key
- create at most one audit row
- return the existing audit row on duplicate retry

## UI refactor risk checklist

Audit every new control in these categories:

- action dropdown buttons
- inline edit controls
- status dropdowns
- notification action buttons
- table bulk actions
- import/save buttons
- developer reset buttons
- confirm dialogs
- drawer footer action buttons

Decision rule:

- if opening/viewing only -> no audit
- if editing in draft only -> no audit until confirmed save
- if confirmed mutation -> one service call, one idempotent audit row

## Non-negotiable files

These files must not be weakened or bypassed:

- [src/audit/auditPolicy.js](D:/keeta%20operations%20portal/src/audit/auditPolicy.js)
- [src/audit/auditLogService.js](D:/keeta%20operations%20portal/src/audit/auditLogService.js)
- [src/operations/operationsLogView.js](D:/keeta%20operations%20portal/src/operations/operationsLogView.js)

## Design implication

The redesign should treat audit safety as part of the component contract:

- route changes are visual state only
- filters are query state only
- drawers are presentation state only
- notifications are derived state only
- audit records are business-state history only
