const assert = require("assert");
const fs = require("fs");
const path = require("path");

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

function includes(text) {
  return operationsUi.indexOf(text) >= 0;
}

const results = [];

results.push(test("dashboard users KPI labels exist for Prompt 8.7 lifecycle buckets", () => {
  [
    "إجمالي يوزرات الداشبورد",
    "جديد",
    "جاهز للتسكين",
    "مسكن",
    "قيد المراجعة",
    "مرفوض",
    "مقال / مختفي",
    "يحتاج مراجعة"
  ].forEach((label) => assert.ok(includes(label), label));
}));

results.push(test("dashboard users filters exist for scope, lifecycle, readiness, and search", () => {
  [
    'id="opsSearchInput"',
    'id="opsRegisterFilter"',
    'id="opsCityFilter"',
    'id="opsPlatformFilter"',
    'id="opsLifecycleFilter"',
    'id="opsReadinessFilter"',
    'id="opsReviewFilter"',
    'id="opsEmploymentFilter"',
    'id="opsModeFilter"',
    'id="opsVehicleFilter"'
  ].forEach((needle) => assert.ok(includes(needle), needle));
}));

results.push(test("dashboard users table columns and import entry points exist", () => {
  [
    "<th>Courier ID</th>",
    "<th>Lifecycle</th>",
    "<th>Assignment Readiness</th>",
    "Actual Rider ID",
    "Source Batch",
    'data-ops-import-route="dashboard_users_import"',
    'data-ops-import-route="current_assignments_import"'
  ].forEach((needle) => assert.ok(includes(needle), needle));
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
