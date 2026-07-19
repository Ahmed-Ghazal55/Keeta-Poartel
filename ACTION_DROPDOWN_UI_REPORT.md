# Action Dropdown UI Report

## Scope

Prompt 8 continuation replaced repeated inline action buttons with a shared dropdown renderer and controller.

## Files

- `src/ui/actionDropdown.js`
- `tests/actionDropdown.test.js`

## Current integration points

Confirmed usage exists in:

- `keeta_operations_portal_operations_extension.js`
- `keeta_operations_portal_hr_extension.js`
- `keeta_operations_portal_performance_extension.js`
- `keeta_operations_portal_fleet_extension.js`

## Behavior

Each row now renders a single trigger:

- `العمليات ▾`

The shared component supports:

- normal items
- disabled items with a short reason
- danger styling for destructive actions
- dataset/context payload passing
- global event dispatch through `keeta:action-dropdown-select`

## Layering

The dropdown root and menu use centralized layer tokens:

- `var(--ui-layer-dropdown)`

No new hard-coded z-index values were added in the component.

## RBAC handling

RBAC-sensitive actions can be rendered disabled with an explanation such as:

- `يحتاج صلاحية operations.assign`

This keeps the UI informative without pretending the user can act.

## Verification

Automated coverage:

- `tests/actionDropdown.test.js`
- included in `npm run test:ui`
- included in `npm run test:all`

Assertions covered:

- single trigger output
- menu item generation
- danger styling
- disabled state rendering with reason text
