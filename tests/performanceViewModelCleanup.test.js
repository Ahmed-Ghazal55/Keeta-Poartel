const assert = require("assert");
const ViewModel = require("../src/performance/performanceViewModel.js");
const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, status: "passed" }); }
  catch (error) { results.push({ name, status: "failed", error: error.message }); }
}
test("canonical performance subpages and legacy aliases resolve", () => {
  assert.deepStrictEqual(ViewModel.SUBPAGES, [
    "performance_overview", "overall_performance", "daily_performance", "vda",
    "face_verification", "delivery_experience", "validity_results", "issues"
  ]);
  assert.strictEqual(ViewModel.normalizeSubPage("results"), "validity_results");
  assert.strictEqual(ViewModel.normalizeSubPage("vda_keeta"), "vda");
});
test("sidebar exposes eight distinct routes", () => {
  const routes = ViewModel.getSidebarRouteMap();
  assert.strictEqual(Object.keys(routes).length, 8);
  assert.strictEqual(routes.PF8.subPage, "issues");
});
test("filters preserve identity and scope separation", () => {
  const rows = [
    { dashboardUserId: "U1", ownerIqama: "O1", actualRiderIqama: "R1", actualRiderSource: "external", register: "EXPRESS", city: "Jeddah", platform: "keeta", month: "2026-07", status: "eligible" },
    { dashboardUserId: "U1", ownerIqama: "O1", actualRiderIqama: "R2", actualRiderSource: "hr", register: "ALBAWABA", city: "Riyadh", platform: "keeta", month: "2026-07", status: "not_eligible" }
  ];
  assert.deepStrictEqual(ViewModel.filterRows(rows, { register: "EXPRESS", actualRiderIqama: "R1" }), [rows[0]]);
});
test("legacy validity statuses normalize to canonical statuses", () => {
  assert.strictEqual(ViewModel.normalizeValidityStatus("eligible"), "valid");
  assert.strictEqual(ViewModel.normalizeValidityStatus("not_eligible"), "invalid");
  assert.strictEqual(ViewModel.normalizeValidityStatus("no_data"), "missing_data");
});
test("issue focus metadata carries read-only destination context", () => {
  const metadata = ViewModel.buildIssueMetadata({ id: "I1", issueCode: "missing_assignment", severity: "critical" }, {
    id: "R1", dashboardUserId: "U1", ownerIqama: "O1", actualRiderIqama: "", month: "2026-07", register: "EXPRESS", city: "Jeddah", platform: "keeta"
  });
  assert.strictEqual(metadata.linkedPage, "performance-shell");
  assert.strictEqual(metadata.linkedSubPage, "issues");
  assert.strictEqual(metadata.ownerIqama, "O1");
  assert.strictEqual(metadata.actualRiderIqama, "");
});
const summary = { total: results.length, passed: results.filter(x => x.status === "passed").length, failed: results.filter(x => x.status === "failed").length };
console.log(JSON.stringify({ summary, results }, null, 2));
if (summary.failed) process.exitCode = 1;
