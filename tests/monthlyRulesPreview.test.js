const assert = require("assert");
const { buildMonthlyRulesPreview } = require("../src/rules/monthlyRulesPreview.js");
const { createRule } = require("./helpers/monthlyRulesTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const results = [];

results.push(test("preview returns Arabic summary title", () => {
  const preview = buildMonthlyRulesPreview(createRule());
  assert.ok(preview.title.includes("شهر 2026-07"));
}));

results.push(test("car and bike valid day text appears in preview", () => {
  const preview = buildMonthlyRulesPreview(createRule({
    validDayRules: {
      minOrdersCar: 20,
      minOrdersBike: 22,
      minWorkingHoursCar: 8,
      minWorkingHoursBike: 9,
    },
  }));
  assert.ok(preview.summaryText.includes("السيارة: 20 طلب أو 8 ساعات"));
  assert.ok(preview.summaryText.includes("الدباب: 22 طلب أو 9 ساعات"));
}));

results.push(test("mandatory days text is rendered", () => {
  const preview = buildMonthlyRulesPreview(createRule({
    mandatoryDaysRules: {
      mandatoryDates: ["2026-07-01", "2026-07-02"],
      minRequiredValidMandatoryDays: 2,
    },
  }));
  assert.ok(preview.summaryText.includes("2 تواريخ إلزامية"));
}));

results.push(test("face vda and delivery details are rendered", () => {
  const preview = buildMonthlyRulesPreview(createRule());
  assert.ok(preview.summaryText.includes("Face Verification"));
  assert.ok(preview.summaryText.includes("VDA"));
  assert.ok(preview.summaryText.includes("Delivery Experience"));
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("monthlyRulesPreview.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("monthlyRulesPreview.test.js passed:", results.length);
