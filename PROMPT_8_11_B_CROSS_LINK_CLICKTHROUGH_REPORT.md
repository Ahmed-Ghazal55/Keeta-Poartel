# Prompt 8.11-B Cross-Link Click-Through Report

Date: 2026-07-29

The live Ubuntu UI at `127.0.0.1:4173` and API at `127.0.0.1:4174` were exercised with Playwright driving Google Chrome. Each action was opened from the Operations dropdown on seeded current-assignment row `1782999000777001`.

| Dropdown action | Browser destination | Identity/context proved | Result |
|---|---|---|---|
| `owner-details` | `HR1 / hr_master`, profile drawer | `2444000077` | Passed |
| `actual-rider-details` | `HR3 / external_riders` | `2999000011` | Passed |
| `registered-vehicle-details` | `FL1 / operating_vehicles`, details drawer | `JED-CAR-7007 / JED-7007` | Passed |
| `actual-vehicle-details` | `FL1 / operating_vehicles`, details drawer | `JED-BIKE-9009 / JED-9090` | Passed |
| `vehicle-usage-history` | `FL4 / vehicle_usage_history` | rider `2999000011`, vehicle `JED-BIKE-9009 / JED-9090`, active usage period | Passed |

The dropdown dataset retained owner versus actual-rider identity and registered versus actual-vehicle identity separately. Relevant drawers opened and closed successfully. Each isolated run retained the seeded usage record, kept audit count at `0`, and emitted no Console or page errors.

The seven required PNG artifacts are stored under `artifacts/prompt-8-11-b/`.
