# Swap Rules

## Service

- `src/operations/swapService.js`

## Required Permission

- `operations.swap`

## Required Preconditions

- dashboard user must exist
- dashboard user must have an active assignment
- if `previousRiderId` is supplied, it must match the active assignment
- new rider must exist, or an iqama must be supplied to create a placeholder rider
- new rider city must match dashboard user city

## Scope Rules

The swap is blocked if the target dashboard user is outside:

- current user scope
- current organization selector scope

Resolved scope is derived from the dashboard user record if the UI payload omits city/register.

## Writes Performed

Successful swap:

1. closes the old active assignment with `status = ended`
2. creates a new active assignment with `assignmentType = swap`
3. updates the dashboard user to the new rider
4. creates one `assignmentHistory` row with action `swap`
5. creates rider archive events for swap-out and swap-in
6. records an audit event

## Dashboard User State After Success

- `currentRiderId` points to the new rider
- `currentAssignmentId` points to the new assignment
- `reviewStatus = ok`
- `recommendedAction = none`
- `status = working`

## Audit Action

- `swap_rider`

Validation rejections are recorded as:

- `operation_rejected_validation`
