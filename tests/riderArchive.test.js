const assert = require("assert");
const RiderArchive = require("../src/hr/riderArchive.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("buildImportedEvent creates a stable imported event payload", () => {
  const eventItem = RiderArchive.buildImportedEvent("r1", {
    city: "جدة",
    register: "EXPRESS",
    sourceFile: "hr.xlsx"
  }, {
    note: "Initial import"
  });
  assert.strictEqual(eventItem.riderId, "r1");
  assert.strictEqual(eventItem.eventType, "imported");
  assert.strictEqual(eventItem.note, "Initial import");
}));

results.push(test("sortTimeline orders newest dates first", () => {
  const sorted = RiderArchive.sortTimeline([
    RiderArchive.createArchiveEvent({ riderId: "r1", eventType: "status_changed", eventDate: "2026-07-01" }),
    RiderArchive.createArchiveEvent({ riderId: "r1", eventType: "status_changed", eventDate: "2026-07-10" })
  ]);
  assert.strictEqual(sorted[0].eventDate, "2026-07-10");
}));

results.push(test("filterEvents supports riderId, city, and register filters", () => {
  const events = [
    RiderArchive.createArchiveEvent({ riderId: "r1", city: "جدة", register: "EXPRESS", eventType: "imported" }),
    RiderArchive.createArchiveEvent({ riderId: "r2", city: "الرياض", register: "TOGARY", eventType: "license_updated" })
  ];
  assert.strictEqual(RiderArchive.filterEvents(events, { riderId: "r1" }).length, 1);
  assert.strictEqual(RiderArchive.filterEvents(events, { city: "الرياض" }).length, 1);
  assert.strictEqual(RiderArchive.filterEvents(events, { register: "TOGARY" }).length, 1);
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
