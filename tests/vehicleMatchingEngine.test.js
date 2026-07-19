const assert = require("assert");
const VehicleMatchingEngine = require("../src/fleet/vehicleMatchingEngine.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const vehicles = [
  {
    id: "vehicle_registered",
    vehicleSerial: "JED-CAR-1001",
    plateNumber: "JED-1001",
    currentCity: "جدة",
    register: "EXPRESS",
    registrationType: "Public Transport",
    transportType: "public_transport",
    vehicleType: "car",
    status: "available"
  },
  {
    id: "vehicle_actual",
    vehicleSerial: "JED-CAR-2001",
    plateNumber: "JED-2001",
    currentCity: "جدة",
    register: "EXPRESS",
    registrationType: "Public Transport",
    transportType: "public_transport",
    vehicleType: "car",
    status: "available"
  },
  {
    id: "vehicle_blocked",
    vehicleSerial: "RUH-CAR-3001",
    plateNumber: "RUH-3001",
    currentCity: "الرياض",
    register: "TOGARY",
    registrationType: "Private Transport",
    transportType: "private_transport",
    vehicleType: "car",
    status: "maintenance"
  }
];

const results = [];

results.push(test("buildVehicleMatchRecord separates registered and actual used vehicles", () => {
  const row = VehicleMatchingEngine.buildVehicleMatchRecord({
    dashboardUserId: "1782916129257495",
    currentRiderIqama: "2444000011",
    ownerIqama: "2444000011",
    city: "جدة",
    register: "EXPRESS",
    vehicleSerial: "JED-CAR-1001",
    plateNumber: "JED-1001"
  }, {
    vehicles,
    vehicleMovementEvents: [
      {
        vehicleSerial: "JED-CAR-2001",
        currentUserIqama: "2444000011",
        eventDate: "2026-07-05",
        status: "handed_over"
      }
    ]
  }, {
    capacityReview: { reviewStatus: "full" }
  });

  assert.strictEqual(row.registeredVehicleSerial, "JED-CAR-1001");
  assert.strictEqual(row.actualUsedVehicleSerial, "JED-CAR-2001");
  assert.strictEqual(row.matchStatus, "warning");
  assert.ok(row.warnings.includes("actual_vehicle_differs"));
  assert.ok(row.warnings.includes("capacity_full"));
}));

results.push(test("cross-city and private transport conflicts block assignment matching", () => {
  const row = VehicleMatchingEngine.buildVehicleMatchRecord({
    dashboardUserId: "1782831407480165",
    currentRiderIqama: "2444000022",
    ownerIqama: "2444000022",
    city: "جدة",
    register: "EXPRESS",
    vehicleSerial: "RUH-CAR-3001",
    plateNumber: "RUH-3001"
  }, {
    vehicles,
    vehicleMovementEvents: []
  }, {});

  assert.strictEqual(row.matchStatus, "blocked");
  assert.ok(row.blockingIssues.includes("private_transport_not_assignable"));
  assert.ok(row.blockingIssues.includes("excluded_vehicle_status"));
  assert.ok(row.blockingIssues.includes("cross_city_conflict"));
  assert.ok(row.blockingIssues.includes("cross_register_conflict"));
}));

results.push(test("missing serial warns clearly", () => {
  const row = VehicleMatchingEngine.buildVehicleMatchRecord({
    dashboardUserId: "NO_SERIAL",
    currentRiderIqama: "2444000099",
    ownerIqama: "2444000099",
    city: "جدة",
    register: "EXPRESS"
  }, {
    vehicles,
    vehicleMovementEvents: []
  }, {});

  assert.ok(row.warnings.includes("serial_missing"));
  assert.strictEqual(row.matchStatus, "warning");
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
