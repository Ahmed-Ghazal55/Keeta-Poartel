const assert = require("assert");
const fs = require("fs");
const path = require("path");
const AuditPolicy = require("../src/audit/auditPolicy.js");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createRepositories } = require("../src/data/repositories.js");
const NotificationCenter = require("../src/notifications/notificationCenter.js");
const { buildDashboardUser } = require("./helpers/operationsTestHelpers.js");

const operationsUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_operations_extension.js"),
  "utf8"
);

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("dashboard user notifications derive without creating audit rows", () => {
  const memoryStore = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memoryStore,
    fallbackAdapter: memoryStore
  });
  const notificationCenter = NotificationCenter.createNotificationCenter({
    nowProvider: () => "2026-07-15T12:00:00.000Z",
    repositories: createRepositories(dataStore)
  });

  dataStore.save("auditLogs", []);
  notificationCenter.syncDerivedNotifications({
    dashboardUsers: [buildDashboardUser({
      assignmentReadinessIssues: ["new_user_needs_assignment", "accepted_user_without_assignment"],
      lifecycleStatus: "new"
    })]
  });

  assert.ok(notificationCenter.list().length >= 1);
  assert.strictEqual(dataStore.getAll("auditLogs").length, 0);
}));

results.push(test("audit policy rejects drawer, route, and filter based dashboard read-only events", () => {
  const drawerOpen = AuditPolicy.classifyAuditRecord({
    action: "dashboard_user_updated",
    actorUserId: "viewer",
    entity: "dashboardUsers",
    entityId: "1001",
    reason: "Opened details drawer",
    source: "drawer_open"
  });
  const routeOpen = AuditPolicy.classifyAuditRecord({
    action: "dashboard_user_updated",
    actorUserId: "viewer",
    entity: "dashboardUsers",
    entityId: "1001",
    reason: "Route change to dashboard users",
    source: "route_change"
  });
  const filterSearch = AuditPolicy.classifyAuditRecord({
    action: "dashboard_user_updated",
    actorUserId: "viewer",
    entity: "dashboardUsers",
    entityId: "1001",
    reason: "Search filter update",
    source: "filter_input"
  });

  assert.strictEqual(drawerOpen.isPhantom, true);
  assert.strictEqual(routeOpen.isPhantom, true);
  assert.strictEqual(filterSearch.isPhantom, true);
}));

results.push(test("operations dashboard UI does not create audit rows directly for read-only interactions", () => {
  assert.ok(!operationsUi.includes("createAuditEvent("));
  assert.ok(!operationsUi.includes("recordAuditEvent("));
  [
    'if (action === "details") {',
    'if (action === "history") {',
    'if (action === "actual-rider-details") {',
    'if (action === "owner-details") {',
    'if (action === "resolver") {',
    'if (action === "source-batch") {'
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
}));

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
