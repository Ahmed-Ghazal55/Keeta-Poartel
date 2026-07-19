# Performance RBAC Rules

Date: 2026-07-12

## Permissions used by Prompt 7

- `performance.view`
- `performance.recalculate`
- `performance.export`
- `performance.reviewIssues`

## Role coverage

### `super_admin`

- Full access through existing broad scope.

### `operations_admin`

- Can view performance.
- Can recalculate scoped performance.
- Can export performance.
- Can review issues.

### `city_supervisor`

- Can view performance inside allowed city/register scope.
- Can recalculate inside allowed city/register scope.
- Can export inside scope.
- Can review issues inside scope.

### `finance_officer`

- Can view performance.
- Can export performance.
- Does not receive recalculation permission.

## Service-layer enforcement

Prompt 7 enforces RBAC in `src/performance/performanceRecalculationService.js`, not UI only.

### Protected operations

- `runPerformanceRecalculationForScope(scope, user)`
- `listValidityResults(filters, user, context)`
- `listPerformanceIssues(filters, user, context)`
- `getResultDetails(id, user)`

### Enforcement points

- `ensureRecalculatePermission(user, scope)`
- `canViewRow(user, row)`
- register-scope checks through register alias matching
- city-scope checks through RBAC city access

## Verified by tests

- viewer cannot recalculate
- city supervisor cannot recalculate another city
- operations admin can recalculate inside scope
- super admin can recalculate global scope
