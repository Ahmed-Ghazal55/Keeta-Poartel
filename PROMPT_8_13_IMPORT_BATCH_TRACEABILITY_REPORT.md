# Prompt 8.13 Import Batch Traceability Report

Date: 2026-08-02

## Batch contract

The centralized batch model exposes batch/type/template/source/target/status, row and validation counts, saved count, scope, creator/time, and source fingerprint when available.

## Browser behavior

- Batch history displayed two isolated verification batches.
- `batch_prompt_8_13_daily_1` opened as a deterministic read-only focused detail.
- The detail displayed batch ID, source file, template, import type, target entity, and status.
- Clicking a history row and calling `focusBatch(...)` remain read-only.
- The real Operations `Import Source Batch` row action focused `batch_prompt_8_13_dashboard_1` with route `operations_source_batch`.

## Result

Linked modules can focus source-batch context without saving or creating audit rows.
