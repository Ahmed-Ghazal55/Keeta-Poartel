const assert = require("assert");
const Adapter = require("../src/performance/faceVerificationAdapter.js");
const { createRule, buildFaceRow } = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const results = [];

results.push(test("face pass rate uses monthly rules threshold", () => {
  const rules = createRule({
    faceVerificationRules: {
      enabled: true,
      passRateRequired: 75,
      skipCountsAsFail: true,
      excludeNoResultDays: true,
      allowExpectedProjection: true,
    },
  });
  const summary = Adapter.evaluateFaceVerification([
    buildFaceRow({ result: "pass" }),
    buildFaceRow({ date: "2026-07-02", result: "pass" }),
    buildFaceRow({ date: "2026-07-03", result: "pass" }),
    buildFaceRow({ date: "2026-07-04", result: "fail" }),
  ], rules, {});
  assert.strictEqual(summary.status, "pass");
}));

results.push(test("face fallback uses legacy threshold when no rules are passed", () => {
  const summary = Adapter.evaluateFaceVerification([
    buildFaceRow({ result: "pass" }),
    buildFaceRow({ date: "2026-07-02", result: "pass" }),
    buildFaceRow({ date: "2026-07-03", result: "pass" }),
    buildFaceRow({ date: "2026-07-04", result: "pass" }),
    buildFaceRow({ date: "2026-07-05", result: "pass" }),
    buildFaceRow({ date: "2026-07-06", result: "pass" }),
    buildFaceRow({ date: "2026-07-07", result: "pass" }),
    buildFaceRow({ date: "2026-07-08", result: "pass" }),
    buildFaceRow({ date: "2026-07-09", result: "fail" }),
    buildFaceRow({ date: "2026-07-10", result: "fail" }),
  ], null, {});
  assert.strictEqual(summary.status, "fail");
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("faceVerificationRulesAdapter.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("faceVerificationRulesAdapter.test.js passed:", results.length);
