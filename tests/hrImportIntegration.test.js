const assert = require("assert");
const XLSX = require("../vendor/xlsx.full.min.js");
const { createMemoryStore } = require("../src/data/memoryStore.js");
const { createDataStore } = require("../src/data/dataStore.js");
const { createAuditLogService } = require("../src/data/auditLog.js");
const { createImportRegistry } = require("../src/import/importRegistry.js");
const { readWorkbook } = require("../src/import/workbookReader.js");
const { createImportBatchService } = require("../src/import/importBatchService.js");
const RBAC = require("../src/auth/rbac.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function buildWorkbook() {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["HR Master"],
    ["الرقم الوظيفي", "رقم الاقامة", "الاسم", "الجنسية", "الفرع", "اسم السجل", "نوع الرخصة", "حالة المندوب", "رقم الهاتف", "تاريخ التعيين", "بطاقة السائق", "ايدي كيتا", "ايدي جاهز"],
    ["EMP001", "2456789012", "Ahmed Salem", "Egyptian", "جدة", "EXPRESS GATE Company", "سيارة", "يعمل حاليا", "0551234567", "2026-01-10", "ساري", "K12345678", "JH123456"],
    ["EMP002", "2456789013", "Ali Hassan", "Indian", "الرياض", "Togary", "دباب", "لا يعمل", "+966551234568", "2026-02-15", "منتهي", "K22345678", ""]
  ]), "HR شركة البوابة المقبله");

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["رقم الهوية", "السجل", "رقم الشهادة الصحية", "تاريخ إصدار الشهادة الصحية", "تاريخ نهاية الشهادة الصحية"],
    ["2456789012", "EXPRESS GATE Company", "HC-100", "2026-01-01", "2026-12-31"],
    ["2456789013", "Togary", "HC-200", "2026-01-01", "2026-11-30"]
  ]), "كروت صحية");

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["ID", "رقم الاقامة", "اسم المندوب", "رقم الجوال", "المدينة", "السجل", "نوع المركبة", "حالة الحساب"],
    ["NINJA1001", "2456789012", "Ahmed Salem", "0551234567", "جدة", "EXPRESS GATE Company", "سيارة", "يعمل"],
    ["NINJA1002", "2456789014", "Omar Ali", "0559999999", "جدة", "Albwaba", "دباب", "يعمل"]
  ]), "Ninja");

  return workbook;
}

function buildAnalysis() {
  const workbook = buildWorkbook();
  const workbookSummary = readWorkbook(workbook, {
    extension: ".xlsx",
    fileName: "البوابة المقبلة.xlsx"
  });
  return {
    extension: ".xlsx",
    fileName: "البوابة المقبلة.xlsx",
    rowCount: workbookSummary.totalRowCount,
    workbook,
    workbookSummary
  };
}

const superAdmin = {
  id: "user_super",
  role: "super_admin",
  cityScope: "all",
  selectedCities: ["جدة", "الرياض"],
  registerScope: "all",
  selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
  permissions: []
};

const memoryStore = createMemoryStore();
const dataStore = createDataStore({
  primaryAdapter: memoryStore,
  fallbackAdapter: memoryStore
});
const auditLog = createAuditLogService(dataStore);
const importRegistry = createImportRegistry({ dataStore });
const service = createImportBatchService({
  auditLog,
  dataStore,
  importRegistry,
  rbac: RBAC,
  xlsxLib: XLSX
});

const results = [];

results.push(test("preview detects hr_master_workbook for the core workbook", () => {
  const preview = service.createPreviewBatch({
    analysis: buildAnalysis(),
    user: superAdmin
  });
  assert.strictEqual(preview.type, "hr_master_workbook");
}));

results.push(test("saving the HR workbook creates master entities and batch stats", () => {
  const saved = service.saveImportBatch({
    analysis: buildAnalysis(),
    user: superAdmin,
    note: "Prompt 4 integration test"
  });

  assert.strictEqual(saved.status, "saved");
  assert.ok(saved.batchStats.hrProfilesCreated >= 2);
  assert.ok(saved.batchStats.ridersCreated >= 3);
  assert.ok(saved.batchStats.identitiesCreated > 0);
  assert.ok(saved.batchStats.platformAccountsCreated > 0);
  assert.ok(saved.batchStats.archiveEventsCreated > 0);
  assert.strictEqual(dataStore.getAll("hrProfiles").length, 2);
  assert.ok(dataStore.getAll("riders").length >= 3);
  assert.ok(dataStore.getAll("riderIdentities").length > 0);
  assert.ok(dataStore.getAll("riderPlatformAccounts").length > 0);
  assert.ok(dataStore.getAll("riderArchiveEvents").length > 0);
  assert.strictEqual(dataStore.getAll("auditLogs").length, 1);
  assert.ok(dataStore.getAll("auditLogs").some((item) => item.action === "import_batch_saved"));
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
