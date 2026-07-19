# Assignment Rules

## Service

- `src/operations/assignmentService.js`

## Required Permission

- `operations.assign`

## Required Scope Conditions

Assignment is rejected if either of the following is outside scope:

- current user city/register scope
- current organization selector city/register scope

The service now derives scope from the actual dashboard user when the UI payload does not explicitly send city/register.

## Assignment Preconditions

- dashboard user must exist
- dashboard user must not already have an active assignment
- rider must exist, or an iqama must be supplied to create a placeholder rider
- rider city must match dashboard user city

## Register Mismatch Rule

Register mismatch does not block assignment automatically.

Instead:

- assignment is allowed
- warning `rider_register_mismatch` is returned
- dashboard user review status becomes `needs_swap`

## Writes Performed

Successful first assignment creates or updates:

- `assignments`
- `dashboardUsers`
- `assignmentHistory`
- `riderArchiveEvents`
- `auditLogs`

## Dashboard User State After Success

- `currentRiderId` filled
- `currentRiderIqama` filled
- `currentRiderName` filled
- `currentAssignmentId` filled
- `assignmentStatus = active`
- `handoverDate` set
- `matchStatus = matched` unless warnings exist
- `reviewStatus = ok` unless warnings exist

## Audit Action

- `assign_rider`

Validation rejections are recorded as:

- `operation_rejected_validation`
