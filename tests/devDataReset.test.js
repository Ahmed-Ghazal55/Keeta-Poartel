const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createAuditLogService } = require("../src/data/auditLog.js");
const DevDataReset = require("../src/data/devDataReset.js");
const { createLocalDb } = require("../server/localDb.js");
const { resetLocalDb } = require("../server/resetLocalDb.js");

function test(name, handler) {
  try {
    const value = handler();
    if (value && typeof value.then === "function") {
      return value.then(() => ({ name, status: "passed" })).catch((error) => ({
        name,
        status: "failed",
        error: error.message
      }));
    }
    return Promise.resolve({ name, status: "passed" });
  } catch (error) {
    return Promise.resolve({ name, status: "failed", error: error.message });
  }
}

function createRuntime() {
  const memory = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memory,
    fallbackAdapter: memory
  });
  const auditLog = createAuditLogService(dataStore);
  dataStore.save("dashboardUsers", [{ id: "user_1", dashboardUserId: "1001" }]);
  dataStore.save("importBatches", [{ id: "batch_1", status: "saved" }]);
  dataStore.save("monthlyRules", [{ id: "rule_1", month: "2026-07" }]);
  dataStore.save("notifications", [{ id: "notif_1", title: "Seeded" }]);
  dataStore.save("cities", [{ id: "city_jeddah", name: "جدة", code: "JED" }]);
  dataStore.save("registers", [{ id: "register_express", code: "EXPRESS", name: "EXPRESS GATE Company" }]);
  return { auditLog, dataStore };
}

function createDevUser() {
  return {
    id: "super-admin",
    role: "super_admin",
    selectedCities: ["\u062c\u062f\u0629"],
    selectedRegisters: ["EXPRESS"]
  };
}

async function run() {
  const results = [];

  results.push(await test("browser reset clears operational collections and keeps demo seed disabled", async () => {
    const runtime = createRuntime();
    const service = DevDataReset.createDevDataResetService({
      auditLog: runtime.auditLog,
      dataStore: runtime.dataStore,
      nowProvider: () => new Date("2026-07-13T12:00:00.000Z")
    });

    const summary = await service.resetBrowserData({
      note: "Prompt 8 reset verification",
      user: createDevUser()
    });

    assert.strictEqual(summary.mode, "browser");
    assert.strictEqual(runtime.dataStore.getAll("dashboardUsers").length, 0);
    assert.strictEqual(runtime.dataStore.getAll("importBatches").length, 0);
    assert.strictEqual(runtime.dataStore.getAll("monthlyRules").length, 0);
    assert.strictEqual(runtime.dataStore.getAll("notifications").length, 0);
    assert.strictEqual(runtime.dataStore.getAll("cities").length, 1);
    assert.strictEqual(runtime.dataStore.getMeta(DevDataReset.DEMO_SEED_META_KEY), true);

    const auditRows = runtime.dataStore.getAll("auditLogs");
    assert.ok(auditRows.some((row) => row.action === "dev_data_reset_requested"));
    assert.ok(auditRows.some((row) => row.action === "dev_data_reset_completed"));
  }));

  results.push(await test("node local DB reset clears target JSON collections and reseeds auth core", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "keeta-reset-"));
    const localDb = createLocalDb({
      backupRoot: path.join(tempRoot, "backups"),
      dataDir: path.join(tempRoot, "local-db")
    });

    localDb.writeCollection("dashboardUsers", [{ id: "user_1" }]);
    localDb.writeCollection("vehicles", [{ id: "vehicle_1" }]);
    localDb.writeCollection("notifications", [{ id: "notif_1" }]);
    localDb.writeCollection("users", [{ id: "custom_user" }]);
    localDb.writeCollection("roles", [{ id: "custom_role" }]);

    const result = resetLocalDb({
      backupBeforeReset: true,
      dataDir: localDb.dataDir,
      entityNames: ["dashboardUsers", "vehicles", "notifications", "auditLogs", "sessions"],
      localDb
    });

    assert.strictEqual(result.status, "completed");
    assert.ok(result.backupDirectory);
    assert.strictEqual(localDb.readCollection("dashboardUsers").length, 0);
    assert.strictEqual(localDb.readCollection("vehicles").length, 0);
    assert.strictEqual(localDb.readCollection("notifications").length, 0);
    assert.ok(Array.isArray(localDb.readCollection("users")));
    assert.ok(Array.isArray(localDb.readCollection("roles")));
  }));

  results.push(await test("service falls back safely when Node local DB reset is unavailable", async () => {
    const runtime = createRuntime();
    const service = DevDataReset.createDevDataResetService({
      auditLog: runtime.auditLog,
      dataStore: runtime.dataStore
    });

    const nodeSummary = await service.resetNodeLocalDb({ user: createDevUser() });
    assert.strictEqual(nodeSummary.status, "skipped");
    assert.strictEqual(nodeSummary.note, "local_db_unavailable");
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
}

run();
