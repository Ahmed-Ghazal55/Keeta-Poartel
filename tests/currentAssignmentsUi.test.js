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

results.push(test("current assignments tabs and filters exist in operations UI", () => {
  [
    "var normalizeOperationMode =",
    'current_assignments',
    'per_order',
    'salary',
    'external_mode',
    'replacement',
    'stopped',
    'id="opsAssignmentStatusFilter"',
    'id="opsRiderSourceFilter"',
    'id="opsSupervisorFilter"'
  ].forEach((needle) => assert.ok(includes(needle), needle));
}));

results.push(test("current assignments table includes operational columns and safe actions", () => {
  [
    "<th>Courier ID</th>",
    "Actual Rider",
    "Vehicle",
    "Operation Mode",
    "renderCurrentAssignmentsTable(",
    "renderCurrentAssignmentRow(",
    'dropdownAction("history"',
    'dropdownAction("actual-rider-details"',
    'dropdownAction("owner-details"',
    'dropdownAction("resolver"',
    'dropdownAction("source-batch"'
  ].forEach((needle) => assert.ok(includes(needle), needle));
}));

results.push(test("assignment and swap drawers expose current assignment operational fields", () => {
  [
    'opsAssignReceiveDate',
    'opsAssignFirstOnlineDate',
    'opsAssignOperationMode',
    'opsAssignActualVehicle',
    'opsAssignVehicleType',
    'opsAssignPlateNumber',
    'opsAssignVehicleSerial',
    'opsAssignSupervisor',
    'opsSwapReceiveDate',
    'opsSwapFirstOnlineDate',
    'opsSwapOperationMode',
    'opsSwapActualVehicle',
    'opsSwapVehicleType',
    'opsSwapPlateNumber',
    'opsSwapVehicleSerial',
    'opsSwapSupervisor'
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
