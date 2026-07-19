# Vehicle Computed Fields Report

## Scope

Prompt 8 added wrapper functions for the computed operating-vehicle columns derived from assignments and movement data.

## Files

- `src/fleet/vehicleComputedFieldsService.js`
- `src/fleet/vehicleComputedFields.js`
- `tests/vehicleComputedFieldsService.test.js`
- `tests/vehicleComputedFields.test.js`

## Identity rules

Fleet logic keeps:

- primary key: `vehicleSerial`
- secondary key: `plateNumber`

If a plate changes for the same serial, the serial identity remains the main vehicle record anchor.

## Exposed wrapper functions

- `computeCurrentBoundingAccounts(...)`
- `computeUsedByPartnerName(...)`
- `computeCurrentBranch(...)`
- `computeCurrentCity(...)`
- `computeTargetedBranch(...)`
- `computeCityUsageCount(...)`
- `computeVehicleType(...)`
- `computeCityAndBranch(...)`
- `computeAccountsRegisteredOnVehicle(...)`
- `computeIqamasRegisteredOnVehicle(...)`
- `computeVehicleMovementStatus(...)`
- `computeOperatingVehicleDisplayRow(...)`

## Prompt 8 outcomes

The wrapper/service pair now derives:

- city/register usage
- account count on the vehicle
- four explicit iqama slots
- movement status from movement events
- display-row values for the official operating-vehicle layout

## Related operational distinction

Prompt 8 also preserves the separation between:

- `registeredVehicleOnDashboard`
- `actualUsedVehicle`

This distinction is consumed by operations and fleet integration.

## Verification

Automated coverage:

- `tests/vehicleComputedFieldsService.test.js`
- `tests/vehicleComputedFields.test.js`
- included in `npm run test:fleet`
- included in `npm run test:all`
