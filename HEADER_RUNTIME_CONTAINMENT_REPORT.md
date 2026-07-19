# Header Runtime Containment Report

Date: 2026-07-13
Scope: Prompt 8.2

## What changed

- Standardized all runtime widgets under one host: `#appTopbarRuntime`.
- Kept runtime rendering inside the application header instead of allowing any legacy injection above the page content.
- Removed the old fallback branch in `ensureTopbarRuntimeScaffolding()` that could re-insert `#topbarRuntimeStrip` through `.ui-topbar__meta`.
- Runtime dedupe now runs before each scaffold pass through `Portal.RuntimeContainment.dedupeRuntimeWidgets(...)`.
- The runtime row now contains only compact chips:
  - `#topbarRuntimeStrip`
  - `#topbarCurrentUserChip`
  - `#topbarStorageModeChip`
  - `#topbarNotificationHost`

## Layout contract

- Desktop topbar height is constrained in CSS:
  - `min-height: 88px`
  - `max-height: min(120px, 14vh)`
- Runtime chips render in one compact horizontal row on desktop.
- On smaller widths, the runtime row wraps without becoming tall stacked cards.
- The current user display stays as one compact chip, with the verbose label hidden and the scope truncated when needed.

## Idempotency safeguards

- `window.__keetaRuntimeLifecycle` stores cleanup callbacks and the bridge subscription.
- Re-initialization now calls `cleanupRuntimeLifecycle()` before rebinding listeners or clocks.
- `runtimeUiState.runtimeUiBound` prevents duplicate document listeners.
- `initLiveClock()` stops any previous controller before starting a new one.
- `dedupeRuntimeWidgets()` removes duplicate runtime nodes before the header is populated again.

## Verification status

- Automated containment checks passed in `tests/runtimeContainment.test.js`.
- UI sizing and chip compaction are enforced by the updated CSS rules in:
  - `keeta_operations_portal_ui_redesign.css`
  - `keeta_operations_portal_stabilization.css`
- Live in-app browser verification was attempted but blocked by browser attach issues in this session.

## Remaining note

- The language selector remains inside the topbar control area, not as a duplicated runtime widget.
- No runtime widget should be injected above the header after this change set.
