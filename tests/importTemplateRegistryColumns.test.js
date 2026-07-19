const assert = require("assert");
const TemplateRegistry = require("../src/import/importTemplateRegistry.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function headersFor(templateId) {
  return TemplateRegistry.getTemplate(templateId).displayColumns.map((column) => column.header);
}

const results = [];

const dashboardHeaders = [
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

const hrHeaders = [
  "تسلسل",
  "الرقم الوظيفى",
  "رقم الهوية",
  "الاسم",
  "تاريخ التعين",
  "الجنسية",
  "المهنه بالاقامه",
  "المسمي الوظيفي",
  "الفرع",
  "تاريخ انتهاء الاقامة",
  "الصلاحية",
  "هوية صاحب العمل",
  "اسم السجل",
  "نوع الرخصة",
  "نوع الرخصة",
  "حالة الكفالة",
  "حالة المندوب",
  "الملاحظات",
  "حاله الرخصه",
  "بطاقة السائق",
  "تطبيق العمل",
  "مدينة و سجل ايدي كيتا",
  "ايدي كيتا",
  "ايدي هنقر",
  "ايدي امازون",
  "ايدي نينجا",
  "ايدي جاهز",
  "ايدي شفز"
];

const operatingVehicleHeaders = [
  "رقم اللوحة",
  "نوع التسجيل",
  "الماركة",
  "الطراز",
  "OPC",
  "الرقم التسلسلي",
  "السجل",
  "Brand Name",
  "السجلات المتاحه للاستخدام",
  "current bounding accounts",
  "used by how name partner",
  "Current branch",
  "Current City",
  "Targeted Branch",
  "In how many city is it used?",
  "Vehicle Type",
  "City & Pranch",
  "Accounts registered on the vehicle",
  "Iqama 1",
  "Iqama 2",
  "Iqama 3",
  "Iqama 4",
  "Vehicle movement status"
];

const movementHeaders = [
  "الفرع",
  "اللوحة الجديدة",
  "نوع تم",
  "نوع التسجيل الجديد",
  "الماركة",
  "الطراز",
  "سنة الصنع",
  "الرقم التسلسلي",
  "رقم الهيكل",
  "اللون الأساسي",
  "اسم المفوض",
  "رقم الجوال بالتفويض",
  "تاريخ بداية التفويض",
  "تاريخ نهاية التفويض",
  "الحالة",
  "الحالة",
  "D",
  "رقم إقامة المفوض",
  "رقم اقامة المستخدم",
  "الإسم",
  "رقم جوال المستخدم",
  "نوع الرخصة",
  "نوع المندوب",
  "تطبيق العمل",
  "رقم الأيدي",
  "تاريخ الإستلام",
  "ملاحظات"
];

results.push(test("Prompt 8 official templates are registered", () => {
  assert.strictEqual(TemplateRegistry.listTemplates().length, 14);
  assert.ok(TemplateRegistry.getTemplate("vehicles"));
  assert.ok(TemplateRegistry.getTemplate("vehicles_movement"));
}));

results.push(test("Dashboard Users column order matches Prompt 8", () => {
  assert.deepStrictEqual(headersFor("dashboard_users"), dashboardHeaders);
}));

results.push(test("HR Master column order includes A:S then computed T:AB", () => {
  assert.deepStrictEqual(headersFor("hr_master"), hrHeaders);
}));

results.push(test("Operating Vehicles column order matches Prompt 8", () => {
  assert.deepStrictEqual(headersFor("vehicles"), operatingVehicleHeaders);
}));

results.push(test("Vehicles Movement column order matches Prompt 8", () => {
  assert.deepStrictEqual(headersFor("vehicles_movement"), movementHeaders);
}));

results.push(test("vehicle workbook operating headers auto-match the operating template", () => {
  const matched = TemplateRegistry.matchTemplates(operatingVehicleHeaders, { importType: "vehicle_workbook" }).bestMatch;
  assert.ok(matched);
  assert.strictEqual(matched.templateId, "vehicles");
  assert.strictEqual(matched.state, "auto");
  assert.strictEqual(matched.mapping.byField.vehicleSerial, "الرقم التسلسلي");
}));

results.push(test("vehicle workbook movement headers auto-match the movement template", () => {
  const matched = TemplateRegistry.matchTemplates(movementHeaders, { importType: "vehicle_workbook" }).bestMatch;
  assert.ok(matched);
  assert.strictEqual(matched.templateId, "vehicles_movement");
  assert.strictEqual(matched.state, "auto");
  assert.strictEqual(matched.mapping.byField.vehicleSerial, "الرقم التسلسلي");
  assert.strictEqual(matched.mapping.byField.currentUserIqama, "رقم اقامة المستخدم");
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
