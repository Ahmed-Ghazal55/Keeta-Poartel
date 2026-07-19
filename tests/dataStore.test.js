const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createBrowserLocalStore } = require("../src/data/browserLocalStore.js");
const { createDataStore } = require("../src/data/dataStore.js");

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

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const memoryStore = createMemoryStore();
const sharedStorage = createMockStorage();
const browserStore = createBrowserLocalStore({
  backupAdapter: memoryStore,
  prefix: "prompt2.dataStoreTest",
  storage: sharedStorage
});
const dataStore = createDataStore({
  fallbackAdapter: memoryStore,
  primaryAdapter: browserStore
});

const results = [];

results.push(test("save and getAll persist collection rows", () => {
  dataStore.save("dashboardUsers", [
    { id: "u1", userId: "1001", city: "جدة", register: "EXPRESS", status: "working" },
    { id: "u2", userId: "1002", city: "الرياض", register: "TOGARY", status: "idle" }
  ]);
  assert.strictEqual(dataStore.getAll("dashboardUsers").length, 2);
}));

results.push(test("upsert updates existing records and create new ones", () => {
  dataStore.upsert("dashboardUsers", { id: "u1", userId: "1001", status: "paused" });
  dataStore.upsert("dashboardUsers", { id: "u3", userId: "1003", city: "جدة", register: "ALBAWABA", status: "working" });
  assert.strictEqual(dataStore.findById("dashboardUsers", "u1").status, "paused");
  assert.strictEqual(dataStore.findById("dashboardUsers", "u3").register, "ALBAWABA");
}));

results.push(test("remove deletes matching record ids", () => {
  dataStore.remove("dashboardUsers", "u2");
  assert.strictEqual(dataStore.findById("dashboardUsers", "u2"), null);
}));

results.push(test("query supports direct equality and contains filters", () => {
  const exact = dataStore.query("dashboardUsers", { city: "جدة" });
  const contains = dataStore.query("dashboardUsers", { userId: { op: "contains", value: "100" } });
  assert.ok(exact.length >= 1);
  assert.ok(contains.length >= 1);
}));

results.push(test("browser adapter fallback metadata and persistence info are available", () => {
  const info = dataStore.getAdapterInfo();
  assert.strictEqual(info.active, "browserLocalStorage");
  assert.strictEqual(info.persistent, true);
}));

results.push(test("records persist after reload with the same browser storage", () => {
  const reloadedStore = createDataStore({
    fallbackAdapter: memoryStore,
    primaryAdapter: createBrowserLocalStore({
      backupAdapter: memoryStore,
      prefix: "prompt2.dataStoreTest",
      storage: sharedStorage
    })
  });
  assert.ok(reloadedStore.getAll("dashboardUsers").length >= 1);
}));

results.push(test("basic migration summary is exposed", () => {
  const migration = dataStore.getMigrationSummary();
  assert.strictEqual(migration.toVersion, 1);
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
