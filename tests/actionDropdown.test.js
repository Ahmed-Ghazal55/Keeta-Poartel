const assert = require("assert");
const ActionDropdown = require("../src/ui/actionDropdown.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("dropdown renderer builds a single trigger with menu items", () => {
  const html = ActionDropdown.renderActionDropdown({
    contextData: { "entity-id": "user_1" },
    dropdownId: "ops_user_1",
    actions: [
      { id: "details", label: "عرض التفاصيل" },
      { id: "terminate", label: "إقالة", danger: true }
    ]
  });

  assert.ok(html.includes('data-action-dropdown-trigger="ops_user_1"'));
  assert.ok(html.includes('data-action-menu-item="details"'));
  assert.ok(html.includes('data-action-menu-item="terminate"'));
  assert.ok(html.includes("is-danger"));
}));

results.push(test("disabled actions render with reason text", () => {
  const html = ActionDropdown.renderActionDropdown({
    actions: [
      { id: "assign", label: "تسكين", disabled: true, reason: "يحتاج صلاحية operations.assign" }
    ]
  });

  assert.ok(html.includes("disabled"));
  assert.ok(html.includes("يحتاج صلاحية operations.assign"));
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
