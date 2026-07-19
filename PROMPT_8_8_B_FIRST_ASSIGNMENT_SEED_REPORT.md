# Prompt 8.8-B First Assignment Seed Report

## Root cause
- The seeded first-assignment row already existed in `src/data/browserRuntime.js`.
- The browser gap was not missing business data.
- The real blocker was persisted browser-local data under the default prefix, which hid the seeded demo state during live browser verification.

## Seed row used
- Seed row id: `dash_user_3`
- Dashboard user id: `1782999000333001`
- Owner name: `Salem Nasser`
- Owner iqama: `2444000033`
- City: `جدة`
- Register: `ALBAWABA`
- Platform: `keeta`
- Activation status: `Accepted`
- Employment state: `In Service`
- Lifecycle/readiness state:
  - `lifecycleStatus = new`
  - `assignmentReadiness = ready_for_assignment`
  - `reviewStatus = needs_assignment`

## Minimal changes made
- Added query-driven browser storage isolation in `src/data/browserRuntime.js`:
  - `resolveBrowserStorageProfile()`
  - `normalizeStorageProfile(value)`
- Changed browser-local prefix from the fixed default to:
  - `keeta.prompt2.runtime.<storageProfile>`
  - fallback remains `keeta.prompt2.runtime` when no profile is supplied
- Added script cache-bust for browser verification in:
  - `keeta_operations_portal_starter_v4.html`
  - `./src/data/browserRuntime.js?v=20260715-2`

## Why this row is valid for first assignment
- Accepted dashboard user.
- In service.
- Valid owner iqama exists.
- No active assignment linked.
- Surfaced by readiness logic as a true first-assignment candidate.
- Owner identity remains separate from actual rider identity.

## How it appears in the UI
- Browser verification URL used:
  - `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?storageProfile=prompt8_8_b_v2&verify=...`
- Visible under operations tab:
  - `تحتاج تسكين 1`
- Visible row text included:
  - `1782999000333001`
  - `Salem Nasser`
  - `2444000033`
  - `Albwaba`
  - `جدة`
  - `KEETA`
  - `يحتاج تسكين`

## Why this does not affect real import behavior
- No import normalizer logic was changed to fake readiness.
- No assignment service rules were weakened.
- Isolation is opt-in via `storageProfile` query parameter and does not alter default runtime behavior.
- Default browser prefix still works unchanged when no isolated profile is requested.
