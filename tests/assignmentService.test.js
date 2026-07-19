const assert = require("assert");
const { createAssignmentService } = require("../src/operations/assignmentService.js");
const {
  CITY_JEDDAH,
  CITY_RIYADH,
  buildDashboardUser,
  buildRider,
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
    service: createAssignmentService(runtime),
    runtime,
  };
}

const results = [];

results.push(test("assigns rider and records assignment history and audit", () => {
  const user = createOperationsAdmin();
  const orgContext = createOrganizationContext();
  const dashboardUser = buildDashboardUser({ dashboardUserId: "1001", status: "needs_assignment" });
  const rider = buildRider({ id: "rider-1", primaryIqama: "299900001" });
  const { service, runtime } = createService({
    dashboardUsers: [dashboardUser],
    riders: [rider],
  });

  const result = service.assignRider({
    dashboardUserId: "1001",
    actualVehicle: "Toyota Yaris",
    firstOnlineDate: "2026-07-12",
    riderId: rider.id,
    iqama: rider.primaryIqama,
    operationMode: "per order",
    plateNumber: "JED-1001",
    riderReceiveDate: "2026-07-11",
    startDate: "2026-07-11",
    reason: "first placement",
    supervisor: "Lead A",
    user,
    vehicleSerial: "VH-1001",
    vehicleType: "car",
    organizationContext: orgContext,
  });

  assert.strictEqual(result.assignment.status, "active");
  assert.strictEqual(result.assignment.operationMode, "per_order");
  assert.strictEqual(result.assignment.actualVehicle, "Toyota Yaris");
  assert.strictEqual(result.assignment.firstOnlineDate, "2026-07-12");
  assert.strictEqual(runtime.dataStore.getAll("assignments").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("assignmentHistory").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riderArchiveEvents").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riderVehicleUsageHistory").length, 1);
  assert.strictEqual(result.vehicleUsage.opened.active, true);
  assert.strictEqual(result.vehicleUsage.opened.vehicleSerial, "VH-1001");
  assert.ok(runtime.dataStore.getAll("auditLogs").some((item) => item.action === "assignment_created"));
  assert.strictEqual(runtime.dataStore.getAll("dashboardUsers")[0].currentRiderId, rider.id);
  assert.strictEqual(runtime.dataStore.getAll("dashboardUsers")[0].operationMode, "per_order");
}));

results.push(test("creates placeholder rider when iqama exists but rider profile is missing", () => {
  const user = createOperationsAdmin();
  const dashboardUser = buildDashboardUser({ dashboardUserId: "1002", fullName: "New Rider Owner" });
  const { service, runtime } = createService({
    dashboardUsers: [dashboardUser],
  });

  const result = service.assignRider({
    dashboardUserId: "1002",
    iqama: "288800002",
    riderName: "Placeholder Rider",
    startDate: "2026-07-11",
    user,
    organizationContext: createOrganizationContext(),
  });

  assert.strictEqual(result.rider.primaryIqama, "288800002");
  assert.ok(result.rider.riskFlags.includes("placeholder_rider"));
  assert.strictEqual(runtime.dataStore.getAll("riders").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riderOperationalProfiles").length, 1);
}));

results.push(test("rejects assignment when viewer lacks permission", () => {
  const dashboardUser = buildDashboardUser({ dashboardUserId: "1003" });
  const rider = buildRider({ id: "rider-3" });
  const { service } = createService({
    dashboardUsers: [dashboardUser],
    riders: [rider],
  });

  assert.throws(() => {
    service.assignRider({
      dashboardUserId: "1003",
      riderId: "rider-3",
      user: createViewer(),
      organizationContext: createOrganizationContext(),
    });
  }, /Permission denied: operations.assign/);
}));

results.push(test("rejects assignment outside city scope even without explicit payload city", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "2001",
    city: CITY_RIYADH,
    register: "TOGARY",
  });
  const rider = buildRider({
    id: "rider-4",
    cities: [CITY_RIYADH],
    city: CITY_RIYADH,
    registers: ["TOGARY"],
    register: "TOGARY",
  });
  const { service } = createService({
    dashboardUsers: [dashboardUser],
    riders: [rider],
  });

  assert.throws(() => {
    service.assignRider({
      dashboardUserId: "2001",
      riderId: "rider-4",
      user: createCitySupervisor(CITY_JEDDAH, "EXPRESS"),
      organizationContext: createOrganizationContext(),
    });
  }, /outside the current user scope/);
}));

results.push(test("rejects assignment when rider already has another active assignment", () => {
  const dashboardUsers = [
    buildDashboardUser({ dashboardUserId: "3001" }),
    buildDashboardUser({ dashboardUserId: "3002", ownerIqama: "244400002", ownerName: "Other Owner" }),
  ];
  const rider = buildRider({ id: "rider-dup", primaryIqama: "299900777" });
  const { service } = createService({
    assignments: [
      {
        id: "assignment-existing",
        assignmentId: "assignment-existing",
        dashboardUserId: "3002",
        courierId: "3002",
        userId: "3002",
        riderId: "rider-dup",
        riderIqama: "299900777",
        actualRiderIqama: "299900777",
        city: CITY_JEDDAH,
        register: "EXPRESS",
        platform: "keeta",
        assignmentStatus: "active",
        assignmentStartDate: "2026-07-10",
        startDate: "2026-07-10",
        endDate: "",
        status: "active"
      }
    ],
    dashboardUsers: dashboardUsers,
    riders: [rider],
  });

  assert.throws(() => {
    service.assignRider({
      dashboardUserId: "3001",
      riderId: "rider-dup",
      iqama: "299900777",
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
