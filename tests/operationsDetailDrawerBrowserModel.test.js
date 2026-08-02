const assert = require("assert");
const fs = require("fs");
const path = require("path");

const operationsUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_operations_extension.js"),
  "utf8"
);
const uiShellSource = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_ui_redesign.js"),
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

const results = [];

results.push(test("current assignment detail drawer still exposes all required proof sections", () => {
  [
    "1. Assignment identity",
    "2. Dashboard user owner",
    "3. Actual rider / resolver result",
    "4. Operational profile",
    "5. Vehicle usage summary",
    "6. Dates and assignment period",
    "7. Current status and allowed actions",
    "8. History links",
    "9. Source import batch",
    "10. Notes"
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
}));

results.push(test("drawer opening updates accessible browser-visible state", () => {
  [
    'setAttribute("aria-hidden", "false")',
    'setAttribute("data-drawer-state", "open")',
    'setAttribute("aria-hidden", "true")',
    'setAttribute("data-drawer-state", "closed")'
  ].forEach((needle) => assert.ok(uiShellSource.includes(needle), needle));
}));

results.push(test("detail drawers remain read-only and do not create direct audit writes", () => {
  assert.ok(!operationsUi.includes("createAuditEvent("));
  assert.ok(!operationsUi.includes("recordAuditEvent("));
  assert.ok(operationsUi.includes('if (action === "details") {'));
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
