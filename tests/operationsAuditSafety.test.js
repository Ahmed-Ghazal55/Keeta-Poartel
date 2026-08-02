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

results.push(test("route linking, filters, notification navigation, dropdowns, drawers, and import navigation stay phantom", () => {
  const records = [
    {
      action: "assignment_updated",
      entity: "assignments",
      entityId: "assignment-810-1",
      reason: "Opened linked current assignment route",
      source: "route_change"
    },
    {
      action: "dashboard_user_updated",
      entity: "dashboardUsers",
      entityId: "dashboard-810-1",
      reason: "Updated operations filter state",
      source: "filter_input"
    },
    {
      action: "assignment_updated",
      entity: "assignments",
      entityId: "assignment-810-2",
      reason: "Notification navigation to current assignments",
      source: "notification_navigation"
    },
    {
      action: "import_batch_saved",
      entity: "importBatches",
      entityId: "batch-810-1",
      reason: "Opened import source batch drawer",
      source: "drawer_open"
    },
    {
      action: "assignment_updated",
      entity: "assignments",
      entityId: "assignment-810-3",
      reason: "Opened row action dropdown",
      source: "dropdown_open"
    },
    {
      action: "import_batch_saved",
      entity: "importBatches",
      entityId: "batch-810-2",
      reason: "Focused import source batch from operations row",
      source: "navigation_open"
    }
  ];

  records.forEach((record) => {
    const result = AuditPolicy.classifyAuditRecord(record);
    assert.strictEqual(result.isPhantom, true, record.source);
  });
}));

results.push(test("operations cleanup helpers remain UI-only with no direct audit writes", () => {
  [
    "function handleLinkedOperationsAction(action, user, assignmentRow)",
    "function renderActionButtonsSafe(row, user)",
    "function buildDropdownActionsSafe(row, user)",
    "function focusImportSourceBatch(user, assignmentRow)",
    "function resolveImportSourceBatchContext(user, assignmentRow)"
  ].forEach((needle) => assert.ok(operationsUi.includes(needle), needle));

  assert.ok(!operationsUi.includes("createAuditEvent("));
  assert.ok(!operationsUi.includes("recordAuditEvent("));
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
