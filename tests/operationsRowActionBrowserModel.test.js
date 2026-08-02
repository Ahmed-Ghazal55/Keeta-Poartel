const assert = require("assert");
const fs = require("fs");
const path = require("path");

const actionDropdownSource = fs.readFileSync(
  path.join(__dirname, "..", "src", "ui", "actionDropdown.js"),
  "utf8"
);
const operationsUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_operations_extension.js"),
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

results.push(test("row action dropdown exposes stable open-state markers for browser verification", () => {
  [
    'data-action-dropdown-open="false"',
    'data-action-dropdown-menu-state="closed"',
    'host.setAttribute("data-action-dropdown-state", "open")',
    'host.setAttribute("data-action-dropdown-state", "closed")'
  ].forEach((needle) => assert.ok(actionDropdownSource.includes(needle), needle));
}));

results.push(test("row action dropdown is viewport constrained instead of overflowing the screen", () => {
  [
    'menu.style.maxHeight',
    'menu.style.overflowY = "auto"',
    'availableHeightBelow',
    'availableHeightAbove'
  ].forEach((needle) => assert.ok(actionDropdownSource.includes(needle), needle));
}));

results.push(test("scrolling inside the dropdown menu does not close it before lower actions are reached", () => {
  [
    'window.addEventListener("scroll", function (event)',
    'ACTIVE_MENU.contains(event.target)',
    'closeMenu(doc);'
  ].forEach((needle) => assert.ok(actionDropdownSource.includes(needle), needle));
}));

results.push(test("operations row actions keep import batch focus routing available", () => {
  [
    'if (action === "source-batch") {',
    'focusImportSourceBatch(user, assignmentRow)',
    'Portal.ImportEntryPoint.focusBatch',
    'function resolveImportSourceBatchContext(user, assignmentRow)'
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));
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
