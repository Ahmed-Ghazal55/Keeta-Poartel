const assert = require("assert");
const { LAYERS, toCssVariables } = require("../src/ui/layering.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("layer ordering keeps overlays above page chrome", () => {
  assert.ok(LAYERS.topbar > LAYERS.hero);
  assert.ok(LAYERS.overlayDrawer > LAYERS.sidebar);
  assert.ok(LAYERS.modal > LAYERS.overlayModal);
  assert.ok(LAYERS.toast > LAYERS.modal);
  assert.ok(LAYERS.loading > LAYERS.toast);
}));

results.push(test("css variable map exposes the centralized z-index tokens", () => {
  const variables = toCssVariables();
  assert.strictEqual(variables["--ui-layer-topbar"], String(LAYERS.topbar));
  assert.strictEqual(variables["--ui-layer-drawer"], String(LAYERS.drawer));
  assert.strictEqual(variables["--ui-layer-toast"], String(LAYERS.toast));
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
