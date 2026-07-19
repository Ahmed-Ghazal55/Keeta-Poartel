# UI Refactor Test Coverage Review

Date: 2026-07-14
Scope: planning review before Prompt 8.5/8.6

## Existing test coverage by protection area

## Audit behavior after 8.4-A

Current tests:

- [tests/auditLogPolicy.test.js](D:/keeta%20operations%20portal/tests/auditLogPolicy.test.js)
- [tests/auditLogFlood.test.js](D:/keeta%20operations%20portal/tests/auditLogFlood.test.js)
- [tests/auditLogCleanup.test.js](D:/keeta%20operations%20portal/tests/auditLogCleanup.test.js)
- [tests/operationsLogView.test.js](D:/keeta%20operations%20portal/tests/operationsLogView.test.js)

What they protect:

- allowlist enforcement
- forbidden-source blocking
- idempotency/deduplication
- cleanup/quarantine behavior
- read-only operations log filtering/pagination
- no phantom rows in covered service paths

## UI shell / runtime / layout

Current tests:

- [tests/bootMode.test.js](D:/keeta%20operations%20portal/tests/bootMode.test.js)
- [tests/headerGridLayout.test.js](D:/keeta%20operations%20portal/tests/headerGridLayout.test.js)
- [tests/runtimeContainment.test.js](D:/keeta%20operations%20portal/tests/runtimeContainment.test.js)
- [tests/runtimeIdempotency.test.js](D:/keeta%20operations%20portal/tests/runtimeIdempotency.test.js)
- [tests/runtimeLoopGuard.test.js](D:/keeta%20operations%20portal/tests/runtimeLoopGuard.test.js)
- [tests/pageRenderController.test.js](D:/keeta%20operations%20portal/tests/pageRenderController.test.js)
- [tests/pageScopedDataLoading.test.js](D:/keeta%20operations%20portal/tests/pageScopedDataLoading.test.js)
- [tests/uiLayering.test.js](D:/keeta%20operations%20portal/tests/uiLayering.test.js)
- [tests/recoveryMode.test.js](D:/keeta%20operations%20portal/tests/recoveryMode.test.js)

What they protect:

- boot flags
- topbar containment and compactness
- runtime dedupe
- render scheduling
- page-scoped hydration
- layer ordering
- recovery behavior

## Sidebar routing

Current tests:

- [tests/sidebarRouting.test.js](D:/keeta%20operations%20portal/tests/sidebarRouting.test.js)

What they protect:

- unique page/subPage route mapping
- active-state logic
- accordion behavior

## Action dropdown

Current tests:

- [tests/actionDropdown.test.js](D:/keeta%20operations%20portal/tests/actionDropdown.test.js)

What they protect:

- shared trigger/menu structure
- disabled state rendering
- explanatory RBAC text

## Details drawer

Current tests:

- [tests/detailsDrawer.test.js](D:/keeta%20operations%20portal/tests/detailsDrawer.test.js)

What they protect:

- summary block rendering
- field/section layout
- empty-state drawer behavior

## Notifications

Current tests:

- [tests/notificationCenter.test.js](D:/keeta%20operations%20portal/tests/notificationCenter.test.js)

What they protect:

- notification derivation
- read/clear flows
- separation from audit lifecycle in current implementation expectations

## Import templates and preview pipeline

Current tests:

- [tests/importTemplateRegistry.test.js](D:/keeta%20operations%20portal/tests/importTemplateRegistry.test.js)
- [tests/importTemplateRegistryColumns.test.js](D:/keeta%20operations%20portal/tests/importTemplateRegistryColumns.test.js)
- [tests/importBatchService.test.js](D:/keeta%20operations%20portal/tests/importBatchService.test.js)
- [tests/fileDetector.test.js](D:/keeta%20operations%20portal/tests/fileDetector.test.js)
- [tests/headerMapper.test.js](D:/keeta%20operations%20portal/tests/headerMapper.test.js)
- [tests/importValidator.test.js](D:/keeta%20operations%20portal/tests/importValidator.test.js)
- [tests/importRegistry.test.js](D:/keeta%20operations%20portal/tests/importRegistry.test.js)

What they protect:

- file detection
- alias/header mapping
- template registry
- preview validation
- save/reject flows
- audit-safe import lifecycle after 8.4-A

## DataStore / storage

Current tests:

- [tests/dataStore.test.js](D:/keeta%20operations%20portal/tests/dataStore.test.js)
- [tests/localDb.test.js](D:/keeta%20operations%20portal/tests/localDb.test.js)
- [tests/storageBridge.test.js](D:/keeta%20operations%20portal/tests/storageBridge.test.js)
- [tests/devDataReset.test.js](D:/keeta%20operations%20portal/tests/devDataReset.test.js)

What they protect:

- repository/store persistence
- local JSON DB behavior
- storage fallback
- reset flows

## Fleet / performance render-loop safety

Current tests:

- [tests/fleetRenderPerformance.test.js](D:/keeta%20operations%20portal/tests/fleetRenderPerformance.test.js)
- [tests/performanceProjection.test.js](D:/keeta%20operations%20portal/tests/performanceProjection.test.js)
- [tests/performanceImportIntegration.test.js](D:/keeta%20operations%20portal/tests/performanceImportIntegration.test.js)
- [tests/fleetOperationsIntegration.test.js](D:/keeta%20operations%20portal/tests/fleetOperationsIntegration.test.js)

What they protect:

- fleet derived rebuild policy
- no direct rebuilds from wrong contexts
- performance integration continuity
- fleet mutation auditing behavior

## Gaps before Prompt 8.5 / 8.6

The current suite is strong, but the redesign layer still needs more explicit interaction-to-audit protections.

### Missing direct UI/audit interaction tests

Add tests for:

- topbar render does not create audit row
- context-bar render does not create audit row
- filter typing does not create audit row
- filter reset does not create audit row
- sidebar route change does not create audit row
- notification drawer open does not create audit row
- notification filter/read/clear does not create audit row
- table pagination does not create audit row
- table density change does not create audit row
- column visibility change does not create audit row
- action dropdown open does not create audit row
- details drawer open does not create audit row

### Missing mutation bridge tests

Add tests for:

- action dropdown confirm -> exactly one audit row
- drawer save -> exactly one audit row
- confirm dialog retry -> no duplicate row because idempotency key wins
- bulk action confirm -> one audit row per true mutation contract, not per repaint

### Missing shell/navigation state tests

Add tests for:

- context selector changes global filter state without auditing
- shell route + subPage survives reload without hidden-page rendering
- safe mode banner does not appear on normal URL
- exit-safe-mode action strips query without mutating audit logs

## Recommendation before implementation

Prompt 8.5 should add these missing tests first or alongside shell refactor work, especially the UI-to-audit negative tests.

That will keep the redesign from silently reintroducing telemetry-like audit behavior.
