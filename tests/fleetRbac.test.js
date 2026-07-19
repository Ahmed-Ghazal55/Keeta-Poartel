const assert = require("assert");
const RBAC = require("../src/auth/rbac.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const viewer = {
  id: "viewer_1",
  role: "viewer",
  cityScope: "all",
  selectedCities: ["جدة", "الرياض"],
  registerScope: "all",
  selectedRegisters: ["EXPRESS", "TOGARY"],
  permissions: []
};

const fleetOfficer = {
  id: "fleet_1",
  role: "fleet_officer",
  cityScope: "single",
  selectedCities: ["جدة"],
  registerScope: "single",
  selectedRegisters: ["EXPRESS"],
  permissions: []
};

const results = [];

results.push(test("monthlyRules permissions remain present before Prompt 8 work", () => {
  assert.ok(RBAC.DEFAULT_PERMISSIONS.includes("monthlyRules.view"));
  assert.ok(RBAC.DEFAULT_PERMISSIONS.includes("monthlyRules.edit"));
}));

results.push(test("fleet permissions exist in RBAC defaults", () => {
  [
    "fleet.view",
    "fleet.import",
    "fleet.edit",
    "fleet.assign",
    "fleet.exclude",
    "fleet.reviewIssues",
    "fleet.export",
    "fleetMovement.view",
    "fleetMovement.edit"
  ].forEach((permission) => {
    assert.ok(RBAC.DEFAULT_PERMISSIONS.includes(permission));
  });
}));

results.push(test("viewer can view fleet but cannot edit or exclude", () => {
  assert.strictEqual(RBAC.canPerform(viewer, "fleet.view"), true);
  assert.strictEqual(RBAC.canPerform(viewer, "fleet.exclude"), false);
  assert.strictEqual(RBAC.canPerform(viewer, "fleetMovement.edit"), false);
}));

results.push(test("fleet officer has fleet edit and movement edit permissions", () => {
  assert.strictEqual(RBAC.canPerform(fleetOfficer, "fleet.edit"), true);
  assert.strictEqual(RBAC.canPerform(fleetOfficer, "fleet.exclude"), true);
  assert.strictEqual(RBAC.canPerform(fleetOfficer, "fleetMovement.edit"), true);
}));

results.push(test("fleet officer city/register scope is enforced", () => {
  assert.strictEqual(RBAC.canAccessCity(fleetOfficer, "جدة"), true);
  assert.strictEqual(RBAC.canAccessCity(fleetOfficer, "الرياض"), false);
  assert.strictEqual(RBAC.canAccessRegister(fleetOfficer, "EXPRESS"), true);
  assert.strictEqual(RBAC.canAccessRegister(fleetOfficer, "TOGARY"), false);
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
