const assert = require("assert");
const DashboardImportSnapshot = require("../src/operations/dashboardImportSnapshot.js");
const {
  buildAssignment,
  buildDashboardUser,
  buildRider,
} = require("./helpers/operationsTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("detects new and missing users inside scoped snapshot", () => {
  const previous = [
    buildDashboardUser({ id: "dash-1", dashboardUserId: "1001" }),
    buildDashboardUser({ id: "dash-2", dashboardUserId: "1002" }),
  ];
  const current = [
    buildDashboardUser({ id: "dash-1", dashboardUserId: "1001" }),
    buildDashboardUser({ id: "dash-3", dashboardUserId: "1003" }),
  ];
  const diff = DashboardImportSnapshot.compareWithPreviousDashboardSnapshot(previous, current, {
    city: previous[0].city,
    platform: previous[0].platform,
    register: previous[0].register,
  });
  assert.strictEqual(diff.newUsers.length, 1);
  assert.strictEqual(diff.missingUsers.length, 1);
  assert.strictEqual(diff.newUsers[0].dashboardUserId, "1003");
  assert.strictEqual(diff.missingUsers[0].dashboardUserId, "1002");
}));

results.push(test("detects tracked field changes", () => {
  const previous = [buildDashboardUser({ dashboardUserId: "1001", ownerPhone: "966500000001", vehicleType: "car" })];
  const current = [buildDashboardUser({ dashboardUserId: "1001", ownerPhone: "966500000099", vehicleType: "bike" })];
  const diff = DashboardImportSnapshot.compareWithPreviousDashboardSnapshot(previous, current, {
    city: current[0].city,
    platform: current[0].platform,
    register: current[0].register,
  });
  assert.strictEqual(diff.changedUsers.length, 1);
  assert.ok(diff.changedUsers[0].changedFields.includes("ownerPhone"));
  assert.ok(diff.changedUsers[0].changedFields.includes("vehicleType"));
}));

results.push(test("marks missing users for operational review without auto termination", () => {
  const previous = [buildDashboardUser({ id: "dash-1", dashboardUserId: "1001", status: "assigned" })];
  const current = [];
  const diff = DashboardImportSnapshot.compareWithPreviousDashboardSnapshot(previous, current, {
    city: previous[0].city,
    platform: previous[0].platform,
    register: previous[0].register,
  });
  const state = DashboardImportSnapshot.updateOperationalState(current, diff, {
    now: "2026-07-11T00:00:00.000Z",
    sourceImportBatchId: "batch-1",
  });
  assert.strictEqual(state.missingUsers.length, 1);
  assert.strictEqual(state.missingUsers[0].missingFromLatestImport, true);
  assert.strictEqual(state.missingUsers[0].reviewStatus, "missing_from_latest_import");
  assert.strictEqual(state.missingUsers[0].status, "assigned");
}));

results.push(test("creates status review rows from the updated state", () => {
  const user = buildDashboardUser({
    dashboardUserId: "1001",
    currentRiderId: "",
    currentRiderIqama: "",
    status: "needs_assignment",
  });
  const diff = DashboardImportSnapshot.compareWithPreviousDashboardSnapshot([], [user], {
    city: user.city,
    platform: user.platform,
    register: user.register,
  });
  const state = DashboardImportSnapshot.updateOperationalState([user], diff, {
    now: "2026-07-11T00:00:00.000Z",
    sourceImportBatchId: "batch-2",
  });
  const reviews = DashboardImportSnapshot.createStatusReviews(state.currentUsers, diff, {
    assignments: [],
    riders: [],
    reviewedAt: "2026-07-11T00:00:00.000Z",
    reviewedBy: "ops-admin",
    sourceImportBatchId: "batch-2",
  });
  assert.strictEqual(reviews.length, 1);
  assert.strictEqual(reviews[0].reviewStatus, "needs_assignment");
  assert.strictEqual(reviews[0].sourceImportBatchId, "batch-2");
}));

results.push(test("links active assignment context when review is ok", () => {
  const rider = buildRider();
  const user = buildDashboardUser({
    dashboardUserId: "1001",
    currentRiderId: rider.id,
    currentRiderIqama: rider.primaryIqama,
    status: "assigned",
    forceStatusReview: true,
  });
  const assignment = buildAssignment({
    dashboardUserId: "1001",
    riderId: rider.id,
    riderIqama: rider.primaryIqama,
  });
  const diff = DashboardImportSnapshot.compareWithPreviousDashboardSnapshot([], [user], {
    city: user.city,
    platform: user.platform,
    register: user.register,
  });
  const reviews = DashboardImportSnapshot.createStatusReviews([user], diff, {
    assignments: [assignment],
    riders: [rider],
    reviewedAt: "2026-07-11T00:00:00.000Z",
    reviewedBy: "ops-admin",
    sourceImportBatchId: "batch-3",
  });
  assert.strictEqual(reviews[0].reviewStatus, "ok");
  assert.strictEqual(reviews[0].activeAssignmentId, assignment.id);
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
