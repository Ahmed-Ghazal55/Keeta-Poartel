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

results.push(test("current assignment detail drawer includes all required sections", () => {
  [
    "function renderCurrentAssignmentDetailsDrawer(row)",
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
  ].forEach((needle) => assert.ok(includes(needle), needle));
}));

results.push(test("detail drawer includes history links and timeline builder", () => {
  [
    "assignment history",
    "swap history",
    "termination history",
    "vehicle usage history",
    "performance by actual rider",
    "audit logs for this assignment/courierId",
    "function buildCurrentAssignmentTimeline(row)",
    "function renderCurrentAssignmentHistoryDrawer(row)"
  ].forEach((needle) => assert.ok(includes(needle), needle));
}));

results.push(test("detail drawer stays read-only and relies on service layer mutations elsewhere", () => {
  assert.ok(!includes("createAuditEvent("));
  assert.ok(!includes("recordAuditEvent("));
  [
    "openPostMutationDetails(dashboardUserId)",
    "assignmentService.assignRider({",
    "swapService.swapRider({",
    "terminationService.terminateUser({"
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
