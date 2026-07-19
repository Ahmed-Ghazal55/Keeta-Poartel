const assert = require("assert");
const VehicleComputedFieldsService = require("../src/fleet/vehicleComputedFieldsService.js");

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
    {
      vehicleSerial: "JED-CAR-1001",
      eventDate: "2026-07-02",
      status: "maintenance"
    }
  ],
  vehicleUpdateRows: [
    {
      vehicleSerial: "JED-CAR-1001",
      currentBoundingAccounts: "2",
      usedByPartnerName: "Ahmed Salem",
      Branch: "جدة",
      brandName: "EXPRESS",
      city: "جدة",
      courier_id: "1782916129257495",
      IQAMA: "2444000011",
      NAME: "Ahmed Salem",
      vehicleType: "car"
    },
    {
      vehicleSerial: "JED-CAR-1001",
      Branch: "الرياض",
      brandName: "TOGARY",
      city: "الرياض",
      courier_id: "1782999999999999",
      IQAMA: "2444000022",
      NAME: "Bader Ali",
      vehicleType: "car"
    }
  ],
  vehicles: [
    {
      vehicleSerial: "JED-CAR-1001",
      currentBranch: "جدة - EXPRESS",
      targetedBranch: "EXPRESS",
      vehicleType: "car"
    }
  ]
};

const results = [];

results.push(test("current city warns when the same serial is mixed across cities", () => {
  const value = VehicleComputedFieldsService.computeCurrentCity("JED-CAR-1001", dataSources);
  assert.ok(value.includes("اختلاط المدينة"));
  assert.ok(value.includes("جدة"));
  assert.ok(value.includes("الرياض"));
}));

results.push(test("iqama columns are derived from update rows", () => {
  const values = VehicleComputedFieldsService.computeIqamaColumns("JED-CAR-1001", dataSources);
  assert.strictEqual(values[0], "2444000011");
  assert.strictEqual(values[1], "2444000022");
  assert.strictEqual(values[2], "");
  assert.strictEqual(values[3], "");
}));

results.push(test("accounts registered on the vehicle are summarized from update rows", () => {
  const value = VehicleComputedFieldsService.computeAccountsRegisteredOnVehicle("JED-CAR-1001", dataSources);
  assert.ok(value.includes("1782916129257495"));
  assert.ok(value.includes("Ahmed Salem"));
}));

results.push(test("movement status is derived from latest movement data", () => {
  assert.strictEqual(
    VehicleComputedFieldsService.computeVehicleMovementStatus("JED-CAR-1001", dataSources),
    "صيانة"
  );
}));

results.push(test("display row fills Prompt 8 computed fleet fields", () => {
  const row = VehicleComputedFieldsService.computeOperatingVehicleDisplayRow({
    vehicleSerial: "JED-CAR-1001",
    plateNumber: "JED-1001"
  }, dataSources);
  assert.strictEqual(row.currentBoundingAccounts, "2");
  assert.strictEqual(row.usedByPartnerName, "Ahmed Salem");
  assert.strictEqual(row.iqama1, "2444000011");
  assert.strictEqual(row.iqama2, "2444000022");
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
