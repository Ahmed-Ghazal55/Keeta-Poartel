# Prompt 8.12 Performance Attribution Report

Date: 2026-07-30

## Completed

- Added `src/performance/performanceAttribution.js`.
- Attribution is resolved by dashboard user, performance date, city, register, and platform.
- Assignment-period history determines the actual rider for the relevant day.
- External-rider and HR-rider sources remain explicit.
- Missing assignment returns an unresolved result instead of promoting the account owner to actual rider.
- Registered vehicle and actual used vehicle remain separate.
- `performanceRecalculationService.js` now uses the date-scoped attribution helper and no longer applies the unsafe current-active-assignment fallback.

## Browser proof

- `2026-07-10` resolved to external rider `2999812001`.
- `2026-07-20` resolved to HR rider `2444812016`.
- Owner `2444812001` remained the owner and was not presented as the actual rider.
- Registered and actual vehicles remained distinct in both periods.

## Result

Performance attribution is date-scoped, source-aware, and safe when assignment evidence is missing.
