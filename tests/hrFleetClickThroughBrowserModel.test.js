const assert = require("assert");
const fs = require("fs");
const path = require("path");

const FleetViewModel = require("../src/fleet/fleetViewModel.js");
const VerificationProfiles = require("../src/runtime/verificationProfiles.js");

const operationsUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_operations_extension.js"),
  "utf8"
);
const hrUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_hr_extension.js"),
  "utf8"
);
const fleetUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_fleet_extension.js"),
  "utf8"
);
const stabilizationUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_stabilization.js"),
  "utf8"
);

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("Prompt 8.11-B profile resolves to the isolated HR/Fleet scenario", () => {
  assert.strictEqual(
    VerificationProfiles.resolveScenario({
      storageProfile: "prompt8_11_b_hr_fleet_clickthrough",
      verify: "8_11_b"
    }),
    VerificationProfiles.SCENARIOS.PROMPT_8_11_B_HR_FLEET_CLICKTHROUGH
  );
}));

results.push(test("explicit vehicle serial wins over broader dashboard and rider associations", () => {
  const rows = FleetViewModel.buildFleetRows({
    assignments: [{
      assignmentStatus: "active",
      actualRiderIqama: "2999000011",
      dashboardUserId: "1782999000777001",
      vehicleSerial: "JED-BIKE-9009"
    }],
    dashboardUsers: [{
      dashboardUserId: "1782999000777001",
      vehicleSerial: "JED-CAR-7007"
    }],
    vehicles: [
      { id: "car", vehicleSerial: "JED-CAR-7007", plateNumber: "JED-7007" },
      { id: "bike", vehicleSerial: "JED-BIKE-9009", plateNumber: "JED-9090" }
    ]
  });
  const focused = FleetViewModel.findFleetRow(rows, {
    actualRiderIqama: "2999000011",
    dashboardUserId: "1782999000777001",
    plateNumber: "JED-9090",
    vehicleSerial: "JED-BIKE-9009"
  });
  assert.ok(focused);
  assert.strictEqual(focused.vehicleSerial, "JED-BIKE-9009");
}));

results.push(test("five Operations actions keep distinct read-only focus contracts", () => {
  [
    'if (action === "owner-details")',
    'if (action === "actual-rider-details")',
    'if (action === "registered-vehicle-details")',
    'if (action === "actual-vehicle-details")',
    'if (action === "vehicle-usage-history")',
    "openOwnerProfileFromOperations(user, linkedRow);",
    "openActualRiderProfileFromOperations(user, linkedRow);",
    "openRegisteredVehicleFromOperations(user, linkedRow);",
    "openActualVehicleFromOperations(user, linkedRow);",
    "openVehicleUsageHistoryFromOperations(user, linkedRow);"
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
}));

results.push(test("HR and Fleet focus targets expose browser-visible non-mutating markers", () => {
  assert.ok(hrUi.includes('page.setAttribute("data-hr-focused-iqama"'));
  assert.ok(hrUi.includes('page.setAttribute("data-hr-focus-mode"'));
  assert.ok(fleetUi.includes('page.setAttribute("data-fleet-focused-serial"'));
  assert.ok(fleetUi.includes('page.setAttribute("data-fleet-focused-plate"'));
  assert.ok(fleetUi.includes('page.setAttribute("data-fleet-focused-rider-iqama"'));
  assert.ok(fleetUi.includes('page.setAttribute("data-fleet-focus-mode"'));
  [hrUi, fleetUi].forEach((source) => {
    assert.ok(!source.includes('AuditLogService.logReadOnlyFocus'));
  });
}));

results.push(test("missing explicit Fleet target fails safely instead of leaking to an associated vehicle", () => {
  const rows = FleetViewModel.buildFleetRows({
    dashboardUsers: [{
      dashboardUserId: "1782999000777001",
      vehicleSerial: "JED-CAR-7007"
    }],
    vehicles: [{ id: "car", vehicleSerial: "JED-CAR-7007", plateNumber: "JED-7007" }]
  });
  assert.strictEqual(
    FleetViewModel.findFleetRow(rows, {
      dashboardUserId: "1782999000777001",
      vehicleSerial: "MISSING-SERIAL"
    }),
    null
  );
}));

results.push(test("isolated verification profiles neither hydrate from nor persist into the dev API", () => {
  assert.ok(stabilizationUi.includes("function isIsolatedVerificationProfile()"));
  assert.ok(stabilizationUi.includes("isIsolatedVerificationProfile() || !importState.storageBridge"));
  assert.ok(stabilizationUi.includes("bootModeState.safeMode ||\n      isIsolatedVerificationProfile()"));
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
