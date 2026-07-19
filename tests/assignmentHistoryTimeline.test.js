const assert = require("assert");
const CurrentAssignmentsViewModel = require("../src/operations/currentAssignmentsViewModel.js");
const { createRuntime } = require("./helpers/operationsTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

const results = [];

results.push(test("timeline merges assignment history, terminations, and audit rows with operational fields", () => {
  const row = {
    assignmentId: "assignment-timeline-1",
    dashboardUserId: "8201",
    ownerIqama: "2444820101",
    actualRiderIqama: "2999820101",
    operationMode: "salary_tiers",
    plateNumber: "JED-8201",
    vehicleSerial: "VH-8201",
  };

  const timeline = CurrentAssignmentsViewModel.buildAssignmentTimeline(row, {
    assignmentHistory: [
      {
        id: "history-8201",
        dashboardUserId: "8201",
        action: "swap",
        actionDate: "2026-07-18",
        previousRiderIqama: "2999820000",
        newRiderIqama: "2999820101",
        after: {
          operationMode: "salary_tiers",
          assignmentStatus: "active",
          vehicleSerial: "VH-8201",
          plateNumber: "JED-8201",
        },
      },
    ],
    auditLogs: [
      {
        id: "audit-8201",
        action: "swap_confirmed",
        entityId: "assignment-timeline-1",
        timestamp: "2026-07-18T10:00:00.000Z",
        before: { actualRiderIqama: "2999820000" },
        after: {
          actualRiderIqama: "2999820101",
          assignmentStatus: "active",
          operationMode: "salary_tiers",
          vehicleSerial: "VH-8201",
          plateNumber: "JED-8201",
        },
        reason: "swap coverage",
      },
    ],
    terminations: [
      {
        id: "termination-8201",
        dashboardUserId: "8201",
        riderIqama: "2999820101",
        terminationDate: "2026-07-19",
        statusAfter: "terminated",
        reason: "final stop",
      },
    ],
  }, { limit: 10 });

  assert.strictEqual(timeline.length, 3);
  assert.strictEqual(timeline[0].eventTime, "2026-07-19");
  assert.ok(timeline.some((item) => item.eventType === "swap"));
  assert.ok(timeline.some((item) => item.auditEventId === "audit-8201"));
  assert.ok(timeline.every((item) => item.courierId === "8201"));
  assert.ok(timeline.every((item) => Object.prototype.hasOwnProperty.call(item, "vehicleSerial")));
  assert.ok(timeline.every((item) => Object.prototype.hasOwnProperty.call(item, "plateNumber")));
}));

results.push(test("timeline reads do not create audit rows", () => {
  const runtime = createRuntime({
    auditLogs: [],
  });
  const before = runtime.dataStore.getAll("auditLogs").length;
  const timeline = CurrentAssignmentsViewModel.buildAssignmentTimeline({
    assignmentId: "assignment-readonly-8202",
    dashboardUserId: "8202",
    ownerIqama: "2444820202",
    actualRiderIqama: "2999820202",
  }, {
    assignmentHistory: [],
    auditLogs: [],
    terminations: [],
  }, { limit: 5 });
  const after = runtime.dataStore.getAll("auditLogs").length;

  assert.deepStrictEqual(timeline, []);
  assert.strictEqual(before, 0);
  assert.strictEqual(after, 0);
}));

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length,
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
