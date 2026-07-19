const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createAuditLogService } = require("../src/data/auditLog.js");
const { createRepositories } = require("../src/data/repositories.js");
const RBAC = require("../src/auth/rbac.js");
const { createFleetOperationsIntegration } = require("../src/fleet/fleetOperationsIntegration.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function buildRuntime() {
  const memory = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memory,
    fallbackAdapter: memory
  });
  const repositories = createRepositories(dataStore);
  const auditLog = createAuditLogService(dataStore);

  dataStore.save("vehicles", [
    {
      id: "vehicle_1",
      vehicleSerial: "JED-CAR-1001",
      plateNumber: "JED-1001",
      vehicleType: "car",
      registrationType: "Public Transport",
      currentCity: "جدة",
      city: "جدة",
      register: "EXPRESS",
      targetedBranch: "EXPRESS",
      status: "available"
    },
    {
      id: "vehicle_2",
      vehicleSerial: "RUH-CAR-2001",
      plateNumber: "RUH-2001",
      vehicleType: "car",
      registrationType: "Private Transport",
      currentCity: "الرياض",
      city: "الرياض",
      register: "TOGARY",
      targetedBranch: "TOGARY",
      status: "maintenance"
    }
  ]);

  dataStore.save("dashboardUsers", [
    {
      id: "dashboard_user_1",
      dashboardUserId: "1782916129257495",
      userId: "1782916129257495",
      city: "جدة",
      register: "EXPRESS",
      vehicleSerial: "JED-CAR-1001",
      plateNumber: "JED-1001",
      currentRiderIqama: "2444000011"
    },
    {
      id: "dashboard_user_2",
      dashboardUserId: "1782831407480165",
      userId: "1782831407480165",
      city: "جدة",
      register: "EXPRESS",
      vehicleSerial: "RUH-CAR-2001",
      plateNumber: "RUH-2001",
      currentRiderIqama: "2444000022"
    }
  ]);

  dataStore.save("vehicleMovementEvents", [
    {
      id: "movement_1",
      vehicleSerial: "JED-CAR-1001",
      eventDate: "2026-07-01",
      currentUserIqama: "2444000011",
      status: "available"
    }
  ]);

  const integration = createFleetOperationsIntegration({
    auditLog,
    rbac: RBAC,
    repositories
  });

  return { auditLog, dataStore, integration, repositories };
}

const fleetOfficer = {
  id: "fleet_1",
  role: "fleet_officer",
  cityScope: "single",
  selectedCities: ["جدة"],
  registerScope: "single",
  selectedRegisters: ["EXPRESS"],
  permissions: []
};

const operationsAdmin = {
  id: "ops_1",
  role: "operations_admin",
  cityScope: "all",
  selectedCities: ["جدة", "الرياض"],
  registerScope: "all",
  selectedRegisters: ["EXPRESS", "TOGARY"],
  permissions: []
};

const results = [];

results.push(test("rebuildDerivedCollections creates fleet review entities", () => {
  const runtime = buildRuntime();
  const summary = runtime.integration.rebuildDerivedCollections({ user: fleetOfficer });
  assert.strictEqual(summary.assignments.length, 2);
  assert.strictEqual(runtime.repositories.vehicleAssignments.all().length, 2);
  assert.strictEqual(runtime.repositories.vehicleCapacityReviews.all().length, 2);
  assert.ok(runtime.repositories.vehicleComplianceIssues.all().length >= 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, 0);
}));

results.push(test("validateVehicleBeforeAssignment blocks invalid fleet usage at service layer", () => {
  const runtime = buildRuntime();
  runtime.integration.rebuildDerivedCollections({ user: fleetOfficer });
  const result = runtime.integration.validateVehicleBeforeAssignment(
    runtime.repositories.dashboardUsers.findById("dashboard_user_2"),
    { id: "rider_2", primaryIqama: "2444000022" },
    runtime.repositories.vehicles.findById("vehicle_2"),
    { user: operationsAdmin }
  );
  assert.strictEqual(result.ok, false);
  assert.ok(result.blockingIssues.includes("private_transport_not_assignable"));
  assert.ok(result.blockingIssues.includes("excluded_vehicle_status"));
}));

results.push(test("markVehicleUnderReview and excludeVehicle create audit entries", () => {
  const runtime = buildRuntime();
  runtime.integration.markVehicleUnderReview({
    vehicleId: "vehicle_1",
    note: "Needs manual review",
    user: fleetOfficer
  });
  runtime.integration.excludeVehicle({
    vehicleId: "vehicle_1",
    reason: "excluded",
    user: fleetOfficer
  });

  const actions = runtime.dataStore.getAll("auditLogs").map((item) => item.action);
  assert.ok(actions.includes("vehicle_marked_under_review"));
  assert.ok(actions.includes("vehicle_excluded"));
}));

results.push(test("exportVehicleReport is permission and scope aware", () => {
  const runtime = buildRuntime();
  const report = runtime.integration.exportVehicleReport("vehicle_1", fleetOfficer);
  assert.strictEqual(report.vehicleSerial, "JED-CAR-1001");
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, 0);
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
