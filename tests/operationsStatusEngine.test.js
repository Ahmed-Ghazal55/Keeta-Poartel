const assert = require("assert");
const OperationsStatusEngine = require("../src/operations/operationsStatusEngine.js");
const {
  CITY_JEDDAH,
  CITY_RIYADH,
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

results.push(test("detects dashboard users that need assignment", () => {
  const user = buildDashboardUser({
    currentRiderId: "",
    currentRiderIqama: "",
    reviewStatus: "",
    status: "needs_assignment",
  });
  const review = OperationsStatusEngine.reviewDashboardUser(user, {
    assignments: [],
    riders: [],
    dashboardUsers: [user],
  });
  assert.strictEqual(review.reviewStatus, "needs_assignment");
  assert.ok(review.reasons.includes("needs_assignment"));
  assert.strictEqual(review.recommendedAction, "assign_rider");
}));

results.push(test("returns ok for matched active assignment", () => {
  const user = buildDashboardUser({
    currentRiderId: "rider-1",
    currentRiderIqama: "299900001",
    reviewStatus: "ok",
    status: "assigned",
  });
  const rider = buildRider();
  const assignment = buildAssignment();
  const review = OperationsStatusEngine.reviewDashboardUser(user, {
    assignments: [assignment],
    riders: [rider],
    dashboardUsers: [user],
  });
  assert.strictEqual(review.reviewStatus, "ok");
  assert.ok(review.reasons.includes("assigned_ok"));
}));

results.push(test("flags rider city mismatch as needs swap", () => {
  const user = buildDashboardUser({
    currentRiderId: "rider-1",
    currentRiderIqama: "299900001",
    city: CITY_JEDDAH,
    status: "assigned",
  });
  const rider = buildRider({ cities: [CITY_RIYADH], city: CITY_RIYADH });
  const assignment = buildAssignment();
  const review = OperationsStatusEngine.reviewDashboardUser(user, {
    assignments: [assignment],
    riders: [rider],
    dashboardUsers: [user],
  });
  assert.strictEqual(review.reviewStatus, "needs_swap");
  assert.ok(review.reasons.includes("rider_city_mismatch"));
}));

results.push(test("flags missing from latest import", () => {
  const user = buildDashboardUser({
    missingFromLatestImport: true,
    status: "under_review",
  });
  const review = OperationsStatusEngine.reviewDashboardUser(user, {
    assignments: [],
    riders: [],
    dashboardUsers: [user],
  });
  assert.strictEqual(review.reviewStatus, "missing_from_latest_import");
  assert.ok(review.reasons.includes("missing_from_latest_import"));
  assert.strictEqual(review.recommendedAction, "review_termination");
}));

results.push(test("detects duplicate and changed dashboard users in snapshot diff", () => {
  const previous = [
    buildDashboardUser({ id: "dash-old", dashboardUserId: "1001", vehicleType: "car" }),
  ];
  const current = [
    buildDashboardUser({ id: "dash-new-1", dashboardUserId: "1001", vehicleType: "bike" }),
    buildDashboardUser({ id: "dash-new-2", dashboardUserId: "1001", vehicleType: "bike" }),
    buildDashboardUser({ id: "dash-new-3", dashboardUserId: "1002" }),
  ];
  const diff = OperationsStatusEngine.detectImportChanges(previous, current);
  assert.deepStrictEqual(diff.duplicateIds, ["1001"]);
  assert.strictEqual(diff.newUsers.length, 1);
  assert.strictEqual(diff.changedUsers.length, 2);
  assert.ok(diff.changedUsers[0].changedFields.includes("vehicleType"));
}));

results.push(test("detects one rider assigned to multiple active users", () => {
  const rider = buildRider();
  const firstUser = buildDashboardUser({
    id: "dash-1",
    dashboardUserId: "1001",
    currentRiderId: rider.id,
    currentRiderIqama: rider.primaryIqama,
    status: "assigned",
  });
  const secondUser = buildDashboardUser({
    id: "dash-2",
    dashboardUserId: "1002",
    userId: "1002",
    currentRiderId: rider.id,
    currentRiderIqama: rider.primaryIqama,
    status: "assigned",
  });
  const assignments = [
    buildAssignment({ id: "assignment-1", dashboardUserId: "1001", riderId: rider.id, riderIqama: rider.primaryIqama }),
    buildAssignment({ id: "assignment-2", dashboardUserId: "1002", riderId: rider.id, riderIqama: rider.primaryIqama }),
  ];
  const review = OperationsStatusEngine.reviewDashboardUser(firstUser, {
    assignments,
    riders: [rider],
    dashboardUsers: [firstUser, secondUser],
  });
  assert.strictEqual(review.reviewStatus, "conflict");
  assert.ok(review.reasons.includes("same_rider_multiple_active_users"));
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
