const assert = require("assert");
const {
  compareRuleVersions,
  computeNextVersion,
} = require("../src/rules/monthlyRulesVersioning.js");
const {
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

results.push(test("version increment works from current version", () => {
  assert.strictEqual(computeNextVersion({ version: 3 }), 4);
}));

results.push(test("compare old and new rules returns changed paths", () => {
  const before = createRule({ notes: "before" });
  const after = createRule({ notes: "after", orderRules: { regularDayMinOrders: 5 } });
  const diff = compareRuleVersions(before, after);
  assert.ok(diff.changeCount >= 2);
  assert.ok(diff.changedPaths.some((item) => item === "notes"));
}));

results.push(test("previousVersionId is preserved in compare result", () => {
  const diff = compareRuleVersions(
    createRule({ id: "old-rule" }),
    createRule({ id: "new-rule", previousVersionId: "old-rule" })
  );
  assert.strictEqual(diff.previousVersionId, "old-rule");
}));

results.push(test("locked rules create a new draft version on update by privileged user", () => {
  const runtime = createRuntime({
    monthlyRules: [createRule({ id: "locked-rule", status: "locked", version: 2 })],
  });
  const user = createSuperAdmin();
  const result = runtime.service.updateMonthlyRules("locked-rule", { notes: "new draft from lock" }, user);
  assert.notStrictEqual(result.id, "locked-rule");
  assert.strictEqual(result.previousVersionId, "locked-rule");
  assert.strictEqual(result.version, 3);
  assert.strictEqual(result.status, "draft");
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("monthlyRulesVersioning.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("monthlyRulesVersioning.test.js passed:", results.length);
