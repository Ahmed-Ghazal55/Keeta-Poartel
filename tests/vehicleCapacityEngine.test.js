const assert = require("assert");
const VehicleCapacityEngine = require("../src/fleet/vehicleCapacityEngine.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("capacity limits match Prompt 8 rules", () => {
  assert.strictEqual(VehicleCapacityEngine.getCapacityByVehicleType("car"), 2);
  assert.strictEqual(VehicleCapacityEngine.getCapacityByVehicleType("bike"), 3);
  assert.strictEqual(VehicleCapacityEngine.getCapacityByVehicleType("unknown"), 1);
}));

results.push(test("reviewVehicleCapacity flags full cars and remaining capacity", () => {
  const review = VehicleCapacityEngine.reviewVehicleCapacity({
    id: "vehicle_1",
    vehicleSerial: "JED-CAR-1001",
    plateNumber: "JED-1001",
    vehicleType: "car",
    registrationType: "Public Transport",
    city: "جدة",
    register: "EXPRESS",
    status: "available"
  }, [
    { dashboardUserId: "U1", currentRiderIqama: "2444000011" },
    { dashboardUserId: "U2", currentRiderIqama: "2444000022" }
  ]);
  assert.strictEqual(review.reviewStatus, "full");
  assert.strictEqual(review.remainingCapacity, 0);
  assert.ok(review.warnings.includes("capacity_full"));
}));

results.push(test("over-capacity and blocked vehicles are detected", () => {
  const review = VehicleCapacityEngine.reviewVehicleCapacity({
    vehicleSerial: "RUH-BIKE-2001",
    plateNumber: "RUH-2001",
    vehicleType: "bike",
    registrationType: "Private Transport",
    city: "الرياض",
    register: "TOGARY",
    status: "maintenance"
  }, [
    { dashboardUserId: "U1" },
    { dashboardUserId: "U2" },
    { dashboardUserId: "U3" },
    { dashboardUserId: "U4" }
  ]);
  assert.strictEqual(review.reviewStatus, "blocked");
  assert.ok(review.blockingIssues.includes("private_transport_not_assignable"));
  assert.ok(review.blockingIssues.includes("excluded_vehicle_status"));
}));

results.push(test("buildVehicleCapacityReviews indexes dashboard users by serial", () => {
  const reviews = VehicleCapacityEngine.buildVehicleCapacityReviews([
    {
      id: "vehicle_1",
      vehicleSerial: "JED-CAR-1001",
      plateNumber: "JED-1001",
      vehicleType: "car",
      registrationType: "Public Transport",
      city: "جدة",
      register: "EXPRESS",
      status: "available"
    }
  ], [
    { dashboardUserId: "U1", vehicleSerial: "JED-CAR-1001" },
    { dashboardUserId: "U2", registeredVehicleSerial: "JED-CAR-1001" }
  ]);
  assert.strictEqual(reviews.length, 1);
  assert.strictEqual(reviews[0].assignedCount, 2);
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
