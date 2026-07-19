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
    assignments: [],
    auditLogs: [],
    dashboardUsers: [],
    externalRiders: [],
    hrProfiles: [],
    importBatches: [],
    riderOperationalProfiles: [],
    riderVehicleUsageHistory: [],
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
  const tableSummary = readDelimitedText("current_assignments.csv", csvText, {});
  return {
    extension: ".csv",
    fileName: "current_assignments.csv",
    rowCount: tableSummary.rowCount,
    tableSummary
  };
}

function buildCurrentAssignmentsCsv() {
  return [
    "السجل,المدينة,التطبيق,Courier ID / User ID,رقم إقامة صاحب اليوزر,اسم صاحب اليوزر,رقم إقامة المندوب المستخدم فعليًا,اسم المندوب المستخدم فعليًا,نوع المندوب: كفالة / خارجي,رقم جوال المندوب الفعلي,نوع التشغيل: راتب / بالطلب / خارجي / بديل,تاريخ بداية التسكين,تاريخ الاستلام للمندوب المستخدم,تاريخ أول يوم عمل للأيدي,حالة التسكين: نشط / موقوف / تبديل / إقالة,المركبة المسجلة على اليوزر,المركبة المستخدمة فعليًا,نوع المركبة,رقم اللوحة,الرقم التسلسلي,المشرف,ملاحظات",
    "EXPRESS,جدة,Keeta,1001,2444000011,Ahmed Salem,2999000011,Mohamed Hamza,خارجي,966501010101,راتب,2026-07-10,2026-07-10,2026-07-11,نشط,EXPRESS Registered Car,Toyota Yaris,Car,JED-1001,JED-CAR-1001,Shift Lead A,Imported from tracker"
  ].join("\n");
}

const results = [];

results.push(test("current assignments save persists only approved lifecycle entities", () => {
  const runtime = createRuntime({
    assignments: [{
      id: "assignment-old",
      assignmentId: "assignment-old",
      dashboardUserId: "1001",
      courierId: "1001",
      userId: "1001",
      riderId: "rider-old",
      riderIqama: "2888000011",
      actualRiderIqama: "2888000011",
      city: "جدة",
      register: "EXPRESS",
      platform: "keeta",
      assignmentStatus: "active",
      assignmentStartDate: "2026-07-01",
      startDate: "2026-07-01",
      endDate: "",
      status: "active"
    }],
    riderVehicleUsageHistory: [{
      id: "usage-old",
      riderIqama: "2999000011",
      platform: "keeta",
      city: "جدة",
      register: "EXPRESS",
      vehicleSerial: "OLD-CAR-1",
      plateNumber: "OLD-1",
      startDate: "2026-07-01",
      endDate: "",
      active: true,
      status: "active"
    }]
  });

  const saved = runtime.importBatchService.saveImportBatch({
    analysis: buildAnalysis(buildCurrentAssignmentsCsv()),
    manualMapping: {
      fileType: "current_assignments_csv",
      city: "جدة",
      register: "EXPRESS",
      month: "2026-07",
      targetEntity: "assignments"
    },
    user: createSuperAdmin()
  });

  const assignments = runtime.dataStore.getAll("assignments");
  const profiles = runtime.dataStore.getAll("riderOperationalProfiles");
  const vehicleUsage = runtime.dataStore.getAll("riderVehicleUsageHistory");

  assert.strictEqual(saved.status, "saved");
  assert.deepStrictEqual(saved.persistedEntities.sort(), ["assignments", "riderOperationalProfiles", "riderVehicleUsageHistory"].sort());
  assert.strictEqual(assignments.length, 2);
  assert.strictEqual(assignments.filter((item) => item.status === "active").length, 1);
  assert.strictEqual(assignments.filter((item) => item.status === "ended").length, 1);
  assert.strictEqual(profiles.length, 1);
  assert.strictEqual(vehicleUsage.length, 2);
  assert.strictEqual(vehicleUsage.filter((item) => item.active === true).length, 1);
  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 0);
  assert.strictEqual(runtime.dataStore.getAll("riders").length, 0);
  assert.strictEqual(runtime.dataStore.getAll("dashboardUsers").length, 0);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "import_batch_saved").length, 1);
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
