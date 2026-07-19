const assert = require("assert");
const fs = require("fs");
const path = require("path");
const AuditPolicy = require("../src/audit/auditPolicy.js");
const { createAssignmentService } = require("../src/operations/assignmentService.js");
const { createSwapService } = require("../src/operations/swapService.js");
const { createTerminationService } = require("../src/operations/terminationService.js");
const {
  buildAssignment,
  buildDashboardUser,
  buildRider,
  buildVehicleUsage,
  createOperationsAdmin,
  createOrganizationContext,
  createRuntime,
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

function createServices(seed) {
  const runtime = createRuntime(seed);
  return {
    assignmentService: createAssignmentService(runtime),
    runtime,
    swapService: createSwapService(runtime),
    terminationService: createTerminationService(runtime),
  };
}

const results = [];

results.push(test("first assignment stores normalized assignment state and opens vehicle usage with one audit", () => {
  const admin = createOperationsAdmin();
  const orgContext = createOrganizationContext();
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "8101",
    ownerIqama: "2444810101",
    ownerName: "Salem Ready",
    status: "needs_assignment",
  });
  const rider = buildRider({
    id: "rider-ready-1",
    primaryIqama: "2999810101",
    displayName: "First Assignment Rider",
  });
  const { assignmentService, runtime } = createServices({
    dashboardUsers: [dashboardUser],
    riders: [rider],
  });

  const result = assignmentService.assignRider({
    dashboardUserId: "8101",
    actualVehicle: "Toyota Yaris",
    firstOnlineDate: "2026-07-16",
    iqama: rider.primaryIqama,
    operationMode: "per order",
    plateNumber: "JED-8101",
    riderId: rider.id,
    riderName: rider.displayName,
    riderReceiveDate: "2026-07-15",
    startDate: "2026-07-15",
    supervisor: "Lead Assign",
    user: admin,
    vehicleSerial: "VH-8101",
    vehicleType: "car",
    organizationContext: orgContext,
  });

  const assignments = runtime.dataStore.getAll("assignments");
  const dashboardUsers = runtime.dataStore.getAll("dashboardUsers");
  const usage = runtime.dataStore.getAll("riderVehicleUsageHistory");
  const audits = runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "assignment_created");

  assert.strictEqual(assignments.length, 1);
  assert.strictEqual(assignments[0].actualRiderIqama, "2999810101");
  assert.strictEqual(assignments[0].riderSource, "External");
  assert.strictEqual(assignments[0].operationMode, "per_order");
  assert.strictEqual(assignments[0].riderReceiveDate, "2026-07-15");
  assert.strictEqual(assignments[0].firstOnlineDate, "2026-07-16");
  assert.strictEqual(assignments[0].actualVehicle, "Toyota Yaris");
  assert.strictEqual(assignments[0].vehicleSerial, "VH-8101");
  assert.strictEqual(assignments[0].plateNumber, "JED-8101");
  assert.strictEqual(usage.length, 1);
  assert.strictEqual(usage[0].active, true);
  assert.strictEqual(usage[0].vehicleSerial, "VH-8101");
  assert.strictEqual(dashboardUsers[0].currentAssignmentId, result.assignment.id);
  assert.strictEqual(dashboardUsers[0].currentRiderIqama, "2999810101");
  assert.strictEqual(audits.length, 1);
}));

results.push(test("swap closes the old assignment, opens the new assignment, and audits once", () => {
  const admin = createOperationsAdmin();
  const orgContext = createOrganizationContext();
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "8102",
    currentRiderId: "rider-old-8102",
    currentRiderIqama: "2999810201",
    currentAssignmentId: "assignment-8102-old",
    assignmentStatus: "active",
    status: "assigned",
  });
  const { swapService, runtime } = createServices({
    assignments: [
      buildAssignment({
        id: "assignment-8102-old",
        assignmentId: "assignment-8102-old",
        dashboardUserId: "8102",
        riderId: "rider-old-8102",
        riderIqama: "2999810201",
        actualRiderIqama: "2999810201",
        vehicleSerial: "OLD-8102",
        plateNumber: "OLD-PLATE-8102",
      }),
    ],
    dashboardUsers: [dashboardUser],
    riderVehicleUsageHistory: [
      buildVehicleUsage({
        id: "usage-8102-old",
        riderIqama: "2999810201",
        riderName: "Old Rider 8102",
        vehicleSerial: "OLD-8102",
        plateNumber: "OLD-PLATE-8102",
      }),
    ],
    riders: [
      buildRider({ id: "rider-old-8102", primaryIqama: "2999810201", displayName: "Old Rider 8102" }),
      buildRider({ id: "rider-new-8102", primaryIqama: "2999810202", displayName: "New Rider 8102" }),
    ],
  });

  const result = swapService.swapRider({
    dashboardUserId: "8102",
    newRiderId: "rider-new-8102",
    newRiderIqama: "2999810202",
    newRiderName: "New Rider 8102",
    operationMode: "replacement",
    plateNumber: "NEW-PLATE-8102",
    previousRiderId: "rider-old-8102",
    riderReceiveDate: "2026-07-16",
    swapDate: "2026-07-16",
    reason: "coverage swap",
    user: admin,
    vehicleSerial: "NEW-8102",
    vehicleType: "car",
    organizationContext: orgContext,
  });

  const assignments = runtime.dataStore.getAll("assignments");
  const audits = runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "swap_confirmed");

  assert.strictEqual(assignments.filter((item) => item.status === "ended").length, 1);
  assert.strictEqual(assignments.filter((item) => item.status === "active").length, 1);
  assert.strictEqual(result.newAssignment.operationMode, "replacement");
  assert.strictEqual(result.vehicleUsage.closed.length, 1);
  assert.strictEqual(result.vehicleUsage.closed[0].active, false);
  assert.strictEqual(result.vehicleUsage.opened.vehicleSerial, "NEW-8102");
  assert.strictEqual(audits.length, 1);
}));

