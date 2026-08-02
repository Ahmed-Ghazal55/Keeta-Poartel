const assert = require("assert");

const CurrentAssignmentsViewModel = require("../src/operations/currentAssignmentsViewModel.js");
const HrViewModel = require("../src/hr/hrViewModel.js");
const FleetViewModel = require("../src/fleet/fleetViewModel.js");
const VerificationProfiles = require("../src/runtime/verificationProfiles.js");

const scenarioId = VerificationProfiles.SCENARIOS.PROMPT_8_11_HR_FLEET_CLEANUP;

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function getCollections() {
  return VerificationProfiles.applyScenarioToCollections({}, scenarioId);
}

const results = [];

results.push(test("prompt 8.11 verification scenario resolves from the browser profile", () => {
  assert.strictEqual(
    VerificationProfiles.resolveScenario({
      storageProfile: "prompt8_11_hr_fleet_cleanup",
      verify: "8_11"
    }),
    scenarioId
  );
}));

results.push(test("scenario keeps owner, actual rider, and registered vs actual vehicle separate", () => {
  const collections = getCollections();
  const rows = CurrentAssignmentsViewModel.buildCurrentAssignmentRows({
    assignments: collections.assignments,
    assignmentHistory: collections.assignmentHistory || [],
    auditLogs: collections.auditLogs || [],
    dashboardUsers: collections.dashboardUsers,
    externalRiders: collections.externalRiders || [],
    hrProfiles: collections.hrProfiles || [],
    riderOperationalProfiles: collections.riderOperationalProfiles || [],
    riderVehicleUsageHistory: collections.riderVehicleUsageHistory || [],
    riders: collections.riders || [],
    terminations: collections.terminations || []
  });
  const target = CurrentAssignmentsViewModel.findCurrentAssignmentRow(rows, "1782999000777001");
  assert.ok(target);
  assert.strictEqual(target.ownerIqama, "2444000077");
  assert.strictEqual(target.actualRiderIqama, "2999000011");
  assert.notStrictEqual(target.dashboardVehicleSummary, target.actualVehicleSummary);
  assert.ok(String(target.dashboardVehicleSummary).includes("JED-CAR-7007"));
  assert.ok(String(target.actualVehicleSummary).includes("JED-BIKE-9009"));
}));

results.push(test("scenario HR and Fleet cleanup rows expose expected support targets", () => {
  const collections = getCollections();
  const hrRows = HrViewModel.buildHrRows({
    assignmentHistory: collections.assignmentHistory || [],
    assignments: collections.assignments,
    dashboardUsers: collections.dashboardUsers,
    hrProfiles: collections.hrProfiles,
    riderOperationalProfiles: collections.riderOperationalProfiles || [],
    terminations: collections.terminations || []
  });
  const fleetRows = FleetViewModel.buildFleetRows({
    assignments: collections.assignments,
    dashboardUsers: collections.dashboardUsers,
    riderVehicleUsageHistory: collections.riderVehicleUsageHistory,
    vehicleAssignments: collections.vehicleAssignments,
    vehicleCapacityReviews: collections.vehicleCapacityReviews,
    vehicleComplianceIssues: collections.vehicleComplianceIssues,
    vehicleMovementEvents: collections.vehicleMovementEvents,
    vehicles: collections.vehicles
  });
  const ownerRow = HrViewModel.findHrRow(hrRows, { iqama: "2444000077" });
  const actualVehicleRow = FleetViewModel.findFleetRow(fleetRows, { vehicleSerial: "JED-BIKE-9009" });
  assert.ok(ownerRow);
  assert.ok(actualVehicleRow);
  assert.strictEqual(ownerRow.isOnKafala, true);
  assert.strictEqual(actualVehicleRow.ownershipType, "private");
  assert.strictEqual(actualVehicleRow.capacityStatus, "over_capacity");
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
