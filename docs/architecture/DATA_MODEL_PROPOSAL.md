# DATA_MODEL_PROPOSAL

Last updated: 2026-07-10  
Scope: Prompt 2 foundation proposed from Prompt 0 evidence

## 1. Modeling principles

The model must satisfy what the real workbooks are doing:

- one rider can move across registers and accounts over time
- one city can host multiple operational registers
- one workbook can contain both raw facts and derived logic
- imports need lineage, supersession, and conflict visibility
- monthly rules must be data, not hardcoded UI text

## 2. Core dimensions

### `cities`

- `city_id`
- `city_code`
- `city_name_ar`
- `city_name_en`
- `is_active`

### `platforms`

- `platform_id`
- `platform_code`
- `platform_name`
- `is_active`

### `registers`

- `register_id`
- `register_code`
- `register_name`
- `company_name`
- `city_id`
- `platform_id`
- `register_number`
- `is_active`

### `source_workbook_families`

- `workbook_family_id`
- `family_code`
- `family_name`
- `source_scope`
- `notes`

Purpose:

- distinguish operations, HR, fleet, shifts, and monthly-closing imports

## 3. Identity and operations entities

### `riders`

- `rider_id`
- `full_name`
- `iqama_or_national_id`
- `phone_primary`
- `phone_secondary`
- `nationality`
- `default_vehicle_type`
- `current_city_id`
- `work_mode`
- `first_seen_at`
- `last_seen_at`
- `notes`

### `dashboard_accounts`

- `dashboard_account_id`
- `platform_id`
- `platform_user_id`
- `city_id`
- `register_id`
- `owner_iqama`
- `owner_name`
- `activation_status`
- `accepted_status`
- `created_from_batch_id`

### `rider_account_assignments`

- `assignment_id`
- `rider_id`
- `dashboard_account_id`
- `assignment_type`
- `started_at`
- `ended_at`
- `is_current`
- `source_batch_id`

### `rider_status_events`

- `status_event_id`
- `rider_id`
- `dashboard_account_id`
- `status_code`
- `status_label`
- `effective_at`
- `days_restricted`
- `reason_text`
- `source_batch_id`
- `source_sheet_name`

Purpose:

- preserve `شغال`, `مقال`, `مقيد بالايام`, `مقيد هيئة النقل`, `لا يعمل حاليا`, and similar lifecycle states

## 4. HR and compliance entities

### `hr_profiles`

- `hr_profile_id`
- `rider_id`
- `register_id`
- `employee_number`
- `job_title`
- `profession`
- `sponsorship_state`
- `actual_work_state`
- `leave_state`
- `housing_state`
- `iban`
- `source_batch_id`

### `compliance_documents`

- `document_id`
- `rider_id`
- `register_id`
- `document_type`
- `document_number`
- `issued_at`
- `expires_at`
- `validity_state`
- `document_scope`
- `source_batch_id`

Suggested `document_type` values:

- `iqama`
- `driver_card`
- `transport_license`
- `health_card`

### `rider_archive_snapshots`

- `archive_snapshot_id`
- `rider_id`
- `register_id`
- `snapshot_date`
- `snapshot_state`
- `archive_notes`
- `source_batch_id`

## 5. Fleet entities

### `vehicles`

- `vehicle_id`
- `vehicle_serial`
- `plate_number`
- `vehicle_type`
- `transport_mode`
- `ownership_register_id`
- `current_city_id`
- `current_register_id`
- `operational_state`
- `target_action`
- `capacity_limit`
- `source_batch_id`

### `vehicle_assignments`

- `vehicle_assignment_id`
- `vehicle_id`
- `rider_id`
- `dashboard_account_id`
- `assigned_city_id`
- `assigned_register_id`
- `assignment_state`
- `started_at`
- `ended_at`
- `source_batch_id`

### `fleet_conflicts`

- `fleet_conflict_id`
- `vehicle_id`
- `rider_id`
- `dashboard_account_id`
- `conflict_code`
- `severity`
- `resolution_state`
- `detail_text`
- `source_batch_id`

Suggested `conflict_code` values:

- `city_mismatch`
- `register_mismatch`
- `capacity_release_required`
- `duplicate_plate`
- `duplicate_serial`
- `manual_review`

## 6. Performance and validity facts

### `daily_performance`

