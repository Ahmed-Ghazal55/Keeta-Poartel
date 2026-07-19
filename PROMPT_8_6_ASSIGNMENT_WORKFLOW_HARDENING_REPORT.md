# Prompt 8.6 Assignment Workflow Hardening Report

## Scope
- `keeta_operations_portal_operations_extension.js`
- `src/operations/assignmentService.js`
- `src/operations/swapService.js`
- shared resolver facade/runtime wiring

## UI hardening completed
- Assignment and swap drawers now consume resolver output consistently.
- Manual iqama entry and rider selection both flow through shared draft state.
- Resolver card appears inside drawers and updates from the typed/selected rider context.
- Shared operational draft fields are shown inline:
  - contact phone
  - app phone
  - IBAN
  - gas card
  - tools

## Business behavior covered
- HR rider:
  - used directly
  - never duplicated into External Riders
- Existing External rider:
  - used directly through resolver output
- Unknown rider:
  - can be created inline as External only when the service/facade allows it
- Shared operational-profile fields can be carried into assignment/swap saves safely.

## Audit behavior
- Opening drawers does not audit.
- Typing/searching before save does not audit.
- Confirmed assign/swap mutations still audit once through service layer.
- Inline external identity creation before assignment/swap is audited once as a business mutation when it actually occurs.

## Evidence
- `tests/assignmentWorkflowRiderResolver.test.js` passed.
- Visual evidence in `artifacts/prompt-8-6/prompt-8-6-normal.png` shows:
  - swap drawer opened successfully
  - resolver card rendered inside the drawer
  - typed iqama and linked rider context present
