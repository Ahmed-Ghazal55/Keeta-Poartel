# Prompt 8.5-B Schema Report

## Scope reviewed
- `src/data/entitySchemas.js`

## Confirmed lifecycle entities
- `externalRiders` exists and now covers external rider master data: `iqama`, `fullName`, phones, IBAN, tools, gas card, operator email fields, and `sourceBatchId`.
- `riderOperationalProfiles` exists and stores the operational overlay independent from HR ownership: `riderSource`, contact/app phone, IBAN, preferred city/register/platform, updater metadata, and notes.
- `riderVehicleUsageHistory` exists and stores rider-to-vehicle usage periods with `startDate`, `endDate`, `active`, `vehicleSource`, `vehicleSerial`, `plateNumber`, and `sourceOperation`.
- `monthlyArchiveSnapshots` exists and supports frozen lifecycle snapshots for monthly closing with dedicated snapshot arrays for dashboard users, assignments, rider profiles, vehicle usage, performance, validity, issues, invoices, and settlements.

## Confirmed enriched core entities
- `dashboardUsers` includes lifecycle/operational fields required by 8.5-B, including `ownerIqama`, `currentRiderIqama`, `currentRiderSource`, `currentAssignmentId`, `operationMode`, `assignmentStatus`, and `lifecycleStatus`.
- `assignments` includes separated owner-vs-actual-rider attribution fields:
  - `ownerIqama`
  - `ownerName`
  - `actualRiderIqama`
  - `actualRiderName`
  - `riderSource`
  - `actualRiderPhone`
  - `operationMode`
  - `assignmentStatus`
  - `assignmentStartDate`
  - `riderReceiveDate`
  - `firstOnlineDate`
  - `dashboardVehicle`
  - `actualVehicle`
  - `plateNumber`
  - `vehicleSerial`
  - `sourceBatchId`
  - `sourceImportBatchId`
  - `updatedBy`

## Result
- Prompt 8.5-B schema targets are present.
- No schema gap remains for lifecycle imports, operational rider overlay storage, vehicle usage period tracking, or monthly frozen snapshots.

## Verification
- Automated coverage passed in `tests/lifecycleEntitySchemas.test.js`.
