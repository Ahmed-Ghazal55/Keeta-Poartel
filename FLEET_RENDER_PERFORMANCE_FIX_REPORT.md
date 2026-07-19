# Fleet Render Performance Fix Report

Date: 2026-07-13
Scope: Prompt 8.3

## Changes

- Fleet rebuild was already removed from `buildModel()` in the earlier Prompt 8.2/8.3 pass.
- This hotfix completed the protection by:
  - preventing re-entrant rebuilds during derived writes
  - narrowing rebuild triggers to fleet source entities
  - persisting the fleet source hash before derived saves complete

## Source vs derived contract

Source entities:

- `vehicles`
- `dashboardUsers`
- `assignments`
- `vehicleMovementEvents`

Derived entities:

- `vehicleAssignments`
- `vehicleCapacityReviews`
- `vehicleComplianceIssues`

## Verified result

- No direct rebuild call remains inside `buildModel()`.
- No stack-overflow recursion remains on normal-mode startup.
- Fleet navigation in safe verification remained responsive:
  - sidebar click to `Operating Vehicles FL1`
  - active page switched to `page-fleet-shell`
  - observed response time about `1185ms`

## Automated coverage

- `tests/fleetRenderPerformance.test.js`
- `npm run test:fleet`
- `npm run test:all`
