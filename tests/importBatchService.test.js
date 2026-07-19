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

function buildAnalysis() {
  const csv = [
    "User ID,Full Name,City,Company,Status,Vehicle Type",
    "1001,Ahmed Salem,Jeddah,EXPRESS GATE Company,active,car",
    "1002,Bader Ali,Jeddah,EXPRESS GATE Company,active,bike",
  ].join("\n");
  const tableSummary = readDelimitedText("Dash_EXPRESS.csv", csv, {});
  return {
    extension: ".csv",
    fileName: "Dash_EXPRESS.csv",
    rowCount: tableSummary.rowCount,
    tableSummary,
  };
}

function buildLowHeaderAnalysis() {
  const csv = [
    "Date,User ID",
    "2026-07-01,1001"
  ].join("\n");
  const tableSummary = readDelimitedText("Daily_Generic.csv", csv, {});
  return {
    extension: ".csv",
    fileName: "Daily_Generic.csv",
    rowCount: tableSummary.rowCount,
    tableSummary,
  };
}

const memoryStore = createMemoryStore();
const dataStore = createDataStore({
  primaryAdapter: memoryStore,
  fallbackAdapter: memoryStore,
});
const auditLog = createAuditLogService(dataStore);
const importRegistry = createImportRegistry({ dataStore });
const service = createImportBatchService({
  dataStore,
  auditLog,
  importRegistry,
  rbac: RBAC,
});

const superAdmin = {
  id: "user_super",
  role: "super_admin",
  cityScope: "all",
  selectedCities: ["\u062c\u062f\u0629", "\u0627\u0644\u0631\u064a\u0627\u0636"],
  registerScope: "all",
  selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
  permissions: []
};

const results = [];

results.push(test("creates preview batch", () => {
  const preview = service.createPreviewBatch({
    analysis: buildAnalysis(),
    defaults: { city: "\u062c\u062f\u0629", register: "EXPRESS", month: "2026-07" },
    user: superAdmin,
  });
  assert.strictEqual(preview.status, "preview");
  assert.strictEqual(dataStore.getAll("importBatches").length >= 1, true);
}));

results.push(test("saves import batch and records dashboard users and status reviews", () => {
  const saved = service.saveImportBatch({
    analysis: buildAnalysis(),
    defaults: { city: "\u062c\u062f\u0629", register: "EXPRESS", month: "2026-07" },
    user: superAdmin,
  });
  assert.strictEqual(saved.status, "saved");
  assert.strictEqual(saved.savedRecordCount, 4);
  assert.strictEqual(dataStore.getAll("dashboardUsers").length, 2);
  assert.strictEqual(dataStore.getAll("operationalStatusReviews").length, 2);
  assert.strictEqual(saved.batchStats.dashboardUsersCreated, 2);
  assert.strictEqual(saved.batchStats.operationalStatusReviewsCreated, 2);
  assert.strictEqual(dataStore.getAll("auditLogs").length, 1);
  assert.ok(dataStore.getAll("auditLogs").some((item) => item.action === "import_batch_saved"));
}));

results.push(test("rejects import batch", () => {
  const rejected = service.rejectImportBatch({
    analysis: buildAnalysis(),
    defaults: { city: "\u062c\u062f\u0629", register: "EXPRESS", month: "2026-07" },
    user: superAdmin,
  });
  assert.strictEqual(rejected.status, "rejected");
  assert.ok(dataStore.getAll("auditLogs").some((item) => item.action === "import_batch_rejected"));
}));

results.push(test("blocks save when template review is required but not applied", () => {
  let thrown = false;
  try {
    service.saveImportBatch({
      analysis: buildLowHeaderAnalysis(),
      defaults: { city: "\u062c\u062f\u0629", register: "EXPRESS", month: "2026-07" },
      fieldMapping: { date: "Date", userId: "User ID" },
      manualMapping: {
        fileType: "performance_daily_csv",
        targetEntity: "performanceDaily"
      },
      reviewRequired: true,
      user: superAdmin
    });
  } catch (error) {
    thrown = /manual mapping|manual review|review/i.test(error.message);
  }
  assert.strictEqual(thrown, true);
}));

results.push(test("allows reviewed save when manual review was applied", () => {
  const saved = service.saveImportBatch({
    analysis: buildLowHeaderAnalysis(),
    defaults: { city: "\u062c\u062f\u0629", register: "EXPRESS", month: "2026-07" },
    fieldMapping: { date: "Date", userId: "User ID" },
    manualMapping: {
      city: "\u062c\u062f\u0629",
      fileType: "performance_daily_csv",
      month: "2026-07",
      register: "EXPRESS",
      targetEntity: "performanceDaily"
    },
    manualMappingApplied: true,
    reviewRequired: true,
    user: superAdmin
  });
  assert.strictEqual(saved.status, "saved");
  assert.ok(dataStore.getAll("performanceDaily").length >= 1);
}));

results.push(test("listRecentBatches returns saved and rejected batches", () => {
  const recent = service.listRecentBatches(10);
  assert.ok(recent.length >= 2);
}));

results.push(test("repeated save with the same batch id does not duplicate the import audit row", () => {
  const payload = {
    id: "batch-idempotent-1",
    analysis: buildAnalysis(),
    defaults: { city: "\u062c\u062f\u0629", register: "EXPRESS", month: "2026-07" },
    user: superAdmin,
  };
  const first = service.saveImportBatch(payload);
  const second = service.saveImportBatch(payload);
  const auditRows = dataStore.getAll("auditLogs").filter((item) => item.action === "import_batch_saved" && item.entityId === "batch-idempotent-1");

  assert.strictEqual(first.auditEventId, second.auditEventId);
  assert.strictEqual(auditRows.length, 1);
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
