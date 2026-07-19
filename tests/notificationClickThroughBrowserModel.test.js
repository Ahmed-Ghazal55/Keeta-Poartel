const assert = require("assert");

const NotificationNavigation = require("../src/notifications/notificationNavigation.js");
const NotificationRules = require("../src/notifications/notificationRules.js");
const VerificationProfiles = require("../src/runtime/verificationProfiles.js");

const scenarioId = VerificationProfiles.SCENARIOS.PROMPT_8_9_B_OPS_NOTIFICATIONS;

function test(name, fn) {
  try {
    fn();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error && error.message ? error.message : String(error) };
  }
}

function summarize(results) {
  return results.reduce((memo, item) => {
    memo.total += 1;
    if (item.status === "passed") {
      memo.passed += 1;
    } else {
      memo.failed += 1;
    }
    return memo;
  }, { total: 0, passed: 0, failed: 0 });
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

results.push(test("dashboard users click-through model keeps readiness and scope filters", () => {
  const notification = findNotification("dashboard_users", (item) => item.issueId === "new_user_needs_assignment");
  assert.ok(notification);
  const request = NotificationNavigation.buildNavigationRequest(notification, { openDrawer: true });
  assert.strictEqual(request.linkedPage, "operations-shell");
  assert.strictEqual(request.linkedSubPage, "needs_assignment");
  assert.strictEqual(request.linkedDrawer, "assign");
  assert.strictEqual(request.linkedFilters.courierId, "1782999000333001");
  assert.strictEqual(request.linkedFilters.assignmentReadiness, "ready_for_assignment");
  assert.strictEqual(request.linkedFilters.readinessStatus, "ready_for_assignment");
}));

results.push(test("current assignments click-through model keeps rider and assignment focus", () => {
  const notification = findNotification("current_assignments", (item) => {
    return item.issueId === "assignment_duplicate_active_rider" && item.courierId === "1782916129257495";
  });
  assert.ok(notification);
  const request = NotificationNavigation.buildNavigationRequest(notification, { openDrawer: false });
  assert.strictEqual(request.linkedPage, "operations-shell");
  assert.strictEqual(request.linkedSubPage, "current_assignments");
  assert.strictEqual(request.linkedFilters.actualRiderIqama, "2444000011");
  assert.strictEqual(request.linkedFilters.assignmentId, "assignment_seed_1");
  assert.strictEqual(request.linkedFilters.courierId, "1782916129257495");
}));

results.push(test("import click-through model keeps batch and template context", () => {
  const notification = findNotification("import", (item) => item.id === "import_warning_batch_prompt_8_9_b_1");
  assert.ok(notification);
  const request = NotificationNavigation.buildNavigationRequest(notification, {});
  assert.strictEqual(request.linkedPage, "import-center");
  assert.strictEqual(request.linkedFilters.batchId, "batch_prompt_8_9_b_1");
  assert.strictEqual(request.linkedFilters.importType, "dashboard_users");
  assert.strictEqual(request.linkedFilters.templateId, "dashboard_users");
}));

const summary = summarize(results);
console.log(JSON.stringify({ summary, results }, null, 2));
if (summary.failed > 0) {
  process.exit(1);
}
