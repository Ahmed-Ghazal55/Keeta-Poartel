const assert = require("assert");
const CurrentAssignmentsViewModel = require("../src/operations/currentAssignmentsViewModel.js");
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

results.push(test("builds current assignment rows with filters and KPI summaries", () => {
  const rows = CurrentAssignmentsViewModel.buildCurrentAssignmentRows({
    assignments: [
      buildAssignment({
        id: "assignment-ca-1",
        assignmentId: "assignment-ca-1",
        dashboardUserId: "5001",
        courierId: "5001",
        userId: "5001",
        riderId: "rider-ca-1",
        riderIqama: "299955551",
        actualRiderIqama: "299955551",
        actualRiderName: "Actual Rider",
        actualRiderPhone: "966500001111",
        assignmentStartDate: "2026-07-10",
        riderReceiveDate: "2026-07-10",
        firstOnlineDate: "2026-07-11",
        operationMode: "per order",
        riderSource: "HR",
        dashboardVehicle: "Registered Sedan",
        actualVehicle: "Toyota Yaris",
        vehicleSerial: "VH-5001",
        plateNumber: "JED-5001",
        supervisor: "Lead A",
      }),
    ],
    assignmentHistory: [
      {
        id: "history-ca-1",
        dashboardUserId: "5001",
        action: "assign",
        actionDate: "2026-07-10",
        previousRiderIqama: "",
        newRiderIqama: "299955551",
      }
    ],
    auditLogs: [],
    dashboardUsers: [
      buildDashboardUser({
        dashboardUserId: "5001",
        userId: "5001",
        ownerIqama: "244455551",
        ownerName: "Owner One",
        currentRiderId: "rider-ca-1",
        currentRiderIqama: "299955551",
        currentRiderName: "Actual Rider",
        currentAssignmentId: "assignment-ca-1",
        assignmentStatus: "active",
        operationMode: "per_order",
        status: "working",
        handoverDate: "2026-07-10",
        canStop: true,
        canSwap: true,
      })
    ],
    externalRiders: [],
    hrProfiles: [
      { id: "hr-owner-1", iqama: "244455551", fullNameArabic: "Owner One", hrStatus: "active" },
      { id: "hr-rider-1", iqama: "299955551", fullNameArabic: "Actual Rider", hrStatus: "active" },
    ],
    riderOperationalProfiles: [
      { id: "profile-1", iqama: "299955551", riderSource: "HR", contactPhone: "966500001111", preferredCity: CITY_JEDDAH, preferredRegister: "EXPRESS" }
    ],
    riderVehicleUsageHistory: [
      buildVehicleUsage({
        id: "usage-ca-1",
        riderIqama: "299955551",
        vehicleSerial: "VH-5001",
        plateNumber: "JED-5001",
        notes: "Toyota Yaris",
      })
    ],
    riders: [
      {
        id: "rider-ca-1",
        primaryIqama: "299955551",
        displayName: "Actual Rider",
        phones: ["966500001111"],
      }
    ],
    terminations: [],
  });

  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].dashboardUserId, "5001");
  assert.strictEqual(rows[0].operationMode, "per_order");
  assert.strictEqual(rows[0].riderSource, "HR");
  assert.strictEqual(rows[0].vehicleCompanyStatus, "company");
  assert.strictEqual(rows[0].actualVehicleSummary, "Toyota Yaris / VH-5001 / JED-5001");

  const filtered = CurrentAssignmentsViewModel.filterCurrentAssignmentRows(rows, {
    assignmentStatus: "active",
    operationMode: "per_order",
    riderSource: "HR",
    supervisor: "Lead A",
    query: "JED-5001"
  }, "per_order");
  assert.strictEqual(filtered.length, 1);

  const kpis = CurrentAssignmentsViewModel.buildCurrentAssignmentKpis(rows, {
    assignmentHistory: [
      { action: "swap", actionDate: "2026-07-12" }
    ],
    terminations: []
  }, {
    now: "2026-07-15T09:00:00.000Z"
  });
  assert.strictEqual(kpis.totalCurrentAssignments, 1);
  assert.strictEqual(kpis.perOrder, 1);
  assert.strictEqual(kpis.companyVehicles, 1);
  assert.strictEqual(kpis.swapsThisMonth, 1);
}));

