# Sidebar Routing Fix Report

## Scope

Prompt 8 continuation normalized grouped sidebar routing so shared shell pages can open distinct operational views instead of collapsing multiple menu items into the same undifferentiated page state.

## Files

- `src/ui/sidebarRouting.js`
- `keeta_operations_portal_ui_redesign.js`
- `keeta_operations_portal_monthly_rules_extension.js`
- `keeta_operations_portal_fleet_extension.js`
- `keeta_operations_portal_operations_extension.js`
- `keeta_operations_portal_performance_extension.js`
- `tests/sidebarRouting.test.js`

## Route mapping

The route map now resolves codes such as:

- `OP1 -> operations-shell / dashboard_users`
- `OP8 -> operations-shell / audit_log`
- `PF1 -> performance-shell / results`
- `PF7 -> performance-shell / issues`
- `RL1 -> monthly-rules-shell / settings`
- `RL2 -> monthly-rules-shell / mandatory`
- `RL3 -> monthly-rules-shell / incentives_cars`
- `RL4 -> monthly-rules-shell / incentives_bikes`
- `RL5 -> monthly-rules-shell / quality`
- `FL1 -> fleet-shell / operating`
- `FL6 -> fleet-shell / matching`

## Active-state rules

Active state is now based on:

- page
- subpage

This prevents all sibling items inside the same shared shell from appearing active at once.

## Accordion behavior

The helper supports:

- single-open mode by default
- optional multi-open behavior

Single-open mode closes sibling groups when a new group is opened.

## Runtime evidence

Existing browser artifacts show the grouped module sidebar is active:

- `.codex-artifacts/prompt8-browser.png`
- `.codex-artifacts/operations-page-live.png`
- `.codex-artifacts/monthly-rules-page-live.png`

## Verification

Automated coverage:

- `tests/sidebarRouting.test.js`
- included in `npm run test:ui`
- included in `npm run test:all`

Covered assertions:

- shared shell routes resolve to distinct subpages
- active state depends on page + subpage
- single-open accordion closes sibling groups
