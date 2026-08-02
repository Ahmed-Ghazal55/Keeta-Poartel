const assert = require("assert");
const Attribution = require("../src/performance/performanceAttribution.js");

const dashboardUsers = [{
  dashboardUserId: "U1", ownerIqama: "OWNER", ownerName: "Owner",
  city: "Jeddah", register: "EXPRESS", platform: "keeta",
  vehicleSerial: "REG-CAR", plateNumber: "REG-1"
}];
const assignments = [
  {
    id: "A1", dashboardUserId: "U1", city: "Jeddah", register: "EXPRESS", platform: "keeta",
    assignmentStartDate: "2026-07-01", assignmentEndDate: "2026-07-15",
    actualRiderIqama: "EXT-1", actualRiderName: "External Rider", riderSource: "External",
    actualVehicleSerial: "BIKE-1", actualVehiclePlate: "BIKE-P1", status: "ended"
  },
  {
    id: "A2", dashboardUserId: "U1", city: "Jeddah", register: "EXPRESS", platform: "keeta",
    assignmentStartDate: "2026-07-16", actualRiderIqama: "HR-1", actualRiderName: "HR Rider",
    riderSource: "HR", actualVehicleSerial: "CAR-2", actualVehiclePlate: "CAR-P2", status: "active"
  }
];

function row(date, overrides) {
  return Object.assign({ dashboardUserId: "U1", date, city: "Jeddah", register: "EXPRESS", platform: "keeta" }, overrides || {});
}
function attribute(input, assignmentRows = assignments) {
  return Attribution.attributePerformanceRow(input, { assignments: assignmentRows, dashboardUsers });
}

const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, status: "passed" }); }
  catch (error) { results.push({ name, status: "failed", error: error.message }); }
}

test("split month uses the actual rider active on each report date", () => {
  assert.strictEqual(attribute(row("2026-07-15")).actualRiderIqama, "EXT-1");
  assert.strictEqual(attribute(row("2026-07-16")).actualRiderIqama, "HR-1");
});
test("external actual rider remains external", () => {
  assert.strictEqual(attribute(row("2026-07-10")).actualRiderSource, "external");
});
test("HR actual rider remains HR", () => {
  assert.strictEqual(attribute(row("2026-07-20")).actualRiderSource, "hr");
});
test("owner-only context is never promoted to actual rider", () => {
  const result = attribute(row("2026-06-01"), []);
  assert.strictEqual(result.ownerIqama, "OWNER");
  assert.strictEqual(result.actualRiderIqama, "");
  assert.strictEqual(result.attributionStatus, "unresolved");
});
test("cross-register and cross-city assignments do not match", () => {
  assert.strictEqual(attribute(row("2026-07-10", { register: "ALBAWABA" })).assignmentId, "");
  assert.strictEqual(attribute(row("2026-07-10", { city: "Riyadh" })).assignmentId, "");
});
test("registered and actual vehicles remain separate", () => {
  const result = attribute(row("2026-07-10"));
  assert.strictEqual(result.registeredVehicleSerial, "REG-CAR");
  assert.strictEqual(result.actualVehicleSerial, "BIKE-1");
});

const summary = { total: results.length, passed: results.filter(x => x.status === "passed").length, failed: results.filter(x => x.status === "failed").length };
console.log(JSON.stringify({ summary, results }, null, 2));
if (summary.failed) process.exitCode = 1;
