# Prompt 8.6 Vehicle Usage Display Report

## Implemented display-only scope
- No vehicle deduction or finance logic was added in Prompt 8.6.
- Resolver UI now displays current vehicle usage context only.

## Vehicle usage fields exposed
- current vehicle summary
- latest active period
- vehicle source
- vehicle usage status
- plate/serial/register/city when available through the summary record

## Data source
- `riderVehicleUsageHistory` repository/entity added to runtime and page-scoped loading.
- Resolver facade surfaces current active usage for both HR and External riders.

## UI surfaces using it
- Rider Resolver `Current Links` card
- Assignment/swap drawer resolver card

## Evidence
- `tests/riderResolverFacade.test.js` passed for current assignment and current vehicle usage surfacing.
- `artifacts/prompt-8-6/prompt-8-6-normal.png` shows vehicle summary for iqama `2999000099` with:
  - `JED-CAR-NEW1`
  - `JED-9099`
  - `EXPRESS / جدة`
  - active period starting `2026-07-10`
