const assert = require("assert");
const AuditPolicy = require("../src/audit/auditPolicy.js");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createRepositories } = require("../src/data/repositories.js");
const NotificationCenter = require("../src/notifications/notificationCenter.js");
const Navigation = require("../src/notifications/notificationNavigation.js");
const { buildDashboardUser } = require("./helpers/operationsTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function buildCenter() {
  const memoryStore = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memoryStore,
    fallbackAdapter: memoryStore
  });
  dataStore.seedCollections({
    auditLogs: [],
    notifications: []
  });
  return {
    center: NotificationCenter.createNotificationCenter({
      nowProvider: () => "2026-07-16T08:00:00.000Z",
      repositories: createRepositories(dataStore)
    }),
    dataStore
  };
}

const results = [];

results.push(test("notification sync and read-state actions do not create audit rows", () => {
  const { center, dataStore } = buildCenter();
  center.syncDerivedNotifications({
    dashboardUsers: [buildDashboardUser({
      dashboardUserId: "8001",
      userId: "8001",
      assignmentReadinessIssues: ["new_user_needs_assignment"],
      lifecycleStatus: "new"
    })]
  });
  center.markAsRead("dashboard_issue_8001_new_user_needs_assignment", "ops-admin");
  center.markAsUnread("dashboard_issue_8001_new_user_needs_assignment");
  center.markAsSeen(["dashboard_issue_8001_new_user_needs_assignment"]);
  center.markAsOpened("dashboard_issue_8001_new_user_needs_assignment");

  assert.strictEqual(dataStore.getAll("auditLogs").length, 0);
}));

results.push(test("notification navigation remains read-only and audit policy rejects it as business audit", () => {
  const events = [];
  const navigator = Navigation.createNotificationNavigator({
    dispatchEvent: (eventName, detail) => {
      events.push({ eventName, detail });
    },
    getUiShell: () => ({
      openPage: () => true
    })
  });

  navigator.navigate({
    id: "notification-9",
    linkedPage: "operations-shell",
    linkedSubPage: "current_assignments",
    linkedFilters: {
      query: "6101 2999006101"
    }
  }, {
    openDrawer: true
  });

  const record = AuditPolicy.classifyAuditRecord({
    action: "assignment_updated",
    actorUserId: "viewer",
    entity: "assignments",
    entityId: "assignment-1",
    reason: "Notification navigation open drawer",
    source: "notification_navigation"
  });

  assert.strictEqual(events.length, 1);
  assert.strictEqual(record.isPhantom, true);
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
