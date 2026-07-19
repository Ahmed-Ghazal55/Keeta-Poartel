const assert = require("assert");
const Mapping = require("../src/notifications/notificationSourceMapping.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("dashboard readiness issue maps to operations assignment route", () => {
  const notification = Mapping.mapDashboardUserIssue("new_user_needs_assignment", {
    dashboardUserId: "1782999000333001",
    fullName: "Salem Nasser",
    ownerIqama: "2444000033",
    city: "جدة",
    register: "ALBAWABA",
    platform: "keeta"
  });

  assert.ok(notification);
  assert.strictEqual(notification.linkedPage, "operations-shell");
  assert.strictEqual(notification.linkedSubPage, "needs_assignment");
  assert.strictEqual(notification.linkedDrawer, "assign");
  assert.strictEqual(notification.severity, "warning");
  assert.strictEqual(notification.linkedFilters.courierId, "1782999000333001");
}));

results.push(test("current assignment alias issue maps to current assignments route", () => {
  const notification = Mapping.mapCurrentAssignmentIssue("duplicate_active_rider", {
    assignmentId: "assignment-1",
    dashboardUserId: "6101",
    actualRiderIqama: "2999006101",
    ownerIqama: "2444006101",
    city: "جدة",
    register: "EXPRESS",
    platform: "keeta"
  });

  assert.ok(notification);
  assert.strictEqual(notification.issueId, "assignment_duplicate_active_rider");
  assert.strictEqual(notification.linkedPage, "operations-shell");
  assert.strictEqual(notification.linkedSubPage, "current_assignments");
  assert.strictEqual(notification.severity, "critical");
  assert.strictEqual(notification.linkedFilters.actualRiderIqama, "2999006101");
}));

results.push(test("import warning notifications carry batch routing metadata", () => {
  const notifications = Mapping.mapImportBatchNotifications({
    id: "batch-77",
    city: "الرياض",
    register: "TOGARY",
    sourceFileName: "current-assignments.xlsx",
    status: "saved",
    targetEntity: "assignments",
    templateId: "current_assignments",
    type: "current_assignments",
    warnings: ["partial_headers"]
  });

  const warning = notifications.filter((item) => item.id === "import_warning_batch-77")[0];
  const saved = notifications.filter((item) => item.id === "import_saved_batch-77")[0];
  assert.ok(warning);
  assert.ok(saved);
  assert.strictEqual(warning.linkedPage, "import-center");
  assert.strictEqual(warning.importBatchId, "batch-77");
  assert.strictEqual(warning.linkedFilters.batchId, "batch-77");
  assert.strictEqual(saved.severity, "success");
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
