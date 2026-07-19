const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createAuditLogService } = require("../src/data/auditLog.js");
const { createRepositories } = require("../src/data/repositories.js");
const { createNotificationCenter } = require("../src/notifications/notificationCenter.js");
const { createFleetOperationsIntegration } = require("../src/fleet/fleetOperationsIntegration.js");
const { createAssignmentService } = require("../src/operations/assignmentService.js");
const {
  buildDashboardUser,
  buildRider,
  createOperationsAdmin,
  createOrganizationContext
} = require("./helpers/operationsTestHelpers.js");
const RBAC = require("../src/auth/rbac.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

function buildRuntime() {
  const memory = createMemoryStore();
  const dataStore = createDataStore({
    fallbackAdapter: memory,
    primaryAdapter: memory
  });
  const auditLog = createAuditLogService(dataStore);
  const repositories = createRepositories(dataStore);
  const notificationCenter = createNotificationCenter({
    repositories
  });
  const fleetIntegration = createFleetOperationsIntegration({
    auditLog,
    rbac: RBAC,
    repositories
  });
  dataStore.save("dashboardUsers", [
    buildDashboardUser({
      dashboardUserId: "1001",
      plateNumber: "JED-1001",
      vehicleSerial: "JED-CAR-1001"
    })
  ]);
  dataStore.save("riders", [
    buildRider({ id: "rider-1", primaryIqama: "299900001" })
  ]);
  dataStore.save("vehicles", [
    {
      id: "vehicle_1",
      city: "\u062c\u062f\u0629",
      currentCity: "\u062c\u062f\u0629",
      plateNumber: "JED-1001",
      register: "EXPRESS",
      registrationType: "Public Transport",
      status: "available",
      targetedBranch: "EXPRESS",
      vehicleSerial: "JED-CAR-1001",
      vehicleType: "car"
    }
  ]);
  return {
    assignmentService: createAssignmentService({
      auditLog,
      dataStore,
      fleetIntegration,
      repositories
    }),
    auditLog,
    dataStore,
    fleetIntegration,
    notificationCenter
  };
}

const results = [];

results.push(test("read paths do not create audit records", () => {
  const runtime = buildRuntime();
  runtime.dataStore.getAll("dashboardUsers");
  runtime.auditLog.listRecent(10);
  runtime.notificationCenter.syncDerivedNotifications({
    importBatches: [{ id: "batch_1", status: "saved" }]
  });
  runtime.fleetIntegration.rebuildDerivedCollections({
    user: createOperationsAdmin()
  });
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, 0);
}));

results.push(test("confirmed assignment creates exactly one audit record", () => {
  const runtime = buildRuntime();
  runtime.assignmentService.assignRider({
    dashboardUserId: "1001",
    iqama: "299900001",
    organizationContext: createOrganizationContext(),
    startDate: "2026-07-14",
    user: createOperationsAdmin()
  });
  const auditRows = runtime.dataStore.getAll("auditLogs");
  assert.strictEqual(auditRows.length, 1);
  assert.strictEqual(auditRows[0].action, "assignment_created");
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("auditLogFlood.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("auditLogFlood.test.js passed:", results.length);