results.push(test("matches multi-token search queries across concatenated assignment fields", () => {
  const rows = CurrentAssignmentsViewModel.buildCurrentAssignmentRows({
    assignments: [
      buildAssignment({
        id: "assignment-seed-33",
        assignmentId: "assignment-seed-33",
        dashboardUserId: "1782999000333001",
        courierId: "1782999000333001",
        userId: "1782999000333001",
        assignmentStatus: "needs_assignment",
        status: "needs_assignment",
        city: CITY_JEDDAH,
        register: "ALBAWABA",
        platform: "keeta"
      })
    ],
    assignmentHistory: [],
    auditLogs: [],
    dashboardUsers: [
      buildDashboardUser({
        dashboardUserId: "1782999000333001",
        userId: "1782999000333001",
        ownerIqama: "2444000033",
        ownerName: "Salem Nasser",
        city: CITY_JEDDAH,
        register: "ALBAWABA",
        platform: "keeta",
        assignmentReadiness: "ready_for_assignment",
        lifecycleStatus: "new",
        reviewStatus: "needs_assignment",
        employmentStatus: "In Service"
      })
    ],
    externalRiders: [],
    hrProfiles: [],
    riderOperationalProfiles: [],
    riderVehicleUsageHistory: [],
    riders: [],
    terminations: []
  });

  const filtered = CurrentAssignmentsViewModel.filterCurrentAssignmentRows(rows, {
    city: CITY_JEDDAH,
    register: "ALBAWABA",
    platform: "keeta",
    query: "1782999000333001 2444000033 assignment-seed-33"
  }, "needs_assignment");

  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].dashboardUserId, "1782999000333001");
  assert.strictEqual(filtered[0].assignmentId, "assignment-seed-33");
}));

results.push(test("derives duplicate rider issues and assignment notifications", () => {
  const payload = {
    assignments: [
      buildAssignment({
        id: "assignment-dup-1",
        assignmentId: "assignment-dup-1",
        dashboardUserId: "5101",
        courierId: "5101",
        userId: "5101",
        riderId: "rider-dup",
        riderIqama: "299977771",
        actualRiderIqama: "299977771",
        actualRiderName: "Duplicate Rider",
      }),
      buildAssignment({
        id: "assignment-dup-2",
        assignmentId: "assignment-dup-2",
        dashboardUserId: "5102",
        courierId: "5102",
        userId: "5102",
        riderId: "rider-dup",
        riderIqama: "299977771",
        actualRiderIqama: "299977771",
        actualRiderName: "Duplicate Rider",
      }),
    ],
    auditLogs: [],
    dashboardUsers: [
      buildDashboardUser({
        dashboardUserId: "5101",
        userId: "5101",
        ownerIqama: "244499991",
        ownerName: "Owner One",
        currentRiderId: "rider-dup",
        currentRiderIqama: "299977771",
        currentAssignmentId: "assignment-dup-1",
        assignmentStatus: "active",
        status: "working",
      }),
      buildDashboardUser({
        dashboardUserId: "5102",
        userId: "5102",
        ownerIqama: "244499992",
        ownerName: "Owner Two",
        currentRiderId: "rider-dup",
        currentRiderIqama: "299977771",
        currentAssignmentId: "assignment-dup-2",
        assignmentStatus: "active",
        status: "working",
      }),
    ],
    externalRiders: [],
    hrProfiles: [],
    riderOperationalProfiles: [],
    riderVehicleUsageHistory: [],
    riders: [],
    terminations: [],
  };

  const rows = CurrentAssignmentsViewModel.buildCurrentAssignmentRows(payload);
  assert.ok(rows.every((row) => row.issues.includes("assignment_duplicate_active_rider")));
  assert.ok(rows.every((row) => row.issues.includes("assignment_owner_missing_hr")));

  const notifications = CurrentAssignmentsViewModel.deriveAssignmentNotifications(payload);
  assert.ok(notifications.some((item) => item.id === "assignment_issue_5101_assignment_duplicate_active_rider"));
  assert.ok(notifications.some((item) => item.severity === "critical"));
  assert.ok(notifications.some((item) => item.id === "assignment_issue_5102_assignment_owner_missing_hr"));
}));

results.push(test("builds a merged assignment timeline from history, terminations, and audit logs", () => {
  const row = {
    assignmentId: "assignment-tl-1",
    dashboardUserId: "5201",
    ownerIqama: "2444005201",
    actualRiderIqama: "2999005201",
    operationMode: "salary_tiers",
    plateNumber: "JED-5201",
    vehicleSerial: "VH-5201",
  };

  const timeline = CurrentAssignmentsViewModel.buildAssignmentTimeline(row, {
    assignmentHistory: [
      {
        id: "history-tl-1",
        dashboardUserId: "5201",
        action: "swap",
        actionDate: "2026-07-12",
        previousRiderIqama: "2999005000",
        newRiderIqama: "2999005201",
        after: { operationMode: "salary_tiers", assignmentStatus: "active", vehicleSerial: "VH-5201", plateNumber: "JED-5201" }
      }
    ],
    auditLogs: [
      {
        id: "audit-tl-1",
        action: "swap_confirmed",
        entityId: "assignment-tl-1",
        timestamp: "2026-07-12T08:00:00.000Z",
        after: { actualRiderIqama: "2999005201", operationMode: "salary_tiers", assignmentStatus: "active" },
        reason: "approved"
      }
    ],
    terminations: [
      {
        id: "term-tl-1",
        dashboardUserId: "5201",
        riderIqama: "2999005201",
        terminationDate: "2026-07-13",
        statusAfter: "terminated",
        reason: "manual termination"
      }
    ]
  }, { limit: 10 });

  assert.strictEqual(timeline.length, 3);
  assert.strictEqual(timeline[0].eventTime, "2026-07-13");
  assert.ok(timeline.some((item) => item.eventType === "swap"));
  assert.ok(timeline.some((item) => item.auditEventId === "audit-tl-1"));
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
