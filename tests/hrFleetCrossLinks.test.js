const assert = require("assert");
const fs = require("fs");
const path = require("path");

const operationsUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_operations_extension.js"),
  "utf8"
);
const hrUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_hr_extension.js"),
  "utf8"
);
const fleetUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_fleet_extension.js"),
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

results.push(test("operations dropdown includes HR and Fleet read-only cross-link actions", () => {
  [
    'dropdownAction("owner-details"',
    'dropdownAction("actual-rider-details"',
    'dropdownAction("registered-vehicle-details"',
    'dropdownAction("actual-vehicle-details"',
    'dropdownAction("vehicle-usage-history"'
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
}));

results.push(test("operations cross-links are wired through shared entry points", () => {
  [
    "openOwnerProfileFromOperations(",
    "openActualRiderProfileFromOperations(",
    "openRegisteredVehicleFromOperations(",
    "openActualVehicleFromOperations(",
    "openVehicleUsageHistoryFromOperations(",
    "Portal.HrEntryPoint.focusProfile",
    "Portal.HrEntryPoint.focusExternalRider",
    "Portal.FleetEntryPoint.focusVehicle",
    "Portal.FleetEntryPoint.focusVehicleUsageHistory"
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
}));

results.push(test("operations dropdown preserves assignment context for read-only HR/Fleet links", () => {
  [
    "buildActionContextFromDataset(dataset)",
    "attachCurrentAssignmentActionContext(rows, currentAssignmentRows)",
    "actualVehicleSummary: assignmentRow.actualVehicleSummary || row.actualVehicleSummary || \"\"",
    "vehicleUsageSummary: assignmentRow.vehicleUsageSummary || row.vehicleUsageSummary || \"\"",
    "attachCurrentAssignmentActionContext(model.dashboardUsers || [], model.currentAssignmentRows || [])",
    '"actual-vehicle-summary": row.actualVehicleSummary || ""',
    '"dashboard-vehicle-summary": row.dashboardVehicleSummary || ""',
    '"actual-rider-iqama": row.actualRiderIqama || row.currentRiderIqama || ""',
    "var linkedRow = mergeObjects({}, user || {}, assignmentRow || {}, actionContext || {});",
    "openActualVehicleFromOperations(user, linkedRow);",
    "openVehicleUsageHistoryFromOperations(user, linkedRow);"
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
}));

results.push(test("HR and Fleet modules expose focus entry points for read-only navigation", () => {
  assert.ok(hrUi.includes("Portal.HrEntryPoint.focusProfile = focusHrProfile;"));
  assert.ok(hrUi.includes("Portal.HrEntryPoint.focusExternalRider = focusExternalRider;"));
  assert.ok(fleetUi.includes("Portal.FleetEntryPoint.focusVehicle = focusFleetVehicle;"));
  assert.ok(fleetUi.includes("Portal.FleetEntryPoint.focusVehicleUsageHistory = focusFleetUsageHistory;"));
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
