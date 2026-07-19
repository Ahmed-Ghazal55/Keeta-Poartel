const assert = require("assert");

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
  const summary = results.reduce((memo, item) => {
    memo.total += 1;
    if (item.status === "passed") {
      memo.passed += 1;
    } else {
      memo.failed += 1;
    }
    return memo;
  }, { total: 0, passed: 0, failed: 0 });
  return summary;
}

function deriveScenarioNotifications() {
  const payload = VerificationProfiles.applyScenarioToCollections({}, scenarioId);
  return {
    notifications: NotificationRules.deriveNotifications(payload),
    payload
  };
}

const results = [];

results.push(test("prompt 8.9-B scenario resolves only for the isolated verification profile", () => {
  assert.strictEqual(
    VerificationProfiles.resolveScenario({ storageProfile: "prompt8_9_b_ops_notifications", verify: "8_9_b" }),
    scenarioId
  );
  assert.strictEqual(
    VerificationProfiles.resolveScenario({ storageProfile: "prompt8_9_b_ops_notifications", verify: "8_9_b_final" }),
    scenarioId
  );
  assert.strictEqual(
    VerificationProfiles.resolveScenario({ storageProfile: "default_runtime", verify: "8_9_b" }),
    ""
  );
}));

results.push(test("prompt 8.9-B scenario derives live dashboard, current assignment, and import notifications", () => {
  const { notifications } = deriveScenarioNotifications();
  assert.ok(notifications.some((item) => item.sourceModule === "dashboard_users"));
  assert.ok(notifications.some((item) => item.sourceModule === "current_assignments"));
  assert.ok(notifications.some((item) => item.sourceModule === "import"));
}));

results.push(test("prompt 8.9-B scenario uses real derived sources instead of seeded notifications", () => {
  const { notifications, payload } = deriveScenarioNotifications();
  assert.deepStrictEqual(payload.notifications, []);
  assert.ok(notifications.some((item) => item.issueId === "new_user_needs_assignment"));
  assert.ok(notifications.some((item) => item.issueId === "assignment_duplicate_active_rider"));
  assert.ok(notifications.some((item) => item.importBatchId === "batch_prompt_8_9_b_1"));
}));

const summary = summarize(results);
console.log(JSON.stringify({ summary, results }, null, 2));
if (summary.failed > 0) {
  process.exit(1);
}
