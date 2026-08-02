# Prompt 8.12 Browser Verification

Date: 2026-07-30

## Environment

- Chrome/Playwright against:
  `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?storageProfile=prompt8_12_performance_validity&verify=8_12`
- Isolated profile: `prompt8_12_performance_validity`

## Verified

- PF1-PF8 opened `page-performance-shell` with their exact canonical views.
- Each view showed the canonical filters and data-derived KPI cards.
- Read-only row details opened in the global drawer.
- Assignment-period attribution switched from the external rider on `2026-07-10` to the HR rider on `2026-07-20`.
- The account owner was not substituted for the actual rider.
- Registered and actual vehicles remained separate.
- Performance import navigation opened `performance_pipeline_import` with `daily_performance` and did not save.
- Audit count stayed `0`.
- Normal mode: zero Console/page errors.
- Safe mode: banner visible, topbar contained, runtime host disabled, no freeze, and zero Console/page errors.

## Artifacts

All 12 required PNG files under `artifacts/prompt-8-12/` were confirmed non-empty and visually reviewed.

## Result

Browser verification passed.
