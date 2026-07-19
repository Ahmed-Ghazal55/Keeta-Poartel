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

const results = [];

results.push(test("official Prompt 8 templates are registered", () => {
  assert.strictEqual(TemplateRegistry.listTemplates().length, 14);
  assert.ok(TemplateRegistry.getTemplate("dashboard_users"));
  assert.ok(TemplateRegistry.getTemplate("external_riders"));
  assert.ok(TemplateRegistry.getTemplate("current_assignments"));
  assert.ok(TemplateRegistry.getTemplate("shift_schedule"));
  assert.ok(TemplateRegistry.getTemplate("vehicles_movement"));
}));

results.push(test("dashboard users headers auto-match the official template", () => {
  const matched = TemplateRegistry.matchTemplates([
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
    "Operations city",
    "register"
  ], { importType: "dashboard_users_csv" }).bestMatch;
  assert.ok(matched);
  assert.strictEqual(matched.templateId, "dashboard_users");
  assert.strictEqual(matched.state, "auto");
  assert.strictEqual(matched.mapping.byField.userId, "Courier ID");
  assert.strictEqual(matched.mapping.byField.personalName, "First Name");
  assert.strictEqual(matched.mapping.byField.familyName, "Last Name");
}));

results.push(test("partial daily performance headers require review", () => {
  const matched = TemplateRegistry.matchTemplates([
    "Date",
    "User ID"
  ], { importType: "performance_daily_csv" }).bestMatch;
  assert.ok(matched);
  assert.strictEqual(matched.templateId, "daily_performance");
  assert.strictEqual(matched.state, "review");
}));

results.push(test("requirement rows include target entity and validation rules", () => {
  const rows = TemplateRegistry.buildRequirementsRows(TemplateRegistry.getTemplate("vehicles"));
  assert.strictEqual(rows[2][1], "vehicles");
  const validationRow = rows.filter((item) => String(item[0]).indexOf("Validation Rule") === 0)[0];
  assert.ok(validationRow);
  assert.ok(String(validationRow[1]).length > 10);
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
