# Operations Status Review Rules

## Engines

- `src/operations/operationsStatusEngine.js`
- `src/operations/dashboardImportSnapshot.js`

## Review Inputs

The review engine evaluates dashboard users against:

- current dashboard user state
- active assignments
- riders
- snapshot change metadata

## Main Review Status Outputs

- `ok`
- `needs_assignment`
- `needs_swap`
- `conflict`
- `missing_from_latest_import`

## Reasons Currently Produced

- `needs_assignment`
- `assigned_ok`
- `missing_rider_profile`
- `rider_city_mismatch`
- `rider_register_mismatch`
- `dashboard_city_changed`
- `dashboard_register_changed`
- `vehicle_changed`
- `owner_iqama_changed`
- `missing_from_latest_import`
- `duplicate_dashboard_user_id`
- `same_dashboard_user_multiple_riders`
- `same_rider_multiple_active_users`
- `under_review_rider`
- `terminated_but_seen_again`

## Recommended Action Mapping

- missing from latest import -> `review_termination`
- missing rider / needs assignment -> `assign_rider`
- city/register/vehicle/owner mismatch -> `review_swap`
- duplicate / multiple-active conflicts -> `resolve_conflict`
- terminated but seen again -> `restore_or_reassign`
- otherwise -> `none`

## Snapshot Behavior

During dashboard import:

- new users are marked as new current snapshot rows
- existing users are diffed for tracked fields
- missing users are appended back as review rows instead of being deleted

## Status Review Persistence

`operationalStatusReviews` are created during dashboard import save.

Current behavior:

- `ok` reviews are skipped unless `forceStatusReview` is set
- non-`ok` reviews are persisted automatically

## Audit

Creation of review rows records:

- `status_review_created`

Updated review rows use:

- `status_review_resolved`
