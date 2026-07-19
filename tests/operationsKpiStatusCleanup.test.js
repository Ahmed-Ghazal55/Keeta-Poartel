const assert = require("assert");
const fs = require("fs");
const path = require("path");

const CurrentAssignmentsViewModel = require("../src/operations/currentAssignmentsViewModel.js");
const OperationsViewModel = require("../src/operations/operationsViewModel.js");
const {
  buildAssignment,
  buildDashboardUser,
} = require("./helpers/operationsTestHelpers.js");

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

results.push(test("dashboard KPI helper counts the visible lifecycle buckets correctly", () => {
  const kpis = OperationsViewModel.buildDashboardKpis([
    { dashboardUserId: "1", lifecycleStatus: "new", assignmentReadiness: "ready_for_assignment" },
    { dashboardUserId: "2", lifecycleStatus: "active_assigned", assignmentReadiness: "already_assigned" },
    { dashboardUserId: "3", lifecycleStatus: "pending_review", assignmentReadiness: "needs_manual_review" },
    { dashboardUserId: "4", lifecycleStatus: "dismissed", assignmentReadiness: "dismissed" },
    { dashboardUserId: "5", lifecycleStatus: "rejected", assignmentReadiness: "rejected" }
  ]);

  assert.strictEqual(kpis.totalDashboardUsers, 5);
  assert.strictEqual(kpis.newUsers, 1);
  assert.strictEqual(kpis.readyForAssignment, 1);
  assert.strictEqual(kpis.assigned, 1);
  assert.strictEqual(kpis.pendingReview, 1);
  assert.strictEqual(kpis.dismissedOrMissing, 1);
  assert.strictEqual(kpis.rejected, 1);
  assert.strictEqual(kpis.needsReview, 1);
}));

results.push(test("current assignment KPIs can be computed from already-filtered rows", () => {
  const rows = CurrentAssignmentsViewModel.buildCurrentAssignmentRows({
    assignments: [
      buildAssignment({
        id: "kpi-a-1",
        assignmentId: "kpi-a-1",
        dashboardUserId: "8001",
        riderIqama: "2999008001",
        actualRiderIqama: "2999008001",
        assignmentStatus: "active",
        operationMode: "per_order",
        vehicleSerial: "VH-8001",
        plateNumber: "JED-8001"
      }),
      buildAssignment({
        id: "kpi-a-2",
        assignmentId: "kpi-a-2",
        dashboardUserId: "8002",
        riderIqama: "2999008002",
        actualRiderIqama: "2999008002",
        assignmentStatus: "active",
        operationMode: "salary_tiers",
        vehicleSerial: "VH-8002",
        plateNumber: "JED-8002"
      })
    ],
    assignmentHistory: [
      { id: "kpi-h-1", dashboardUserId: "8001", action: "swap", actionDate: "2026-07-15" }
    ],
    auditLogs: [],
    dashboardUsers: [
      buildDashboardUser({ dashboardUserId: "8001", userId: "8001", ownerIqama: "2444008001", currentAssignmentId: "kpi-a-1", currentRiderIqama: "2999008001", assignmentStatus: "active" }),
      buildDashboardUser({ dashboardUserId: "8002", userId: "8002", ownerIqama: "2444008002", currentAssignmentId: "kpi-a-2", currentRiderIqama: "2999008002", assignmentStatus: "active" }),
      buildDashboardUser({ dashboardUserId: "8003", userId: "8003", ownerIqama: "2444008003", assignmentReadiness: "ready_for_assignment", lifecycleStatus: "ready_for_assignment" })
    ],
    externalRiders: [],
    hrProfiles: [],
    riderOperationalProfiles: [],
    riderVehicleUsageHistory: [],
    riders: [],
    terminations: []
  });

  const filtered = CurrentAssignmentsViewModel.filterCurrentAssignmentRows(rows, {
    assignmentStatus: "active",
    query: "800"
  }, "current_assignments");
  const kpis = CurrentAssignmentsViewModel.buildCurrentAssignmentKpis(filtered, {
    assignmentHistory: [{ action: "swap", actionDate: "2026-07-15" }],
    terminations: []
  }, { now: "2026-07-18T10:00:00.000Z" });

  assert.strictEqual(kpis.totalCurrentAssignments, 2);
  assert.strictEqual(kpis.active, 2);
  assert.strictEqual(kpis.perOrder, 1);
  assert.strictEqual(kpis.salary, 1);
  assert.strictEqual(kpis.swapsThisMonth, 1);
}));

results.push(test("operations UI keeps stable KPI labels and tone classes", () => {
  [
    'label: "إجمالي يوزرات الداشبورد", value: kpis.totalDashboardUsers || 0',
    'label: "جاهز للتسكين", value: kpis.readyForAssignment || 0, className: "good"',
    'label: "مقال / مختفي", value: kpis.dismissedOrMissing || 0, className: "bad"',
    'label: "يحتاج مراجعة", value: kpis.needsReview || 0, className: "warn"',
    'label: "موقوف", value: kpis.stopped || 0, className: "bad"'
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
