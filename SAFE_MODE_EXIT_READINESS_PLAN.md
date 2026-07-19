# Safe Mode Exit Readiness Plan

Date: 2026-07-14
Scope: readiness plan only, no behavior rewrite in Prompt 8.4

## Current safe-mode contract

Source:

- [src/runtime/bootMode.js](D:/keeta%20operations%20portal/src/runtime/bootMode.js)
- [keeta_operations_portal_stabilization.js](D:/keeta%20operations%20portal/keeta_operations_portal_stabilization.js)
- [keeta_operations_portal_ui_redesign.js](D:/keeta%20operations%20portal/keeta_operations_portal_ui_redesign.js)

Current behavior:

- `?safe=1` enables safe mode
- `?lite=1` also enables safe-style boot constraints
- `?debugBoot=1` enables diagnostics only
- normal mode is the default when no safe/lite flag is present

## Current readiness assessment

### Normal mode

- usable: yes
- audit flood regression in normal mode: not observed
- should remain the default entry path: yes

### Safe mode

- still required as a recovery path: yes
- currently query-driven rather than persisted: yes
- should remain available after UI refactor: yes

## Persisted safe-mode flag review

Reviewed behavior indicates:

- no dedicated persisted safe-mode flag is stored in `localStorage`
- safe mode is derived from URL query only

Implication:

- exiting safe mode is primarily a URL/navigation concern
- there is no special safe-mode storage key that must be cleared in current code

## Current visible indicators

Existing indicators:

- safe-mode body class
- safe-mode banner host: `#safeModeBanner`
- boot-mode labeling in developer/runtime areas

Gap:

- user-facing safe-mode exit affordance should be clearer
- current project has a visible banner/instructions, but a dedicated `Exit Safe Mode` affordance should be standardized in the final shell

## Required 8.5 follow-up for exit behavior

Prompt 8.5 should add one of these patterns:

1. `Exit Safe Mode` button in the banner
2. `Back to Normal Mode` chip in the topbar/context bar
3. clear textual instruction with a one-click action that removes `?safe=1` / `?lite=1`

Expected action:

- strip `safe` and `lite` query params
- preserve the current page/route when possible
- do not mutate application data
- do not create audit rows

## Safety rules for exit flow

- exiting safe mode must not call audit services
- exiting safe mode must not trigger fleet rebuild during click handling itself
- exiting safe mode must not trigger broad hidden-page rendering
- re-entering normal mode must still respect page-scoped hydration and render scheduling

## Manual verification plan

1. Open normal URL:
   - `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html`
2. Confirm safe banner is not visible.
3. Open safe URL:
   - `http://127.0.0.1:4173/keeta_operations_portal_starter_v4.html?safe=1`
4. Confirm safe banner is visible.
5. Open Operations Log in both modes.
6. Idle for `60s`.
7. Confirm audit count does not grow in either mode.
8. Switch routes in both modes.
9. Confirm audit count does not grow.
10. Use future `Exit Safe Mode` action.
11. Confirm URL returns to normal mode.
12. Confirm audit count still does not grow after exit.

## Recommendation

Prompt 8.5 can safely treat normal mode as the default operating shell.

Safe mode should remain a recovery overlay/state, not a parallel product mode.
