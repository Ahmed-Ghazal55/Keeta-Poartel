const assert = require("assert");
const RuntimeLoopGuard = require("../src/runtime/runtimeLoopGuard.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("state factory exposes the required hotfix guards", () => {
  const state = RuntimeLoopGuard.createState();
  assert.ok(Object.prototype.hasOwnProperty.call(state, "isHandlingDataChanged"));
  assert.ok(Object.prototype.hasOwnProperty.call(state, "notificationSyncInFlight"));
  assert.ok(Object.prototype.hasOwnProperty.call(state, "lastNotificationHash"));
  assert.ok(Object.prototype.hasOwnProperty.call(state, "lastHydrationKey"));
  assert.ok(Object.prototype.hasOwnProperty.call(state, "lastFleetDerivedHash"));
  assert.ok(Object.prototype.hasOwnProperty.call(state, "renderDepth"));
}));

results.push(test("stable hashes only report changes when the payload really changes", () => {
  const first = RuntimeLoopGuard.shouldProceed("", [{ id: "a", status: "open" }]);
  const second = RuntimeLoopGuard.shouldProceed(first.hash, [{ id: "a", status: "open" }]);
  const third = RuntimeLoopGuard.shouldProceed(second.hash, [{ id: "a", status: "resolved" }]);
  assert.strictEqual(first.changed, true);
  assert.strictEqual(second.changed, false);
  assert.strictEqual(third.changed, true);
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
