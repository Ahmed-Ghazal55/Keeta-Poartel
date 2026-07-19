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

const externalRiderHeaders = [
  "Timestamp",
  "رقم اقامة المندوب",
  "اسم المندوب",
  "رقم جوال التواصل",
  "نوع المندوب / نوع البديل",
  "نوع المركبة",
  "كارت بنزين",
  "عهدة الادوات",
  "الجنسية",
  "رقم الجوال المسجل بالتطبيق للمندوب",
  "رقم الايبان البنكي",
  "المعرف",
  "Email Address"
];

const currentAssignmentHeaders = [
  "السجل",
  "المدينة",
  "التطبيق",
  "Courier ID / User ID",
  "رقم إقامة صاحب اليوزر",
  "اسم صاحب اليوزر",
  "رقم إقامة المندوب المستخدم فعليًا",
  "اسم المندوب المستخدم فعليًا",
  "نوع المندوب: كفالة / خارجي",
  "رقم جوال المندوب الفعلي",
  "نوع التشغيل: راتب / بالطلب / خارجي / بديل",
  "تاريخ بداية التسكين",
  "تاريخ الاستلام للمندوب المستخدم",
  "تاريخ أول يوم عمل للأيدي",
  "حالة التسكين: نشط / موقوف / تبديل / إقالة",
  "المركبة المسجلة على اليوزر",
  "المركبة المستخدمة فعليًا",
  "نوع المركبة",
  "رقم اللوحة",
  "الرقم التسلسلي",
  "المشرف",
  "ملاحظات"
];

const results = [];

results.push(test("external riders template columns match the lifecycle contract", () => {
  assert.deepStrictEqual(headersFor("external_riders"), externalRiderHeaders);
  assert.strictEqual(TemplateRegistry.getTemplate("external_riders").targetEntity, "externalRiders");
}));

results.push(test("current assignments template columns match the lifecycle contract", () => {
  assert.deepStrictEqual(headersFor("current_assignments"), currentAssignmentHeaders);
  assert.strictEqual(TemplateRegistry.getTemplate("current_assignments").targetEntity, "assignments");
}));

results.push(test("external riders headers auto-match the registered lifecycle template", () => {
  const matched = TemplateRegistry.matchTemplates(externalRiderHeaders, { importType: "external_riders_csv" }).bestMatch;
  assert.ok(matched);
  assert.strictEqual(matched.templateId, "external_riders");
  assert.strictEqual(matched.state, "auto");
  assert.strictEqual(matched.mapping.byField.iqama, "رقم اقامة المندوب");
}));

results.push(test("current assignments headers auto-match the registered lifecycle template", () => {
  const matched = TemplateRegistry.matchTemplates(currentAssignmentHeaders, { importType: "current_assignments_csv" }).bestMatch;
  assert.ok(matched);
  assert.strictEqual(matched.templateId, "current_assignments");
  assert.strictEqual(matched.state, "auto");
  assert.strictEqual(matched.mapping.byField.userId, "Courier ID / User ID");
  assert.strictEqual(matched.mapping.byField.ownerIqama, "رقم إقامة صاحب اليوزر");
  assert.strictEqual(matched.mapping.byField.actualRiderIqama, "رقم إقامة المندوب المستخدم فعليًا");
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
