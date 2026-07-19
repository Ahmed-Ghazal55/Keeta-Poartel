const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createAuditLogService } = require("../src/data/auditLog.js");

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
  return { auditLog, dataStore };
}

const actor = {
  email: "",
  id: "ops-admin",
  role: "operations_admin"
};

const results = [];

results.push(test("rejects forbidden UI event types", () => {
  const runtime = buildRuntime();
  const created = runtime.auditLog.createAuditEvent({
    actor,
    entityId: "dashboard",
    entityType: "pages",
    eventType: "page_opened",
    idempotencyKey: "page_opened:dashboard",
    source: "operations-shell"
  });
  assert.strictEqual(created, null);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, 0);
}));

results.push(test("rejects allowed business event without actor or idempotency key", () => {
  const runtime = buildRuntime();
  assert.strictEqual(runtime.auditLog.createAuditEvent({
    entityId: "assignment-1",
    entityType: "assignments",
    eventType: "assignment_created",
    source: "operations_assignment"
  }), null);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, 0);
}));

results.push(test("accepts allowed business event and deduplicates by idempotency key", () => {
  const runtime = buildRuntime();
  const first = runtime.auditLog.createAuditEvent({
    actor,
    entityId: "assignment-1",
    entityType: "assignments",
    eventType: "assignment_created",
    idempotencyKey: "assignment_created:assignment-1",
    source: "operations_assignment"
  });
  const duplicate = runtime.auditLog.createAuditEvent({
    actor,
    entityId: "assignment-1",
    entityType: "assignments",
    eventType: "assignment_created",
    idempotencyKey: "assignment_created:assignment-1",
    source: "operations_assignment"
  });
  assert.ok(first);
  assert.strictEqual(first.id, duplicate.id);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, 1);
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("auditLogPolicy.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("auditLogPolicy.test.js passed:", results.length);
