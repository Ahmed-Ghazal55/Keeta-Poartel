const assert = require("assert");
const Adapter = require("../src/performance/vdaAdapter.js");
const { createRule, buildVdaResult } = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const results = [];

results.push(test("vda valid status passes", () => {
  const rules = createRule();
  const result = Adapter.evaluateVdaResult(buildVdaResult({ status: "valid" }), rules, {});
  assert.strictEqual(result.status, "valid");
}));

results.push(test("vda invalid status fails", () => {
  const rules = createRule();
  const result = Adapter.evaluateVdaResult(buildVdaResult({ status: "invalid" }), rules, {});
  assert.strictEqual(result.status, "invalid");
}));

results.push(test("vda fallback can evaluate raw row through the legacy engine", () => {
  const result = Adapter.evaluateVdaResult({
    "Rider ID": "1001",
    "Vehicle Type": "car",
    "Online Day": 3,
    "Sum of Valid Shifts": 0,
    "Sum of total delivered tasks": 4,
    "Face Pass Rate": 0.5,
  }, null, {});
  assert.strictEqual(result.status, "invalid");
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("vdaRulesAdapter.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("vdaRulesAdapter.test.js passed:", results.length);
