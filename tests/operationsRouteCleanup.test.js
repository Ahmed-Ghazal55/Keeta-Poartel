const assert = require("assert");

const OperationsViewModel = require("../src/operations/operationsViewModel.js");
const SidebarRouting = require("../src/ui/sidebarRouting.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("route aliases normalize to canonical operations tabs", () => {
  const cases = {
    "current-assignments": "current_assignments",
    "dashboard-users": "dashboard_users",
    "first-assignment": "needs_assignment",
    "operations-log": "audit_log",
    "user-status": "needs_review",
    "working-users": "working"
  };

  Object.keys(cases).forEach((alias) => {
    assert.strictEqual(OperationsViewModel.normalizeOperationsRoute(alias), cases[alias], alias);
  });
}));

results.push(test("required operations tabs remain registered and reachable", () => {
  const keys = OperationsViewModel.listOperationTabs({
    includeAudit: true,
    includeOptional: true
  }).map((item) => item.key);

  [
    "dashboard_users",
    "needs_assignment",
    "current_assignments",
    "working",
    "working_riders",
    "needs_review",
    "swaps",
    "terminations",
    "audit_log"
  ].forEach((key) => assert.ok(keys.includes(key), key));
}));

results.push(test("sidebar operations entries resolve to canonical operations subpages", () => {
  assert.strictEqual(SidebarRouting.resolveRoute("OP1").subPage, "dashboard_users");
  assert.strictEqual(SidebarRouting.resolveRoute("OP4").subPage, "needs_assignment");
  assert.strictEqual(SidebarRouting.resolveRoute("OP8").subPage, "audit_log");
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
