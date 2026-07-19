const assert = require("assert");
const SidebarRouting = require("../src/ui/sidebarRouting.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("route map resolves shared shells to distinct subpages", () => {
  const op1 = SidebarRouting.resolveRoute("OP1");
  const op8 = SidebarRouting.resolveRoute("OP8");
  const rl2 = SidebarRouting.resolveRoute("RL2");

  assert.strictEqual(op1.page, "operations-shell");
  assert.strictEqual(op1.subPage, "dashboard_users");
  assert.strictEqual(op8.page, "operations-shell");
  assert.strictEqual(op8.subPage, "audit_log");
  assert.strictEqual(rl2.page, "monthly-rules-shell");
  assert.strictEqual(rl2.subPage, "mandatory");
}));

results.push(test("active state depends on page and subpage instead of page only", () => {
  const current = SidebarRouting.resolveRoute("RL3");
  assert.strictEqual(SidebarRouting.isActiveRoute(current, SidebarRouting.resolveRoute("RL3")), true);
  assert.strictEqual(SidebarRouting.isActiveRoute(current, SidebarRouting.resolveRoute("RL4")), false);
}));

results.push(test("single-open accordion closes sibling groups by default", () => {
  const next = SidebarRouting.toggleGroupState({
    ops: true,
    rules: false,
    fleet: true
  }, "rules", false);

  assert.deepStrictEqual(next, {
    ops: false,
    rules: true,
    fleet: false
  });
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
