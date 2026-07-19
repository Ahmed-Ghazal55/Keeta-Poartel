const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_stabilization.js"),
  "utf8"
);

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function includes(text) {
  return source.indexOf(text) >= 0;
}

const results = [];

results.push(test("runtime lifecycle guard is defined and reused", () => {
  assert.ok(includes("window.__keetaRuntimeLifecycle = window.__keetaRuntimeLifecycle || {"));
  assert.ok(includes("if (runtimeLifecycle.initialized) {"));
  assert.ok(includes("cleanupRuntimeLifecycle();"));
}));

results.push(test("runtime cleanup removes listeners and bridge subscription", () => {
  assert.ok(includes("runtimeLifecycle.cleanup.splice(0).forEach(function (dispose) {"));
  assert.ok(includes("if (runtimeLifecycle.bridgeUnsubscribe) {"));
  assert.ok(includes("runtimeLifecycle.bridgeUnsubscribe = null;"));
  assert.ok(includes("document.removeEventListener(\"click\", handleRuntimeUiClick);"));
  assert.ok(includes("document.removeEventListener(\"change\", handleRuntimeUiChange);"));
}));

results.push(test("live clock and runtime event binding are protected against duplicate init", () => {
  assert.ok(includes("if (runtimeUiState.runtimeUiBound) {"));
  assert.ok(includes("runtimeUiState.runtimeUiBound = true;"));
  assert.ok(includes("runtimeUiState.clockController.stop();"));
  assert.ok(includes("runtimeUiState.clockController = null;"));
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
