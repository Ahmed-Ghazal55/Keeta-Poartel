const assert = require("assert");
const VehicleValidator = require("../src/fleet/vehicleValidator.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("vehicle type normalization supports car and bike", () => {
  assert.strictEqual(VehicleValidator.normalizeVehicleType("car"), "car");
  assert.strictEqual(VehicleValidator.normalizeVehicleType("bike"), "bike");
  assert.strictEqual(VehicleValidator.normalizeVehicleType("unknown"), "unknown");
}));

results.push(test("transport type normalization distinguishes public and private transport", () => {
  assert.strictEqual(VehicleValidator.normalizeTransportType("Public Transport"), "public_transport");
  assert.strictEqual(VehicleValidator.normalizeTransportType("Private Transport"), "private_transport");
}));

results.push(test("assignable vehicle must be public transport and not excluded", () => {
  assert.strictEqual(
    VehicleValidator.isAssignableVehicle({ registrationType: "Public Transport", movementStatus: "available" }),
    true
  );
  assert.strictEqual(
    VehicleValidator.isAssignableVehicle({ registrationType: "Private Transport", movementStatus: "available" }),
    false
  );
  assert.strictEqual(
    VehicleValidator.isAssignableVehicle({ registrationType: "Public Transport", movementStatus: "maintenance" }),
    false
  );
}));

results.push(test("blocking reasons include private transport and excluded status", () => {
  const reasons = VehicleValidator.buildVehicleBlockingReasons({
    registrationType: "Private Transport",
    movementStatus: "maintenance",
    vehicleSerial: ""
  });
  assert.ok(reasons.includes("private_transport_not_assignable"));
  assert.ok(reasons.includes("excluded_vehicle_status"));
  assert.ok(reasons.includes("missing_vehicle_serial"));
}));

results.push(test("operating vehicle and movement validation require core fields", () => {
  assert.ok(VehicleValidator.validateOperatingVehicleRecord({}).includes("missing_vehicle_serial"));
  assert.ok(VehicleValidator.validateVehicleMovementEvent({}).includes("missing_event_type"));
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
