const assert = require("assert");
const VehicleComputedFields = require("../src/fleet/vehicleComputedFields.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const dataSources = {
  vehicleMovementEvents: [
    { vehicleSerial: "JED-CAR-1001", eventDate: "2026-07-02", status: "maintenance" }
  ],
  vehicleUpdateRows: [
    { vehicleSerial: "JED-CAR-1001", city: "جدة", Branch: "جدة", brandName: "EXPRESS", currentBoundingAccounts: "2", usedByPartnerName: "Ahmed Salem", courier_id: "USER-1", IQAMA: "2444000011", NAME: "Ahmed Salem", vehicleType: "car" },
    { vehicleSerial: "JED-CAR-1001", city: "الرياض", Branch: "الرياض", brandName: "TOGARY", courier_id: "USER-2", IQAMA: "2444000022", NAME: "Bader Ali", vehicleType: "car" }
  ],
  vehicles: [
    { vehicleSerial: "JED-CAR-1001", currentBranch: "جدة - EXPRESS", targetedBranch: "EXPRESS", vehicleType: "car" }
  ]
};

const results = [];

results.push(test("vehicle wrapper aliases the city usage count helper", () => {
  assert.strictEqual(VehicleComputedFields.computeCityUsageCount("JED-CAR-1001", dataSources), 2);
}));

results.push(test("vehicle wrapper exposes iqamas as the four prompt fields", () => {
  const iqamas = VehicleComputedFields.computeIqamasRegisteredOnVehicle("JED-CAR-1001", dataSources);
  assert.deepStrictEqual(iqamas, {
    iqama1: "2444000011",
    iqama2: "2444000022",
    iqama3: "",
    iqama4: ""
  });
}));

results.push(test("vehicle wrapper keeps the service movement status", () => {
  assert.strictEqual(VehicleComputedFields.computeVehicleMovementStatus("JED-CAR-1001", dataSources), "صيانة");
}));

results.push(test("vehicle display row contains the computed prompt 8 fleet columns", () => {
  const row = VehicleComputedFields.computeOperatingVehicleDisplayRow({ vehicleSerial: "JED-CAR-1001" }, dataSources);
  assert.strictEqual(row.currentBoundingAccounts, "2");
  assert.strictEqual(row.usedByPartnerName, "Ahmed Salem");
  assert.strictEqual(row.iqama1, "2444000011");
  assert.strictEqual(row.movementStatus, "صيانة");
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
