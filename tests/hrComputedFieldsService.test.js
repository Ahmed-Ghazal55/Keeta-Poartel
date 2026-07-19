const assert = require("assert");
const HrComputedFieldsService = require("../src/hr/hrComputedFieldsService.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const dataSources = {
  driverCards: [
    {
      iqama: "2444000011",
      cardNumber: "CARD-2026-001",
      cardStatus: "Valid",
      cardExpiry: "2027-02-01"
    }
  ],
  riderPlatformAccounts: [
    { iqama: "2444000011", platform: "keeta", userId: "KEETA-1001", city: "جدة", register: "EXPRESS" },
    { iqama: "2444000011", platform: "hungerstation", userId: "HUNGER-1001", city: "جدة", register: "EXPRESS" },
    { iqama: "2444000011", platform: "amazon", userId: "AMAZON-1001", city: "الرياض", register: "TOGARY" },
    { iqama: "2444000011", platform: "ninja", userId: "NINJA-1001", city: "جدة", register: "EXPRESS" },
    { iqama: "2444000011", platform: "jahez", userId: "JAHEZ-1001", city: "جدة", register: "EXPRESS" }
  ]
};

const hrProfile = {
  employeeId: "EMP-1001",
  employmentType: "sponsorship",
  fullNameArabic: "Ahmed Salem",
  hrStatus: "active",
  iqama: "2444000011",
  jobTitle: "Rider",
  kafalaStatus: "على الكفالة",
  licenseState: "سارية",
  licenseType: "عمومي",
  nationality: "Egyptian",
  notes: "Prompt 8 test row",
  professionAtIqama: "Courier",
  registerName: "EXPRESS GATE Company",
  residencyExpiry: "2027-02-01",
  residencyStatus: "سارية",
  sponsorId: "1010101010",
  startDate: "2026-01-10"
};

const results = [];

results.push(test("driver card summary uses the driver cards lookup", () => {
  assert.strictEqual(
    HrComputedFieldsService.computeDriverCardSummary("2444000011", dataSources),
    "CARD-2026-001 - Valid - 2027-02-01"
  );
}));

results.push(test("driver card summary falls back clearly when source is missing", () => {
  assert.strictEqual(
    HrComputedFieldsService.computeDriverCardSummary("9999999999", dataSources),
    "لم يتم اصدار بطاقة سائق بعد"
  );
}));

results.push(test("work applications summary concatenates linked platform accounts", () => {
  const summary = HrComputedFieldsService.computeWorkApplicationsSummary("2444000011", dataSources);
  assert.ok(summary.includes("KEETA-1001"));
  assert.ok(summary.includes("HUNGER-1001"));
  assert.ok(summary.includes("AMAZON-1001"));
}));

results.push(test("Keeta city/register and IDs resolve by iqama", () => {
  assert.strictEqual(HrComputedFieldsService.computeKeetaCityRegister("2444000011", dataSources), "جدة - EXPRESS");
  assert.strictEqual(HrComputedFieldsService.computeKeetaId("2444000011", dataSources), "KEETA-1001");
  assert.strictEqual(HrComputedFieldsService.computeHungerId("2444000011", dataSources), "HUNGER-1001");
  assert.strictEqual(HrComputedFieldsService.computeAmazonId("2444000011", dataSources), "AMAZON-1001");
  assert.strictEqual(HrComputedFieldsService.computeNinjaId("2444000011", dataSources), "NINJA-1001");
  assert.strictEqual(HrComputedFieldsService.computeJahezId("2444000011", dataSources), "JAHEZ-1001");
}));

results.push(test("missing platform IDs return the explicit fallback text", () => {
  assert.strictEqual(HrComputedFieldsService.computeChefzId("2444000011", dataSources), "لا يوجد ايدي");
}));

results.push(test("computeHrDisplayRow produces Prompt 8 display fields", () => {
  const row = HrComputedFieldsService.computeHrDisplayRow(hrProfile, dataSources);
  assert.strictEqual(row.employeeNumber, "EMP-1001");
  assert.strictEqual(row.fullName, "Ahmed Salem");
  assert.strictEqual(row.iqama, "2444000011");
  assert.strictEqual(row.driverCardSummary, "CARD-2026-001 - Valid - 2027-02-01");
  assert.strictEqual(row.keetaCityRegister, "جدة - EXPRESS");
  assert.strictEqual(row.keetaId, "KEETA-1001");
  assert.strictEqual(row.hungerId, "HUNGER-1001");
  assert.strictEqual(row.amazonId, "AMAZON-1001");
  assert.strictEqual(row.chefzId, "لا يوجد ايدي");
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
