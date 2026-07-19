# Startup Profiler Report

Date: 2026-07-13
Scope: Prompt 8.3

## Runtime additions

- `src/runtime/startupProfiler.js`
- profiler wiring in:
  - `keeta_operations_portal_stabilization.js`
  - `src/data/browserRuntime.js`

## Instrumented startup steps

- `applyLayeringVariables`
- `compactHeroHeader`
- `ensureTopbarRuntimeScaffolding`
- `bindRuntimeUiEvents`
- `initLiveClock`
- `renderTopbarRuntime`
- `initStorageBridge`
- `storageBridge.refreshStatus`
- `hydrateEntity:*`
- `fleetIntegration.rebuildDerivedCollections`
- `performanceService.runPerformanceRecalculationForScope`

## Final observed warnings

In-app browser normal mode:

- `fleetIntegration.rebuildDerivedCollections` heavy at about `855ms`
- `startup.total` blocking at about `1011ms`
- `storageBridge.refreshStatus` blocking at about `1278ms`

Headless normal mode:

- `storageBridge.refreshStatus` warning around `1220ms`
- No post-fix stack overflow page errors

## Interpretation

- The critical recursion failure is fixed.
- The remaining slow point is offline node-sync health checking when the local dev API is not running.
- Startup is now slow-warning level in normal mode, but no longer crash/freeze level.
