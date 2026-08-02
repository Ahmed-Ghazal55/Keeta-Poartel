const assert = require("assert");

const HrViewModel = require("../src/hr/hrViewModel.js");
const FleetViewModel = require("../src/fleet/fleetViewModel.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("HR issue focus objects keep canonical route metadata", () => {
  const focus = HrViewModel.buildHrIssueFocus("owner_hr_profile_missing", {
    ownerIqama: "2444000077",
    dashboardUserId: "1782999000777001",
    linkedSubPage: "hr-master",
    city: "Jeddah",
    register: "EXPRESS"
  });
  assert.strictEqual(focus.sourceModule, "hr");
  assert.strictEqual(focus.entityType, "hr_profile");
  assert.strictEqual(focus.linkedSubPage, "hr_master");
  assert.strictEqual(focus.ownerIqama, "2444000077");
}));

results.push(test("Fleet issue focus objects keep canonical route metadata", () => {
  const focus = FleetViewModel.buildFleetIssueFocus("vehicle_capacity_exceeded", {
    actualRiderIqama: "2999000011",
    dashboardUserId: "1782999000777001",
    linkedDrawer: "capacity",
    linkedSubPage: "capacity-review",
    plateNumber: "JED-9090",
    vehicleSerial: "JED-BIKE-9009"
  });
  assert.strictEqual(focus.sourceModule, "fleet");
  assert.strictEqual(focus.entityType, "vehicle");
  assert.strictEqual(focus.linkedSubPage, "capacity_review");
  assert.strictEqual(focus.linkedDrawer, "capacity");
  assert.strictEqual(focus.vehicleSerial, "JED-BIKE-9009");
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
