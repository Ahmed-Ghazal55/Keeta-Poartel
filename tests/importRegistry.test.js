const assert = require("assert");
const RBAC = require("../src/auth/rbac.js");
const { hasEntitySchema } = require("../src/data/entitySchemas.js");
const { createImportRegistry } = require("../src/import/importRegistry.js");
const ImportTypes = require("../src/import/importTypes.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const registry = createImportRegistry({});
const results = [];

results.push(test("register lists all prompt 3 import types", () => {
  const ids = registry.listTypes().map((item) => item.id);
  [
    "hr_master_workbook",
    "dashboard_users_csv",
    "vehicle_workbook",
    "company_invoice_workbook",
    "internal_settlement_workbook",
    "shift_schedule_xlsm",
    "zip_reference",
    "unknown",
  ].forEach((id) => {
    assert.ok(ids.includes(id), "missing type " + id);
  });
}));

results.push(test("target entities exist in schema registry", () => {
  registry.listTypes().forEach((item) => {
    if (!item.targetEntity) {
      return;
    }
    assert.strictEqual(hasEntitySchema(item.targetEntity), true, "missing entity schema for " + item.id);
  });
}));

results.push(test("import save and reject permissions are registered in RBAC", () => {
  assert.ok(RBAC.DEFAULT_PERMISSIONS.includes("imports.save"));
  assert.ok(RBAC.DEFAULT_PERMISSIONS.includes("imports.reject"));
  assert.ok(RBAC.DEFAULT_PERMISSIONS.includes("audit.view"));
}));

results.push(test("confidence thresholds are ordered correctly", () => {
  assert.ok(ImportTypes.CONFIDENCE_THRESHOLDS.autoDetected > ImportTypes.CONFIDENCE_THRESHOLDS.needsReview);
  assert.strictEqual(registry.getConfidenceState(0.9), "auto_detected");
  assert.strictEqual(registry.getConfidenceState(0.7), "needs_review");
  assert.strictEqual(registry.getConfidenceState(0.2), "manual_mapping_required");
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
