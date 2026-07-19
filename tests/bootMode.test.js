const assert = require("assert");
const BootMode = require("../src/runtime/bootMode.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("safe and lite query flags enable safe boot behavior", () => {
  const safeState = BootMode.parseBootMode("?safe=1");
  const liteState = BootMode.parseBootMode("?lite=1");
  assert.strictEqual(safeState.safeMode, true);
  assert.strictEqual(liteState.safeMode, true);
  assert.strictEqual(liteState.disableNodeSync, true);
}));

results.push(test("debugBoot can be enabled without forcing safe mode", () => {
  const state = BootMode.parseBootMode("?debugBoot=1");
  assert.strictEqual(state.debugBoot, true);
  assert.strictEqual(state.safeMode, false);
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
