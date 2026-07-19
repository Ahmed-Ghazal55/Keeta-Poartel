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

function includes(text) {
  return operationsUi.indexOf(text) >= 0;
}

const results = [];

results.push(test("dashboard user dropdown includes the required Prompt 8.7 actions", () => {
  [
    'dropdownAction("details"',
    'dropdownAction("assign"',
    'dropdownAction("swap"',
    'dropdownAction("stop"',
    'dropdownAction("terminate"',
    'dropdownAction("history"',
    'dropdownAction("actual-rider-details"',
    'dropdownAction("owner-details"',
    'dropdownAction("resolver"',
    'dropdownAction("source-batch"'
  ].forEach((needle) => assert.ok(includes(needle), needle));
}));

results.push(test("read-only row actions route to drawer views and not direct audit calls", () => {
  [
    'if (action === "history") {',
    'if (action === "actual-rider-details") {',
    'if (action === "owner-details") {',
    'if (action === "resolver") {',
    'if (action === "source-batch") {',
    'state.drawerMode = "details";'
  ].forEach((needle) => assert.ok(includes(needle), needle));
  assert.ok(!includes("createAuditEvent("));
  assert.ok(!includes("recordAuditEvent("));
}));

results.push(test("mutating dashboard actions still go through service-layer workflows", () => {
  [
    "assignmentService.assignRider({",
    "swapService.swapRider({",
    "terminationService.terminateUser({"
  ].forEach((needle) => assert.ok(includes(needle), needle));
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
