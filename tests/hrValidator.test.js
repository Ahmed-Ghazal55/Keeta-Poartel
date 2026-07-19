const assert = require("assert");
const { validateHrBundle } = require("../src/hr/hrValidator.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("flags missing iqama without blocking preview", () => {
  const validation = validateHrBundle({
    hrProfiles: [{
      id: "p1",
      iqama: "",
      fullNameArabic: "أحمد",
      phone: "966551111111",
      city: "جدة",
      register: "EXPRESS",
      employmentType: "sponsorship",
      hrStatus: "active"
    }]
  }, { mode: "preview" });
  assert.ok(validation.issues.some((item) => item.code === "missing_iqama"));
  assert.strictEqual(validation.blockingIssues.length, 0);
}));

results.push(test("flags duplicate iqama values", () => {
  const bundle = {
    hrProfiles: [
      { id: "p2", iqama: "2456789001", fullNameArabic: "A", phone: "966551111112", city: "جدة", register: "EXPRESS", employmentType: "sponsorship", hrStatus: "active", sourceSheet: "HR1" },
      { id: "p3", iqama: "2456789001", fullNameArabic: "B", phone: "966551111113", city: "جدة", register: "EXPRESS", employmentType: "sponsorship", hrStatus: "active", sourceSheet: "HR1" }
    ]
  };
  const validation = validateHrBundle(bundle, { mode: "preview" });
  assert.ok(validation.issues.some((item) => item.code === "duplicate_iqama_same_sheet"));
  assert.ok(validation.issues.some((item) => item.code === "duplicate_iqama_multiple_profiles"));
}));

results.push(test("flags same phone across multiple iqamas", () => {
  const validation = validateHrBundle({
    hrProfiles: [
      { id: "p4", iqama: "2456789002", fullNameArabic: "A", phone: "0551111114", city: "جدة", register: "EXPRESS", employmentType: "sponsorship", hrStatus: "active" },
      { id: "p5", iqama: "2456789003", fullNameArabic: "B", phone: "+966551111114", city: "جدة", register: "EXPRESS", employmentType: "sponsorship", hrStatus: "active" }
    ]
  }, { mode: "preview" });
  assert.ok(validation.issues.some((item) => item.code === "same_phone_multiple_iqamas"));
}));

results.push(test("flags expired license and unknown city/register", () => {
  const validation = validateHrBundle({
    hrProfiles: [{
      id: "p6",
      iqama: "2456789004",
      fullNameArabic: "C",
      phone: "966551111115",
      city: "",
      register: "",
      employmentType: "unknown",
      hrStatus: "under_review",
      licenseExpiry: "2025-01-01"
    }]
  }, { mode: "preview" });
  assert.ok(validation.issues.some((item) => item.code === "expired_license"));
  assert.ok(validation.issues.some((item) => item.code === "unknown_city"));
  assert.ok(validation.issues.some((item) => item.code === "unknown_register"));
}));

results.push(test("flags a platform user id shared across multiple iqamas", () => {
  const validation = validateHrBundle({
    hrProfiles: [],
    platformAccountsRaw: [
      { platform: "keeta", userId: "USER-1", iqama: "2456789005" },
      { platform: "keeta", userId: "USER-1", iqama: "2456789006" }
    ]
  }, { mode: "preview" });
  assert.ok(validation.issues.some((item) => item.code === "same_user_id_multiple_iqamas"));
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
