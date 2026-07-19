const assert = require("assert");
const RBAC = require("../src/auth/rbac.js");

const CITY_JEDDAH = "\u062c\u062f\u0629";
const CITY_RIYADH = "\u0627\u0644\u0631\u064a\u0627\u0636";

const superAdmin = {
  id: "super",
  role: "super_admin",
  cityScope: "all",
  selectedCities: [CITY_JEDDAH, CITY_RIYADH],
  registerScope: "all",
  selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
  permissions: []
};

const jeddahSupervisor = {
  id: "jed",
  role: "city_supervisor",
  cityScope: "single",
  selectedCities: [CITY_JEDDAH],
  registerScope: "single",
  selectedRegisters: ["EXPRESS"],
  permissions: []
};

const riyadhSupervisor = {
  id: "ruh",
  role: "city_supervisor",
  cityScope: "single",
  selectedCities: [CITY_RIYADH],
  registerScope: "single",
  selectedRegisters: ["TOGARY"],
  permissions: []
};

const viewer = {
  id: "viewer",
  role: "viewer",
  cityScope: "single",
  selectedCities: [CITY_JEDDAH],
  registerScope: "single",
  selectedRegisters: ["EXPRESS"],
  permissions: []
};

const finance = {
  id: "finance",
  role: "finance_officer",
  cityScope: "all",
  selectedCities: [CITY_JEDDAH, CITY_RIYADH],
  registerScope: "all",
  selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
  permissions: []
};

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const scopedRows = [
  { id: "1", city: CITY_JEDDAH, register: "EXPRESS" },
  { id: "2", city: CITY_RIYADH, register: "TOGARY" }
];

const results = [];

results.push(test("super_admin can access all cities", () => {
  assert.strictEqual(RBAC.canAccessCity(superAdmin, CITY_JEDDAH), true);
  assert.strictEqual(RBAC.canAccessCity(superAdmin, CITY_RIYADH), true);
}));

results.push(test("jeddah supervisor cannot see riyadh", () => {
  assert.strictEqual(RBAC.canAccessCity(jeddahSupervisor, CITY_RIYADH), false);
}));

results.push(test("riyadh supervisor cannot see jeddah", () => {
  assert.strictEqual(RBAC.canAccessCity(riyadhSupervisor, CITY_JEDDAH), false);
}));

results.push(test("viewer cannot assign or swap", () => {
  assert.strictEqual(RBAC.canPerform(viewer, "operations.assign"), false);
  assert.strictEqual(RBAC.canPerform(viewer, "operations.swap"), false);
  assert.strictEqual(RBAC.canPerform(viewer, "imports.save"), false);
}));

results.push(test("finance can view monthly closing but cannot edit HR", () => {
  assert.strictEqual(RBAC.canPerform(finance, "monthlyClosing.view"), true);
  assert.strictEqual(RBAC.canPerform(finance, "hr.edit"), false);
  assert.strictEqual(RBAC.canPerform(finance, "imports.save"), true);
}));

results.push(test("filterRowsByUserScope respects city and register scope", () => {
  const filtered = RBAC.filterRowsByUserScope(jeddahSupervisor, scopedRows);
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].city, CITY_JEDDAH);
}));

results.push(test("filterRowsByUserScope supports register alias mapping", () => {
  const legacyRows = [
    { id: "legacy-1", city: CITY_JEDDAH, register: "Express" },
    { id: "legacy-2", city: CITY_JEDDAH, register: "FR 3PL" },
    { id: "legacy-3", city: CITY_RIYADH, register: "Express" }
  ];
  const filtered = RBAC.filterRowsByUserScope(jeddahSupervisor, legacyRows, {
    registerMatcher: (user, registerValue) => {
      if (user.registerScope === "all") {
        return true;
      }
      return (user.selectedRegisters || []).some((code) => {
        if (code === registerValue) {
          return true;
        }
        return code === "EXPRESS" && registerValue === "Express";
      });
    }
  });
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].register, "Express");
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
