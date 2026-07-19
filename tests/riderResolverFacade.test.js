const assert = require("assert");
const { createRiderResolverFacade } = require("../src/riders/riderResolverFacade.js");
const {
  CITY_JEDDAH,
  buildAssignment,
  buildDashboardUser,
  buildRider,
  createOperationsAdmin,
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

function createFacade(seed) {
  const runtime = createRuntime(seed);
  return {
    facade: createRiderResolverFacade(runtime),
    runtime,
  };
}

const results = [];

results.push(test("resolver prefers HR rider identity over external rider for the same iqama", () => {
  const { facade } = createFacade({
    externalRiders: [
      { id: "ext-1", iqama: "2444000011", fullName: "External Candidate", city: CITY_JEDDAH, register: "EXPRESS" },
    ],
    hrProfiles: [
      { id: "hr-1", iqama: "2444000011", fullNameArabic: "سائق كفالة", city: CITY_JEDDAH, register: "EXPRESS", hrStatus: "active" },
    ],
    riderOperationalProfiles: [
      { id: "profile-1", iqama: "2444000011", riderSource: "HR", contactPhone: "966500000111", preferredCity: CITY_JEDDAH, preferredRegister: "EXPRESS" },
    ],
    riders: [
      buildRider({ id: "rider-hr-1", primaryIqama: "2444000011", displayName: "Canonical HR Rider", employmentType: "sponsorship", hrProfileId: "hr-1" }),
    ],
  });

  const resolved = facade.resolveRiderByIqama("2444000011");
  assert.strictEqual(resolved.riderSource, "HR");
  assert.strictEqual(resolved.canCreateExternal, false);
  assert.strictEqual(resolved.canEditIdentity, false);
  assert.strictEqual(resolved.fullName, "سائق كفالة");
  assert.ok(resolved.hrProfile);
  assert.ok(resolved.externalRider);
}));

results.push(test("resolver falls back to external rider and surfaces current assignment and vehicle usage", () => {
  const dashboardUser = buildDashboardUser({ dashboardUserId: "7001", city: CITY_JEDDAH, register: "EXPRESS", vehicleSerial: "VS-1", plateNumber: "ABC123" });
  const { facade } = createFacade({
    assignments: [
      buildAssignment({
        id: "assignment-7001",
        dashboardUserId: "7001",
        riderId: "rider-ext-1",
        riderIqama: "2555000011",
        actualRiderIqama: "2555000011",
      }),
    ],
    dashboardUsers: [dashboardUser],
    externalRiders: [
      { id: "ext-2", iqama: "2555000011", fullName: "External Rider Two", contactPhone: "966500000222", city: CITY_JEDDAH, register: "EXPRESS", status: "active" },
    ],
    riderOperationalProfiles: [
      { id: "profile-2", iqama: "2555000011", riderSource: "External", appPhone: "966500000223", preferredCity: CITY_JEDDAH, preferredRegister: "EXPRESS" },
    ],
    riderVehicleUsageHistory: [
      { id: "usage-1", riderIqama: "2555000011", active: true, status: "active", vehicleSource: "company", plateNumber: "XYZ111", vehicleSerial: "SER-22", vehicleRegister: "EXPRESS", city: CITY_JEDDAH, startDate: "2026-07-01" },
    ],
    riders: [
      buildRider({ id: "rider-ext-1", primaryIqama: "2555000011", displayName: "Resolved External Rider" }),
    ],
  });

  const resolved = facade.resolveRiderByIqama("2555000011");
  assert.strictEqual(resolved.riderSource, "External");
  assert.strictEqual(resolved.currentAssignment.id, "assignment-7001");
  assert.strictEqual(resolved.currentDashboardUser.dashboardUserId, "7001");
  assert.ok(resolved.currentVehicleSummary.includes("XYZ111"));
  assert.strictEqual(resolved.canEditIdentity, true);
}));

results.push(test("prepareRiderForAssignment allows inline external creation only when iqama is unknown", () => {
  const { facade } = createFacade({
    externalRiders: [],
    hrProfiles: [],
    riderOperationalProfiles: [],
    riders: [],
  });

  const prepared = facade.prepareRiderForAssignment("2999000099", {
    allowCreateExternal: true,
  });

  assert.strictEqual(prepared.found, false);
  assert.strictEqual(prepared.canCreateExternal, true);
  assert.strictEqual(prepared.allowInlineExternalCreation, true);
  assert.strictEqual(prepared.assignmentReady, true);
}));

results.push(test("operational profile updates round-trip through facade", () => {
  const runtime = createRuntime({
    hrProfiles: [
      { id: "hr-2", iqama: "2777000011", fullNameArabic: "سائق تشغيل", city: CITY_JEDDAH, register: "EXPRESS", hrStatus: "active" },
    ],
    riderOperationalProfiles: [],
  });
  const facade = createRiderResolverFacade(runtime);

  const updated = facade.upsertRiderOperationalProfile({
    iqama: "2777000011",
    contactPhone: "966500000777",
    appPhone: "966500000778",
    preferredCity: CITY_JEDDAH,
    preferredRegister: "EXPRESS",
  }, {
    user: createOperationsAdmin(),
    organizationContext: {
      cityScope: "all",
      selectedCities: [CITY_JEDDAH],
      registerScope: "all",
      selectedRegisters: ["EXPRESS"],
    },
  });

  assert.strictEqual(updated.contactPhone, "966500000777");
  assert.strictEqual(runtime.dataStore.getAll("riderOperationalProfiles").length, 1);
  assert.ok(runtime.dataStore.getAll("auditLogs").some((item) => item.action === "rider_profile_updated"));
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
