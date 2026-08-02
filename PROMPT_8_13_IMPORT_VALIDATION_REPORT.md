# Prompt 8.13 Import Validation Report

Date: 2026-08-02

## Completed

Added `src/import/importValidationModel.js` with canonical statuses:

- `ready`
- `warning`
- `invalid`
- `blocked`
- `duplicate`
- `needs_review`

Issues preserve source row, field, issue code, severity, message, suggested action, linked entity context, and register/city/platform/month scope.

## Covered cases

- missing dashboard user ID
- missing owner iqama
- missing actual rider
- invalid register, city, or platform
- duplicate source row and existing entity
- vehicle serial/plate mismatch
- missing assignment for a Performance row
- report scope mismatch
- unsupported template
- malformed date and month

## Result

Validation produces row-level issues and batch summaries without mutating operational data or audit logs.
