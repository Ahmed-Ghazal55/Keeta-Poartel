# Prompt 8.6 External Riders UI Report

## UI placement decision
- Prompt 8.6 kept the workflow inside the existing `Rider Master` page instead of introducing a broad new shell route.
- This matched the prompt constraint to avoid a full shell redesign while still making the workflow usable.

## Added UI sections
- Search panel:
  - iqama input
  - search/verify submit
  - result badge
- Identity card:
  - HR rider identity shown read-only
  - External rider identity editable
  - Unknown rider can open create-external flow
- Operational Profile card:
  - shared operational fields editable through one form
- Current Links card:
  - current user summary
  - current assignment
  - current vehicle summary
  - latest active vehicle-usage period
  - vehicle source/status
- External Riders table:
  - visible external riders
  - one-click `Resolve` action by iqama
  - page-level import entry button

## Implemented behavior
- HR lookup:
  - identity is read-only
  - external creation is disabled
  - operational profile remains editable
- External lookup:
  - external identity becomes editable
  - operational profile remains editable
- Unknown lookup:
  - create-external path is available
  - operational profile path can be prepared without creating phantom records

## Audit safety
- Opening the Rider Resolver UI does not audit.
- Searching by iqama does not audit.
- Only confirmed create/update mutations can audit once through the service layer.

## Evidence
- `tests/externalRidersWorkflow.test.js` passed.
- Visual evidence saved in:
  - `artifacts/prompt-8-6/prompt-8-6-normal.png`
  - `artifacts/prompt-8-6/prompt-8-6-load-probe.png`
