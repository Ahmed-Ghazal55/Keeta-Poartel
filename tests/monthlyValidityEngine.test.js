const assert = require("assert");
const MonthlyValidityEngine = require("../src/performance/monthlyValidityEngine.js");
const DailyPerformanceEngine = require("../src/performance/dailyPerformanceEngine.js");
const {
  createRule,
  buildDailyRow,
} = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

function buildMonthRows(overrides) {
  const baseRows = [
    buildDailyRow({ date: "2026-07-01", completedOrders: 60 }),
    buildDailyRow({ date: "2026-07-02", completedOrders: 60 }),
    buildDailyRow({ date: "2026-07-03", completedOrders: 60 }),
    buildDailyRow({ date: "2026-07-04", completedOrders: 50 }),
    buildDailyRow({ date: "2026-07-05", completedOrders: 50 }),
    buildDailyRow({ date: "2026-07-06", completedOrders: 50 }),
    buildDailyRow({ date: "2026-07-07", completedOrders: 50 }),
  ];
  return baseRows.map((row, index) => Object.assign({}, row, overrides && overrides[index] ? overrides[index] : {}));
}

const results = [];

results.push(test("eligible full case", () => {
  const rules = createRule();
  const rows = buildMonthRows().map((row) => DailyPerformanceEngine.calculateDailyPerformance(row, rules));
  const monthly = MonthlyValidityEngine.calculateMonthlyPerformance(rows, { city: rowCity(rows), register: "EXPRESS", riderId: "rider-1" }, rules);
  const validity = MonthlyValidityEngine.calculateValidityResult(monthly, {
    deliveryExperienceResult: { status: "pass", affectsIncentive: true },
    faceVerificationResult: { status: "pass" },
    vdaResult: { status: "valid", affectsSalaryEligibility: true, affectsValidity: true },
  }, rules);
  assert.strictEqual(validity.status, "eligible");
}));

results.push(test("not eligible due mandatory days", () => {
  const rules = createRule();
  const rows = buildMonthRows([
    null,
    null,
    null,
    { completedOrders: 0, workingHours: 0 },
    { completedOrders: 0, workingHours: 0 },
  ]).map((row) => DailyPerformanceEngine.calculateDailyPerformance(row, rules));
  const monthly = MonthlyValidityEngine.calculateMonthlyPerformance(rows, { city: rowCity(rows), register: "EXPRESS", riderId: "rider-1" }, rules);
  const validity = MonthlyValidityEngine.calculateValidityResult(monthly, {
    deliveryExperienceResult: { status: "pass", affectsIncentive: true },
    faceVerificationResult: { status: "pass" },
    vdaResult: { status: "valid", affectsSalaryEligibility: true, affectsValidity: true },
  }, rules);
  assert.strictEqual(validity.status, "not_eligible");
}));

results.push(test("under review due missing rider link", () => {
  const rules = createRule();
  const rows = buildMonthRows().map((row) => DailyPerformanceEngine.calculateDailyPerformance(row, rules));
  const monthly = MonthlyValidityEngine.calculateMonthlyPerformance(rows, { city: rowCity(rows), register: "EXPRESS", riderId: "" }, rules);
  const validity = MonthlyValidityEngine.calculateValidityResult(monthly, {
    missingRiderLink: true,
    deliveryExperienceResult: { status: "pass", affectsIncentive: true },
    faceVerificationResult: { status: "pass" },
    vdaResult: { status: "valid", affectsSalaryEligibility: true, affectsValidity: true },
  }, rules);
  assert.strictEqual(validity.status, "under_review");
}));

results.push(test("vda invalid blocks validity", () => {
  const rules = createRule();
  const rows = buildMonthRows().map((row) => DailyPerformanceEngine.calculateDailyPerformance(row, rules));
  const monthly = MonthlyValidityEngine.calculateMonthlyPerformance(rows, { city: rowCity(rows), register: "EXPRESS", riderId: "rider-1" }, rules);
  const validity = MonthlyValidityEngine.calculateValidityResult(monthly, {
    deliveryExperienceResult: { status: "pass", affectsIncentive: true },
    faceVerificationResult: { status: "pass" },
    vdaResult: { status: "invalid", affectsSalaryEligibility: true, affectsValidity: true },
  }, rules);
  assert.strictEqual(validity.status, "not_eligible");
}));

results.push(test("face failure blocks salary eligibility", () => {
  const rules = createRule();
  const rows = buildMonthRows().map((row) => DailyPerformanceEngine.calculateDailyPerformance(row, rules));
  const monthly = MonthlyValidityEngine.calculateMonthlyPerformance(rows, { city: rowCity(rows), register: "EXPRESS", riderId: "rider-1" }, rules);
  const validity = MonthlyValidityEngine.calculateValidityResult(monthly, {
    deliveryExperienceResult: { status: "pass", affectsIncentive: true },
    faceVerificationResult: { status: "fail" },
    vdaResult: { status: "valid", affectsSalaryEligibility: true, affectsValidity: true },
  }, rules);
  assert.strictEqual(validity.salaryEligibilityStatus, "not_eligible");
}));

results.push(test("delivery experience affects incentive eligibility", () => {
  const rules = createRule();
  const rows = buildMonthRows().map((row) => DailyPerformanceEngine.calculateDailyPerformance(row, rules));
  const monthly = MonthlyValidityEngine.calculateMonthlyPerformance(rows, { city: rowCity(rows), register: "EXPRESS", riderId: "rider-1" }, rules);
  const validity = MonthlyValidityEngine.calculateValidityResult(monthly, {
    deliveryExperienceResult: { status: "fail", affectsIncentive: true },
    faceVerificationResult: { status: "pass" },
    vdaResult: { status: "valid", affectsSalaryEligibility: true, affectsValidity: true },
  }, rules);
  assert.strictEqual(validity.incentiveEligibilityStatus, "not_eligible");
}));

function rowCity(rows) {
  return rows[0] ? rows[0].city : "";
}

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("monthlyValidityEngine.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("monthlyValidityEngine.test.js passed:", results.length);
