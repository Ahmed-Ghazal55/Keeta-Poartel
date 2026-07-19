const assert = require("assert");
const fs = require("fs");
const path = require("path");
const AuditPolicy = require("../src/audit/auditPolicy.js");

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

results.push(test("audit policy rejects read-only current assignment interactions", () => {
  const drawerOpen = AuditPolicy.classifyAuditRecord({
    action: "assignment_updated",
    actorUserId: "viewer",
    entity: "assignments",
    entityId: "assignment-1",
    reason: "Opened current assignment details drawer",
    source: "drawer_open"
  });
  const historyOpen = AuditPolicy.classifyAuditRecord({
    action: "assignment_updated",
    actorUserId: "viewer",
    entity: "assignments",
    entityId: "assignment-1",
    reason: "Viewed current assignment history",
    source: "readonly_history_view"
  });
  const filterChange = AuditPolicy.classifyAuditRecord({
    action: "assignment_updated",
    actorUserId: "viewer",
    entity: "assignments",
    entityId: "assignment-1",
    reason: "Updated current assignments filter",
    source: "filter_input"
  });

  assert.strictEqual(drawerOpen.isPhantom, true);
  assert.strictEqual(historyOpen.isPhantom, true);
  assert.strictEqual(filterChange.isPhantom, true);
}));

results.push(test("current assignments UI keeps audit creation in service layer only", () => {
  assert.ok(!operationsUi.includes("createAuditEvent("));
  assert.ok(!operationsUi.includes("recordAuditEvent("));
  [
    'if (action === "details") {',
    'if (action === "history") {',
    "renderCurrentAssignmentDetailsDrawer(",
    "renderCurrentAssignmentHistoryDrawer(",
    "openPostMutationDetails(dashboardUserId)"
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
