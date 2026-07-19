const assert = require("assert");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createAuditLogService } = require("../src/data/auditLog.js");
const { createRepositories } = require("../src/data/repositories.js");
const RBAC = require("../src/auth/rbac.js");
const { createImportRegistry } = require("../src/import/importRegistry.js");
const TemplateRegistry = require("../src/import/importTemplateRegistry.js");
const { createImportBatchService } = require("../src/import/importBatchService.js");
const { createFleetOperationsIntegration } = require("../src/fleet/fleetOperationsIntegration.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function buildRuntime() {
  const memory = createMemoryStore();
  const dataStore = createDataStore({
    primaryAdapter: memory,
    fallbackAdapter: memory
  });
  const auditLog = createAuditLogService(dataStore);
  const repositories = createRepositories(dataStore);
  const importRegistry = createImportRegistry({ dataStore });
  const fleetIntegration = createFleetOperationsIntegration({
    auditLog,
    rbac: RBAC,
    repositories
  });
  const importBatchService = createImportBatchService({
    auditLog,
    dataStore,
    fleetIntegration,
    importRegistry,
    rbac: RBAC
  });

  dataStore.save("dashboardUsers", [
    {
      id: "dashboard_user_1",
      dashboardUserId: "1782916129257495",
      userId: "1782916129257495",
      city: "جدة",
      register: "EXPRESS",
      vehicleSerial: "JED-CAR-1001",
      plateNumber: "JED-1001",
      currentRiderIqama: "2444000011",
      ownerIqama: "2444000011"
    }
  ]);

  return { auditLog, dataStore, importBatchService };
}

function buildAnalysis(fileName, headers, rows, importType) {
  const match = TemplateRegistry.matchTemplates(headers, { importType }).bestMatch;
  return {
    extension: ".csv",
    fileName,
    rowCount: rows.length + 1,
    tableSummary: {
      headers,
      mapping: match ? match.mapping : { byField: {}, headers, mappedCount: 0, mappedFields: [], missingRequired: [], coverage: 0, unknownHeaders: headers.slice() },
      rows
    }
  };
}

const fleetOfficer = {
  id: "fleet_1",
  role: "fleet_officer",
  cityScope: "single",
  selectedCities: ["جدة"],
  registerScope: "single",
  selectedRegisters: ["EXPRESS"],
  permissions: []
};

const results = [];

results.push(test("operating vehicles import saves through repositories and creates fleet derived collections", () => {
  const runtime = buildRuntime();
  const headers = TemplateRegistry.getTemplate("vehicles").displayColumns.map((column) => column.header);
  const saved = runtime.importBatchService.saveImportBatch({
    analysis: buildAnalysis("Updata_Vehicles.csv", headers, [
      {
        "رقم اللوحة": "JED-1001",
        "نوع التسجيل": "Public Transport",
        "الماركة": "Toyota",
        "الطراز": "Yaris",
        "OPC": "OPC-1001",
        "الرقم التسلسلي": "JED-CAR-1001",
        "السجل": "EXPRESS",
        "Brand Name": "EXPRESS GATE Company",
        "السجلات المتاحه للاستخدام": "EXPRESS",
        "current bounding accounts": "1",
        "used by how name partner": "Ahmed Salem",
        "Current branch": "جدة - EXPRESS",
        "Current City": "جدة",
        "Targeted Branch": "EXPRESS",
        "In how many city is it used?": "1",
        "Vehicle Type": "car",
        "City & Pranch": "جدة - EXPRESS",
        "Accounts registered on the vehicle": "1782916129257495 - 2444000011 - Ahmed Salem",
        "Iqama 1": "2444000011",
        "Iqama 2": "",
        "Iqama 3": "",
        "Iqama 4": "",
        "Vehicle movement status": "available"
      }
    ], "vehicle_workbook"),
    defaults: { city: "جدة", register: "EXPRESS", month: "2026-07" },
    manualMapping: {
      city: "جدة",
      fileType: "vehicle_workbook",
      month: "2026-07",
      register: "EXPRESS",
      targetEntity: "vehicles"
    },
    manualMappingApplied: true,
    templateId: "vehicles",
    user: fleetOfficer
  });

  assert.strictEqual(saved.status, "saved");
  assert.strictEqual(runtime.dataStore.getAll("vehicles").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("vehicleImportSnapshots").length, 1);
  assert.ok(saved.batchStats.vehiclesCreated >= 1);
  assert.ok(saved.batchStats.vehicleCapacityReviewsCreated >= 1);
  assert.ok(saved.batchStats.vehicleAssignmentsCreated >= 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, 1);
  assert.ok(runtime.dataStore.getAll("auditLogs").some((item) => item.action === "import_batch_saved"));
}));

