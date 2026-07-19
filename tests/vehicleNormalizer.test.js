const assert = require("assert");
const VehicleNormalizer = require("../src/fleet/vehicleNormalizer.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function mapping(byField) {
  return {
    byField,
    headers: Object.keys(byField).map((key) => byField[key]),
    mappedCount: Object.keys(byField).length,
    mappedFields: Object.keys(byField),
    missingRequired: [],
    coverage: 1,
    unknownHeaders: []
  };
}

const results = [];

results.push(test("normalizes operating vehicle rows using the official headers", () => {
  const importRecord = {
    id: "import_batch_vehicles",
    sourceFileName: "Updata_Vehicles.csv",
    headers: ["رقم اللوحة", "نوع التسجيل", "الماركة", "الرقم التسلسلي", "السجل", "Current City", "Vehicle Type", "Vehicle movement status"],
    mapping: mapping({
      plateNumber: "رقم اللوحة",
      registrationType: "نوع التسجيل",
      brand: "الماركة",
      vehicleSerial: "الرقم التسلسلي",
      register: "السجل",
      currentCity: "Current City",
      vehicleType: "Vehicle Type",
      movementStatus: "Vehicle movement status"
    }),
    analysis: {
      tableSummary: {
        rows: [
          {
            "رقم اللوحة": "JED-1001",
            "نوع التسجيل": "Public Transport",
            "الماركة": "Toyota",
            "الرقم التسلسلي": "JED-CAR-1001",
            "السجل": "EXPRESS",
            "Current City": "جدة",
            "Vehicle Type": "car",
            "Vehicle movement status": "available"
          }
        ]
      }
    }
  };

  const records = VehicleNormalizer.normalizeOperatingVehicleRows(importRecord);
  assert.strictEqual(records.length, 1);
  assert.strictEqual(records[0].vehicleSerial, "JED-CAR-1001");
  assert.strictEqual(records[0].plateNumber, "JED-1001");
  assert.strictEqual(records[0].transportType, "public_transport");
  assert.strictEqual(records[0].sourceRow, 2);
}));

results.push(test("normalizes vehicle movement rows into movement events", () => {
  const importRecord = {
    id: "import_batch_movement",
    sourceFileName: "Vehicles_Movement.csv",
    headers: ["الفرع", "اللوحة الجديدة", "الرقم التسلسلي", "رقم اقامة المستخدم", "الإسم", "تاريخ الإستلام", "الحالة"],
    mapping: mapping({
      branch: "الفرع",
      newPlateNumber: "اللوحة الجديدة",
      vehicleSerial: "الرقم التسلسلي",
      currentUserIqama: "رقم اقامة المستخدم",
      currentUserName: "الإسم",
      receiptDate: "تاريخ الإستلام",
      movementStatus: "الحالة"
    }),
    analysis: {
      tableSummary: {
        rows: [
          {
            "الفرع": "جدة",
            "اللوحة الجديدة": "JED-1001",
            "الرقم التسلسلي": "JED-CAR-1001",
            "رقم اقامة المستخدم": "2444000011",
            "الإسم": "Ahmed Salem",
            "تاريخ الإستلام": "2026-07-01",
            "الحالة": "available"
          }
        ]
      }
    }
  };

  const events = VehicleNormalizer.normalizeVehicleMovementRows(importRecord);
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].vehicleSerial, "JED-CAR-1001");
  assert.strictEqual(events[0].plateNumber, "JED-1001");
  assert.strictEqual(events[0].currentUserIqama, "2444000011");
  assert.strictEqual(events[0].eventType, "received");
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
