# Current Assignments 8.8 Contract Report

## Contract sources reviewed
- `src/import/importTemplateRegistry.js`
- `src/data/entitySchemas.js`
- `src/data/lifecycleRegistry.js`
- `tests/lifecycleTemplateRegistry.test.js`
- `tests/currentAssignmentsImport.test.js`
- `PROMPT_8_5_B_TEMPLATE_REGISTRY_REPORT.md`
- `PROMPT_8_5_B_SCHEMA_REPORT.md`

## Confirmed template contract
- Template id: `current_assignments`
- Target entity: `assignments`
- Supported import types:
  - `current_assignments_workbook`
  - `current_assignments_csv`

## Confirmed operational header coverage
- register / city / platform
- `Courier ID / User ID`
- owner iqama and owner name
- actual rider iqama, name, phone, and rider source
- operation mode
- assignment start / receive / first-online dates
- assignment status
- dashboard vehicle / actual vehicle
- vehicle type / plate number / serial
- supervisor / notes

## Confirmed canonical assignment storage
The active schema still supports the Prompt 8.8 split between dashboard-user owner and actual operating rider, including:
- `assignmentId`
- `register`
- `city`
- `platform`
- `courierId`
- `userId`
- `ownerIqama`
- `ownerName`
- `actualRiderIqama`
- `actualRiderName`
- `riderSource`
- `actualRiderPhone`
- `operationMode`
- `assignmentStartDate`
- `riderReceiveDate`
- `firstOnlineDate`
- `assignmentStatus`
- `dashboardVehicle`
- `actualVehicle`
- `vehicleType`
- `plateNumber`
- `vehicleSerial`
- `supervisor`
- `notes`
- `startDate`
- `endDate`
- `sourceBatchId`
- `sourceImportBatchId`
- `createdBy`
- `createdAt`
- `updatedBy`
- `updatedAt`

## Contract alignment confirmed in tests
- `tests/lifecycleTemplateRegistry.test.js`
  - current assignments headers still auto-match the registered lifecycle template
- `tests/currentAssignmentsImport.test.js`
  - approved save persists only approved lifecycle entities
- `tests/currentAssignmentsViewModel.test.js`
  - current rows still expose operation mode, rider source, and vehicle attribution fields correctly

## Result
- Prompt 8.8 did not break the `current_assignments` import or storage contract.
- Owner identity, actual rider identity, and vehicle linkage remain separated in storage as required.
