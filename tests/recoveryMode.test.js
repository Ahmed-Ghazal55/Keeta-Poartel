const assert = require("assert");
const RecoveryMode = require("../src/runtime/recoveryMode.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("recovery threshold helper triggers after 5 seconds", () => {
  assert.strictEqual(RecoveryMode.shouldTriggerRecovery(5100, 5000), true);
  assert.strictEqual(RecoveryMode.shouldTriggerRecovery(4900, 5000), false);
}));

results.push(test("recovery controller triggers and can be disarmed", () => {
  let triggered = 0;
  const timers = [];
  const controller = RecoveryMode.createRecoveryController({
    clearTimeoutImpl(id) {
      if (timers[id - 1]) {
        timers[id - 1].cleared = true;
      }
    },
    onTrigger() {
      triggered += 1;
    },
    setTimeoutImpl(callback) {
      timers.push({ callback, cleared: false });
      return timers.length;
    },
    timeoutMs: 5000
  });

  controller.arm();
  timers[0].callback();
  assert.strictEqual(triggered, 1);
  controller.arm();
  controller.disarm();
  assert.strictEqual(timers[1].cleared, true);
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
