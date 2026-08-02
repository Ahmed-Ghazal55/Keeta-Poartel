# Prompt 8.13 Import Center Model Report

Date: 2026-08-02

## Completed

- Added `src/import/importCenterViewModel.js` as a read-only centralized model.
- Registered 12 canonical families: dashboard users, current assignments, external riders, HR master, fleet operating vehicles, vehicle assignments, overall performance, daily performance, VDA, face verification, delivery experience, and validity results.
- Centralized canonical route, template, target entity, source module, scope, preview-row, validation-state, batch-history, and focused-batch shapes.
- Preserved route aliases such as `performance_import -> performance_pipeline_import`.
- Extended `src/data/lifecycleRegistry.js` with the canonical page-level import routes while retaining the established template IDs (`vehicles` and `vehicles_movement`) for Fleet compatibility.

## Read-only contract

Route open, template selection, preview state, history normalization, and batch focus contain no storage or audit calls. Explicit save remains in the existing import batch service.

## Result

The Import Center now has one canonical presentation contract without replacing its established service-layer save flow.
