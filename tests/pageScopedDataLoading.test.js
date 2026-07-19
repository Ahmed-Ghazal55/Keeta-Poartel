const assert = require("assert");
const PageScopedDataLoading = require("../src/runtime/pageScopedDataLoading.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("dashboard startup entities remain lightweight", () => {
  assert.deepStrictEqual(PageScopedDataLoading.getStartupEntities(), ["importBatches", "auditLogs", "notifications"]);
}));

results.push(test("fleet shell entities are scoped to fleet collections", () => {
  const entities = PageScopedDataLoading.resolvePageEntities("page-fleet-shell");
  assert.ok(entities.includes("vehicles"));
  assert.ok(entities.includes("vehicleAssignments"));
  assert.ok(!entities.includes("hrProfiles"));
}));

results.push(test("operations shell includes rider resolver entities only for operational pages", () => {
  const entities = PageScopedDataLoading.resolvePageEntities("page-operations-shell");
  assert.ok(entities.includes("externalRiders"));
  assert.ok(entities.includes("riderOperationalProfiles"));
  assert.ok(entities.includes("riderVehicleUsageHistory"));
}));

results.push(test("rider master page includes resolver and archive support collections", () => {
  const entities = PageScopedDataLoading.resolvePageEntities("page-rider-master");
  assert.ok(entities.includes("externalRiders"));
  assert.ok(entities.includes("riderOperationalProfiles"));
  assert.ok(entities.includes("riderVehicleUsageHistory"));
  assert.ok(entities.includes("riderArchiveEvents"));
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
