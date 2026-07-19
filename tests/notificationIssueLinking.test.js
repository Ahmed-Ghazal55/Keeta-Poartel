const assert = require("assert");
const Navigation = require("../src/notifications/notificationNavigation.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("buildNavigationRequest keeps operations filters and explicit drawer flag", () => {
  const request = Navigation.buildNavigationRequest({
    id: "notification-1",
    linkedPage: "operations-shell",
    linkedSubPage: "needs_assignment",
    linkedDrawer: "assign",
    linkedFilters: {
      city: "جدة",
      register: "EXPRESS",
      query: "1782999000333001 2444000033"
    },
    courierId: "1782999000333001",
    ownerIqama: "2444000033"
  }, {
    openDrawer: true
  });

  assert.strictEqual(request.linkedPage, "operations-shell");
  assert.strictEqual(request.linkedSubPage, "needs_assignment");
  assert.strictEqual(request.explicitDrawer, true);
  assert.strictEqual(request.linkedDrawer, "assign");
  assert.strictEqual(request.linkedFilters.query, "1782999000333001 2444000033");
}));

results.push(test("navigator opens current assignments page and dispatches event payload", () => {
  const calls = [];
  const events = [];
  const navigator = Navigation.createNotificationNavigator({
    dispatchEvent: (eventName, detail) => {
      events.push({ eventName, detail });
    },
    getUiShell: () => ({
      openPage: (pageKey, route) => {
        calls.push({ pageKey, route });
        return true;
      }
    })
  });

  const request = navigator.navigate({
    id: "notification-2",
    linkedPage: "operations-shell",
    linkedSubPage: "current_assignments",
    linkedFilters: { actualRiderIqama: "2999006101" },
    assignmentId: "assignment-1",
    courierId: "6101",
    linkedDrawer: "details"
  }, {
    openDrawer: false
  });

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].pageKey, "operations-shell");
  assert.strictEqual(calls[0].route.subPage, "current_assignments");
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].eventName, Navigation.NAVIGATION_EVENT);
  assert.strictEqual(request.linkedFilters.actualRiderIqama, "2999006101");
  assert.strictEqual(request.explicitDrawer, false);
}));

results.push(test("import notification navigation targets import center safely", () => {
  const request = Navigation.buildNavigationRequest({
    id: "notification-3",
    linkedPage: "import-center",
    linkedFilters: {
      batchId: "batch-77",
      templateId: "current_assignments"
    },
    importBatchId: "batch-77"
  });

  assert.strictEqual(request.linkedPage, "import-center");
  assert.strictEqual(request.importBatchId, "batch-77");
  assert.strictEqual(request.linkedFilters.templateId, "current_assignments");
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
