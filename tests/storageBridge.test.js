const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createBrowserLocalStore } = require("../src/data/browserLocalStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createStorageBridge } = require("../src/data/storageBridge.js");
const { createDevServer } = require("../server/devServer.js");

function createMockStorage() {
  const bag = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null;
    },
    removeItem(key) {
      delete bag[key];
    },
    setItem(key, value) {
      bag[key] = String(value);
    }
  };
}

async function run() {
  const results = [];

  async function test(name, handler) {
    try {
      await handler();
      results.push({ name, status: "passed" });
    } catch (error) {
      results.push({ name, status: "failed", error: error.message });
    }
  }

  await test("bridge falls back cleanly when no fetch implementation is supplied", async () => {
    const memoryStore = createMemoryStore();
    const dataStore = createDataStore({
      fallbackAdapter: memoryStore,
      primaryAdapter: createBrowserLocalStore({
        backupAdapter: memoryStore,
        prefix: "storageBridge.noFetch",
        storage: createMockStorage()
      })
    });
    const bridge = createStorageBridge({
      dataStore,
      fetchImpl: null
    });
    const status = await bridge.refreshStatus();
    assert.strictEqual(status.label, "Browser Local");
  });

  await test("bridge reports API unavailable fallback when remote health checks fail", async () => {
    const memoryStore = createMemoryStore();
    const dataStore = createDataStore({
      fallbackAdapter: memoryStore,
      primaryAdapter: createBrowserLocalStore({
        backupAdapter: memoryStore,
        prefix: "storageBridge.fallback",
        storage: createMockStorage()
      })
    });
    const bridge = createStorageBridge({
      dataStore,
      fetchImpl: async function () {
        throw new Error("connect ECONNREFUSED");
      }
    });
    const status = await bridge.refreshStatus();
    assert.strictEqual(status.label, "API unavailable / fallback mode");
  });

  await test("refreshStatus reuses the recent status cache to avoid repeated health checks", async () => {
    const memoryStore = createMemoryStore();
    const dataStore = createDataStore({
      fallbackAdapter: memoryStore,
      primaryAdapter: createBrowserLocalStore({
        backupAdapter: memoryStore,
        prefix: "storageBridge.cache",
        storage: createMockStorage()
      })
    });
    let fetchCount = 0;
    const bridge = createStorageBridge({
      dataStore,
      fetchImpl: async function () {
        fetchCount += 1;
        return {
          ok: true,
          async json() {
            return { ok: true };
          }
        };
      },
      statusCacheTtlMs: 60000
    });

    await bridge.refreshStatus();
    await bridge.refreshStatus();
    assert.strictEqual(fetchCount, 1);
  });

  await test("bridge persists browser collections into the node local db when API is available", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "keeta-storage-bridge-"));
    const dataDir = path.join(tmpRoot, "db");
    const backupRoot = path.join(tmpRoot, "backups");
    const runtime = createDevServer({ backupRoot, dataDir });
    await new Promise((resolve) => runtime.server.listen(0, resolve));
    const port = runtime.server.address().port;

    const memoryStore = createMemoryStore();
    const sharedStorage = createMockStorage();
    const dataStore = createDataStore({
      fallbackAdapter: memoryStore,
      primaryAdapter: createBrowserLocalStore({
        backupAdapter: memoryStore,
        prefix: "storageBridge.node",
        storage: sharedStorage
      })
    });
    dataStore.save("dashboardUsers", [
      { id: "dash_1", userId: "1001", city: "Jeddah", register: "EXPRESS", status: "working" }
    ]);

    const bridge = createStorageBridge({
      apiBaseUrl: "http://127.0.0.1:" + port + "/api",
      dataStore,
      entityNames: ["dashboardUsers"],
      fetchImpl: fetch
    });

    const status = await bridge.initialize(["dashboardUsers"]);
    assert.strictEqual(status.label, "Node Local DB");
    assert.strictEqual(runtime.localDb.readCollection("dashboardUsers").length, 1);

    dataStore.save("dashboardUsers", [
      { id: "dash_1", userId: "1001", city: "Jeddah", register: "EXPRESS", status: "working" },
      { id: "dash_2", userId: "1002", city: "Riyadh", register: "TOGARY", status: "paused" }
    ]);
    await bridge.persistCollections(["dashboardUsers"]);
    assert.strictEqual(runtime.localDb.readCollection("dashboardUsers").length, 2);

    runtime.server.close();
  });

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

run().catch((error) => {
  console.error(JSON.stringify({
    summary: { total: 1, passed: 0, failed: 1 },
    results: [{ name: "storage bridge", status: "failed", error: error.message }]
  }, null, 2));
  process.exitCode = 1;
});
