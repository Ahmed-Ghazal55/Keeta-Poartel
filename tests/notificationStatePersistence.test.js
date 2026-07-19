const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createRepositories } = require("../src/data/repositories.js");
const NotificationCenter = require("../src/notifications/notificationCenter.js");
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

results.push(test("read state survives deterministic re-derivation", () => {
  const { center } = buildCenter();
  const payload = {
    dashboardUsers: [buildDashboardUser({
      dashboardUserId: "7001",
      userId: "7001",
      assignmentReadinessIssues: ["new_user_needs_assignment"],
      lifecycleStatus: "new"
    })]
  };

  center.syncDerivedNotifications(payload);
  center.markAsRead("dashboard_issue_7001_new_user_needs_assignment", "ops-admin");
  center.syncDerivedNotifications(payload);

  const notification = center.findById("dashboard_issue_7001_new_user_needs_assignment");
  assert.ok(notification);
  assert.strictEqual(notification.status, "read");
  assert.strictEqual(notification.readBy, "ops-admin");
}));

results.push(test("mark unread, seen, and opened update UI state without duplication", () => {
  const { center } = buildCenter();
  const payload = {
    dashboardUsers: [buildDashboardUser({
      dashboardUserId: "7002",
      userId: "7002",
      assignmentReadinessIssues: ["owner_not_found_in_hr"],
      ownerIqama: "2444007002",
      lifecycleStatus: "needs_review"
    })]
  };

  center.syncDerivedNotifications(payload);
  center.markAsSeen(["dashboard_issue_7002_owner_not_found_in_hr"]);
  center.markAsOpened("dashboard_issue_7002_owner_not_found_in_hr");
  center.markAsRead("dashboard_issue_7002_owner_not_found_in_hr", "ops-admin");
  center.markAsUnread("dashboard_issue_7002_owner_not_found_in_hr");
  center.syncDerivedNotifications(payload);

  const items = center.list({ status: "all", includeResolved: true, includeHidden: true });
  const notification = center.findById("dashboard_issue_7002_owner_not_found_in_hr");
  assert.strictEqual(items.filter((item) => item.id === "dashboard_issue_7002_owner_not_found_in_hr").length, 1);
  assert.strictEqual(notification.status, "unread");
  assert.ok(notification.lastSeenAt);
  assert.ok(notification.lastOpenedAt);
}));

results.push(test("disappearing derived notifications resolve and can re-open on reappearance", () => {
  const { center } = buildCenter();
  const payload = {
    dashboardUsers: [buildDashboardUser({
      dashboardUserId: "7003",
      userId: "7003",
      assignmentReadinessIssues: ["user_pending_review"],
      lifecycleStatus: "pending_review"
    })]
  };

  center.syncDerivedNotifications(payload);
  center.syncDerivedNotifications({});
  let notification = center.findById("dashboard_issue_7003_user_pending_review");
  assert.strictEqual(notification.status, "resolved");

  center.syncDerivedNotifications(payload);
  notification = center.findById("dashboard_issue_7003_user_pending_review");
  assert.strictEqual(notification.status, "unread");
  assert.strictEqual(center.list().filter((item) => item.id === "dashboard_issue_7003_user_pending_review").length, 1);
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
