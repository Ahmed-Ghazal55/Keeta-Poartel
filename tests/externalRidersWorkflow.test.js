const assert = require("assert");
const fs = require("fs");
const path = require("path");
const PageScopedDataLoading = require("../src/runtime/pageScopedDataLoading.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const hrUi = fs.readFileSync(path.join(__dirname, "..", "keeta_operations_portal_hr_extension.js"), "utf8");
const operationsUi = fs.readFileSync(path.join(__dirname, "..", "keeta_operations_portal_operations_extension.js"), "utf8");
const results = [];

results.push(test("rider master UI exposes resolver search, identity form, and operational profile form", () => {
  assert.ok(hrUi.includes('id="riderResolverSearchForm"'));
  assert.ok(hrUi.includes('id="externalRiderIdentityForm"'));
  assert.ok(hrUi.includes('id="resolverOperationalProfileForm"'));
  assert.ok(hrUi.includes("rider-resolver-load"));
}));

results.push(test("page-level import entry points exist for external riders and current assignments", () => {
  assert.ok(hrUi.includes('data-hr-import-route="external_riders_import"'));
  assert.ok(operationsUi.includes('data-ops-import-route="current_assignments_import"'));
}));

results.push(test("page-scoped loading includes rider resolver entities for rider master and operations shell", () => {
  const riderMasterEntities = PageScopedDataLoading.resolvePageEntities("page-rider-master");
  const operationsEntities = PageScopedDataLoading.resolvePageEntities("page-operations-shell");

  assert.ok(riderMasterEntities.includes("externalRiders"));
  assert.ok(riderMasterEntities.includes("riderOperationalProfiles"));
  assert.ok(riderMasterEntities.includes("riderVehicleUsageHistory"));
  assert.ok(operationsEntities.includes("externalRiders"));
  assert.ok(operationsEntities.includes("riderOperationalProfiles"));
  assert.ok(operationsEntities.includes("riderVehicleUsageHistory"));
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
