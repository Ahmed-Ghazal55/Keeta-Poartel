const assert = require("assert");

const NotificationNavigation = require("../src/notifications/notificationNavigation.js");

function test(name, fn) {
  try {
    fn();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error && error.message ? error.message : String(error) };
  }
}

function summarize(results) {
  return results.reduce((memo, item) => {
    memo.total += 1;
    if (item.status === "passed") {
      memo.passed += 1;
    } else {
      memo.failed += 1;
    }
    return memo;
  }, { total: 0, passed: 0, failed: 0 });
}

const results = [];

results.push(test("navigator opens operations shell and dispatches one dashboard navigation event", () => {
  const events = [];
  const pages = [];
  const navigator = NotificationNavigation.createNotificationNavigator({
    dispatchEvent: (name, detail) => events.push({ name, detail }),
    getUiShell: () => ({
      openPage: (pageKey, route) => pages.push({ pageKey, route })
    })
  });
  const request = navigator.navigate({
    id: "notification-dashboard-1",
    linkedPage: "operations-shell",
    linkedSubPage: "needs_assignment",
    linkedDrawer: "assign",
    linkedFilters: {
      courierId: "1782999000333001",
      readinessStatus: "ready_for_assignment"
    }
  }, {
    openDrawer: true
  });

  assert.strictEqual(pages.length, 1);
  assert.strictEqual(pages[0].pageKey, "operations-shell");
  assert.strictEqual(pages[0].route.subPage, "needs_assignment");
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].name, NotificationNavigation.NAVIGATION_EVENT);
  assert.strictEqual(events[0].detail.linkedDrawer, "assign");
  assert.strictEqual(request.linkedFilters.readinessStatus, "ready_for_assignment");
}));

results.push(test("navigator keeps import-center navigation read-only and route scoped", () => {
  const events = [];
  const pages = [];
  const navigator = NotificationNavigation.createNotificationNavigator({
    dispatchEvent: (name, detail) => events.push({ name, detail }),
    getUiShell: () => ({
      openPage: (pageKey, route) => pages.push({ pageKey, route })
    })
  });

  navigator.navigate({
    id: "notification-import-1",
    linkedPage: "import-center",
    linkedFilters: {
      batchId: "batch_prompt_8_9_b_1",
      templateId: "dashboard_users"
    }
  }, {});

  assert.strictEqual(pages.length, 1);
  assert.strictEqual(pages[0].pageKey, "import-center");
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].detail.linkedFilters.batchId, "batch_prompt_8_9_b_1");
  assert.strictEqual(events[0].detail.linkedFilters.templateId, "dashboard_users");
}));

const summary = summarize(results);
console.log(JSON.stringify({ summary, results }, null, 2));
if (summary.failed > 0) {
  process.exit(1);
}