- `daily_performance_id`
- `rider_id`
- `dashboard_account_id`
- `city_id`
- `register_id`
- `date_key`
- `delivered_orders`
- `rider_rejections`
- `auto_rejections`
- `cancellation_rate`
- `online_duration_minutes`
- `average_delivery_minutes`
- `accepted_orders`
- `distance_km`
- `source_batch_id`

### `face_verification_daily`

- `face_verification_id`
- `rider_id`
- `dashboard_account_id`
- `date_key`
- `final_result`
- `triggered_flag`
- `fail_count`
- `pass_count`
- `nafath_fail_count`
- `nafath_pass_count`
- `source_batch_id`

### `vda_daily_raw`

- `vda_daily_id`
- `rider_id`
- `dashboard_account_id`
- `first_online_date`
- `online_day_number`
- `vehicle_type`
- `valid_shift_count`
- `delivered_orders`
- `accepted_orders`
- `cancellations`
- `distance_km`
- `source_batch_id`

### `vda_monthly_results`

- `vda_result_id`
- `rider_id`
- `city_id`
- `register_id`
- `month_key`
- `report_date_key`
- `delivered_total`
- `current_target`
- `projected_target`
- `gap_to_target`
- `validity_status`
- `face_penalty_bucket`
- `recovery_status`
- `source_batch_id`

### `delivery_experience_results`

- `delivery_experience_id`
- `rider_id`
- `city_id`
- `register_id`
- `month_key`
- `vehicle_type`
- `experience_level`
- `ranking_bucket`
- `estimated_incentive_amount`
- `is_zeroed_by_invalidity`
- `source_batch_id`

## 7. Monthly rules and shifts

### `monthly_rule_sets`

- `rule_set_id`
- `platform_id`
- `city_id`
- `month_key`
- `mandatory_days_json`
- `mandatory_day_min_orders`
- `regular_day_min_orders`
- `car_levels_json`
- `bike_levels_json`
- `ata_rule_json`
- `cancellation_rule_json`
- `face_rule_json`
- `notes`

### `shift_slots`

- `shift_slot_id`
- `city_id`
- `register_id`
- `slot_code`
- `slot_label`
- `slot_start`
- `slot_end`
- `target_count`
- `max_count`

### `shift_assignments`

- `shift_assignment_id`
- `rider_id`
- `city_id`
- `register_id`
- `week_key`
- `slot_code`
- `slot_order`
- `supervisor_name`
- `source_batch_id`

## 8. Monthly closing entities

### `monthly_closing_batches`

- `closing_batch_id`
- `city_id`
- `month_key`
- `status`
- `built_at`
- `locked_at`
- `source_batch_id`

### `monthly_closing_rows`

- `closing_row_id`
- `closing_batch_id`
- `rider_id`
- `register_id`
- `company_partner_id`
- `delivered_orders`
- `distance_amount`
- `capacity_incentive`
- `delivery_experience_incentive`
- `deductions_total`
- `net_amount`
- `match_state`
- `match_notes`

## 9. Import lineage entities

### `import_batches`

- `import_batch_id`
- `file_name`
- `file_path`
- `source_workbook_family_id`
- `city_id`
- `register_id`
- `platform_id`
- `month_key`
- `imported_at`
- `detected_role`
- `checksum`

### `import_datasets`

- `import_dataset_id`
- `import_batch_id`
- `sheet_name`
- `dataset_role`
- `header_row_index`
- `row_count`
- `column_count`
- `formula_count`
- `conditional_rule_count`
- `is_latest_for_scope`

### `import_conflicts`

- `import_conflict_id`
- `import_dataset_id`
- `conflict_code`
- `severity`
- `record_key`
- `detail_text`
- `resolved_flag`

## 10. Uniqueness and relationship rules

- one rider can have many dashboard accounts over time
- one dashboard account can map to different riders historically, but only one current assignment
- one rider can have many status events
- one vehicle can have many assignments over time
- one monthly rule set is unique by `platform_id + city_id + month_key`
- one import dataset belongs to exactly one batch, but one batch can create many normalized datasets

## 11. Prompt 2 starting subset

Prompt 2 does not need every table implemented at once.

Safe first subset:

1. `cities`
2. `platforms`
3. `registers`
4. `riders`
5. `dashboard_accounts`
6. `rider_account_assignments`
7. `rider_status_events`
8. `import_batches`
9. `import_datasets`
10. `import_conflicts`

That subset is enough to support the first operational import and review screens without hardcoding workbook behavior into UI files.
