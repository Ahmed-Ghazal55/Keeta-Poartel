const assert = require("assert");
const {
  CITY_JEDDAH,
  buildAssignment,
  buildDashboardUser,
  buildDeliveryResult,
  buildFaceRow,
  buildPerformanceAnalysis,
  buildRider,
  buildVdaResult,
  createRule,
  createRuntime,
  createSuperAdmin,
} = require("./helpers/performanceTestHelpers.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

function buildDailyCsv(userId) {
  return [
    "Date,User ID,City,Company,Vehicle Type,Completed Orders,Working Hours",
    "2026-07-01," + userId + ",Jeddah,EXPRESS,car,60,9",
    "2026-07-02," + userId + ",Jeddah,EXPRESS,car,60,9",
    "2026-07-03," + userId + ",Jeddah,EXPRESS,car,60,9",
    "2026-07-04," + userId + ",Jeddah,EXPRESS,car,50,8",
    "2026-07-05," + userId + ",Jeddah,EXPRESS,car,50,8",
    "2026-07-06," + userId + ",Jeddah,EXPRESS,car,50,8",
  ].join("\n");
}

const results = [];

results.push(test("daily performance import creates monthly and validity outputs", () => {
  const runtime = createRuntime({
    assignments: [buildAssignment()],
    dashboardUsers: [buildDashboardUser()],
    deliveryExperience: [buildDeliveryResult()],
    faceVerification: [buildFaceRow(), buildFaceRow({ date: "2026-07-02" }), buildFaceRow({ date: "2026-07-03" })],
    monthlyRules: [createRule()],
    riders: [buildRider()],
    vdaResults: [buildVdaResult()],
  });
  const saved = runtime.importBatchService.saveImportBatch({
    analysis: buildPerformanceAnalysis("daily_performance.csv", buildDailyCsv("1001")),
    manualMapping: {
      city: CITY_JEDDAH,
      fileType: "performance_daily_csv",
      month: "2026-07",
      register: "EXPRESS",
      targetEntity: "performanceDaily",
    },
    user: createSuperAdmin(),
  });
  assert.strictEqual(saved.status, "saved");
  assert.ok(runtime.dataStore.getAll("performanceDaily").length >= 6);
  assert.ok(runtime.dataStore.getAll("performanceMonthly").length >= 1);
  assert.ok(runtime.dataStore.getAll("validityResults").length >= 1);
  assert.strictEqual(runtime.dataStore.getAll("auditLogs").length, 1);
  assert.ok(runtime.dataStore.getAll("auditLogs").some((item) => item.action === "performance_report_imported"));
}));

results.push(test("missing rider linkage creates a performance issue", () => {
  const runtime = createRuntime({
    monthlyRules: [createRule()],
  });
  runtime.importBatchService.saveImportBatch({
    analysis: buildPerformanceAnalysis("daily_performance_unlinked.csv", buildDailyCsv("9999")),
    manualMapping: {
      city: CITY_JEDDAH,
      fileType: "performance_daily_csv",
      month: "2026-07",
      register: "EXPRESS",
      targetEntity: "performanceDaily",
    },
    user: createSuperAdmin(),
  });
  assert.ok(runtime.dataStore.getAll("performanceIssues").some((item) => item.issueType === "missing_rider_link"));
}));

results.push(test("recalculation stays scoped to the imported city register and month", () => {
  const runtime = createRuntime({
    assignments: [buildAssignment()],
    dashboardUsers: [buildDashboardUser()],
    deliveryExperience: [buildDeliveryResult()],
    faceVerification: [buildFaceRow()],
    monthlyRules: [createRule()],
    riders: [buildRider()],
    vdaResults: [buildVdaResult()],
  });
  const saved = runtime.importBatchService.saveImportBatch({
    analysis: buildPerformanceAnalysis("daily_performance_scoped.csv", buildDailyCsv("1001")),
    manualMapping: {
      city: CITY_JEDDAH,
      fileType: "performance_daily_csv",
      month: "2026-07",
      register: "EXPRESS",
      targetEntity: "performanceDaily",
    },
    user: createSuperAdmin(),
  });
  assert.strictEqual(saved.recalculationSummary.scope.city, CITY_JEDDAH);
  assert.strictEqual(saved.recalculationSummary.scope.register, "EXPRESS");
  assert.strictEqual(saved.recalculationSummary.scope.month, "2026-07");
  assert.ok(runtime.dataStore.getAll("validityResults").every((item) => item.city === CITY_JEDDAH));
}));

const failed = results.filter((item) => item.status === "failed");
if (failed.length) {
  console.error("performanceImportIntegration.test.js failures:");
  failed.forEach((item) => console.error("-", item.name + ":", item.error));
  process.exit(1);
}

console.log("performanceImportIntegration.test.js passed:", results.length);
