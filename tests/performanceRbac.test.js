const assert = require("assert");
const {
  CITY_JEDDAH,
  CITY_RIYADH,
  buildAssignment,
  buildDashboardUser,
  buildDailyRow,
  buildRider,
  createCitySupervisor,
  createOperationsAdmin,
  createRule,
  createRuntime,
  createSuperAdmin,
  createViewer,
} = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

function createScopedRuntime() {
  return createRuntime({
    assignments: [buildAssignment()],
    dashboardUsers: [buildDashboardUser()],
    monthlyRules: [createRule()],
    performanceDaily: [buildDailyRow()],
    riders: [buildRider()],
  });
}

const results = [];

results.push(test("viewer cannot recalculate", () => {
  const runtime = createScopedRuntime();
  assert.throws(() => {
    runtime.performanceService.runPerformanceRecalculationForScope({
      city: CITY_JEDDAH,
      month: "2026-07",
      platform: "keeta",
      register: "EXPRESS",
    }, createViewer());
  }, /Permission denied: performance\.recalculate/);
}));

results.push(test("city supervisor cannot recalculate another city", () => {
  const runtime = createScopedRuntime();
  assert.throws(() => {
    runtime.performanceService.runPerformanceRecalculationForScope({
      city: CITY_RIYADH,
      month: "2026-07",
      platform: "keeta",
      register: "TOGARY",
    }, createCitySupervisor(CITY_JEDDAH, "EXPRESS"));
  }, /outside the current user scope/);
}));

results.push(test("operations admin can recalculate scoped city", () => {
  const runtime = createScopedRuntime();
  const result = runtime.performanceService.runPerformanceRecalculationForScope({
    city: CITY_JEDDAH,
    month: "2026-07",
    platform: "keeta",
    register: "EXPRESS",
  }, createOperationsAdmin());
  assert.ok(result.monthlyRowsCalculated >= 1);
}));

results.push(test("super admin can recalculate all scope", () => {
  const runtime = createScopedRuntime();
  const result = runtime.performanceService.runPerformanceRecalculationForScope({
    month: "2026-07",
    platform: "keeta",
  }, createSuperAdmin());
  assert.ok(result.resultsCreated >= 1);
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("performanceRbac.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("performanceRbac.test.js passed:", results.length);
