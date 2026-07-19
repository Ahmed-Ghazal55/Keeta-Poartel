const assert = require("assert");
const { createSwapService } = require("../src/operations/swapService.js");
const {
  CITY_JEDDAH,
  CITY_RIYADH,
  buildAssignment,
  buildDashboardUser,
  buildRider,
  buildVehicleUsage,
  createCitySupervisor,
  createOperationsAdmin,
  createOrganizationContext,
  createRuntime,
  createViewer,
} = require("./helpers/operationsTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function createService(seed) {
  const runtime = createRuntime(seed);
  return {
    service: createSwapService(runtime),
    runtime,
  };
}

const results = [];

results.push(test("swaps active rider and keeps history", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "1001",
    currentRiderId: "rider-old",
    currentRiderIqama: "299900001",
    currentAssignmentId: "assignment-old",
    assignmentStatus: "active",
    status: "assigned",
  });
  const oldRider = buildRider({ id: "rider-old", primaryIqama: "299900001", displayName: "Old Rider" });
  const newRider = buildRider({ id: "rider-new", primaryIqama: "299900099", displayName: "New Rider" });
  const activeAssignment = buildAssignment({
    id: "assignment-old",
    dashboardUserId: "1001",
    riderId: "rider-old",
    riderIqama: "299900001",
  });
  const { service, runtime } = createService({
    dashboardUsers: [dashboardUser],
    riders: [oldRider, newRider],
    assignments: [activeAssignment],
    riderVehicleUsageHistory: [
      buildVehicleUsage({
        id: "usage-old",
        riderIqama: "299900001",
        riderName: "Old Rider",
        vehicleSerial: "OLD-CAR-1",
        plateNumber: "OLD-1",
        notes: "Old Sedan"
      })
    ]
  });

  const result = service.swapRider({
    actualVehicle: "Toyota Yaris",
    firstOnlineDate: "2026-07-13",
    dashboardUserId: "1001",
    operationMode: "replacement",
    plateNumber: "NEW-1",
    previousRiderId: "rider-old",
    newRiderId: "rider-new",
    newRiderIqama: "299900099",
    riderReceiveDate: "2026-07-12",
    swapDate: "2026-07-12",
    reason: "replacement",
    supervisor: "Lead B",
    user: createOperationsAdmin(),
    vehicleSerial: "NEW-CAR-9",
    vehicleType: "car",
    organizationContext: createOrganizationContext(),
  });

  const assignments = runtime.dataStore.getAll("assignments");
  assert.strictEqual(assignments.length, 2);
  assert.strictEqual(assignments.filter((item) => item.status === "active").length, 1);
  assert.strictEqual(assignments.filter((item) => item.status === "ended").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("assignmentHistory").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riderArchiveEvents").length, 2);
  assert.strictEqual(result.dashboardUser.currentRiderId, "rider-new");
  assert.strictEqual(result.newAssignment.operationMode, "replacement");
  assert.strictEqual(result.vehicleUsage.closed.length, 1);
  assert.strictEqual(result.vehicleUsage.closed[0].active, false);
  assert.strictEqual(result.vehicleUsage.opened.vehicleSerial, "NEW-CAR-9");
  assert.strictEqual(runtime.dataStore.getAll("riderVehicleUsageHistory").filter((item) => item.active === true).length, 1);
  assert.ok(runtime.dataStore.getAll("auditLogs").some((item) => item.action === "swap_confirmed"));
}));

results.push(test("rejects swap without active assignment", () => {
  const { service } = createService({
    dashboardUsers: [buildDashboardUser({ dashboardUserId: "1002" })],
    riders: [buildRider({ id: "rider-2" })],
  });

  assert.throws(() => {
    service.swapRider({
      dashboardUserId: "1002",
      newRiderId: "rider-2",
      user: createOperationsAdmin(),
      organizationContext: createOrganizationContext(),
    });
  }, /does not have an active assignment/);
}));

