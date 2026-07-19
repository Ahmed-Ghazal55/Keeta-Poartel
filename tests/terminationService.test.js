const assert = require("assert");
const { createTerminationService } = require("../src/operations/terminationService.js");
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
    service: createTerminationService(runtime),
    runtime,
  };
}

const results = [];

results.push(test("terminates dashboard user and preserves history", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "1001",
    currentRiderId: "rider-1",
    currentRiderIqama: "299900001",
    currentAssignmentId: "assignment-1",
    assignmentStatus: "active",
    status: "assigned",
  });
  const activeAssignment = buildAssignment({
    id: "assignment-1",
    dashboardUserId: "1001",
    riderId: "rider-1",
    riderIqama: "299900001",
  });
  const { service, runtime } = createService({
    dashboardUsers: [dashboardUser],
    riders: [buildRider({ id: "rider-1", primaryIqama: "299900001" })],
    assignments: [activeAssignment],
    riderVehicleUsageHistory: [
      buildVehicleUsage({
        id: "usage-termination-1",
        riderIqama: "299900001",
        vehicleSerial: "VH-TERM-1",
        plateNumber: "TERM-1"
      })
    ]
  });

  const result = service.terminateUser({
    dashboardUserId: "1001",
    action: "terminate",
    terminationDate: "2026-07-13",
    reason: "manual termination",
    user: createOperationsAdmin(),
    organizationContext: createOrganizationContext(),
  });

  assert.strictEqual(result.termination.statusAfter, "terminated");
  assert.strictEqual(runtime.dataStore.getAll("terminations").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("assignmentHistory").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("assignments")[0].status, "ended");
  assert.strictEqual(runtime.dataStore.getAll("dashboardUsers")[0].status, "terminated");
  assert.strictEqual(runtime.dataStore.getAll("dashboardUsers")[0].currentRiderId, "");
  assert.strictEqual(runtime.dataStore.getAll("dashboardUsers")[0].currentRiderIqama, "");
  assert.strictEqual(result.vehicleUsage.length, 1);
  assert.strictEqual(result.vehicleUsage[0].active, false);
  assert.ok(runtime.dataStore.getAll("auditLogs").some((item) => item.action === "termination_created"));
}));

results.push(test("supports stop without replacement status", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "1002",
    currentRiderId: "rider-2",
    currentAssignmentId: "assignment-2",
    assignmentStatus: "active",
    status: "assigned",
  });
  const { service, runtime } = createService({
    dashboardUsers: [dashboardUser],
    assignments: [buildAssignment({ id: "assignment-2", dashboardUserId: "1002", riderId: "rider-2", riderIqama: "299900002" })],
  });

  const result = service.terminateUser({
    dashboardUserId: "1002",
    action: "stop_without_replacement",
    reason: "temporary stop",
    user: createOperationsAdmin(),
    organizationContext: createOrganizationContext(),
  });

  assert.strictEqual(result.termination.statusAfter, "not_working");
  assert.ok(runtime.dataStore.getAll("auditLogs").some((item) => item.action === "stop_without_replacement_confirmed"));
}));

results.push(test("requires termination reason", () => {
  const { service } = createService({
    dashboardUsers: [buildDashboardUser({ dashboardUserId: "1003" })],
  });

  assert.throws(() => {
    service.terminateUser({
      dashboardUserId: "1003",
      action: "terminate",
      user: createOperationsAdmin(),
      organizationContext: createOrganizationContext(),
    });
  }, /Termination reason is required/);
}));

results.push(test("rejects termination outside scope", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "2001",
    city: CITY_RIYADH,
    register: "TOGARY",
    currentRiderId: "rider-4",
    currentAssignmentId: "assignment-4",
    assignmentStatus: "active",
    status: "assigned",
  });
  const { service } = createService({
    dashboardUsers: [dashboardUser],
    assignments: [buildAssignment({ id: "assignment-4", dashboardUserId: "2001", riderId: "rider-4", riderIqama: "299900004", city: CITY_RIYADH, register: "TOGARY" })],
  });

  assert.throws(() => {
    service.terminateUser({
      dashboardUserId: "2001",
      action: "terminate",
      reason: "scope check",
      user: createCitySupervisor(CITY_JEDDAH, "EXPRESS"),
      organizationContext: createOrganizationContext(),
    });
  }, /outside the current user scope/);
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
