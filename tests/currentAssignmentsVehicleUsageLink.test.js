const assert = require("assert");
const { createAssignmentService } = require("../src/operations/assignmentService.js");
const { createSwapService } = require("../src/operations/swapService.js");
const { createTerminationService } = require("../src/operations/terminationService.js");
const CurrentAssignmentsViewModel = require("../src/operations/currentAssignmentsViewModel.js");
const {
  buildAssignment,
  buildDashboardUser,
  buildRider,
  buildVehicleUsage,
  createOperationsAdmin,
  createOrganizationContext,
  createRuntime,
} = require("./helpers/operationsTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function createServices(seed) {
  const runtime = createRuntime(seed);
  return {
    assignmentService: createAssignmentService(runtime),
    runtime,
    swapService: createSwapService(runtime),
    terminationService: createTerminationService(runtime),
  };
}

const results = [];

results.push(test("first assignment opens vehicle usage period when vehicle details exist", () => {
  const { assignmentService, runtime } = createServices({
    dashboardUsers: [buildDashboardUser({ dashboardUserId: "8301" })],
    riders: [buildRider({ id: "rider-8301", primaryIqama: "2999830101" })],
  });

  const result = assignmentService.assignRider({
    dashboardUserId: "8301",
    actualVehicle: "Toyota Yaris",
    iqama: "2999830101",
    riderId: "rider-8301",
    riderName: "Vehicle Rider 8301",
    startDate: "2026-07-20",
    riderReceiveDate: "2026-07-20",
    user: createOperationsAdmin(),
    vehicleSerial: "VH-8301",
    vehicleType: "car",
    plateNumber: "JED-8301",
    organizationContext: createOrganizationContext(),
  });

  assert.strictEqual(result.vehicleUsage.opened.active, true);
  assert.strictEqual(runtime.dataStore.getAll("riderVehicleUsageHistory").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riderVehicleUsageHistory")[0].vehicleSerial, "VH-8301");
}));

results.push(test("swap closes old vehicle usage and opens new usage when vehicle changes", () => {
  const { runtime, swapService } = createServices({
    assignments: [
      buildAssignment({
        id: "assignment-8302-old",
        assignmentId: "assignment-8302-old",
        dashboardUserId: "8302",
        riderId: "rider-old-8302",
        riderIqama: "2999830201",
        actualRiderIqama: "2999830201",
        vehicleSerial: "OLD-8302",
        plateNumber: "OLD-PLATE-8302",
      }),
    ],
    dashboardUsers: [
      buildDashboardUser({
        dashboardUserId: "8302",
        currentRiderId: "rider-old-8302",
        currentRiderIqama: "2999830201",
        currentAssignmentId: "assignment-8302-old",
        assignmentStatus: "active",
        status: "assigned",
      }),
    ],
    riderVehicleUsageHistory: [
      buildVehicleUsage({
        id: "usage-8302-old",
        riderIqama: "2999830201",
        vehicleSerial: "OLD-8302",
        plateNumber: "OLD-PLATE-8302",
      }),
    ],
    riders: [
      buildRider({ id: "rider-old-8302", primaryIqama: "2999830201" }),
      buildRider({ id: "rider-new-8302", primaryIqama: "2999830202" }),
    ],
  });

  const result = swapService.swapRider({
    dashboardUserId: "8302",
    previousRiderId: "rider-old-8302",
    newRiderId: "rider-new-8302",
    newRiderIqama: "2999830202",
    newRiderName: "New Vehicle Rider 8302",
    swapDate: "2026-07-21",
    riderReceiveDate: "2026-07-21",
    user: createOperationsAdmin(),
    vehicleSerial: "NEW-8302",
    plateNumber: "NEW-PLATE-8302",
    vehicleType: "car",
    organizationContext: createOrganizationContext(),
  });

  assert.strictEqual(result.vehicleUsage.closed.length, 1);
  assert.strictEqual(result.vehicleUsage.closed[0].active, false);
  assert.strictEqual(result.vehicleUsage.opened.vehicleSerial, "NEW-8302");
  assert.strictEqual(runtime.dataStore.getAll("riderVehicleUsageHistory").filter((item) => item.active === true).length, 1);
}));

results.push(test("stop closes active vehicle usage and missing company vehicle falls back safely in display", () => {
  const { runtime, terminationService } = createServices({
    assignments: [
      buildAssignment({
        id: "assignment-8303",
        assignmentId: "assignment-8303",
        dashboardUserId: "8303",
        riderId: "rider-8303",
        riderIqama: "2999830301",
        actualRiderIqama: "2999830301",
      }),
    ],
    dashboardUsers: [
      buildDashboardUser({
        dashboardUserId: "8303",
        currentRiderId: "rider-8303",
        currentRiderIqama: "2999830301",
        currentAssignmentId: "assignment-8303",
        assignmentStatus: "active",
        status: "assigned",
      }),
    ],
    riderVehicleUsageHistory: [
      buildVehicleUsage({
        id: "usage-8303",
        riderIqama: "2999830301",
        vehicleSerial: "VH-8303",
        plateNumber: "JED-8303",
      }),
    ],
    riders: [
      buildRider({ id: "rider-8303", primaryIqama: "2999830301" }),
    ],
  });

  const result = terminationService.terminateUser({
    dashboardUserId: "8303",
    action: "stop_without_replacement",
    reason: "vehicle usage closure",
    terminationDate: "2026-07-22",
    user: createOperationsAdmin(),
    organizationContext: createOrganizationContext(),
  });

  const rows = CurrentAssignmentsViewModel.buildCurrentAssignmentRows({
    assignments: [
      buildAssignment({
        id: "assignment-display-8304",
        assignmentId: "assignment-display-8304",
        dashboardUserId: "8304",
        riderId: "rider-8304",
        riderIqama: "2999830401",
        actualRiderIqama: "2999830401",
        actualVehicle: "Private Sedan",
        vehicleSerial: "",
        plateNumber: "",
        assignmentStatus: "active",
      }),
    ],
    auditLogs: [],
    dashboardUsers: [
      buildDashboardUser({
        dashboardUserId: "8304",
        ownerIqama: "2444830404",
        ownerName: "Owner 8304",
        currentRiderId: "rider-8304",
        currentRiderIqama: "2999830401",
        currentAssignmentId: "assignment-display-8304",
        assignmentStatus: "active",
        vehicleSerial: "",
        plateNumber: "",
      }),
    ],
    externalRiders: [],
    hrProfiles: [
      { id: "hr-owner-8304", iqama: "2444830404", fullNameArabic: "Owner 8304", hrStatus: "active" },
    ],
    riderOperationalProfiles: [],
    riderVehicleUsageHistory: [],
    riders: [
      buildRider({ id: "rider-8304", primaryIqama: "2999830401", displayName: "Private Rider 8304" }),
    ],
    terminations: [],
  });

  assert.strictEqual(result.vehicleUsage.length, 1);
  assert.strictEqual(result.vehicleUsage[0].active, false);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].vehicleCompanyStatus, "private");
  assert.ok(rows[0].actualVehicleSummary.includes("Private Sedan"));
}));

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length,
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
