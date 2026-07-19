const assert = require("assert");
const { createAssignmentService } = require("../src/operations/assignmentService.js");
const { createSwapService } = require("../src/operations/swapService.js");
const { createRiderResolverFacade } = require("../src/riders/riderResolverFacade.js");
const {
  CITY_JEDDAH,
  buildAssignment,
  buildDashboardUser,
  buildRider,
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

function createServices(seed) {
  const runtime = createRuntime(seed);
  return {
    assignmentService: createAssignmentService(runtime),
    facade: createRiderResolverFacade(runtime),
    runtime,
    swapService: createSwapService(runtime),
  };
}

const user = createOperationsAdmin();
const organizationContext = createOrganizationContext();
const results = [];

results.push(test("HR rider assignment uses resolver output without creating external rider duplicates", () => {
  const dashboardUser = buildDashboardUser({ dashboardUserId: "8101", city: CITY_JEDDAH, register: "EXPRESS" });
  const { assignmentService, facade, runtime } = createServices({
    dashboardUsers: [dashboardUser],
    externalRiders: [],
    hrProfiles: [
      { id: "hr-assign-1", iqama: "2444555511", fullNameArabic: "مندوب كفالة", city: CITY_JEDDAH, register: "EXPRESS", hrStatus: "active" },
    ],
    riderOperationalProfiles: [],
    riders: [],
  });

  const resolved = facade.resolveRiderByIqama("2444555511");
  assert.strictEqual(resolved.riderSource, "HR");

  assignmentService.assignRider({
    dashboardUserId: "8101",
    iqama: resolved.iqama,
    riderName: resolved.fullName,
    riderSource: resolved.riderSource,
    user,
    organizationContext,
  });

  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 0);
  assert.strictEqual(runtime.dataStore.getAll("assignments").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "assignment_created").length, 1);
}));

results.push(test("unknown rider can be created as external before assignment using resolver workflow", () => {
  const dashboardUser = buildDashboardUser({ dashboardUserId: "8102", city: CITY_JEDDAH, register: "EXPRESS" });
  const { assignmentService, facade, runtime } = createServices({
    dashboardUsers: [dashboardUser],
    externalRiders: [],
    hrProfiles: [],
    riderOperationalProfiles: [],
    riders: [],
  });

  facade.createExternalRider({
    iqama: "2999777711",
    fullName: "Inline External",
    contactPhone: "966500000991",
    preferredCity: CITY_JEDDAH,
    preferredRegister: "EXPRESS",
  }, {
    user,
    organizationContext,
    source: "workflow_test",
  });
  const resolved = facade.resolveRiderByIqama("2999777711");

  assignmentService.assignRider({
    dashboardUserId: "8102",
    iqama: resolved.iqama,
    riderName: resolved.fullName,
    riderPhone: resolved.contactPhone,
    riderSource: resolved.riderSource,
    user,
    organizationContext,
  });

  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("riderOperationalProfiles").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "external_rider_created").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "assignment_created").length, 1);
}));

results.push(test("swap workflow accepts resolver output for an external rider and audits once", () => {
  const dashboardUser = buildDashboardUser({
    dashboardUserId: "8103",
    currentRiderId: "rider-old",
    currentRiderIqama: "288800001",
    currentAssignmentId: "assignment-old-8103",
    assignmentStatus: "active",
    status: "assigned",
  });
  const { facade, runtime, swapService } = createServices({
    assignments: [
      buildAssignment({ id: "assignment-old-8103", dashboardUserId: "8103", riderId: "rider-old", riderIqama: "288800001" }),
    ],
    dashboardUsers: [dashboardUser],
    externalRiders: [
      { id: "ext-swap-1", iqama: "288800009", fullName: "Replacement Rider", contactPhone: "966500000809", city: CITY_JEDDAH, register: "EXPRESS" },
    ],
    riderOperationalProfiles: [
      { id: "profile-swap-1", iqama: "288800009", riderSource: "External", contactPhone: "966500000809", preferredCity: CITY_JEDDAH, preferredRegister: "EXPRESS" },
    ],
    riders: [
      buildRider({ id: "rider-old", primaryIqama: "288800001", displayName: "Old Rider" }),
    ],
  });

  const resolved = facade.resolveRiderByIqama("288800009");
  swapService.swapRider({
    dashboardUserId: "8103",
    previousRiderId: "rider-old",
    newRiderIqama: resolved.iqama,
    newRiderName: resolved.fullName,
    newRiderPhone: resolved.contactPhone,
    riderSource: resolved.riderSource,
    user,
    organizationContext,
  });

  assert.strictEqual(runtime.dataStore.getAll("externalRiders").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").filter((item) => item.action === "swap_confirmed").length, 1);
  assert.strictEqual(runtime.dataStore.getAll("assignments").filter((item) => item.status === "active").length, 1);
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
