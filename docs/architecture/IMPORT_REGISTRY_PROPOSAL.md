# IMPORT_REGISTRY_PROPOSAL

Last updated: 2026-07-10  
Scope: Prompt 2 import foundation proposed from Prompt 0 evidence

## 1. Why this is required

Current state confirmed in the repo:

- `storage/imports/import_manifest.json` is still `[]`
- raw files already exist in multiple families under `data/raw/`
- one city/month can contain many datasets with different roles
- workbook names alone are not enough to prevent data mix-ups

Therefore, Prompt 2 needs an explicit import registry before building more logic pages.

## 2. Registry goals

The registry must answer:

- what file was imported
- when it was imported
- what workbook family it belongs to
- which sheet became which dataset
- which city / register / platform / month it belongs to
- whether it supersedes an older import
- what conflicts were detected during import

## 3. Import batch structure

### Batch-level record

Each uploaded file should create one `import_batch`.

Minimum fields:

- `import_batch_id`
- `file_name`
- `original_extension`
- `source_family`
- `platform`
- `city`
- `register`
- `month_key`
- `imported_at`
- `checksum`
- `notes`

Example `source_family` values:

- `operations_workbook`
- `hr_archive_workbook`
- `fleet_workbook`
- `shift_workbook`
- `company_invoice_workbook`
- `internal_settlement_workbook`
- `face_workbook`
- `company_vda_workbook`
- `csv_extract`

## 4. Dataset-level record

One workbook import usually creates many datasets, so each relevant sheet must become an `import_dataset`.

Minimum fields:

- `import_dataset_id`
- `import_batch_id`
- `sheet_name`
- `dataset_role`
- `header_row_index`
- `row_count`
- `column_count`
- `formula_count`
- `conditional_rule_count`
- `schema_signature`
- `is_latest_for_scope`

## 5. Dataset role taxonomy

### Operations family

- `rider_master`
- `user_movement_history`
- `opr_express`
- `opr_albwaba`
- `opr_togary`
- `dash_express`
- `dash_albwaba`
- `dash_togary`
- `per_order_mode`
- `status_review`
- `resignations`
- `daily_followup`
- `daily_report`
- `daily_performance`
- `overall_performance`
- `face_verification`
- `delivery_experience`
- `vda_raw`
- `vda_result`

### HR / compliance family

- `hr_albwaba`
- `hr_express`
- `hr_togary`
- `hr_archive`
- `inactive_riders`
- `transport_license_queue`
- `keeta_id_registry`
- `driver_cards`
- `health_cards`
- `platform_reference_hangar`
- `platform_reference_amazon`
- `platform_reference_ninja`
- `platform_reference_jahez`
- `platform_reference_chefs`

### Fleet family

- `operating_vehicles`
- `update_branches`
- `update_vehicles`
- `vehicle_occupancy`
- `branch_compliance`
- `handover_jeddah`
- `handover_riyadh`

### Monthly closing family

- `company_partner_invoice`
- `company_courier_invoice`
- `internal_settlement_express`
- `internal_settlement_albwaba`
- `internal_settlement_fr3pl`
- `monthly_vda`
- `monthly_short_vda`
- `monthly_vda_report`
- `monthly_delivery_experience`
- `monthly_face_summary`
- `monthly_face_daily`

## 6. Scope key for supersession

The registry should maintain one "latest" dataset per scope key:

`dataset_role + platform + city + register + month_key`

Why:

- July operations imports can be refreshed many times
- one new dashboard export should supersede the previous one of the same role and scope
- older imports still need to remain accessible for audit

## 7. Conflict registry

Each import should create `import_conflicts` records when needed.

Suggested conflict codes:

- `missing_city_scope`
- `missing_register_scope`
- `mixed_city_detected`
- `mixed_register_detected`
- `duplicate_rider_id`
- `duplicate_iqama`
- `schema_drift`
- `header_not_recognized`
- `unknown_dataset_role`
- `cross_file_mismatch`

Suggested severities:

- `info`
- `warning`
- `blocking`

## 8. How role detection should work

Detection order:

1. filename clues
2. sheet names
3. header row signature
4. formula / conditional-format signature

Examples:

- workbook with `EXPRESS OPR`, `Albwaba OPR`, `VDA`, `الاداء الكلى` -> `operations_workbook`
- workbook with `HR شركة البوابة المقبله`, `ايديهات كيتا`, `بطاقات السائقين` -> `hr_archive_workbook`
- workbook with `Operating Vehicles`, `Update Branches`, `VehicleS` -> `fleet_workbook`
- workbook with `تفاصيل الشركاء` and `تفاصيل سائق التوصيل` -> `company_invoice_workbook`

## 9. Recommended storage layout

Use the existing `storage/` folder instead of inventing a second persistence root.

Suggested files:

- `storage/imports/import_manifest.json`
- `storage/imports/batches/<batch-id>.json`
- `storage/imports/datasets/<dataset-id>.json`
- `storage/imports/conflicts/<batch-id>.json`

Suggested behavior:

- manifest keeps lightweight index rows
- batch file keeps source-level metadata
- dataset file keeps schema and normalization metadata
- conflict file keeps warnings and blockers

## 10. First implementation rules for Prompt 2

Prompt 2 should not attempt:

- full formula execution
- automated Google Sheets remote pulls
- silent city/register inference when ambiguous

Prompt 2 should do:

1. detect file family
2. classify sheet roles
3. persist batch metadata
4. persist dataset metadata
5. record conflicts clearly
6. mark latest vs superseded imports

## 11. Final recommendation

The import registry is the real bridge between Prompt 0 and every later prompt.

Without it:

- operations pages will keep re-parsing files ad hoc
- HR and fleet joins will drift
- monthly closing imports will not be auditable
- multi-register July datasets will become risky to refresh
