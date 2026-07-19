const assert = require("assert");
const fs = require("fs");
const path = require("path");

const stabilizationUi = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_stabilization.js"),
  "utf8"
);
const stabilizationCss = fs.readFileSync(
  path.join(__dirname, "..", "keeta_operations_portal_stabilization.css"),
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

results.push(test("notification bell, drawer host, and filters render in topbar runtime", () => {
  [
    'id="topbarNotificationToggle"',
    'id="topbarNotificationPanel"',
    'id="topbarNotificationSearch"',
    'id="topbarNotificationSource"',
    'data-notification-quick-filter="',
    'data-notification-action="open-issue"',
    'data-notification-action="open-linked-drawer"',
    'data-notification-action="mark-unread"'
  ].forEach((needle) => assert.ok(stabilizationUi.includes(needle), needle));
}));

results.push(test("notification drawer model integration and safe mode messaging exist", () => {
  [
    "buildNotificationDrawerModel(",
    "markOpenNotificationsAsSeen(",
    "handleNotificationNavigationEvent(",
    "topbar-notification-safe"
  ].forEach((needle) => assert.ok(stabilizationUi.includes(needle) || stabilizationCss.includes(needle), needle));
}));

results.push(test("notification drawer CSS includes quick filters, module badge, and entity summary", () => {
  [
    ".topbar-notification-quick-filters",
    ".topbar-notification-chip",
    ".topbar-notification-module",
    ".topbar-notification-item__entity",
    ".import-history-row.is-focused"
  ].forEach((needle) => assert.ok(stabilizationCss.includes(needle), needle));
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
