const assert = require("assert");

const NotificationNavigation = require("../src/notifications/notificationNavigation.js");
const NotificationRules = require("../src/notifications/notificationRules.js");
const OperationsViewModel = require("../src/operations/operationsViewModel.js");
const VerificationProfiles = require("../src/runtime/verificationProfiles.js");

const scenarioId = VerificationProfiles.SCENARIOS.PROMPT_8_10_OPS_CLEANUP;

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function getNotifications() {
  return NotificationRules.deriveNotifications(
    VerificationProfiles.applyScenarioToCollections({}, scenarioId)
  );
}

function findNotification(sourceModule, predicate) {
  return getNotifications().filter((item) => item.sourceModule === sourceModule).filter(predicate)[0] || null;
}

const results = [];

results.push(test("prompt 8.10 verification scenario resolves from the new browser profile", () => {
  assert.strictEqual(
    VerificationProfiles.resolveScenario({
      storageProfile: "prompt8_10_ops_cleanup",
      verify: "8_10"
    }),
    scenarioId
  );
}));

results.push(test("dashboard and current assignment notifications keep canonical operations targets", () => {
  const dashboardNotification = findNotification("dashboard_users", (item) => item.issueId === "new_user_needs_assignment");
  const assignmentNotification = findNotification("current_assignments", (item) => item.issueId === "assignment_duplicate_active_rider");

  assert.ok(dashboardNotification);
  assert.ok(assignmentNotification);

  const dashboardRequest = NotificationNavigation.buildNavigationRequest(dashboardNotification, { openDrawer: true });
  const assignmentRequest = NotificationNavigation.buildNavigationRequest(assignmentNotification, { openDrawer: false });

  assert.strictEqual(OperationsViewModel.normalizeOperationsRoute(dashboardRequest.linkedSubPage), "needs_assignment");
  assert.strictEqual(OperationsViewModel.normalizeOperationsRoute(assignmentRequest.linkedSubPage), "current_assignments");
  assert.ok(["assignment_seed_1", "assignment_seed_3"].includes(assignmentRequest.linkedFilters.assignmentId));
}));

results.push(test("import notifications still route to import center with batch context", () => {
  const importNotification = findNotification("import", (item) => item.id === "import_warning_batch_prompt_8_9_b_1");
  assert.ok(importNotification);

  const request = NotificationNavigation.buildNavigationRequest(importNotification, {});
  assert.strictEqual(request.linkedPage, "import-center");
  assert.strictEqual(request.linkedFilters.batchId, "batch_prompt_8_9_b_1");
  assert.strictEqual(request.linkedFilters.templateId, "dashboard_users");
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
