const assert = require("assert");
const VehicleMovementService = require("../src/fleet/vehicleMovementService.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("createVehicleMovementEvent derives event type and stable identifiers", () => {
  const eventItem = VehicleMovementService.createVehicleMovementEvent({
    vehicleSerial: "JED-CAR-1001",
    plateNumber: "JED-1001",
    eventDate: "2026-07-01",
    currentUserIqama: "2444000011",
    currentUserName: "Ahmed Salem",
    primaryStatus: "available"
  }, {});
  assert.strictEqual(eventItem.vehicleSerial, "JED-CAR-1001");
  assert.strictEqual(eventItem.eventType, "received");
  assert.ok(eventItem.id.indexOf("vehicleMovementEvents::JED-CAR-1001") >= 0);
}));

results.push(test("movement index keeps the latest event per serial", () => {
  const index = VehicleMovementService.buildVehicleMovementIndex([
    { vehicleSerial: "JED-CAR-1001", eventDate: "2026-07-01", status: "available" },
    { vehicleSerial: "JED-CAR-1001", eventDate: "2026-07-03", status: "maintenance" }
  ]);
  assert.strictEqual(index["JED-CAR-1001"].eventDate, "2026-07-03");
}));

results.push(test("derived movement status uses the latest event label", () => {
  const status = VehicleMovementService.deriveVehicleMovementStatus("JED-CAR-1001", [
    { vehicleSerial: "JED-CAR-1001", eventDate: "2026-07-01", status: "available" },
    { vehicleSerial: "JED-CAR-1001", eventDate: "2026-07-05", status: "maintenance" }
  ]);
  assert.strictEqual(status, "صيانة");
}));

results.push(test("inferEventType maps excluded statuses to withdrawn", () => {
  assert.strictEqual(VehicleMovementService.inferEventType("excluded"), "withdrawn");
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
