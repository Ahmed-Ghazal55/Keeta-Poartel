const assert = require("assert");
const { createRiderOperationalProfileService } = require("../src/riders/riderOperationalProfileService.js");
const {
  CITY_JEDDAH,
  createOperationsAdmin,
  createOrganizationContext,
  createRuntime,
} = require("./helpers/operationsTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function createService(seed) {
  const runtime = createRuntime(seed);
  return {
    runtime,
    service: createRiderOperationalProfileService(runtime),
  };
}

const mutationContext = {
  organizationContext: createOrganizationContext(),
  source: "test_rider_resolver",
  user: createOperationsAdmin(),
};

const results = [];

results.push(test("createExternalRider stores identity, operational profile, and one audit event", () => {
  const { runtime, service } = createService({
    externalRiders: [],
    hrProfiles: [],
    riderOperationalProfiles: [],
    riders: [],
  });

  const result = service.createExternalRider({
    iqama: "2888000011",
    fullName: "External New Rider",
    contactPhone: "966500000881",
    appPhone: "966500000882",
    iban: "SA001234567890",
    gasCard: "GC-88",
    tools: "helmet",
    preferredCity: CITY_JEDDAH,
    preferredRegister: "EXPRESS",
  }, mutationContext);

  assert.strictEqual(result.externalRider.iqama, "2888000011");
  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riderOperationalProfiles").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "external_rider_created").length, 1);
}));

results.push(test("service rejects duplicating an HR rider into external riders", () => {
  const { service } = createService({
    externalRiders: [],
    hrProfiles: [
      { id: "hr-dup-1", iqama: "2999111111", fullNameArabic: "سائق كفالة", city: CITY_JEDDAH, register: "EXPRESS" },
    ],
  });

  assert.throws(() => {
    service.createExternalRider({
      iqama: "2999111111",
      fullName: "Should Fail",
    }, mutationContext);
  }, /HR riders cannot be created as external riders/);
}));

results.push(test("upsertRiderOperationalProfile works for HR riders and audits once", () => {
  const { runtime, service } = createService({
    hrProfiles: [
      { id: "hr-save-1", iqama: "2777444411", fullNameArabic: "سائق تشغيل", city: CITY_JEDDAH, register: "EXPRESS", hrStatus: "active" },
    ],
    riderOperationalProfiles: [],
  });

  const profile = service.upsertRiderOperationalProfile({
    iqama: "2777444411",
    contactPhone: "966500000441",
    appPhone: "966500000442",
    iban: "SA99887766",
    gasCard: "GC-HR-1",
    tools: "bag",
    preferredCity: CITY_JEDDAH,
    preferredRegister: "EXPRESS",
  }, mutationContext);

  assert.strictEqual(profile.iqama, "2777444411");
  assert.strictEqual(runtime.dataStore.getAll("riderOperationalProfiles").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "rider_profile_updated").length, 1);
}));

results.push(test("updateExternalRider updates identity fields without creating duplicates", () => {
  const { runtime, service } = createService({
    externalRiders: [
      { id: "ext-update-1", iqama: "2555666611", fullName: "External Before", contactPhone: "966500000551", city: CITY_JEDDAH, register: "EXPRESS" },
    ],
    riderOperationalProfiles: [
      { id: "profile-update-1", iqama: "2555666611", riderSource: "External", contactPhone: "966500000551", preferredCity: CITY_JEDDAH, preferredRegister: "EXPRESS" },
    ],
  });

  const updated = service.updateExternalRider("2555666611", {
    fullName: "External After",
    contactPhone: "966500000552",
    appPhone: "966500000553",
  }, mutationContext);

  assert.strictEqual(updated.externalRider.fullName, "External After");
  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "external_rider_updated").length, 1);
}));

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length,
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
