const assert = require("assert");
const MandatoryDaysEngine = require("../src/performance/mandatoryDaysEngine.js");
const Common = require("../src/performance/performanceCommon.js");
const { createRule, buildDailyRow } = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

function mandatoryRow(date, status) {
  return buildDailyRow({
    date,
    mandatoryDayStatus: status,
    validDayStatus: status === "mandatory_valid" ? "valid" : "invalid",
  });
}

const results = [];

results.push(test("6 of 7 mandatory days passes when allowMissed is 1", () => {
  const rules = createRule();
  const rows = [
    mandatoryRow("2026-07-01", "mandatory_valid"),
    mandatoryRow("2026-07-02", "mandatory_valid"),
    mandatoryRow("2026-07-03", "mandatory_valid"),
    mandatoryRow("2026-07-04", "mandatory_valid"),
    mandatoryRow("2026-07-05", "mandatory_valid"),
    mandatoryRow("2026-07-06", "mandatory_valid"),
    mandatoryRow("2026-07-07", "mandatory_invalid"),
  ];
  const summary = MandatoryDaysEngine.evaluateMandatoryDays(rows, rules);
  assert.strictEqual(summary.met, true);
  assert.strictEqual(summary.valid, 6);
  assert.strictEqual(summary.missed, 1);
}));

results.push(test("5 of 7 mandatory days fails", () => {
  const rules = createRule();
  const rows = [
    mandatoryRow("2026-07-01", "mandatory_valid"),
    mandatoryRow("2026-07-02", "mandatory_valid"),
    mandatoryRow("2026-07-03", "mandatory_valid"),
    mandatoryRow("2026-07-04", "mandatory_valid"),
    mandatoryRow("2026-07-05", "mandatory_valid"),
    mandatoryRow("2026-07-06", "mandatory_invalid"),
    mandatoryRow("2026-07-07", "mandatory_invalid"),
  ];
  const summary = MandatoryDaysEngine.evaluateMandatoryDays(rows, rules);
  assert.strictEqual(summary.met, false);
}));

results.push(test("mandatory weekdays generate only the requested weekday", () => {
  const rules = createRule({
    mandatoryDaysRules: {
      enabled: true,
      mandatoryDates: [],
      mandatoryWeekdays: ["Sunday"],
      minRequiredValidMandatoryDays: 1,
      allowMissedMandatoryDays: 10,
    },
  });
  const dates = MandatoryDaysEngine.getMandatoryDatesForMonth(rules, "2026-07");
  assert.ok(dates.length > 0);
  dates.forEach((date) => {
    assert.strictEqual(Common.weekdayName(date), "sunday");
  });
}));

results.push(test("missing data is counted for mandatory days", () => {
  const rules = createRule();
  const rows = [
    mandatoryRow("2026-07-01", "mandatory_valid"),
    mandatoryRow("2026-07-02", "mandatory_valid"),
  ];
  const summary = MandatoryDaysEngine.evaluateMandatoryDays(rows, rules);
  assert.ok(summary.noData >= 1);
}));

results.push(test("late month start adds a warning and excused dates", () => {
  const rules = createRule();
  const rows = [
    mandatoryRow("2026-07-06", "mandatory_valid"),
    mandatoryRow("2026-07-07", "mandatory_valid"),
  ];
  const summary = MandatoryDaysEngine.evaluateMandatoryDays(rows, rules);
  assert.ok(summary.warnings.length >= 1);
  assert.ok(summary.excusedDates.length >= 1);
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("mandatoryDaysEngine.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("mandatoryDaysEngine.test.js passed:", results.length);