results.push(test("stop without replacement closes active state, preserves history, and audits once", () => {
  const admin = createOperationsAdmin();
  const orgContext = createOrganizationContext();
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "8103",
    currentRiderId: "rider-stop-8103",
    currentRiderIqama: "2999810301",
    currentAssignmentId: "assignment-8103",
    assignmentStatus: "active",
    status: "assigned",
  });
  const { runtime, terminationService } = createServices({
    assignments: [
      buildAssignment({
        id: "assignment-8103",
        assignmentId: "assignment-8103",
        dashboardUserId: "8103",
        riderId: "rider-stop-8103",
        riderIqama: "2999810301",
        actualRiderIqama: "2999810301",
      }),
    ],
    dashboardUsers: [dashboardUser],
    riderVehicleUsageHistory: [
      buildVehicleUsage({
        id: "usage-8103",
        riderIqama: "2999810301",
        vehicleSerial: "STOP-8103",
        plateNumber: "STOP-PLATE-8103",
      }),
    ],
    riders: [
      buildRider({ id: "rider-stop-8103", primaryIqama: "2999810301", displayName: "Stop Rider 8103" }),
    ],
  });

  const result = terminationService.terminateUser({
    dashboardUserId: "8103",
    action: "stop_without_replacement",
    reason: "coverage stop",
    terminationDate: "2026-07-17",
    user: admin,
    organizationContext: orgContext,
  });

  const dashboardUsers = runtime.dataStore.getAll("dashboardUsers");
  const audits = runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "stop_without_replacement_confirmed");

  assert.strictEqual(result.termination.statusAfter, "not_working");
  assert.strictEqual(result.vehicleUsage.length, 1);
  assert.strictEqual(result.vehicleUsage[0].active, false);
  assert.strictEqual(runtime.dataStore.getAll("assignmentHistory").length, 1);
  assert.strictEqual(dashboardUsers[0].currentAssignmentId, "");
  assert.strictEqual(dashboardUsers[0].currentRiderIqama, "");
  assert.strictEqual(dashboardUsers[0].lifecycleStatus, "ready_for_assignment");
  assert.strictEqual(audits.length, 1);
}));

results.push(test("read-only current assignment preparation remains phantom and UI-side audit free", () => {
  const drawerOpen = AuditPolicy.classifyAuditRecord({
    action: "assignment_updated",
    actorUserId: "viewer",
    entity: "assignments",
    entityId: "assignment-readonly-1",
    reason: "Opened first assignment drawer",
    source: "drawer_open"
  });
  const resolverLookup = AuditPolicy.classifyAuditRecord({
    action: "assignment_updated",
    actorUserId: "viewer",
    entity: "assignments",
    entityId: "assignment-readonly-1",
    reason: "Resolver lookup before assignment confirmation",
    source: "readonly_resolver_lookup"
  });
  const searchTyping = AuditPolicy.classifyAuditRecord({
    action: "assignment_updated",
    actorUserId: "viewer",
    entity: "assignments",
    entityId: "assignment-readonly-1",
    reason: "Typed rider iqama in first assignment search",
    source: "filter_input"
  });

  assert.strictEqual(drawerOpen.isPhantom, true);
  assert.strictEqual(resolverLookup.isPhantom, true);
  assert.strictEqual(searchTyping.isPhantom, true);
  assert.ok(!operationsUi.includes("createAuditEvent("));
  assert.ok(operationsUi.includes('if (action === "assign") {'));
  assert.ok(operationsUi.includes("renderAssignDrawer(user)"));
  assert.ok(operationsUi.includes("submitAssignment(form)"));
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
