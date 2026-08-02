# Prompt 8.11-B Browser Verification

Date: 2026-07-29

Normal URL:
`http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?storageProfile=prompt8_11_b_hr_fleet_links&verify=8_11_b`

Safe URL:
`http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?safe=1&storageProfile=prompt8_11_b_hr_fleet_links&verify=8_11_b`

Google Chrome was driven by Playwright against the live local UI and API. The row `1782999000777001` was opened from sidebar route `OP1`, the current canonical Dashboard Users route.

| Action | Result | Artifact |
|---|---|---|
| Owner HR | `HR1 / hr_master`, `2444000077`, correct drawer | `prompt-8-11-b-owner-details-clickthrough.png` |
| Actual rider | `HR3 / external_riders`, `2999000011` | `prompt-8-11-b-actual-rider-details-clickthrough.png` |
| Registered vehicle | `FL1`, `JED-CAR-7007 / JED-7007` | `prompt-8-11-b-registered-vehicle-clickthrough.png` |
| Actual vehicle | `FL1`, `JED-BIKE-9009 / JED-9090` | `prompt-8-11-b-actual-vehicle-clickthrough.png` |
| Usage history | `FL4 / vehicle_usage_history`, rider `2999000011`, active period visible | `prompt-8-11-b-vehicle-usage-history-clickthrough.png` |

All five paths:

- preserved distinct page/subpage state
- showed the expected focused data
- opened/closed the relevant drawer safely
- retained audit count `0`
- produced zero Console/page errors

Safe mode also passed with no freeze or Console error.

Additional evidence:

- `prompt-8-11-b-audit-safety.png`: OP8 audit page, zero audit rows and zero Console/page errors.
- `prompt-8-11-b-safe-mode.png`: safe-mode banner visible, runtime hosts disabled, topbar contained, page responsive.
