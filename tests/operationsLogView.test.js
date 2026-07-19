const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createRepositories } = require("../src/data/repositories.js");
const { createAuditLogService } = require("../src/data/auditLog.js");
const { createOperationsLogView } = require("../src/operations/operationsLogView.js");

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
  const view = createOperationsLogView({
    pageSize: 2,
    repository: repositories.auditLogs
  });
  return { auditLog, dataStore, view };
}

const actor = { id: "ops-admin", role: "operations_admin" };
const results = [];

results.push(test("operations log view filters and paginates without writing logs", () => {
  const runtime = buildRuntime();
  runtime.auditLog.createAuditEvent({
    actor,
    context: { city: "\u062c\u062f\u0629", register: "EXPRESS" },
    entityId: "assignment-1",
    entityType: "assignments",
    eventType: "assignment_created",
    idempotencyKey: "assignment_created:assignment-1",
    source: "operations_assignment"
  });
  runtime.auditLog.createAuditEvent({
    actor,
    context: { city: "\u0627\u0644\u0631\u064a\u0627\u0636", register: "TOGARY" },
    entityId: "termination-1",
    entityType: "terminations",
    eventType: "termination_created",
    idempotencyKey: "termination_created:termination-1",
    source: "operations_termination"
  });
  runtime.auditLog.createAuditEvent({
    actor,
    context: { city: "\u062c\u062f\u0629", register: "EXPRESS" },
    entityId: "vehicle-1",
    entityType: "vehicles",
    eventType: "vehicle_excluded",
    idempotencyKey: "vehicle_excluded:vehicle-1",
    source: "fleet_module"
  });

  const beforeCount = runtime.dataStore.getAll("auditLogs").length;
  const pageOne = runtime.view.listEvents({ city: "\u062c\u062f\u0629" }, { page: 1, pageSize: 2 });
  const filtered = runtime.view.listEvents({ eventType: "vehicle_excluded" }, { page: 1, pageSize: 10 });

  assert.strictEqual(pageOne.items.length, 2);
  assert.strictEqual(pageOne.total, 2);
  assert.strictEqual(filtered.items.length, 1);
  assert.strictEqual(filtered.items[0].action, "vehicle_excluded");
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, beforeCount);
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("operationsLogView.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("operationsLogView.test.js passed:", results.length);
