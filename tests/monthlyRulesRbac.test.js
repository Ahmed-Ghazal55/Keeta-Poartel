const assert = require("assert");
const {
  CITY_JEDDAH,
  CITY_RIYADH,
  createCitySupervisor,
  createRule,
  createRuntime,
  createSuperAdmin,
  createViewer,
} = require("./helpers/monthlyRulesTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const results = [];

results.push(test("viewer cannot create or edit monthly rules", () => {
  const runtime = createRuntime();
  const viewer = createViewer();
  assert.throws(() => runtime.service.createMonthlyRules(createRule({ id: "" }), viewer), /Permission denied/);
}));

results.push(test("city supervisor cannot edit another city rule", () => {
  const runtime = createRuntime({
    monthlyRules: [createRule({
      id: "ruh-rule",
      city: CITY_RIYADH,
      cityScope: "single",
      selectedCities: [CITY_RIYADH],
      register: "TOGARY",
      registerScope: "single",
      selectedRegisters: ["TOGARY"],
    })],
  });
  const jeddahSupervisor = createCitySupervisor(CITY_JEDDAH, "EXPRESS");
  assert.throws(() => runtime.service.updateMonthlyRules("ruh-rule", { notes: "forbidden" }, jeddahSupervisor), /outside the current user scope/);
}));

results.push(test("super admin can activate monthly rules", () => {
  const runtime = createRuntime({
    monthlyRules: [createRule({ id: "activate-me" })],
  });
  const result = runtime.service.activateMonthlyRules("activate-me", createSuperAdmin());
  assert.strictEqual(result.status, "active");
}));

results.push(test("unlock permission is required for locked rules", () => {
  const runtime = createRuntime({
    monthlyRules: [createRule({ id: "locked-rule", status: "locked" })],
  });
  const supervisor = createCitySupervisor(CITY_JEDDAH, "EXPRESS");
  assert.throws(() => runtime.service.updateMonthlyRules("locked-rule", { notes: "attempt" }, supervisor), /Locked rules cannot be updated/);
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("monthlyRulesRbac.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("monthlyRulesRbac.test.js passed:", results.length);
