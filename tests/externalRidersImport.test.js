const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createAuditLogService } = require("../src/data/auditLog.js");
const RBAC = require("../src/auth/rbac.js");
const { createImportRegistry } = require("../src/import/importRegistry.js");
const { readDelimitedText } = require("../src/import/csvReader.js");
const { createImportBatchService } = require("../src/import/importBatchService.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function createRuntime(seed) {
  const memoryStore = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memoryStore,
    fallbackAdapter: memoryStore
  });
  const auditLog = createAuditLogService(dataStore);
  const importRegistry = createImportRegistry({ dataStore });
  const importBatchService = createImportBatchService({
    auditLog,
    dataStore,
    importRegistry,
    rbac: RBAC
  });
  dataStore.seedCollections(Object.assign({
    auditLogs: [],
    externalRiders: [],
    hrProfiles: [],
    importBatches: [],
    riderOperationalProfiles: [],
    riders: []
  }, seed || {}));
  return { auditLog, dataStore, importBatchService };
}

function createSuperAdmin() {
  return {
    id: "super-admin",
    role: "super_admin",
    cityScope: "all",
    selectedCities: ["جدة", "الرياض"],
    registerScope: "all",
    selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
    permissions: []
  };
}

function buildAnalysis(csvText) {
  const tableSummary = readDelimitedText("external_riders.csv", csvText, {});
  return {
    extension: ".csv",
    fileName: "external_riders.csv",
    rowCount: tableSummary.rowCount,
    tableSummary
  };
}

function buildExternalCsv(iqama) {
  return [
    "Timestamp,رقم اقامة المندوب,اسم المندوب,رقم جوال التواصل,نوع المندوب / نوع البديل,نوع المركبة,كارت بنزين,عهدة الادوات,الجنسية,رقم الجوال المسجل بالتطبيق للمندوب,رقم الايبان البنكي,المعرف,Email Address",
    "2026-07-15 09:15:00," + iqama + ",Mohammed Adel,966550001122,خارجي,Car,Yes,Bag + Uniform,Egyptian,966550009988,SA0380000000608010167519,1782999000112233,supervisor.ops@example.com"
  ].join("\n");
}

const results = [];

results.push(test("external riders preview does not mutate lifecycle master entities", () => {
  const runtime = createRuntime();
  const preview = runtime.importBatchService.createPreviewBatch({
    analysis: buildAnalysis(buildExternalCsv("2444333222")),
    manualMapping: {
      fileType: "external_riders_csv",
      city: "جدة",
      register: "EXPRESS",
      month: "2026-07",
      targetEntity: "externalRiders"
    },
    user: createSuperAdmin()
  });

  assert.strictEqual(preview.status, "preview");
  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 0);
  assert.strictEqual(runtime.dataStore.getAll("riderOperationalProfiles").length, 0);
  assert.strictEqual(runtime.dataStore.getAll("riders").length, 0);
}));

results.push(test("external riders save skips external identity when iqama already exists in HR", () => {
  const runtime = createRuntime({
    hrProfiles: [{
      id: "hr-1",
      iqama: "2444333222",
      fullNameArabic: "محمد عادل",
      city: "جدة",
      register: "EXPRESS",
      status: "active"
    }]
  });

  const saved = runtime.importBatchService.saveImportBatch({
    analysis: buildAnalysis(buildExternalCsv("2444333222")),
    manualMapping: {
      fileType: "external_riders_csv",
      city: "جدة",
      register: "EXPRESS",
      month: "2026-07",
      targetEntity: "externalRiders"
    },
    user: createSuperAdmin()
  });

  assert.strictEqual(saved.status, "saved");
  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 0);
  assert.strictEqual(runtime.dataStore.getAll("riderOperationalProfiles").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riders").length, 0);
  assert.ok((saved.normalizerWarnings || []).some((item) => String(item).indexOf("hr_rider_not_saved_as_external") >= 0));
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "import_batch_saved").length, 1);
}));

results.push(test("external riders save writes only externalRiders and riderOperationalProfiles for non-HR riders", () => {
  const runtime = createRuntime();

  const saved = runtime.importBatchService.saveImportBatch({
    analysis: buildAnalysis(buildExternalCsv("2555444333")),
    manualMapping: {
      fileType: "external_riders_csv",
      city: "جدة",
      register: "EXPRESS",
      month: "2026-07",
      targetEntity: "externalRiders"
    },
    user: createSuperAdmin()
  });

  assert.strictEqual(saved.status, "saved");
  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riderOperationalProfiles").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riders").length, 0);
  assert.deepStrictEqual(saved.persistedEntities.sort(), ["externalRiders", "riderOperationalProfiles"].sort());
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
