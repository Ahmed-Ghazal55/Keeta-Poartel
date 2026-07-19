const assert = require("assert");
const HrNormalizer = require("../src/hr/riderNormalizer.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("normalizeIqama keeps digits as string", () => {
  assert.strictEqual(HrNormalizer.normalizeIqama(" 2456-789-012 "), "2456789012");
}));

results.push(test("normalizePhone supports local and international Saudi formats", () => {
  assert.strictEqual(HrNormalizer.normalizePhone("055 123 4567"), "966551234567");
  assert.strictEqual(HrNormalizer.normalizePhone("+966-55-123-4567"), "966551234567");
}));

results.push(test("normalizeName trims repeated spaces", () => {
  assert.strictEqual(HrNormalizer.normalizeName("  Ahmed   Salem \n "), "Ahmed Salem");
}));

results.push(test("detectPlatformFromSheet classifies keeta and ninja sheets", () => {
  assert.strictEqual(HrNormalizer.detectPlatformFromSheet("ايديهات كيتا", []), "keeta");
  assert.strictEqual(HrNormalizer.detectPlatformFromSheet("Ninja", ["ID", "City"]), "ninja");
}));

results.push(test("normalizeEmploymentType and normalizeHrStatus map operational values", () => {
  assert.strictEqual(HrNormalizer.normalizeEmploymentType("كفالة"), "sponsorship");
  assert.strictEqual(HrNormalizer.normalizeEmploymentType("External rider"), "freelancer");
  assert.strictEqual(HrNormalizer.normalizeHrStatus("يعمل حاليا"), "active");
  assert.strictEqual(HrNormalizer.normalizeHrStatus("لم يبدأ"), "not_started");
}));

results.push(test("buildHrProfiles enriches health card and license support data", () => {
  const profiles = HrNormalizer.buildHrProfiles({
    fileName: "prompt4.xlsx",
    rawProfiles: [{
      iqama: "2456789012",
      fullNameArabic: "أحمد سالم",
      city: "جدة",
      register: "EXPRESS",
      employmentType: "sponsorship",
      hrStatus: "active",
      notes: "master row"
    }],
    healthCardsByIqama: {
      "2456789012": {
        healthCardNumber: "HC-100",
        healthCardExpiry: "2026-12-31"
      }
    },
    licensesByIqama: {
      "2456789012": {
        licenseType: "car",
        note: "renew soon"
      }
    }
  }, {});

  assert.strictEqual(profiles.length, 1);
  assert.strictEqual(profiles[0].healthCardNumber, "HC-100");
  assert.strictEqual(profiles[0].licenseType, "car");
  assert.ok((profiles[0].notes || "").indexOf("renew soon") >= 0);
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
