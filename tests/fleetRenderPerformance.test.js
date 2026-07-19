const assert = require("assert");
const fs = require("fs");
const path = require("path");
const FleetRebuildPolicy = require("../src/runtime/fleetRebuildPolicy.js");

const fleetSource = fs.readFileSync(path.join(__dirname, "..", "keeta_operations_portal_fleet_extension.js"), "utf8");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("fleet rebuild policy only rebuilds when the source hash changes or derived data is missing", () => {
  const nextHash = FleetRebuildPolicy.createFleetSourceHash({
    vehicles: [{ id: "1", updatedAt: "2026-07-13T00:00:00.000Z" }],
    dashboardUsers: [],
    assignments: [],
    vehicleMovementEvents: [],
    vehicleComplianceIssues: []
  });
  assert.strictEqual(FleetRebuildPolicy.shouldRebuildFleetDerived({
    hasDerivedCollections: false,
    lastHash: "",
    nextHash
  }), true);
  assert.strictEqual(FleetRebuildPolicy.shouldRebuildFleetDerived({
    hasDerivedCollections: true,
    lastHash: nextHash,
    nextHash
  }), false);
}));

results.push(test("fleet source entities exclude derived compliance issues", () => {
  assert.ok(Array.isArray(FleetRebuildPolicy.SOURCE_ENTITIES));
  assert.ok(!FleetRebuildPolicy.SOURCE_ENTITIES.includes("vehicleComplianceIssues"));
  assert.ok(FleetRebuildPolicy.DERIVED_ENTITIES.includes("vehicleComplianceIssues"));
}));

results.push(test("fleet buildModel no longer performs direct derived rebuilds", () => {
  const buildModelIndex = fleetSource.indexOf("function buildModel()");
  const renderPageIndex = fleetSource.indexOf("function renderPage()");
  const buildModelSource = fleetSource.slice(buildModelIndex, renderPageIndex);
  assert.ok(!buildModelSource.includes("rebuildDerivedCollections("));
}));

results.push(test("fleet data change listener ignores re-entrant derived rebuild saves", () => {
  assert.ok(fleetSource.includes("fleetDerivedRebuildInFlight"));
  assert.ok(fleetSource.includes("sourceEntities.indexOf(entityName) >= 0"));
  assert.ok(fleetSource.includes("derivedEntities.indexOf(entityName) >= 0"));
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
