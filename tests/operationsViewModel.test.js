const assert = require("assert");

const CurrentAssignmentsViewModel = require("../src/operations/currentAssignmentsViewModel.js");
const OperationsViewModel = require("../src/operations/operationsViewModel.js");
const {
  CITY_JEDDAH,
  buildAssignment,
  buildDashboardUser,
  buildVehicleUsage,
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

results.push(test("owner and actual rider identities stay separate from registered and actual vehicle summaries", () => {
  const rows = CurrentAssignmentsViewModel.buildCurrentAssignmentRows({
    assignments: [
      buildAssignment({
        id: "assignment-ovm-1",
        assignmentId: "assignment-ovm-1",
        dashboardUserId: "7001",
        courierId: "7001",
        userId: "7001",
        riderId: "rider-7001",
        riderIqama: "2999007001",
        actualRiderIqama: "2999007001",
        actualRiderName: "Actual Rider 7001",
        actualVehicle: "Toyota Yaris",
        dashboardVehicle: "Registered Sedan",
        vehicleSerial: "VH-7001",
        plateNumber: "JED-7001",
        assignmentStatus: "active",
        operationMode: "salary_tiers"
      })
    ],
    assignmentHistory: [],
    auditLogs: [],
    dashboardUsers: [
      buildDashboardUser({
        dashboardUserId: "7001",
        userId: "7001",
        ownerIqama: "2444007001",
        ownerName: "Owner 7001",
        currentRiderId: "rider-7001",
        currentRiderIqama: "2999007001",
        currentAssignmentId: "assignment-ovm-1",
        assignmentStatus: "active",
        city: CITY_JEDDAH,
        register: "EXPRESS",
        platform: "keeta",
        vehicleType: "car"
      })
    ],
    externalRiders: [],
    hrProfiles: [
      { id: "hr-owner-7001", iqama: "2444007001", fullNameArabic: "Owner 7001", hrStatus: "active" },
      { id: "hr-rider-7001", iqama: "2999007001", fullNameArabic: "Actual Rider 7001", hrStatus: "active" }
    ],
    riderOperationalProfiles: [
      { id: "profile-7001", iqama: "2999007001", riderSource: "HR", contactPhone: "966500700100", preferredCity: CITY_JEDDAH, preferredRegister: "EXPRESS" }
    ],
    riderVehicleUsageHistory: [
      buildVehicleUsage({
        id: "usage-7001",
        riderIqama: "2999007001",
        vehicleSerial: "VH-7001",
        plateNumber: "JED-7001",
        notes: "Toyota Yaris"
      })
    ],
    riders: [
      { id: "rider-7001", primaryIqama: "2999007001", displayName: "Actual Rider 7001" }
    ],
    terminations: []
  });

  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].ownerIqama, "2444007001");
  assert.strictEqual(rows[0].actualRiderIqama, "2999007001");
  assert.notStrictEqual(rows[0].ownerIqama, rows[0].actualRiderIqama);
  assert.ok(rows[0].dashboardVehicleSummary.includes("Registered Sedan"));
  assert.ok(rows[0].actualVehicleSummary.includes("Toyota Yaris"));
}));

results.push(test("search supports courier, owner, actual rider, plate, serial, and assignment id", () => {
  const rows = CurrentAssignmentsViewModel.buildCurrentAssignmentRows({
    assignments: [
      buildAssignment({
        id: "assignment-ovm-2",
        assignmentId: "assignment-ovm-2",
        dashboardUserId: "7002",
        courierId: "7002",
        userId: "7002",
        riderId: "rider-7002",
        riderIqama: "2999007002",
        actualRiderIqama: "2999007002",
        actualRiderName: "Actual Rider 7002",
        vehicleSerial: "VH-7002",
        plateNumber: "JED-7002",
        assignmentStatus: "active",
        city: CITY_JEDDAH,
        register: "ALBAWABA",
        platform: "keeta"
      })
    ],
    assignmentHistory: [],
    auditLogs: [],
    dashboardUsers: [
      buildDashboardUser({
        dashboardUserId: "7002",
        userId: "7002",
        ownerIqama: "2444007002",
        ownerName: "Owner 7002",
        currentRiderId: "rider-7002",
        currentRiderIqama: "2999007002",
        currentAssignmentId: "assignment-ovm-2",
        assignmentStatus: "active",
        city: CITY_JEDDAH,
        register: "ALBAWABA",
        platform: "keeta"
      })
    ],
    externalRiders: [],
    hrProfiles: [],
    riderOperationalProfiles: [],
    riderVehicleUsageHistory: [],
    riders: [],
    terminations: []
  });

  [
    "7002",
    "2444007002",
    "2999007002",
    "JED-7002",
    "VH-7002",
    "assignment-ovm-2"
  ].forEach((query) => {
    const filtered = CurrentAssignmentsViewModel.filterCurrentAssignmentRows(rows, {
      city: CITY_JEDDAH,
      register: "ALBAWABA",
      platform: "keeta",
      query
    }, "current_assignments");
    assert.strictEqual(filtered.length, 1, query);
  });
}));

results.push(test("dashboard tab helpers split needs assignment, working, and review buckets", () => {
  const rows = [
    { dashboardUserId: "d-1", assignmentReadiness: "ready_for_assignment", lifecycleStatus: "new" },
    { dashboardUserId: "d-2", assignmentStatus: "active", currentAssignmentId: "a-2", lifecycleStatus: "active_assigned" },
    { dashboardUserId: "d-3", assignmentReadiness: "needs_manual_review", lifecycleStatus: "pending_review" }
  ];

  assert.strictEqual(OperationsViewModel.filterDashboardRowsForTab(rows, "needs_assignment").length, 1);
  assert.strictEqual(OperationsViewModel.filterDashboardRowsForTab(rows, "working").length, 1);
  assert.strictEqual(OperationsViewModel.filterDashboardRowsForTab(rows, "needs_review").length, 1);
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
