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
  return createAssignmentService(runtime);
}

const results = [];

results.push(test("operations admin can assign inside allowed scope", () => {
  const dashboardUser = buildDashboardUser({ dashboardUserId: "1001" });
  const rider = buildRider({ id: "rider-1", primaryIqama: "299900001" });
  const service = createService({
    dashboardUsers: [dashboardUser],
    riders: [rider],
  });
  const result = service.assignRider({
    dashboardUserId: "1001",
    riderId: "rider-1",
    user: createOperationsAdmin(),
    organizationContext: createOrganizationContext(),
  });
  assert.strictEqual(result.assignment.dashboardUserId, "1001");
}));

results.push(test("viewer cannot assign riders", () => {
  const dashboardUser = buildDashboardUser({ dashboardUserId: "1002" });
  const rider = buildRider({ id: "rider-2", primaryIqama: "299900002" });
  const service = createService({
    dashboardUsers: [dashboardUser],
    riders: [rider],
  });
  assert.throws(() => {
    service.assignRider({
      dashboardUserId: "1002",
      riderId: "rider-2",
      user: createViewer(),
      organizationContext: createOrganizationContext(),
    });
  }, /Permission denied: operations.assign/);
}));

results.push(test("city supervisor cannot operate on another city", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "2001",
    city: CITY_RIYADH,
    register: "TOGARY",
  });
  const rider = buildRider({
    id: "rider-3",
    primaryIqama: "299900003",
    city: CITY_RIYADH,
    cities: [CITY_RIYADH],
    register: "TOGARY",
    registers: ["TOGARY"],
  });
  const service = createService({
    dashboardUsers: [dashboardUser],
    riders: [rider],
  });
  assert.throws(() => {
    service.assignRider({
      dashboardUserId: "2001",
      riderId: "rider-3",
      user: createCitySupervisor(CITY_JEDDAH, "EXPRESS"),
      organizationContext: createOrganizationContext(),
    });
  }, /outside the current user scope/);
}));

results.push(test("organization context can further restrict operations", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "1004",
    city: CITY_JEDDAH,
    register: "EXPRESS",
  });
  const rider = buildRider({ id: "rider-4", primaryIqama: "299900004" });
  const service = createService({
    dashboardUsers: [dashboardUser],
    riders: [rider],
  });
  assert.throws(() => {
    service.assignRider({
      dashboardUserId: "1004",
      riderId: "rider-4",
      user: createOperationsAdmin(),
      organizationContext: createOrganizationContext({
        cityScope: "single",
        selectedCities: [CITY_JEDDAH],
        registerScope: "single",
        selectedRegisters: ["ALBAWABA"],
        selectedDashboards: ["ALBAWABA"],
      }),
    });
  }, /outside the current organization selector/);
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
