const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createRepositories } = require("../src/data/repositories.js");
const NotificationCenter = require("../src/notifications/notificationCenter.js");
const {
  buildAssignment,
  buildDashboardUser,
} = require("./helpers/operationsTestHelpers.js");

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
  dataStore.seedCollections({
    auditLogs: [],
    notifications: []
  });
  return {
    center: NotificationCenter.createNotificationCenter({
      nowProvider: () => "2026-07-15T12:00:00.000Z",
      repositories: createRepositories(dataStore)
    }),
    dataStore
  };
}

const results = [];

results.push(test("current assignment issues derive notifications without creating audit rows", () => {
  const { center, dataStore } = buildCenter();
  center.syncDerivedNotifications({
    assignments: [
      buildAssignment({
        id: "assignment-ntf-1",
        assignmentId: "assignment-ntf-1",
        dashboardUserId: "6101",
        courierId: "6101",
        userId: "6101",
        riderId: "rider-dup",
        riderIqama: "2999006101",
        actualRiderIqama: "2999006101",
        actualRiderName: "Rider Duplicate"
      }),
      buildAssignment({
        id: "assignment-ntf-2",
        assignmentId: "assignment-ntf-2",
        dashboardUserId: "6102",
        courierId: "6102",
        userId: "6102",
        riderId: "rider-dup",
        riderIqama: "2999006101",
        actualRiderIqama: "2999006101",
        actualRiderName: "Rider Duplicate"
      })
    ],
    auditLogs: [],
    dashboardUsers: [
      buildDashboardUser({
        dashboardUserId: "6101",
        userId: "6101",
        ownerIqama: "2444006101",
        currentRiderId: "rider-dup",
        currentRiderIqama: "2999006101",
        currentAssignmentId: "assignment-ntf-1",
        assignmentStatus: "active",
        status: "working",
      }),
      buildDashboardUser({
        dashboardUserId: "6102",
        userId: "6102",
        ownerIqama: "2444006102",
        currentRiderId: "rider-dup",
        currentRiderIqama: "2999006101",
        currentAssignmentId: "assignment-ntf-2",
        assignmentStatus: "active",
        status: "working",
      })
    ],
    externalRiders: [],
    hrProfiles: [],
    importBatches: [],
    operationalStatusReviews: [],
    performanceIssues: [],
    riderOperationalProfiles: [],
    riderVehicleUsageHistory: [],
    riders: [],
    terminations: [],
    vehicleComplianceIssues: [],
  });

  const notifications = center.list();
  assert.ok(notifications.some((item) => item.id === "assignment_issue_6101_assignment_duplicate_active_rider"));
  assert.ok(notifications.some((item) => item.id === "assignment_issue_6102_assignment_owner_missing_hr"));
  assert.ok(notifications.some((item) => item.severity === "critical"));
  assert.strictEqual(dataStore.getAll("auditLogs").length, 0);
}));

results.push(test("assignment issue notifications keep operations routing metadata", () => {
  const { center } = buildCenter();
  center.syncDerivedNotifications({
    assignments: [
      buildAssignment({
        id: "assignment-ntf-3",
        assignmentId: "assignment-ntf-3",
        dashboardUserId: "6201",
        courierId: "6201",
        userId: "6201",
        actualRiderIqama: "",
        riderIqama: "",
        actualRiderName: "",
      })
    ],
    auditLogs: [],
    dashboardUsers: [
      buildDashboardUser({
        dashboardUserId: "6201",
        userId: "6201",
        currentRiderId: "",
        currentRiderIqama: "",
        currentAssignmentId: "assignment-ntf-3",
        assignmentStatus: "active",
        status: "working",
      })
    ],
    externalRiders: [],
    hrProfiles: [],
    importBatches: [],
    operationalStatusReviews: [],
    performanceIssues: [],
    riderOperationalProfiles: [],
    riderVehicleUsageHistory: [],
    riders: [],
    terminations: [],
    vehicleComplianceIssues: [],
  });

  const notification = center.list().filter((item) => item.id === "assignment_issue_6201_assignment_missing_actual_rider")[0];
  assert.ok(notification);
  assert.strictEqual(notification.source, "operations");
  assert.strictEqual(notification.actionPage, "operations-shell");
  assert.strictEqual(notification.actionTarget, "6201");
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
