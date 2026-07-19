const assert = require("assert");
const LiveClock = require("../src/ui/liveClock.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("clock formatter returns operational timestamp with Arabic meridiem", () => {
  const value = LiveClock.formatClockStamp(new Date(2026, 6, 13, 9, 47, 5));
  assert.strictEqual(value, "2026-07-13 09:47:05 ص");
}));

results.push(test("controller updates current time and last data update snapshots", () => {
  const snapshots = [];
  const controller = LiveClock.createLiveClockController({
    nowProvider: () => new Date(2026, 6, 13, 15, 12, 30),
    onTick: (snapshot) => snapshots.push(snapshot)
  });

  controller.tick();
  controller.setLastDataUpdate("2026-07-13 03:00:00 م");

  assert.strictEqual(snapshots[0].currentTime, "2026-07-13 03:12:30 م");
  assert.strictEqual(snapshots[1].lastDataUpdate, "2026-07-13 03:00:00 م");
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
