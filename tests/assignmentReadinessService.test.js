const assert = require("assert");
const AssignmentReadinessService = require("../src/operations/assignmentReadinessService.js");
const {
  buildAssignment,
  buildDashboardUser,
  buildRider
} = require("./helpers/operationsTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function buildHrProfile(overrides) {
  return Object.assign({
    id: "hr-profile-1",
    fullNameArabic: "Ahmed Salem",
    hrStatus: "active",
    iqama: "244400001"
  }, overrides || {});
}

function buildOperationalProfile(overrides) {
  return Object.assign({
    id: "opr-profile-1",
    iqama: "299900001",
    riderId: "rider-1",
    riderSource: "External"
  }, overrides || {});
}

const results = [];

results.push(test("accepted active user with HR owner and no assignment is ready_for_assignment", () => {
  const readiness = AssignmentReadinessService.buildDashboardUserReadiness(
    buildDashboardUser({
      activationStatus: "accepted",
      assignmentStatus: "",
      currentAssignmentId: "",
      lifecycleStatus: "ready_for_assignment",
      ownerIqama: "244400001"
    }),
    {
      assignments: [],
      externalRiders: [],
      hrProfiles: [buildHrProfile()],
      riderOperationalProfiles: [],
      riders: []
    }
  );

  assert.strictEqual(readiness.readinessStatus, "ready_for_assignment");
  assert.strictEqual(readiness.ownerSource, "HR");
  assert.strictEqual(readiness.canAssign, true);
  assert.strictEqual(readiness.hasActiveAssignment, false);
}));

results.push(test("accepted active user with active assignment becomes already_assigned", () => {
  const rider = buildRider({ id: "rider-1", primaryIqama: "299900001", displayName: "Actual Rider" });
  const readiness = AssignmentReadinessService.buildDashboardUserReadiness(
    buildDashboardUser({
      activationStatus: "accepted",
      currentAssignmentId: "assignment-1",
      currentRiderId: rider.id,
      currentRiderIqama: rider.primaryIqama,
      currentRiderName: rider.displayName,
      lifecycleStatus: "active_assigned",
      ownerIqama: "244400001"
    }),
    {
      assignments: [buildAssignment({ id: "assignment-1", riderId: rider.id, riderIqama: rider.primaryIqama })],
      externalRiders: [],
      hrProfiles: [buildHrProfile()],
      riderOperationalProfiles: [buildOperationalProfile()],
      riders: [rider]
    }
  );

  assert.strictEqual(readiness.readinessStatus, "already_assigned");
  assert.strictEqual(readiness.hasActiveAssignment, true);
  assert.strictEqual(readiness.actualRiderName, "Actual Rider");
  assert.strictEqual(readiness.canSwap, true);
  assert.strictEqual(readiness.canStop, true);
}));

results.push(test("pending review blocks assignment", () => {
  const readiness = AssignmentReadinessService.buildDashboardUserReadiness(
    buildDashboardUser({
      activationStatus: "pending",
      lifecycleStatus: "pending_review",
      ownerIqama: "244400001"
    }),
    {
      assignments: [],
      externalRiders: [],
      hrProfiles: [buildHrProfile()],
      riderOperationalProfiles: [],
      riders: []
    }
  );

  assert.strictEqual(readiness.readinessStatus, "under_review");
  assert.strictEqual(readiness.canAssign, false);
}));

results.push(test("rejected dashboard user blocks assignment", () => {
  const readiness = AssignmentReadinessService.buildDashboardUserReadiness(
    buildDashboardUser({
      activationStatus: "rejected",
      documentChangeStatus: "Rejected",
      lifecycleStatus: "rejected",
      ownerIqama: "244400001"
    }),
    {
      assignments: [],
      externalRiders: [],
      hrProfiles: [buildHrProfile()],
      riderOperationalProfiles: [],
      riders: []
    }
  );

  assert.strictEqual(readiness.readinessStatus, "rejected");
  assert.ok(readiness.issues.includes("user_rejected_documents"));
}));

results.push(test("missing or dismissed dashboard users stay blocked", () => {
  const missingReadiness = AssignmentReadinessService.buildDashboardUserReadiness(
    buildDashboardUser({
      lifecycleStatus: "missing_from_latest_snapshot",
      ownerIqama: "244400001"
    }),
    {
      assignments: [],
      externalRiders: [],
      hrProfiles: [buildHrProfile()],
      riderOperationalProfiles: [],
      riders: []
    }
  );
  const dismissedReadiness = AssignmentReadinessService.buildDashboardUserReadiness(
    buildDashboardUser({
      employmentStatus: "Terminated",
      lifecycleStatus: "dismissed",
      ownerIqama: "244400001"
    }),
    {
      assignments: [],
      externalRiders: [],
      hrProfiles: [buildHrProfile()],
      riderOperationalProfiles: [],
      riders: []
    }
  );

  assert.strictEqual(missingReadiness.readinessStatus, "missing_from_latest_snapshot");
  assert.strictEqual(dismissedReadiness.readinessStatus, "dismissed");
}));

results.push(test("owner and actual rider identities remain separated", () => {
  const rider = buildRider({
    id: "rider-actual",
    primaryIqama: "299900010",
    displayName: "Actual External Rider"
  });
  const readiness = AssignmentReadinessService.buildDashboardUserReadiness(
    buildDashboardUser({
      activationStatus: "accepted",
      currentAssignmentId: "assignment-owner-vs-actual",
      currentRiderId: rider.id,
      currentRiderIqama: rider.primaryIqama,
      currentRiderName: rider.displayName,
      lifecycleStatus: "active_assigned",
      ownerIqama: "244400777"
    }),
    {
      assignments: [buildAssignment({
        id: "assignment-owner-vs-actual",
        riderId: rider.id,
        riderIqama: rider.primaryIqama,
        riderSource: "External"
      })],
      externalRiders: [{ id: "ext-1", iqama: rider.primaryIqama, fullName: rider.displayName }],
      hrProfiles: [buildHrProfile({ id: "hr-owner", fullNameArabic: "Owner Profile", iqama: "244400777" })],
      riderOperationalProfiles: [buildOperationalProfile({ iqama: rider.primaryIqama, riderId: rider.id, riderSource: "External" })],
      riders: [rider]
    }
  );

  assert.strictEqual(readiness.ownerName, "Owner Profile");
  assert.strictEqual(readiness.ownerIqama, "244400777");
  assert.strictEqual(readiness.actualRiderIqama, "299900010");
  assert.strictEqual(readiness.actualRiderName, "Actual External Rider");
  assert.strictEqual(readiness.riderSource, "External");
  assert.notStrictEqual(readiness.ownerIqama, readiness.actualRiderIqama);
}));

results.push(test("missing owner iqama is blocked explicitly", () => {
  const readiness = AssignmentReadinessService.buildDashboardUserReadiness(
    buildDashboardUser({
      ownerIqama: "",
      lifecycleStatus: "ready_for_assignment"
    }),
    {
      assignments: [],
      externalRiders: [],
      hrProfiles: [],
      riderOperationalProfiles: [],
      riders: []
    }
  );

  assert.strictEqual(readiness.readinessStatus, "blocked_missing_owner_iqama");
  assert.ok(readiness.issues.includes("blocked_missing_owner_iqama"));
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
