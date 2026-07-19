# Prompt 8.3 Reproduction Report

Date: 2026-07-13
Scope: Emergency UI + Performance Hotfix reproduction before final stabilization

## Initial reproduced issues

- Normal mode initially produced repeated `Maximum call stack size exceeded` page errors.
- The error loop was reproducible in headless verification and pointed to fleet derived rebuild recursion:
  - `keeta_operations_portal_hr_extension.js`
  - `keeta_operations_portal_fleet_extension.js`
  - `src/fleet/fleetOperationsIntegration.js`
  - `src/data/repositories.js`
- In-app browser verification of normal mode stalled before the fleet loop fix.
- Mobile safe-mode topbar was initially too tall at `550px`.
- Desktop safe mode was stable, but normal mode still showed slow startup warnings from `storageBridge.refreshStatus`.

## Reproduction method

URLs used:

- `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?safe=1`
- `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html`

Verification tools used:

- In-app browser via Browser skill
- Local Playwright headless verification
- `npm run test:ui`
- `npm run test:fleet`
- `npm run test:all`

## Pre-fix evidence

- Headless `pageerror` stack showed fleet rebuild recursion on repeated `dataStore.save/upsert`.
- Mobile safe-mode header measured `550px` before the compact mobile pass.
- Normal mode emitted repeated stack-overflow page errors until the fleet guard patch was applied.

## Final reproduced state after fix

- The stack overflow is no longer reproduced.
- In-app browser now opens both safe and normal mode successfully.
- Mobile safe-mode header is reduced to `191px`.
- Remaining observable startup warnings are limited to offline node-sync fallback:
  - `storageBridge.refreshStatus` around `1.2s`
  - request failure on `http://127.0.0.1:4174/api/health` when the local dev API is not running

## Related artifacts

- `artifacts/prompt-8-3/playwright-verification.json`
- `artifacts/prompt-8-3/safe-desktop.png`
- `artifacts/prompt-8-3/normal-desktop.png`
- `artifacts/prompt-8-3/safe-mobile.png`
- `artifacts/prompt-8-3/safe-after-nav.png`
