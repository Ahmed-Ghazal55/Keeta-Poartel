const assert = require("assert");
const Engine = require("../src/performance/monthlyValidityEngine.js");
const { createRule } = require("./helpers/performanceTestHelpers.js");
const monthly = {
  riderId: "rider-1", dashboardUserId: "U1", iqama: "R1", ownerIqama: "O1",
  actualRiderIqama: "R1", actualRiderSource: "external", assignmentId: "A1",
  registeredVehicleSerial: "REG-1", actualVehicleSerial: "ACT-1",
  city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07",
  vehicleType: "car", totalCompletedOrders: 400, validDaysCount: 7, invalidDaysCount: 0,
  dailyRows: [{}], mandatorySummary: { met: true }, warnings: []
};
const result = Engine.calculateValidityResult(monthly, {
  deliveryExperienceResult: { status: "pass" },
  faceVerificationResult: { status: "pass" },
  vdaResult: { status: "valid" }
}, createRule());
assert.strictEqual(result.canonicalStatus, "valid");
assert.strictEqual(result.ownerIqama, "O1");
assert.strictEqual(result.actualRiderIqama, "R1");
assert.notStrictEqual(result.registeredVehicleSerial, result.actualVehicleSerial);
assert.ok(["valid", "warning", "invalid", "blocked", "missing_data", "under_review"].includes(result.canonicalStatus));
console.log(JSON.stringify({ summary: { total: 4, passed: 4, failed: 0 } }, null, 2));
