(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./performanceCommon.js"),
      require("./performanceRuleResolver.js"),
      require("../lib/deliveryExperienceEngine.js").DeliveryExperienceEngine
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DeliveryExperienceAdapter = factory(
    root.KeetaPortal.PerformanceCommon,
    root.KeetaPortal.PerformanceRuleResolver,
    root.KeetaV6 && root.KeetaV6.DeliveryExperienceEngine
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (Common, RuleResolver, DeliveryExperienceEngine) {
  "use strict";

  var GRADE_ORDER = ["A", "B", "C", "D", "E", "F", "NONE"];

  function evaluateDeliveryExperience(input, rules, options) {
    options = options || {};
    var policy = RuleResolver.getDeliveryExperiencePolicy(rules);
    if (!input || (Array.isArray(input) && !input.length)) {
      return {
        affectsIncentive: policy.affectsIncentive,
        fallbackUsed: !rules || !!rules.fallbackUsed,
        incentive: 0,
        level: "",
        policy: policy,
        reasons: ["No delivery experience record was found for this rider and month."],
        status: "no_data",
        summary: null
      };
    }

    var row = Array.isArray(input) ? selectBestRow(input, options) : input;
    if (Array.isArray(input) && !row && DeliveryExperienceEngine && typeof DeliveryExperienceEngine.buildExperienceRows === "function") {
      row = DeliveryExperienceEngine.buildExperienceRows(input, {
        incentiveByLevel: policy.legacyIncentiveByLevel
      })[0] || null;
    }

    var level = Common.normalizeText(Common.firstNonEmpty(row && row.level, row && row.experienceLevel)).toUpperCase() || "NONE";
    var vehicleType = Common.normalizeVehicleType(Common.firstNonEmpty(row && row.vehicleType, options.vehicleType));
    var minGrade = policy.minGrade || "";
    var meetsGrade = !minGrade || compareGrades(level, minGrade) <= 0;
    var incentive = resolveIncentive(policy, level, vehicleType, row);
    return {
      affectsIncentive: policy.affectsIncentive,
      fallbackUsed: !rules || !!rules.fallbackUsed,
      incentive: incentive,
      level: level,
      policy: policy,
      reasons: meetsGrade
        ? []
        : ["Delivery experience grade is below the required minimum (" + level + "/" + minGrade + ")."],
      status: meetsGrade ? "pass" : "fail",
      summary: row || null
    };
  }

  function compareGrades(left, right) {
    return gradeRank(left) - gradeRank(right);
  }

  function gradeRank(value) {
    var normalized = Common.normalizeText(value).toUpperCase() || "NONE";
    var index = GRADE_ORDER.indexOf(normalized);
    return index >= 0 ? index : GRADE_ORDER.length;
  }

  function resolveIncentive(policy, level, vehicleType, row) {
    if (policy.gradeScores && Object.prototype.hasOwnProperty.call(policy.gradeScores, level)) {
      return Common.parseNumber(policy.gradeScores[level], 0);
    }
    if (row && row.estimatedBonusAmount != null && row.estimatedBonusAmount !== "") {
      return Common.parseNumber(row.estimatedBonusAmount, 0);
    }
    var legacyMap = policy.legacyIncentiveByLevel || {};
    var vehicleMap = legacyMap[vehicleType] || legacyMap.default || {};
    return Common.parseNumber(vehicleMap[level], 0);
  }

  function selectBestRow(rows, options) {
    var riderId = Common.normalizeText(options && options.riderId);
    var userId = Common.normalizeText(options && options.userId);
    var match = (rows || []).filter(function (row) {
      return Common.normalizeText(row && row.riderId) === riderId || Common.normalizeText(row && row.userId) === userId;
    })[0];
    return match || (rows || [])[0] || null;
  }

  return {
    compareGrades: compareGrades,
    evaluateDeliveryExperience: evaluateDeliveryExperience
  };
});
