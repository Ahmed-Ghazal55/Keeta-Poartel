const assert = require("assert");
const HrComputedFields = require("../src/hr/hrComputedFields.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const dataSources = {
  amazonData: [
    { iqama: "2444000011", userId: "AMAZON-55", city: "جدة" }
  ],
  chefzData: [
    { iqama: "2444000011", userId: "CHEFZ-11", status: "active" },
    { iqama: "2444000022", userId: "CHEFZ-22", status: "blocked" }
  ],
  driverCards: [
    { iqama: "2444000011", cardNumber: "CARD-2026-001", cardStatus: "Valid", cardExpiry: "2027-02-01" }
  ],
  hungerData: [
    { iqama: "2444000011", userId: "HUNGER-7", branch: "Jeddah Express", city: "جدة" }
  ],
  hungerIssues: [
    { iqama: "2444000099", reason: "مرفوض لعدم اكتمال البيانات" }
  ],
  jahezAllBranches: [
    { iqama: "2444000011", userId: "JAHEZ-18", branch: "Express Gate", city: "جدة" }
  ],
  keetaJeddahPerformance: [
    { iqama: "2444000011", userId: "KEETA-1001", city: "جدة", register: "EXPRESS" }
  ],
  ninjaData: [
    { iqama: "2444000011", userId: "NINJA-1" }
  ]
};

const hrProfile = {
  employeeId: "EMP-1001",
  fullNameArabic: "Ahmed Salem",
  iqama: "2444000011",
  registerName: "EXPRESS GATE Company"
};

const results = [];

results.push(test("driver card wrapper returns the required explicit fallback", () => {
  assert.strictEqual(HrComputedFields.computeDriverCard("9999999999", dataSources), "لم يتم اصدار بطاقة سائق بعد");
}));

results.push(test("work apps wrapper falls back to not working when no platforms are linked", () => {
  assert.strictEqual(HrComputedFields.computeWorkApps("2444999999", dataSources), "لا يعمل حاليا");
}));

results.push(test("hunger wrapper includes branch when an ID exists", () => {
  assert.strictEqual(HrComputedFields.computeHungerId("2444000011", dataSources), "HUNGER-7 - له ايدي هنقر في Jeddah Express");
}));

results.push(test("hunger wrapper explains the missing-ID issue when available", () => {
  assert.strictEqual(HrComputedFields.computeHungerId("2444000099", dataSources), "لا يوجد ايدي والسبب: مرفوض لعدم اكتمال البيانات");
}));

results.push(test("chefz wrapper reflects active and blocked statuses", () => {
  assert.strictEqual(HrComputedFields.computeChefzId("2444000011", dataSources), "CHEFZ-11 - له ايدي شيفز (نشط)");
  assert.strictEqual(HrComputedFields.computeChefzId("2444000022", dataSources), "CHEFZ-22 - إيقاف وحظر");
}));

results.push(test("display row wrapper exposes the prompt 8 computed contract", () => {
  const row = HrComputedFields.computeHrDisplayRow(hrProfile, dataSources);
  assert.strictEqual(row.keetaId, "KEETA-1001");
  assert.strictEqual(row.amazonId, "AMAZON-55 له ايدي امازون بجدة");
  assert.strictEqual(row.jahezId, "JAHEZ-18 له ايدي جاهز في Express Gate");
  assert.ok(row.workApplicationsSummary.includes("كيتا"));
}));

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
