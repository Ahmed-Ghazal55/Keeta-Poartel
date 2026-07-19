const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createRepositories } = require("../src/data/repositories.js");
const NotificationCenter = require("../src/notifications/notificationCenter.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function buildCenter() {
  const memory = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memory,
    fallbackAdapter: memory
  });
  return NotificationCenter.createNotificationCenter({
    nowProvider: () => "2026-07-13T12:00:00.000Z",
    repositories: createRepositories(dataStore)
  });
}

const results = [];

results.push(test("derived notifications are stored from issues and audit events", () => {
  const center = buildCenter();
  center.syncDerivedNotifications({
    auditLogs: [
      { id: "audit_1", action: "monthly_rule_published", entity: "monthlyRules", entityId: "rule_1", note: "Published July rule" }
    ],
    importBatches: [
      { id: "batch_1", status: "saved", sourceFileName: "dashboard-users.xlsx", warnings: [] }
    ],
    performanceIssues: [
      { id: "perf_1", severity: "warning", message: "ATA below target" }
    ],
    vehicleComplianceIssues: [
      { id: "fleet_1", blocking: true, message: "Vehicle excluded from operations" }
    ]
  });

  const notifications = center.list();
  assert.strictEqual(notifications.length, 4);
  assert.ok(notifications.some((item) => item.id === "monthly_rule_audit_1"));
  assert.ok(notifications.some((item) => item.id === "import_saved_batch_1"));
  assert.ok(notifications.some((item) => item.id === "vehicle_issue_fleet_1"));
}));

results.push(test("notifications can be marked as read and cleared", () => {
  const center = buildCenter();
  center.upsert({
    id: "notif_1",
    severity: "info",
    source: "settings",
    title: "Saved",
    message: "Saved successfully",
    status: "unread"
  });

  center.markAsRead("notif_1", "user_1");
  assert.strictEqual(center.list({ status: "read" }).length, 1);

  center.clearRead();
  assert.strictEqual(center.list().length, 0);
}));

results.push(test("dashboard user readiness issues create notifications without audit coupling", () => {
  const center = buildCenter();
  center.syncDerivedNotifications({
    dashboardUsers: [{
      assignmentReadinessIssues: ["new_user_needs_assignment", "owner_not_found_in_hr"],
      dashboardUserId: "1782999000333001",
      fullName: "Salem Nasser",
      lifecycleStatus: "new",
      platform: "keeta",
      register: "EXPRESS"
    }]
  });

  const notifications = center.list();
  assert.ok(notifications.some((item) => item.source === "operations" && item.sourceEntity === "dashboardUsers"));
  assert.ok(notifications.some((item) => item.issueId === "new_user_needs_assignment" || item.issueId === "owner_not_found_in_hr"));
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
