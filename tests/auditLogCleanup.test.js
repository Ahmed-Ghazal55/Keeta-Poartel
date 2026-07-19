const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createRepositories } = require("../src/data/repositories.js");
const { createAuditLogService } = require("../src/data/auditLog.js");
const { createAuditLogCleanup } = require("../src/audit/auditLogCleanup.js");

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
  const cleanup = createAuditLogCleanup({
    dataStore
  });
  return { auditLog, cleanup, dataStore, repositories };
}

const actor = { id: "ops-admin", role: "operations_admin" };
const results = [];

results.push(test("cleanup quarantines phantom and duplicate audit rows while keeping real events", () => {
  const runtime = buildRuntime();
  runtime.auditLog.createAuditEvent({
    actor,
    entityId: "assignment-1",
    entityType: "assignments",
    eventType: "assignment_created",
    idempotencyKey: "assignment_created:assignment-1",
    source: "operations_assignment"
  });
  runtime.dataStore.upsert("auditLogs", {
    action: "page_opened",
    entity: "pages",
    entityId: "dashboard",
    id: "audit_fake_1",
    note: "page render",
    source: "runtime_render",
    timestamp: "2026-07-14T10:00:00.000Z"
  });
  runtime.dataStore.upsert("auditLogs", {
    action: "assignment_created",
    entity: "assignments",
    entityId: "assignment-1",
    id: "audit_duplicate_1",
    idempotencyKey: "assignment_created:assignment-1",
    source: "operations_assignment",
    timestamp: "2026-07-14T10:05:00.000Z",
    userId: "ops-admin"
  });

  const summary = runtime.cleanup.cleanupExistingLogs();
  assert.strictEqual(summary.retainedCount, 1);
  assert.strictEqual(summary.movedCount, 2);
  assert.strictEqual(runtime.repositories.auditLogs.all().length, 1);
  assert.strictEqual(runtime.repositories.auditLogsQuarantine.all().length, 2);
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("auditLogCleanup.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("auditLogCleanup.test.js passed:", results.length);
