const assert = require("assert");
const fs = require("fs");
const path = require("path");

const jsSource = fs.readFileSync(path.join(__dirname, "..", "keeta_operations_portal_ui_redesign.js"), "utf8");
const cssSource = fs.readFileSync(path.join(__dirname, "..", "keeta_operations_portal_ui_redesign.css"), "utf8");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("topbar markup contains the rebuilt main and runtime rows", () => {
  assert.ok(jsSource.includes("ui-topbar__main"));
  assert.ok(jsSource.includes("ui-topbar__title-row"));
  assert.ok(jsSource.includes("appTopbarRuntime"));
}));

results.push(test("topbar css uses grid/flex layout without overflow clipping", () => {
  assert.ok(cssSource.includes(".ui-topbar__main"));
  assert.ok(cssSource.includes(".ui-topbar__title-row"));
  assert.ok(!/\\.ui-topbar\\s*\\{[\\s\\S]*overflow:\\s*hidden;/m.test(cssSource));
}));

results.push(test("mobile topbar keeps runtime and actions horizontally compact", () => {
  assert.ok(cssSource.includes("@media (max-width: 860px)"));
  assert.ok(cssSource.includes(".ui-topbar__actions .ui-btn"));
  assert.ok(cssSource.includes("min-width: max-content;"));
  assert.ok(cssSource.includes("overflow-x: auto;"));
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
