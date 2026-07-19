const assert = require("assert");
const Resolver = require("../src/performance/performanceRuleResolver.js");
const {
  CITY_JEDDAH,
  CITY_RIYADH,
  createRule,
  createRuntime,
} = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const results = [];

results.push(test("active monthly rule resolves by month city register and platform", () => {
  const runtime = createRuntime({
    monthlyRules: [createRule()],
  });
  const resolved = Resolver.resolvePerformanceRules({
    city: CITY_JEDDAH,
    month: "2026-07",
    monthlyRulesService: runtime.monthlyRulesService,
    platform: "keeta",
    register: "EXPRESS",
  });
  assert.strictEqual(resolved.appliedRuleId, "rule-jed-express-2026-07");
  assert.strictEqual(resolved.fallbackUsed, false);
}));

results.push(test("fallback is used when no active rule exists", () => {
  const resolved = Resolver.resolvePerformanceRules({
    city: CITY_RIYADH,
    month: "2026-07",
    platform: "keeta",
    register: "TOGARY",
  });
  assert.strictEqual(resolved.appliedRuleId, "legacy_fallback");
  assert.strictEqual(resolved.fallbackUsed, true);
  assert.deepStrictEqual(resolved.fallbackParts, ["all"]);
}));

results.push(test("partial fallback is reported when rule is missing a section", () => {
  const runtime = createRuntime({
    monthlyRules: [
      Object.assign({}, createRule(), {
        id: "rule-partial",
        deliveryExperienceRules: null,
      }),
    ],
  });
  const resolved = Resolver.resolvePerformanceRules({
    city: CITY_JEDDAH,
    month: "2026-07",
    monthlyRulesService: runtime.monthlyRulesService,
    platform: "keeta",
    register: "EXPRESS",
  });
  assert.strictEqual(resolved.fallbackUsed, true);
  assert.ok(resolved.fallbackParts.indexOf("deliveryExperienceRules") >= 0);
}));

results.push(test("specific rule wins over broader rule", () => {
  const runtime = createRuntime({
    monthlyRules: [
      createRule({
        id: "rule-all-jeddah",
        cityScope: "single",
        selectedCities: [CITY_JEDDAH],
        registerScope: "all",
        selectedRegisters: [],
      }),
      createRule({
        id: "rule-specific",
        cityScope: "single",
        selectedCities: [CITY_JEDDAH],
        registerScope: "single",
        selectedRegisters: ["EXPRESS"],
      }),
    ],
  });
  const resolved = Resolver.resolvePerformanceRules({
    city: CITY_JEDDAH,
    month: "2026-07",
    monthlyRulesService: runtime.monthlyRulesService,
    platform: "keeta",
    register: "EXPRESS",
  });
  assert.strictEqual(resolved.appliedRuleId, "rule-specific");
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("performanceRuleResolver.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("performanceRuleResolver.test.js passed:", results.length);
