const assert = require("assert");
const DashboardUserLifecycle = require("../src/operations/dashboardUserLifecycle.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("new accepted in-service user stays new on the first import snapshot", () => {
  const status = DashboardUserLifecycle.computeDashboardLifecycleStatus({
    activationStatus: "Accepted",
    employmentStatus: "In Service"
  }, {
    hasActiveAssignment: false,
    isNewRecord: true,
    presentInLatestImport: true
  });

  assert.strictEqual(status, "new");
}));

results.push(test("accepted active user with active assignment becomes active_assigned", () => {
  const status = DashboardUserLifecycle.computeDashboardLifecycleStatus({
    activationStatus: "Accepted",
    assignmentStatus: "active",
    employmentStatus: "In Service"
  }, {
    hasActiveAssignment: true,
    presentInLatestImport: true
  });

  assert.strictEqual(status, "active_assigned");
}));

results.push(test("accepted active user without assignment becomes ready_for_assignment after the first import", () => {
  const status = DashboardUserLifecycle.computeDashboardLifecycleStatus({
    activationStatus: "Accepted",
    employmentStatus: "In Service"
  }, {
    hasActiveAssignment: false,
    isNewRecord: false,
    presentInLatestImport: true
  });

  assert.strictEqual(status, "ready_for_assignment");
}));

results.push(test("historically assigned accepted user without active assignment becomes active_unassigned", () => {
  const status = DashboardUserLifecycle.computeDashboardLifecycleStatus({
    activationStatus: "Accepted",
    assignmentStatus: "ended",
    employmentStatus: "In Service",
    handoverDate: "2026-07-01"
  }, {
    hasActiveAssignment: false,
    isNewRecord: false,
    presentInLatestImport: true
  });

  assert.strictEqual(status, "active_unassigned");
}));

results.push(test("pending review user becomes pending_review", () => {
  const status = DashboardUserLifecycle.computeDashboardLifecycleStatus({
    activationStatus: "Pending Review",
    employmentStatus: "In Service"
  }, {
    presentInLatestImport: true
  });

  assert.strictEqual(status, "pending_review");
}));

results.push(test("rejected dashboard review or documents become rejected", () => {
  const status = DashboardUserLifecycle.computeDashboardLifecycleStatus({
    activationStatus: "Accepted",
    documentChangeStatus: "Rejected",
    employmentStatus: "In Service"
  }, {
    presentInLatestImport: true
  });

  assert.strictEqual(status, "rejected");
}));

results.push(test("missing users from the latest upload become missing_from_latest_snapshot by default", () => {
  const status = DashboardUserLifecycle.computeDashboardLifecycleStatus({
    activationStatus: "Accepted",
    employmentStatus: "In Service",
    missingFromLatestImport: true
  }, {
    presentInLatestImport: false
  });

  assert.strictEqual(status, "missing_from_latest_snapshot");
}));

results.push(test("out-of-service users become dismissed", () => {
  const status = DashboardUserLifecycle.computeDashboardLifecycleStatus({
    activationStatus: "Accepted",
    employmentStatus: "Terminated"
  }, {
    presentInLatestImport: true
  });

  assert.strictEqual(status, "dismissed");
}));

results.push(test("manual-review notes push the user into needs_review", () => {
  const status = DashboardUserLifecycle.computeDashboardLifecycleStatus({
    activationStatus: "Accepted",
    documentChangeStatus: "No Change",
    employmentStatus: "In Service",
    pleaseNote: "manual review required before reuse"
  }, {
    presentInLatestImport: true
  });

  assert.strictEqual(status, "needs_review");
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
