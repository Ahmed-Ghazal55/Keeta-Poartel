const assert = require("assert");
const {
  CITY_JEDDAH,
  buildDailyRow,
  createRule,
  createRuntime,
  createSuperAdmin
} = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("performance recalculation attributes rows to the rider active for that assignment period", () => {
  const runtime = createRuntime({
    assignments: [
      {
        id: "assignment-early",
        assignmentId: "assignment-early",
        dashboardUserId: "1001",
        courierId: "1001",
        userId: "1001",
        riderId: "",
        riderIqama: "2444000101",
        actualRiderIqama: "2444000101",
        actualRiderName: "Rider Early",
        riderSource: "External",
        city: CITY_JEDDAH,
        register: "EXPRESS",
        platform: "keeta",
        assignmentStatus: "ended",
        assignmentStartDate: "2026-07-01",
        startDate: "2026-07-01",
        endDate: "2026-07-10",
        status: "ended"
      },
      {
        id: "assignment-late",
        assignmentId: "assignment-late",
        dashboardUserId: "1001",
        courierId: "1001",
        userId: "1001",
        riderId: "",
        riderIqama: "2444000202",
        actualRiderIqama: "2444000202",
        actualRiderName: "Rider Late",
        riderSource: "HR",
        city: CITY_JEDDAH,
        register: "EXPRESS",
        platform: "keeta",
        assignmentStatus: "active",
        assignmentStartDate: "2026-07-11",
        startDate: "2026-07-11",
        endDate: "",
        status: "active"
      }
    ],
    dashboardUsers: [{
      id: "dashboard-user-1",
      dashboardUserId: "1001",
      userId: "1001",
      platform: "keeta",
      city: CITY_JEDDAH,
      register: "EXPRESS",
      ownerIqama: "2444999999",
      currentRiderIqama: "",
      currentRiderId: "",
      vehicleType: "car",
      status: "working"
    }],
    monthlyRules: [createRule()],
    performanceDaily: [
      buildDailyRow({ date: "2026-07-05", riderId: "", iqama: "", orders: 20, completedOrders: 20, deliveredTasks: 20 }),
      buildDailyRow({ date: "2026-07-12", riderId: "", iqama: "", orders: 22, completedOrders: 22, deliveredTasks: 22 })
    ]
  });

  const summary = runtime.performanceService.runPerformanceRecalculationForScope({
    city: CITY_JEDDAH,
    month: "2026-07",
    platform: "keeta",
    register: "EXPRESS"
  }, createSuperAdmin(), {
    auditFinalization: false,
    source: "test"
  });

  const dailyRows = runtime.dataStore.getAll("performanceDaily").sort((left, right) => String(left.date).localeCompare(String(right.date)));
  assert.strictEqual(summary.dailyRowsProcessed, 2);
  assert.strictEqual(dailyRows[0].actualRiderIqama, "2444000101");
  assert.strictEqual(dailyRows[0].riderSource, "External");
  assert.strictEqual(dailyRows[1].actualRiderIqama, "2444000202");
  assert.strictEqual(dailyRows[1].riderSource, "HR");
  assert.strictEqual(runtime.dataStore.getAll("performanceIssues").filter((item) => item.issueType === "missing_rider_link").length, 0);
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
