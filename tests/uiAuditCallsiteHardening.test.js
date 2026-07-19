const assert = require("assert");
const fs = require("fs");
const path = require("path");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const uiRedesignPath = path.join(__dirname, "..", "keeta_operations_portal_ui_redesign.js");
const operationsUiPath = path.join(__dirname, "..", "keeta_operations_portal_operations_extension.js");
const hrUiPath = path.join(__dirname, "..", "keeta_operations_portal_hr_extension.js");
const uiRedesign = fs.readFileSync(uiRedesignPath, "utf8");
const operationsUi = fs.readFileSync(operationsUiPath, "utf8");
const hrUi = fs.readFileSync(hrUiPath, "utf8");
const results = [];

results.push(test("legacy UI audit helper remains unused by page actions", () => {
  const occurrences = (uiRedesign.match(/recordAuditEvent\(/g) || []).length;
  assert.strictEqual(occurrences, 1);
}));

results.push(test("legacy phantom audit action names are removed from UI modules", () => {
  [
    "open_import_center",
    "export_report",
    "open_archive",
    "import_file",
  ].forEach((needle) => {
    assert.ok(!uiRedesign.includes(needle), needle + " should not remain in UI redesign audit paths");
  });
}));

results.push(test("operations and HR workflow modules do not create UI-side audit rows", () => {
  assert.ok(!operationsUi.includes("recordAuditEvent("));
  assert.ok(!hrUi.includes("recordAuditEvent("));
}));

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length,
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
