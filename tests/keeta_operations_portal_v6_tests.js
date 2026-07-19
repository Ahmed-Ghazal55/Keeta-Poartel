const { FormulaEngine } = require("../src/lib/formulaEngine.js");
const { StatusReviewEngine } = require("../src/lib/statusReviewEngine.js");
const { NormalizeOverallPerformance } = require("../src/lib/normalizeOverallPerformance.js");
const { VdaEngine } = require("../src/lib/vdaEngine.js");
const { FaceVerificationEngine } = require("../src/lib/faceVerificationEngine.js");
const { DeliveryExperienceEngine } = require("../src/lib/deliveryExperienceEngine.js");
const { OprEngine } = require("../src/lib/oprEngine.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const tests = [];

function test(name, handler) {
  tests.push({ name, handler });
}

test("FormulaEngine supports lookup and aggregations", () => {
  assert(FormulaEngine.xlookup("B", ["A", "B", "C"], [1, 2, 3], null) === 2, "xlookup should find the matching value");
  assert(FormulaEngine.countIf(["A", "B", "A"], "A") === 2, "countIf should count matches");
  assert(
    FormulaEngine.countIfs([
      { values: ["جدة", "الرياض", "جدة"], criteria: "جدة" },
      { values: ["car", "bike", "car"], criteria: "car" },
    ]) === 2,
    "countIfs should match multiple criteria"
  );
  assert(
    FormulaEngine.sumIfs([10, 20, 30], [
      { values: ["A", "B", "A"], criteria: "A" },
      { values: [1, 2, 3], criteria: { op: ">=", value: 1 } },
    ]) === 40,
    "sumIfs should sum rows that satisfy all criteria"
  );
});

test("StatusReviewEngine updates expired restricted rows", () => {
  const result = StatusReviewEngine.reviewStatusRows([
    {
      "المعرف": "KT-1",
      "الحالة": "مقيد بالايام",
      "تاريخ التقييد": "01/07/2026، 10:30 ص",
      "عدد الايام": "3",
    },
    {
      "المعرف": "KT-2",
      "الحالة": "مقيد بالايام",
      "تاريخ التقييد": "08/07/2026، 09:00 ص",
      "عدد الايام": "5",
    },
  ], {
    now: new Date("2026-07-05T08:00:00Z"),
  });

  assert(result.rows[0]["الحالة"] === "شغال", "expired row should become active");
  assert(result.rows[0]["تاريخ التقييد"].indexOf("تاريخ اخر تقييد") >= 0, "expired row should store the note");
  assert(result.rows[1]["الحالة"] === "مقيد بالايام", "future row should stay restricted");
  assert(result.changes.length === 1, "only one row should change");
});

test("NormalizeOverallPerformance converts wide data into long rows", () => {
  const matrix = [
    ["المدينة", "السجل", "معرّف السائق", "الاسم", "رقم الهوية", "رقم الهاتف", "المركبة", "20260701", "20260701", "20260702", "20260702"],
    ["المدينة", "السجل", "معرّف السائق", "الاسم", "رقم الهوية", "رقم الهاتف", "المركبة", "المهام التي تم تسليمها", "المهام المرفوضة (السائق)", "المهام التي تم تسليمها", "المهام المرفوضة (السائق)"],
    ["جدة", "CR-JED", "KT-1", "أحمد", "123", "050", "car", 12, 1, 16, 0],
  ];

  const rows = NormalizeOverallPerformance.normalizeOverallPerformance(matrix);
  assert(rows.length === 2, "wide row should become two long rows");
  assert(rows[0].date_key === "20260701", "first date key should be preserved");
  assert(rows[1].orders === 16, "second day orders should be extracted");
  assert(rows[0].day === "الأربعاء", "weekday should be derived in Arabic");
});

test("VdaEngine evaluates rider validity with configurable targets", () => {
  const result = VdaEngine.evaluateRiderVda({
    "Rider ID": "KT-1",
    "Vehicle Type": "bike",
    "First online date": "2026-07-01",
    "Online Day": 5,
    "Sum of Valid Shifts": 5,
    "Sum of total delivered tasks": 60,
    "Face Pass Rate": 0.95,
  }, {
    reportDate: new Date("2026-07-05T00:00:00Z"),
    dailyTargetByVehicleType: { bike: 10, car: 12, default: 12 },
    minimumValidDays: 3,
  });

  assert(result.finalStatus === "Valid", "rider should be valid when targets are met");
  assert(result.currentTarget === 50, "current target should scale by working days");
});

test("FaceVerificationEngine summarizes pass rate and deductions", () => {
  const summary = FaceVerificationEngine.summarizeFaceVerification([
    { riderId: "KT-1", date: "2026-07-01", result: "Pass" },
    { riderId: "KT-1", date: "2026-07-02", result: "Failed" },
    { riderId: "KT-1", date: "2026-07-03", result: "Pass" },
  ], {
    deductionPerFailedDay: 25,
  });

  assert(summary.triggeredDays === 3, "all rows should count as triggered");
  assert(summary.failedDays === 1, "failed days should be counted");
  assert(summary.deduction === 25, "deduction should use failed-day count");
});

test("DeliveryExperienceEngine ranks riders and zeros invalid incentive", () => {
  const rows = DeliveryExperienceEngine.buildExperienceRows([
    { city: "جدة", riderId: "KT-1", vehicleType: "car", onTimeRate: 0.98, orders: 80, isValid: true },
    { city: "جدة", riderId: "KT-2", vehicleType: "bike", onTimeRate: 0.82, orders: 40, isValid: false },
  ]);

  const invalidRow = rows.find((row) => row.riderId === "KT-2");
  assert(rows[0].rank === 1, "best rider should be ranked first");
  assert(invalidRow.incentive === 0, "invalid rider should not receive incentive");
});

test("OprEngine normalizes rows and supports search and stop actions", () => {
  const indexes = OprEngine.buildIndexes({
    express: [
      {
        "المعرف": "KT-1",
        "الاسم بالكامل": "أحمد سالم",
        "رقم بطاقة الهوية": "123",
        "رقم الهاتف": "0500000000",
        "المركبة": "Car",
        "الحالة": "شغال",
        "السجل": "CR-JED",
      },
    ],
    perOrder: [
      {
        "المعرف": "KT-2",
        "الاسم بالكامل": "بدر علي",
        "رقم بطاقة الهوية": "456",
        "رقم الهاتف": "0550000000",
        "المركبة": "Bike",
        "الحالة": "نشط",
        "السجل": "CR-JED",
      },
    ],
  });

  const matches = OprEngine.searchRiders(indexes, "بدر");
  const stopped = OprEngine.stopWithoutReplacement(matches[0], "تجربة");

  assert(indexes.rows.length === 2, "both datasets should be indexed");
  assert(matches.length === 1 && matches[0].userId === "KT-2", "search should find matching rider");
  assert(stopped.item.status === "لا يعمل حاليا", "stop action should mark row inactive");
});

const results = [];

for (const item of tests) {
  try {
    item.handler();
    results.push({ name: item.name, status: "passed" });
  } catch (error) {
    results.push({ name: item.name, status: "failed", error: error.message });
  }
}

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length,
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
