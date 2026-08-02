const assert = require("assert");
const fs = require("fs");
const path = require("path");

const AuditPolicy = require("../src/audit/auditPolicy.js");

const operationsUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_operations_extension.js"),
  "utf8"
);
const hrUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_hr_extension.js"),
  "utf8"
);
const fleetUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_fleet_extension.js"),
  "utf8"
);

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("audit policy rejects HR/Fleet read-only route and drawer interactions", () => {
  const hrRoute = AuditPolicy.classifyAuditRecord({
    action: "hr_profile_updated",
    actorUserId: "viewer",
    entity: "hrProfiles",
    entityId: "hr_1",
    reason: "Cross-link navigation to HR profile route",
    source: "route_change"
  });
  const fleetDrawer = AuditPolicy.classifyAuditRecord({
    action: "vehicle_updated",
    actorUserId: "viewer",
    entity: "vehicles",
    entityId: "vehicle_11_bike_9009",
    reason: "Opened fleet detail drawer from operations",
    source: "drawer_open"
  });
  const usageSearch = AuditPolicy.classifyAuditRecord({
    action: "vehicle_updated",
    actorUserId: "viewer",
    entity: "vehicles",
    entityId: "vehicle_11_bike_9009",
    reason: "Vehicle usage history search filter",
    source: "filter_input"
  });

  assert.strictEqual(hrRoute.isPhantom, true);
  assert.strictEqual(fleetDrawer.isPhantom, true);
  assert.strictEqual(usageSearch.isPhantom, true);
}));

results.push(test("HR/Fleet UI files keep audit creation inside service layers only", () => {
  [operationsUi, hrUi, fleetUi].forEach((source) => {
    assert.ok(!source.includes("createAuditEvent("));
    assert.ok(!source.includes("recordAuditEvent("));
  });
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
