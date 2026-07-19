const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createAuditLogService } = require("../src/data/auditLog.js");
const { createImportRegistry } = require("../src/import/importRegistry.js");
const { createImportBatchService } = require("../src/import/importBatchService.js");
const ImportValidator = require("../src/import/importValidator.js");
const LifecycleRegistry = require("../src/data/lifecycleRegistry.js");
const { readDelimitedText } = require("../src/import/csvReader.js");
const RBAC = require("../src/auth/rbac.js");

const DASHBOARD_HEADERS = [
  "Courier ID",
  "Courier qualification type",
  "First Name",
  "Last Name",
  "ID Number",
  "Phone Number",
  "Email",
  "Vehicle",
  "Employment Status",
  "Review Status",
  "Document change status",
  "Please note",
  "Settlement mode",
  "Operations  city",
  "register"
];

const operationsUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_operations_extension.js"),
  "utf8"
);

const superAdmin = {
  id: "user_super",
  permissions: [],
  role: "super_admin",
  selectedCities: ["جدة", "الرياض"],
  selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"]
};

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function csvEscape(value) {
  const text = String(value == null ? "" : value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildAnalysis(fileName, rows) {
  const csv = [DASHBOARD_HEADERS.join(",")]
    .concat(rows.map((row) => DASHBOARD_HEADERS.map((header) => csvEscape(row[header] || "")).join(",")))
    .join("\n");
  const tableSummary = readDelimitedText(fileName, csv, {});
  return {
    extension: ".csv",
    fileName,
    rowCount: tableSummary.rowCount,
    tableSummary
  };
}

function buildService() {
  const memoryStore = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memoryStore,
    fallbackAdapter: memoryStore
  });
  dataStore.save("dashboardUsers", []);
  dataStore.save("operationalStatusReviews", []);
  dataStore.save("importBatches", []);
  dataStore.save("auditLogs", []);
  const auditLog = createAuditLogService(dataStore);
  return {
    auditLog,
    dataStore,
    service: createImportBatchService({
      auditLog,
      dataStore,
      importRegistry: createImportRegistry({ dataStore }),
      rbac: RBAC
    })
  };
}

function buildDashboardRow(overrides) {
  return Object.assign({
    "Courier ID": "1782916129257495",
    "Courier qualification type": "Car - External",
    "First Name": "Ahmed",
    "Last Name": "Salem",
    "ID Number": "244400001",
    "Phone Number": "966500000001",
    "Email": "ahmed@example.com",
    "Vehicle": "Car",
    "Employment Status": "In Service",
    "Review Status": "Accepted",
    "Document change status": "No Change",
    "Please note": "",
    "Settlement mode": "Salary Tiers",
    "Operations  city": "جدة",
    "register": "EXPRESS"
  }, overrides || {});
}

const results = [];

results.push(test("dashboard users page import route resolves to the operations template contract", () => {
  const route = LifecycleRegistry.resolveImportRoute("dashboard_users_import");

  assert.ok(route);
  assert.strictEqual(route.defaultImportType, "dashboard_users_workbook");
  assert.strictEqual(route.defaultTargetEntity, "dashboardUsers");
  assert.deepStrictEqual(route.templateIds, ["dashboard_users"]);
  assert.ok(operationsUi.includes('data-ops-import-route="dashboard_users_import"'));
}));

results.push(test("preview and validation do not mutate dashboard users or create audit rows", () => {
  const runtime = buildService();
  const preview = runtime.service.createPreviewBatch({
    analysis: buildAnalysis("Dash_EXPRESS.csv", [buildDashboardRow()]),
    defaults: { city: "جدة", register: "EXPRESS" },
    user: superAdmin
  });
  const validation = ImportValidator.validateImportRecord(preview, {
    dataStore: runtime.dataStore,
    mode: "save"
  });

  assert.strictEqual(preview.status, "preview");
  assert.ok(validation);
  assert.strictEqual(runtime.dataStore.getAll("dashboardUsers").length, 0);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, 0);
}));

results.push(test("approved dashboard users save mutates dashboard users through the delta engine and audits once", () => {
  const runtime = buildService();
  const saved = runtime.service.saveImportBatch({
    id: "dashboard-route-batch-1",
    analysis: buildAnalysis("Dash_EXPRESS.csv", [
      buildDashboardRow(),
      buildDashboardRow({
        "Courier ID": "1782999000444001",
        "First Name": "Hassan",
        "Last Name": "Omar",
        "ID Number": "2444000044",
        "Review Status": "Pending Review"
      })
    ]),
    defaults: { city: "جدة", register: "EXPRESS" },
    user: superAdmin
  });
  const auditRows = runtime.dataStore.getAll("auditLogs");

  assert.strictEqual(saved.status, "saved");
  assert.strictEqual(runtime.dataStore.getAll("dashboardUsers").length, 2);
  assert.strictEqual(runtime.dataStore.getAll("operationalStatusReviews").length, 2);
  assert.strictEqual(auditRows.length, 1);
  assert.strictEqual(auditRows[0].action, "import_batch_saved");
}));

results.push(test("repeated approved save with the same batch id does not duplicate the import audit row", () => {
  const runtime = buildService();
  const payload = {
    id: "dashboard-route-batch-repeat",
    analysis: buildAnalysis("Dash_EXPRESS.csv", [buildDashboardRow()]),
    defaults: { city: "جدة", register: "EXPRESS" },
    user: superAdmin
  };
  runtime.service.saveImportBatch(payload);
  runtime.service.saveImportBatch(payload);

  const auditRows = runtime.dataStore.getAll("auditLogs").filter((item) => item.entityId === "dashboard-route-batch-repeat");
  assert.strictEqual(auditRows.length, 1);
  assert.strictEqual(runtime.dataStore.getAll("dashboardUsers").length, 1);
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
