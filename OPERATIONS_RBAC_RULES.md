# Operations RBAC Rules

## Permissions Used

- `operations.view`
- `operations.assign`
- `operations.swap`
- `operations.terminate`
- `operations.editStatus`
- `audit.view`
- `archive.view`

## UI Rules

- Operations page respects `operations.view`.
- action buttons are disabled when the current user lacks the required permission.
- audit log tab is rendered only when `audit.view` is available.

## Service-Layer Rules

Critical rule:

Operations are not trusted to the UI alone.

The service layer re-validates:

- permission
- user city/register scope
- organization selector city/register scope
- operation-specific validation

This prevents direct manual invocation outside scope.

## Scope Sources

Every operations action is affected by:

- `CurrentUser.cityScope`
- `CurrentUser.selectedCities`
- `CurrentUser.registerScope`
- `CurrentUser.selectedRegisters`
- `Portal.OrganizationContext.getState()`

## Register Matching

Register matching uses:

- exact normalized register equality
- Prompt 3 compatibility rule `matchUserRegisterScope`

This allows scope compatibility for combinations such as:

- `PER_ORDER_FR3PL`
- `PER_ORDER`
- `FR_3PL`

## Verified Cases

Covered by automated tests:

- operations admin can assign within scope
- viewer cannot assign
- city supervisor for Jeddah cannot operate on Riyadh user
- organization selector can further narrow access even for an operations admin
