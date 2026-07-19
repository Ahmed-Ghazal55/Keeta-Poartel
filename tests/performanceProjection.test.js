const assert = require("assert");
const MonthlyValidityEngine = require("../src/performance/monthlyValidityEngine.js");
const { createRule } = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const rules = createRule();
const results = [];

results.push(test("projection can still qualify when enough days remain", () => {
  const summary = {
    month: "2026-07",
    totalCompletedOrders: 220,
    validDaysCount: 4,
    vehicleType: "car",
  };
  const projection = MonthlyValidityEngine.calculateExpectedEndOfMonth(summary, rules, "2026-07-10");
  assert.strictEqual(projection.canStillQualify, true);
}));

results.push(test("projection cannot qualify when remaining window is too small", () => {
  const summary = {
    month: "2026-07",
    totalCompletedOrders: 100,
    validDaysCount: 2,
    vehicleType: "car",
  };
  const projection = MonthlyValidityEngine.calculateExpectedEndOfMonth(summary, rules, "2026-07-30");
  assert.strictEqual(projection.canStillQualify, false);
}));

results.push(test("required valid days remaining is returned", () => {
  const remaining = MonthlyValidityEngine.calculateRequiredValidDaysRemaining({
    validDaysCount: 2,
    vehicleType: "car",
  }, rules);
  assert.strictEqual(remaining, 4);
}));

results.push(test("required orders remaining is returned", () => {
  const remaining = MonthlyValidityEngine.calculateRequiredOrdersRemaining({
    totalCompletedOrders: 120,
    vehicleType: "car",
  }, rules);
  assert.strictEqual(remaining, 210);
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("performanceProjection.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("performanceProjection.test.js passed:", results.length);
