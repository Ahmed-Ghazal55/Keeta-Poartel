const assert = require("assert");
const {
  CITY_JEDDAH,
  createOperationsAdmin,
  createRule,
  createRuntime,
  createSuperAdmin,
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

results.push(test("create draft stores monthly rule and audit", () => {
  const runtime = createRuntime();
  const user = createOperationsAdmin();
  const result = runtime.service.createMonthlyRules(createRule({ id: "", month: "2026-09" }), user);
  assert.strictEqual(result.status, "draft");
  assert.strictEqual(runtime.dataStore.getAll("monthlyRules").length, 1);
  assert.ok(runtime.dataStore.getAll("auditLogs").some((item) => item.action === "monthly_rule_created"));
}));

results.push(test("update draft keeps same id and edits notes", () => {
  const runtime = createRuntime({
    monthlyRules: [createRule({ id: "rule-update" })],
  });
  const user = createOperationsAdmin();
  const updated = runtime.service.updateMonthlyRules("rule-update", { notes: "updated note" }, user);
  assert.strictEqual(updated.id, "rule-update");
  assert.strictEqual(updated.notes, "updated note");
}));

results.push(test("activate rule changes status and effective dates", () => {
  const runtime = createRuntime({
    monthlyRules: [createRule({ id: "rule-activate" })],
  });
  const user = createSuperAdmin();
  const activated = runtime.service.activateMonthlyRules("rule-activate", user);
  assert.strictEqual(activated.status, "active");
  assert.strictEqual(activated.effectiveFrom, "2026-07-01");
  assert.strictEqual(activated.effectiveTo, "2026-07-31");
}));

results.push(test("get active rules resolves by city and register", () => {
  const runtime = createRuntime({
    monthlyRules: [
      createRule({ id: "rule-active", status: "active" }),
      createRule({ id: "rule-other", status: "active", cityScope: "single", selectedCities: ["الرياض"], registerScope: "single", selectedRegisters: ["TOGARY"] }),
    ],
  });
  const matches = runtime.service.getActiveRules({
    city: CITY_JEDDAH,
    month: "2026-07",
    platform: "keeta",
    register: "EXPRESS",
  });
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].id, "rule-active");
}));

results.push(test("clone next month creates new draft and previousVersionId", () => {
  const runtime = createRuntime({
    monthlyRules: [createRule({ id: "rule-source", status: "active" })],
  });
  const user = createOperationsAdmin();
  const cloned = runtime.service.cloneMonthlyRules("rule-source", "2026-08", user);
  assert.strictEqual(cloned.status, "draft");
  assert.strictEqual(cloned.month, "2026-08");
  assert.strictEqual(cloned.previousVersionId, "rule-source");
}));

results.push(test("export and import JSON round-trip as draft", () => {
  const runtime = createRuntime({
    monthlyRules: [createRule({ id: "rule-export", status: "active" })],
  });
  const superAdmin = createSuperAdmin();
  const exported = runtime.service.exportMonthlyRules("rule-export", superAdmin);
  const imported = runtime.service.importMonthlyRules(exported, superAdmin);
  assert.strictEqual(imported.status, "draft");
  assert.strictEqual(imported.previousVersionId, "rule-export");
  assert.ok(runtime.dataStore.getAll("auditLogs").some((item) => item.action === "monthly_rule_created" && item.entityId === imported.id));
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("monthlyRulesService.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("monthlyRulesService.test.js passed:", results.length);
