# Prompt 8.11 HR Fleet Issue Linking Report

Date: 2026-07-19

## Files
- `src/hr/hrViewModel.js`
- `src/fleet/fleetViewModel.js`
- `tests/hrFleetIssueLinking.test.js`

## Stable focus/issue metadata status
- HR focus objects keep canonical route metadata
- Fleet focus objects keep canonical route metadata
- The cleanup keeps future notification linking possible for:
  - `owner_hr_profile_missing`
  - `actual_rider_hr_external_mismatch`
  - `actual_rider_profile_missing`
  - `registered_vehicle_missing`
  - `actual_vehicle_missing`
  - `vehicle_capacity_exceeded`
  - `vehicle_status_excluded`
  - `plate_serial_mismatch`

## Metadata fields preserved where available
- `sourceModule`
- `entityType`
- `entityId`
- `ownerIqama`
- `actualRiderIqama`
- `vehicleSerial`
- `plateNumber`
- `dashboardUserId`
- `assignmentId`
- `register`
- `city`
- `platform`
- `linkedPage`
- `linkedSubPage`
- `linkedFilters`
- `linkedDrawer`

## Test proof
- `tests/hrFleetIssueLinking.test.js` passed

## Result
- Issue/focus metadata is ready for later notification and issue-linking layers
