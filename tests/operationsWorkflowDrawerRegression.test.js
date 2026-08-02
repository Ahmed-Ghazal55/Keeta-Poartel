const assert = require("assert");
const fs = require("fs");
const path = require("path");

const AuditPolicy = require("../src/audit/auditPolicy.js");

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

results.push(test("first assignment drawer keeps all required operational fields", () => {
  [
    "opsAssignIqama",
    "opsAssignRiderName",
    "opsAssignOperationMode",
    "opsAssignReceiveDate",
    "opsAssignFirstOnlineDate",
    "opsAssignPlateNumber",
    "opsAssignVehicleSerial",
    "opsAssignSupervisor",
    "opsAssignForm"
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
}));

results.push(test("swap and termination drawers keep their required workflow fields", () => {
  [
    "opsSwapIqama",
    "opsSwapRiderName",
    "opsSwapOperationMode",
    "opsSwapReceiveDate",
    "opsSwapFirstOnlineDate",
    "opsSwapPlateNumber",
    "opsSwapVehicleSerial",
    "opsSwapSupervisor",
    "opsSwapForm",
    "opsTerminationAction",
    "opsTerminationDate",
    "opsTerminationReason",
    "opsTerminationForm"
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
}));

results.push(test("workflow drawer open remains phantom while mutations stay service-layer driven", () => {
  const drawerOpen = AuditPolicy.classifyAuditRecord({
    action: "assignment_updated",
    entity: "assignments",
    entityId: "assignment-workflow-1",
    reason: "Opened workflow drawer",
    source: "drawer_open"
  });

  assert.strictEqual(drawerOpen.isPhantom, true);
  [
    "assignmentService.assignRider({",
    "swapService.swapRider({",
    "terminationService.terminateUser({"
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