results.push(test("swap can create external identity/profile when only iqama is provided", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "1010",
    currentRiderId: "rider-old",
    currentRiderIqama: "299900010",
    currentAssignmentId: "assignment-old-1010",
    assignmentStatus: "active",
    status: "assigned",
  });
  const { service, runtime } = createService({
    dashboardUsers: [dashboardUser],
    riders: [buildRider({ id: "rider-old", primaryIqama: "299900010" })],
    assignments: [buildAssignment({ id: "assignment-old-1010", dashboardUserId: "1010", riderId: "rider-old", riderIqama: "299900010" })],
  });

  const result = service.swapRider({
    dashboardUserId: "1010",
    previousRiderId: "rider-old",
    newRiderIqama: "299900099",
    newRiderName: "External Replacement",
    swapDate: "2026-07-12",
    reason: "replacement",
    user: createOperationsAdmin(),
    organizationContext: createOrganizationContext(),
  });

  assert.ok(result.newAssignment.riderId);
  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riderOperationalProfiles").length, 1);
}));

results.push(test("rejects swap when viewer lacks permission", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "1003",
    currentRiderId: "rider-old",
    currentRiderIqama: "299900003",
    currentAssignmentId: "assignment-old",
    assignmentStatus: "active",
    status: "assigned",
  });
  const { service } = createService({
    dashboardUsers: [dashboardUser],
    riders: [buildRider({ id: "rider-old", primaryIqama: "299900003" }), buildRider({ id: "rider-new", primaryIqama: "299900004" })],
    assignments: [buildAssignment({ id: "assignment-old", dashboardUserId: "1003", riderId: "rider-old", riderIqama: "299900003" })],
  });

  assert.throws(() => {
    service.swapRider({
      dashboardUserId: "1003",
      newRiderId: "rider-new",
      user: createViewer(),
      organizationContext: createOrganizationContext(),
    });
  }, /Permission denied: operations.swap/);
}));

results.push(test("rejects swap outside supervisor scope", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "2001",
    city: CITY_RIYADH,
    register: "TOGARY",
    currentRiderId: "rider-old",
    currentRiderIqama: "299901111",
    currentAssignmentId: "assignment-old",
    assignmentStatus: "active",
    status: "assigned",
  });
  const { service } = createService({
    dashboardUsers: [dashboardUser],
    riders: [
      buildRider({ id: "rider-old", primaryIqama: "299901111", city: CITY_RIYADH, cities: [CITY_RIYADH], register: "TOGARY", registers: ["TOGARY"] }),
      buildRider({ id: "rider-new", primaryIqama: "299901112", city: CITY_RIYADH, cities: [CITY_RIYADH], register: "TOGARY", registers: ["TOGARY"] }),
    ],
    assignments: [buildAssignment({ id: "assignment-old", dashboardUserId: "2001", riderId: "rider-old", riderIqama: "299901111", city: CITY_RIYADH, register: "TOGARY" })],
  });

  assert.throws(() => {
    service.swapRider({
      dashboardUserId: "2001",
      newRiderId: "rider-new",
      user: createCitySupervisor(CITY_JEDDAH, "EXPRESS"),
      organizationContext: createOrganizationContext(),
    });
  }, /outside the current user scope/);
}));

results.push(test("rejects swap when replacement rider is already active on another dashboard user", () => {
  const dashboardUsers = [
    buildDashboardUser({
      dashboardUserId: "3101",
      currentRiderId: "rider-old",
      currentRiderIqama: "299901001",
      currentAssignmentId: "assignment-old-3101",
      assignmentStatus: "active",
      status: "assigned",
    }),
    buildDashboardUser({
      dashboardUserId: "3102",
      ownerIqama: "244400010",
      ownerName: "Owner Two",
      currentRiderId: "rider-busy",
      currentRiderIqama: "299901099",
      currentAssignmentId: "assignment-busy-3102",
      assignmentStatus: "active",
      status: "assigned",
    })
  ];
  const { service } = createService({
    assignments: [
      buildAssignment({ id: "assignment-old-3101", dashboardUserId: "3101", riderId: "rider-old", riderIqama: "299901001" }),
      buildAssignment({ id: "assignment-busy-3102", dashboardUserId: "3102", riderId: "rider-busy", riderIqama: "299901099" }),
    ],
    dashboardUsers: dashboardUsers,
    riders: [
      buildRider({ id: "rider-old", primaryIqama: "299901001" }),
      buildRider({ id: "rider-busy", primaryIqama: "299901099" }),
    ],
  });

  assert.throws(() => {
    service.swapRider({
      dashboardUserId: "3101",
      previousRiderId: "rider-old",
      newRiderId: "rider-busy",
      user: createOperationsAdmin(),
      organizationContext: createOrganizationContext(),
    });
  }, /active assignment on another dashboard user/);
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
