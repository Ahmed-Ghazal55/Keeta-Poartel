const assert = require("assert");
const RiderIdentityResolver = require("../src/hr/riderIdentityResolver.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("resolver prefers HR profiles over external riders for the same iqama", () => {
  const resolved = RiderIdentityResolver.resolveRiderIdentity({
    iqama: "2444000011",
    riderSource: "External"
  }, {
    externalRiders: [{ id: "ext-1", iqama: "2444000011", fullName: "External Rider" }],
    hrProfiles: [{ id: "hr-1", iqama: "2444000011", fullNameArabic: "سائق كفالة" }],
    riders: [{ id: "rider-1", primaryIqama: "2444000011", displayName: "Canonical Rider" }]
  });

  assert.strictEqual(resolved.riderSource, "HR");
  assert.strictEqual(resolved.hrProfile.id, "hr-1");
  assert.strictEqual(resolved.externalRider.id, "ext-1");
  assert.strictEqual(resolved.rider.id, "rider-1");
  assert.strictEqual(resolved.allowCreateExternal, false);
}));

results.push(test("resolver falls back to external rider when no HR profile exists", () => {
  const resolved = RiderIdentityResolver.resolveRiderIdentity({
    iqama: "2555000011",
    riderSource: "External"
  }, {
    externalRiders: [{ id: "ext-2", iqama: "2555000011", fullName: "External Rider Two" }],
    hrProfiles: [],
    riders: []
  });

  assert.strictEqual(resolved.riderSource, "External");
  assert.strictEqual(resolved.externalRider.id, "ext-2");
  assert.strictEqual(resolved.allowCreateExternal, false);
}));

results.push(test("resolver allows external creation only when HR and external master are both missing", () => {
  const resolved = RiderIdentityResolver.resolveRiderIdentity({
    iqama: "2666000011",
    riderSource: "External"
  }, {
    externalRiders: [],
    hrProfiles: [],
    riders: []
  });

  assert.strictEqual(resolved.allowCreateExternal, true);
  assert.strictEqual(resolved.hrProfile, null);
  assert.strictEqual(resolved.externalRider, null);
  assert.strictEqual(resolved.rider, null);
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
