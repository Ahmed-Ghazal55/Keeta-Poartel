const assert = require("assert");
const Adapter = require("../src/performance/deliveryExperienceAdapter.js");
const { createRule, buildDeliveryResult } = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const results = [];

results.push(test("delivery grade scores can come from monthly rules", () => {
  const rules = createRule({
    deliveryExperienceRules: {
      enabled: true,
      minGrade: "B",
      gradeScores: { A: 2500, B: 1500, C: 900 },
      affectsIncentive: true,
    },
  });
  const result = Adapter.evaluateDeliveryExperience(buildDeliveryResult({ level: "A" }), rules, { vehicleType: "car" });
  assert.strictEqual(result.status, "pass");
  assert.strictEqual(result.incentive, 2500);
}));

results.push(test("delivery fallback uses legacy incentive levels", () => {
  const result = Adapter.evaluateDeliveryExperience(buildDeliveryResult({ level: "A", estimatedBonusAmount: "" }), null, { vehicleType: "car" });
  assert.ok(result.incentive > 0);
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("deliveryExperienceRulesAdapter.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("deliveryExperienceRulesAdapter.test.js passed:", results.length);
