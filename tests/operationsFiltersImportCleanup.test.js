const assert = require("assert");
const fs = require("fs");
const path = require("path");

const LifecycleRegistry = require("../src/data/lifecycleRegistry.js");
const OperationsViewModel = require("../src/operations/operationsViewModel.js");

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

results.push(test("filter visibility is scoped by operations tab family", () => {
  const dashboardFilters = OperationsViewModel.getVisibleFilterKeys("dashboard_users");
  const assignmentFilters = OperationsViewModel.getVisibleFilterKeys("current_assignments");
  const riderFilters = OperationsViewModel.getVisibleFilterKeys("working_riders");

  assert.ok(dashboardFilters.includes("lifecycleStatus"));
  assert.ok(dashboardFilters.includes("assignmentReadiness"));
  assert.ok(!dashboardFilters.includes("assignmentStatus"));

  assert.ok(assignmentFilters.includes("assignmentStatus"));
  assert.ok(assignmentFilters.includes("riderSource"));
  assert.ok(!assignmentFilters.includes("lifecycleStatus"));

  assert.deepStrictEqual(riderFilters, ["search"]);
}));

results.push(test("operations import routes resolve correctly and are exposed only on relevant tabs", () => {
  const dashboardImport = LifecycleRegistry.resolveImportRoute("dashboard_users_import");
  const currentAssignmentsImport = LifecycleRegistry.resolveImportRoute("current_assignments_import");

  assert.strictEqual(dashboardImport.pageKey, "operations-shell");
  assert.strictEqual(currentAssignmentsImport.pageKey, "operations-shell");
  assert.deepStrictEqual(
    OperationsViewModel.getImportButtons("dashboard_users"),
    ["dashboard_users_import", "current_assignments_import"]
  );
  assert.deepStrictEqual(OperationsViewModel.getImportButtons("working_riders"), []);
}));

results.push(test("operations UI uses scoped filters and shared import buttons without direct mutations", () => {
  [
    "getVisibleFilterKeys(state.activeTab)",
    "getImportButtons(state.activeTab)",
    "renderOperationsImportButtons(importButtons)",
    "ops-toolbar--filters",
    'id="opsLifecycleFilter"',
    'id="opsAssignmentStatusFilter"'
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));

  assert.ok(!operationsUi.includes("createAuditEvent("));
  assert.ok(!operationsUi.includes("recordAuditEvent("));
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
