(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./performanceCommon.js"),
      require("./performanceRuleResolver.js"),
      require("../lib/faceVerificationEngine.js").FaceVerificationEngine
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.FaceVerificationAdapter = factory(
    root.KeetaPortal.PerformanceCommon,
    root.KeetaPortal.PerformanceRuleResolver,
    root.KeetaV6 && root.KeetaV6.FaceVerificationEngine
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (Common, RuleResolver, FaceVerificationEngine) {
  "use strict";

  function evaluateFaceVerification(rows, rules, options) {
    options = options || {};
    var policy = RuleResolver.getFaceVerificationPolicy(rules);
    var list = normalizeFaceRows(rows, policy);
    if (!list.length) {
      return {
        affectsSalaryEligibility: true,
        fallbackUsed: !rules || !!rules.fallbackUsed,
        passRate: 0,
        passRateRequired: policy.passRateRequired,
        policy: policy,
        projectedPassRate: null,
        reasons: ["No face verification rows were found for this rider and month."],
        status: "no_data",
        summary: null
      };
    }

    var summary = FaceVerificationEngine && typeof FaceVerificationEngine.summarizeFaceVerification === "function"
      ? FaceVerificationEngine.summarizeFaceVerification(list, {
          deductionPerFailedDay: 0,
          firstOnlineField: "date",
          passField: "result",
          passThreshold: policy.passThreshold,
          triggeredField: "triggered"
        })
      : {
          triggeredDays: list.length,
          passedDays: list.filter(function (row) { return isPass(row.result); }).length,
          failedDays: list.filter(function (row) { return !isPass(row.result); }).length,
          passRate: list.length ? list.filter(function (row) { return isPass(row.result); }).length / list.length : 0,
          isAboveThreshold: false
        };

    var projectedPassRate = null;
    if (policy.allowExpectedProjection && options.expectedTriggeredDays && options.expectedTriggeredDays > summary.triggeredDays) {
      projectedPassRate = (summary.passedDays + (options.expectedTriggeredDays - summary.triggeredDays)) / options.expectedTriggeredDays;
    }

    return {
      affectsSalaryEligibility: true,
      fallbackUsed: !rules || !!rules.fallbackUsed,
      passRate: summary.passRate,
      passRateRequired: policy.passRateRequired,
      policy: policy,
      projectedPassRate: projectedPassRate,
      reasons: summary.isAboveThreshold
        ? []
        : ["Face pass rate is below the required threshold (" + Math.round(summary.passRate * 100) + "%/" + policy.passRateRequired + "%)."],
      status: summary.isAboveThreshold ? "pass" : "fail",
      summary: summary
    };
  }

  function normalizeFaceRows(rows, policy) {
    var list = Array.isArray(rows) ? rows.slice() : rows ? [rows] : [];
    return list.map(function (row) {
      var result = Common.normalizeText(
        Common.firstNonEmpty(row && row.result, row && row.verification, row && row.status)
      );
      var triggered = row && Object.prototype.hasOwnProperty.call(row, "triggered")
        ? Boolean(row.triggered)
        : Boolean(result) || policy.skipCountsAsFail;
      return {
        date: Common.normalizeIsoDate(row && (row.date || row.dateKey)),
        result: result,
        triggered: triggered
      };
    }).filter(function (row) {
      if (!row.triggered) {
        return false;
      }
      if (policy.excludeNoResultDays && !row.result) {
        return false;
      }
      return true;
    });
  }

  function isPass(value) {
    var text = Common.normalizeText(value).toLowerCase();
    return [
      "pass",
      "passed",
      "true",
      "1",
      "valid",
      "\u0646\u0627\u062c\u062d",
      "\u062a\u0645",
      "\u0635\u0627\u0644\u062d"
    ].some(function (entry) {
      return text.indexOf(entry) >= 0;
    });
  }

  return {
    evaluateFaceVerification: evaluateFaceVerification,
    normalizeFaceRows: normalizeFaceRows
  };
});
