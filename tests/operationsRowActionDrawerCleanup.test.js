const assert = require("assert");
const fs = require("fs");
const path = require("path");

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

results.push(test("linked row actions are routed through operations focus navigation", () => {
  [
    "function handleLinkedOperationsAction(action, user, assignmentRow)",
    'linkedSubPage: action === "linked-current-assignment" ? "current_assignments" : "dashboard_users"',
    "focusOperationsView(detail, {",
    "openPage: true"
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
}));

results.push(test("safe row action rendering uses actual rider fallback and stays UI-only", () => {
  [
    "function renderActionButtonsSafe(row, user)",
    '\"rider-id\": row.actualRiderId || row.currentRiderId || ""',
    "function buildDropdownActionsSafe(row, user)",
    "function renderActionButtonSafe(action, label, row, allowed, deniedReason)"
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));

  assert.ok(!operationsUi.includes("createAuditEvent("));
  assert.ok(!operationsUi.includes("recordAuditEvent("));
}));

results.push(test("dropdown keeps the required operations actions after cleanup", () => {
  [
    'dropdownAction("linked-dashboard-user"',
    'dropdownAction("linked-current-assignment"',
    'dropdownAction("details"',
    'dropdownAction("assign"',
    'dropdownAction("swap"',
    'dropdownAction("stop"',
    'dropdownAction("terminate"',
    'dropdownAction("history"',
    'dropdownAction("actual-rider-details"',
    'dropdownAction("owner-details"',
    'dropdownAction("resolver"',
    'dropdownAction("source-batch"',
    'dropdownAction("rider-archive"'
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
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
