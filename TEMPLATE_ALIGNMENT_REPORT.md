# Template Alignment Report

## Scope

Prompt 8 aligned the import template registry with the user-specified official column order for dashboard users, HR master, and fleet-related templates.

## File

- `src/import/importTemplateRegistry.js`

## Registered template set

The registry currently exposes `12` templates.

Important Prompt 8 templates:

- `dashboard_users`
- `hr_master`
- `vehicles`
- `vehicles_movement`
- `daily_performance`
- `overall_performance`
- `vda`
- `face_verification`
- `delivery_experience`
- `company_invoice`
- `internal_settlement`
- `shift_schedule`

## Exact-order templates confirmed

Verified by tests:

- Dashboard Users exact order
- HR Master A:S plus computed T:AB exact order
- Operating Vehicles exact order
- Vehicles Movement exact order

## Matching behavior

The registry supports three matching outcomes:

- `auto`
- `review`
- `manual`

Current verified examples:

- official operating-vehicle headers auto-match `vehicles`
- official vehicle-movement headers auto-match `vehicles_movement`
- partial performance headers remain review-gated

## Download/requirements support

The registry exposes:

- template workbook generation
- bundle workbook generation
- requirements sheet generation
- aliases sheet generation

## Validation direction

The registry captures:

- primary keys
- secondary keys
- relationships
- validation rules
- computed headers
- display order

## Verification

Automated coverage:

- `tests/importTemplateRegistry.test.js`
- `tests/importTemplateRegistryColumns.test.js`
- included in `npm run test:templates`
- included in `npm run test:fleet`
- included in `npm run test:all`
