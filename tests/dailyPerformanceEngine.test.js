const assert = require("assert");
const DailyPerformanceEngine = require("../src/performance/dailyPerformanceEngine.js");
const { createRule, buildDailyRow } = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const results = [];

results.push(test("orders_only mode validates by orders", () => {
  const rules = createRule({
    validDayRules: { validDayMode: "orders_only", minOrdersCar: 18, minWorkingHoursCar: 8 },
  });
  const row = buildDailyRow({ completedOrders: 19, workingHours: 2 });
  assert.strictEqual(DailyPerformanceEngine.isValidDay(row, rules, "car"), true);
}));

results.push(test("hours_only mode validates by hours", () => {
  const rules = createRule({
    validDayRules: { validDayMode: "hours_only", minOrdersCar: 18, minWorkingHoursCar: 8 },
  });
  const row = buildDailyRow({ completedOrders: 5, workingHours: 8.5 });
  assert.strictEqual(DailyPerformanceEngine.isValidDay(row, rules, "car"), true);
}));

results.push(test("orders_or_hours mode passes when one target is met", () => {
  const rules = createRule({
    validDayRules: { validDayMode: "orders_or_hours", minOrdersCar: 18, minWorkingHoursCar: 8 },
  });
  const row = buildDailyRow({ completedOrders: 10, workingHours: 8.2 });
  assert.strictEqual(DailyPerformanceEngine.isValidDay(row, rules, "car"), true);
}));

results.push(test("orders_and_hours mode fails when one target is missing", () => {
  const rules = createRule({
    validDayRules: { validDayMode: "orders_and_hours", minOrdersCar: 18, minWorkingHoursCar: 8 },
  });
  const row = buildDailyRow({ completedOrders: 18, workingHours: 7.5 });
  const calculated = DailyPerformanceEngine.calculateDailyPerformance(row, rules);
  assert.strictEqual(calculated.validDayStatus, "invalid");
  assert.ok(calculated.validDayReasons.length >= 1);
}));

results.push(test("bike criteria can differ from car criteria", () => {
  const rules = createRule({
    validDayRules: {
      validDayMode: "orders_only",
      minOrdersCar: 18,
      minOrdersBike: 16,
      minWorkingHoursCar: 8,
      minWorkingHoursBike: 7,
    },
  });
  const row = buildDailyRow({ vehicleType: "bike", completedOrders: 16, workingHours: 4 });
  assert.strictEqual(DailyPerformanceEngine.isValidDay(row, rules, "bike"), true);
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("dailyPerformanceEngine.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("dailyPerformanceEngine.test.js passed:", results.length);
