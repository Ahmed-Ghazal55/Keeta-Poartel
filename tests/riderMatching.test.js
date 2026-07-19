const assert = require("assert");
const RiderMatching = require("../src/hr/riderMatching.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("same iqama maps to the same rider", () => {
  const context = RiderMatching.buildMatchingContext({
    riders: [{ id: "r1", primaryIqama: "2456789012", displayName: "Ahmed Salem", phones: ["966551234567"], cities: ["جدة"], registers: ["EXPRESS"], platforms: [] }],
    identities: [{ riderId: "r1", identityType: "iqama", normalizedValue: "2456789012", platform: "", city: "جدة", register: "EXPRESS" }],
    platformAccounts: []
  });
  const result = RiderMatching.matchRiderCandidate({ iqama: "2456789012", displayName: "Ahmed Salem" }, context);
  assert.strictEqual(result.matchedRiderId, "r1");
  assert.strictEqual(result.matchReason, "same_iqama");
}));

results.push(test("same phone with similar name produces a strong match", () => {
  const context = RiderMatching.buildMatchingContext({
    riders: [{ id: "r2", primaryIqama: "", displayName: "Mohamed Ali Hassan", phones: ["966500000001"], cities: ["الرياض"], registers: ["TOGARY"], platforms: [] }],
    identities: [{ riderId: "r2", identityType: "phone", normalizedValue: "966500000001", platform: "", city: "الرياض", register: "TOGARY" }],
    platformAccounts: []
  });
  const result = RiderMatching.matchRiderCandidate({ phone: "966500000001", displayName: "Mohamed Ali" }, context);
  assert.strictEqual(result.matchedRiderId, "r2");
  assert.strictEqual(result.matchReason, "same_phone_similar_name");
}));

results.push(test("name-only similarity does not auto-merge riders", () => {
  const context = RiderMatching.buildMatchingContext({
    riders: [{ id: "r3", primaryIqama: "", displayName: "Abdullah Noor", phones: [], cities: ["جدة"], registers: ["ALBAWABA"], platforms: [] }],
    identities: [],
    platformAccounts: []
  });
  const result = RiderMatching.matchRiderCandidate({ displayName: "Abdullah Noor" }, context);
  assert.strictEqual(result.matchedRiderId, "");
  assert.ok(result.warnings.indexOf("name_only_similarity") >= 0);
}));

results.push(test("one iqama can naturally map to multiple user ids across accounts", () => {
  const context = RiderMatching.buildMatchingContext({
    riders: [{ id: "r4", primaryIqama: "2456000001", displayName: "Salem Adel", phones: ["966511111111"], cities: ["جدة"], registers: ["EXPRESS"], platforms: ["keeta", "jahez"] }],
    identities: [{ riderId: "r4", identityType: "iqama", normalizedValue: "2456000001", platform: "", city: "جدة", register: "EXPRESS" }],
    platformAccounts: [
      { riderId: "r4", platform: "keeta", userId: "KEETA01", city: "جدة", register: "EXPRESS" },
      { riderId: "r4", platform: "jahez", userId: "JH00001", city: "جدة", register: "EXPRESS" }
    ]
  });
  const result = RiderMatching.matchRiderCandidate({ iqama: "2456000001", platform: "jahez", userId: "JH00002", displayName: "Salem Adel" }, context);
  assert.strictEqual(result.matchedRiderId, "r4");
  assert.strictEqual(result.conflicts.length, 0);
}));

results.push(test("same platform user id linked to multiple iqamas triggers a high conflict", () => {
  const context = RiderMatching.buildMatchingContext({
    riders: [
      { id: "r5", primaryIqama: "2456000002", displayName: "Ali One", phones: [], cities: ["جدة"], registers: ["EXPRESS"], platforms: ["keeta"] },
      { id: "r6", primaryIqama: "2456000003", displayName: "Ali Two", phones: [], cities: ["جدة"], registers: ["EXPRESS"], platforms: ["keeta"] }
    ],
    identities: [],
    platformAccounts: [
      { riderId: "r5", platform: "keeta", userId: "DUPLICATE01", city: "جدة", register: "EXPRESS" },
      { riderId: "r6", platform: "keeta", userId: "DUPLICATE01", city: "جدة", register: "EXPRESS" }
    ]
  });
  const result = RiderMatching.matchRiderCandidate({ platform: "keeta", userId: "DUPLICATE01", city: "جدة", register: "EXPRESS" }, context);
  assert.strictEqual(result.matchedRiderId, "");
  assert.ok(result.conflicts.indexOf("same_user_id_multiple_iqamas") >= 0);
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
