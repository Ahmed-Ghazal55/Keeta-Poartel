const assert = require("assert");
const { validateMonthlyRules } = require("../src/rules/monthlyRulesValidator.js");
const {
  CITY_JEDDAH,
  createRule,
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

results.push(test("valid monthly rule passes validation", () => {
  const result = validateMonthlyRules(createRule(), { existingRules: [] });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.blockingIssues.length, 0);
}));

results.push(test("missing month is blocking", () => {
  const result = validateMonthlyRules(createRule({ month: "" }), { existingRules: [] });
  assert.ok(result.blockingIssues.some((item) => item.code === "missing_month"));
}));

results.push(test("overlapping tiers are blocking", () => {
  const result = validateMonthlyRules(createRule({
    incentiveRules: {
      carTiers: [
        { minOrders: 0, maxOrders: 60, rate: 11 },
        { minOrders: 60, maxOrders: 80, rate: 14 },
      ],
    },
  }), { existingRules: [] });
  assert.ok(result.blockingIssues.some((item) => item.code === "overlapping_tiers"));
}));

results.push(test("invalid face pass rate is blocking", () => {
  const result = validateMonthlyRules(createRule({
    faceVerificationRules: { passRateRequired: 140 },
  }), { existingRules: [] });
  assert.ok(result.blockingIssues.some((item) => item.code === "invalid_face_pass_rate"));
}));

results.push(test("mandatory required days cannot exceed dates", () => {
  const result = validateMonthlyRules(createRule({
    mandatoryDaysRules: {
      mandatoryDates: ["2026-07-01", "2026-07-02"],
      minRequiredValidMandatoryDays: 3,
    },
  }), { existingRules: [] });
  assert.ok(result.blockingIssues.some((item) => item.code === "mandatory_days_overflow"));
}));

results.push(test("duplicate active rule for same scope is blocking", () => {
  const existingRule = createRule({
    id: "existing-active",
    status: "active",
  });
  const result = validateMonthlyRules(createRule({
    id: "candidate-active",
    status: "active",
  }), {
    existingRules: [existingRule],
    mode: "activate",
  });
  assert.ok(result.blockingIssues.some((item) => item.code === "duplicate_active_rule"));
}));

results.push(test("locked update without permission is rejected", () => {
  const result = validateMonthlyRules(createRule({
    status: "locked",
    city: CITY_JEDDAH,
  }), {
    allowLockedUpdate: false,
    existingRules: [],
    lockedUpdate: true,
  });
  assert.ok(result.blockingIssues.some((item) => item.code === "locked_rule_update_rejected"));
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("monthlyRulesValidator.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("monthlyRulesValidator.test.js passed:", results.length);
