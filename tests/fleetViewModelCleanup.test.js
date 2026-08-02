const assert = require("assert");

const FleetViewModel = require("../src/fleet/fleetViewModel.js");
const SidebarRouting = require("../src/ui/sidebarRouting.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function buildPayload() {
  return {
    assignments: [
      {
        assignmentStatus: "active",
        dashboardUserId: "1782999000777001",
        actualRiderIqama: "2999000011",
        vehicleSerial: "JED-BIKE-9009"
      }
    ],
    dashboardUsers: [
      {
        dashboardUserId: "1782999000777001",
        vehicleSerial: "JED-CAR-7007"
      }
    ],
    riderVehicleUsageHistory: [
      {
        dashboardUserId: "1782999000777001",
        riderIqama: "2999000011",
        status: "active",
        usageStartDate: "2026-07-15",
        vehicleSerial: "JED-BIKE-9009"
      }
    ],
    vehicleAssignments: [
      {
        dashboardUserId: "1782999000777001",
        vehicleSerial: "JED-CAR-7007",
        actualUsedVehicleSerial: "JED-BIKE-9009"
      }
    ],
    vehicleCapacityReviews: [
      {
        reviewStatus: "over_capacity",
        updatedAt: "2026-07-18T21:41:00.000Z",
        vehicleCompanyStatus: "private",
        vehicleSerial: "JED-BIKE-9009",
        warnings: ["vehicle_capacity_exceeded"]
      }
    ],
    vehicleComplianceIssues: [
      {
        issueType: "vehicle_capacity_exceeded",
        vehicleSerial: "JED-BIKE-9009"
      }
    ],
    vehicleMovementEvents: [
      {
        newPlateNumber: "JED-7007",
        oldPlateNumber: "JED-7006",
        vehicleSerial: "JED-CAR-7007"
      }
    ],
    vehicles: [
      {
        id: "vehicle_1",
        vehicleCompanyStatus: "company",
        vehicleSerial: "JED-CAR-7007",
        plateNumber: "JED-7007",
        register: "EXPRESS",
        currentCity: "Jeddah",
        vehicleType: "car",
        movementStatus: "active",
        updatedAt: "2026-07-18T21:00:00.000Z"
      },
      {
        id: "vehicle_2",
        vehicleCompanyStatus: "private",
        vehicleSerial: "JED-CAR-7007",
        plateNumber: "JED-7008",
        register: "EXPRESS",
        currentCity: "Jeddah",
        vehicleType: "car",
        movementStatus: "active",
        updatedAt: "2026-07-10T21:00:00.000Z"
      },
      {
        id: "vehicle_3",
        vehicleCompanyStatus: "private",
        vehicleSerial: "JED-BIKE-9009",
        plateNumber: "JED-9090",
        register: "EXPRESS",
        currentCity: "Jeddah",
        vehicleType: "bike",
        movementStatus: "active",
        updatedAt: "2026-07-18T21:10:00.000Z"
      }
    ]
  };
}

const results = [];

results.push(test("Fleet route aliases normalize to canonical cleanup tabs", () => {
  assert.strictEqual(FleetViewModel.normalizeFleetRoute("operating"), "operating_vehicles");
  assert.strictEqual(FleetViewModel.normalizeFleetRoute("vehicle-handover"), "vehicle_usage_history");
  assert.strictEqual(FleetViewModel.normalizeFleetRoute("vehicle-user-matching"), "vehicle_assignments");
  assert.strictEqual(FleetViewModel.normalizeFleetRoute("full-vehicles"), "capacity_review");
  assert.strictEqual(SidebarRouting.resolveRoute("FL3").subPage, "capacity_review");
  assert.strictEqual(SidebarRouting.resolveRoute("FL6").subPage, "vehicle_assignments");
}));

results.push(test("vehicle serial stays the primary identity and plate history stays attached", () => {
  const rows = FleetViewModel.buildFleetRows(buildPayload());
  const carRow = rows.filter((row) => row.vehicleSerial === "JED-CAR-7007")[0];
  assert.ok(carRow);
  assert.strictEqual(rows.filter((row) => row.vehicleSerial === "JED-CAR-7007").length, 1);
  assert.ok(carRow.plateHistory.includes("JED-7007"));
  assert.ok(carRow.plateHistory.includes("JED-7006"));
  assert.strictEqual(FleetViewModel.findFleetRow(rows, { plateNumber: "JED-7006" }).vehicleSerial, "JED-CAR-7007");
}));

results.push(test("registered and actual vehicle paths remain separate", () => {
  const rows = FleetViewModel.buildFleetRows(buildPayload());
  const registeredRow = FleetViewModel.findFleetRow(rows, { dashboardUserId: "1782999000777001" });
  const actualRow = FleetViewModel.findFleetRow(rows, { actualRiderIqama: "2999000011" });
  const explicitActualRow = FleetViewModel.findFleetRow(rows, {
    actualRiderIqama: "2999000011",
    dashboardUserId: "1782999000777001",
    plateNumber: "JED-9090",
    vehicleSerial: "JED-BIKE-9009"
  });
  assert.ok(registeredRow);
  assert.ok(actualRow);
  assert.ok(explicitActualRow);
  assert.strictEqual(registeredRow.vehicleSerial, "JED-CAR-7007");
  assert.strictEqual(actualRow.vehicleSerial, "JED-BIKE-9009");
  assert.strictEqual(explicitActualRow.vehicleSerial, "JED-BIKE-9009");
}));

results.push(test("capacity warnings remain visible through cleanup view rows", () => {
  const rows = FleetViewModel.buildFleetRows(buildPayload());
  const filtered = FleetViewModel.filterFleetRows(rows, {
    capacityStatus: "over_capacity"
  }, "capacity_review");
  const kpis = FleetViewModel.buildFleetKpis(filtered);
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].capacityStatus, "over_capacity");
  assert.ok(filtered[0].warnings.includes("vehicle_capacity_exceeded"));
  assert.strictEqual(kpis.overCapacity, 1);
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
