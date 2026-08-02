# Prompt 8.10-B Workflow Drawer Regression Report

## First assignment proof

- Verified row:
  - `dashboardUserId = 1782999000333001`
- Browser-visible drawer title:
  - `تسكين مندوب`
- Verified visible fields:
  - `opsAssignIqama`
  - `opsAssignRiderName`
  - `opsAssignOperationMode`
  - `opsAssignReceiveDate`
  - `opsAssignFirstOnlineDate`
  - `opsAssignPlateNumber`
  - `opsAssignVehicleSerial`
  - `opsAssignSupervisor`
- Resolver section remained visible.
- Artifact:
  - `artifacts/prompt-8-10-b/prompt-8-10-b-first-assignment-drawer.png`

## Swap proof

- Verified row:
  - `dashboardUserId = 1782916129257495`
- Browser-visible drawer title:
  - `تبديل مندوب`
- Verified visible fields:
  - `opsSwapIqama`
  - `opsSwapRiderName`
  - `opsSwapOperationMode`
  - `opsSwapReceiveDate`
  - `opsSwapFirstOnlineDate`
  - `opsSwapPlateNumber`
  - `opsSwapVehicleSerial`
  - `opsSwapSupervisor`
- Artifact:
  - `artifacts/prompt-8-10-b/prompt-8-10-b-swap-drawer.png`

## Stop / termination proof

- Verified active current assignment row:
  - `dashboardUserId = 1782916129257495`
- Browser-visible drawer title:
  - `إيقاف بدون بديل`
- Verified visible fields:
  - `opsTerminationAction`
  - `opsTerminationDate`
  - `opsTerminationReason`
- The shared termination form contract remains in place for stop/dismissal selection through `opsTerminationAction`.
- Artifact:
  - `artifacts/prompt-8-10-b/prompt-8-10-b-stop-drawer.png`

## Safety result

- Opening these drawers stayed phantom and non-auditing.
- Confirmed mutation paths still belong to the existing service layer only.