results.push(test("vehicles movement import stores movement events and updates the linked vehicle", () => {
  const runtime = buildRuntime();
  runtime.dataStore.save("vehicles", [
    {
      id: "vehicles::JED-CAR-1001",
      vehicleSerial: "JED-CAR-1001",
      plateNumber: "JED-1001",
      currentCity: "جدة",
      city: "جدة",
      register: "EXPRESS",
      targetedBranch: "EXPRESS",
      vehicleType: "car",
      registrationType: "Public Transport",
      status: "available"
    }
  ]);

  const headers = TemplateRegistry.getTemplate("vehicles_movement").displayColumns.map((column) => column.header);
  const saved = runtime.importBatchService.saveImportBatch({
    analysis: buildAnalysis("Vehicles_Movement.csv", headers, [
      {
        "الفرع": "جدة",
        "اللوحة الجديدة": "JED-1009",
        "نوع تم": "تسليم",
        "نوع التسجيل الجديد": "Public Transport",
        "الماركة": "Toyota",
        "الطراز": "Yaris",
        "سنة الصنع": "2024",
        "الرقم التسلسلي": "JED-CAR-1001",
        "رقم الهيكل": "CH-1001",
        "اللون الأساسي": "White",
        "اسم المفوض": "Abdullah",
        "رقم الجوال بالتفويض": "966500000001",
        "تاريخ بداية التفويض": "2026-07-01",
        "تاريخ نهاية التفويض": "2026-07-31",
        "الحالة": "handed_over",
        "D": "",
        "رقم إقامة المفوض": "2444556677",
        "رقم اقامة المستخدم": "2444000011",
        "الإسم": "Ahmed Salem",
        "رقم جوال المستخدم": "966501112233",
        "نوع الرخصة": "عمومي",
        "نوع المندوب": "car",
        "تطبيق العمل": "keeta",
        "رقم الأيدي": "1782916129257495",
        "تاريخ الإستلام": "2026-07-01",
        "ملاحظات": "Operational handover"
      }
    ], "vehicle_workbook"),
    defaults: { city: "جدة", register: "EXPRESS", month: "2026-07" },
    manualMapping: {
      city: "جدة",
      fileType: "vehicle_workbook",
      month: "2026-07",
      register: "EXPRESS",
      targetEntity: "vehicleMovementEvents"
    },
    manualMappingApplied: true,
    templateId: "vehicles_movement",
    user: fleetOfficer
  });

  const vehicle = runtime.dataStore.getAll("vehicles")[0];
  assert.strictEqual(saved.status, "saved");
  assert.strictEqual(runtime.dataStore.getAll("vehicleMovementEvents").length, 1);
  assert.strictEqual(vehicle.actualUserIqama, "2444000011");
  assert.strictEqual(vehicle.actualUsedVehiclePlateNumber, "JED-1009");
  assert.ok(saved.batchStats.vehicleMovementEventsCreated >= 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, 1);
  assert.ok(runtime.dataStore.getAll("auditLogs").some((item) => item.action === "import_batch_saved"));
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
