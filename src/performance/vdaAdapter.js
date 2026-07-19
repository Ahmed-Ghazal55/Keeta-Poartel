(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./performanceCommon.js"),
      require("./performanceRuleResolver.js"),
      require("../lib/vdaEngine.js").VdaEngine
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.VdaAdapter = factory(
    root.KeetaPortal.PerformanceCommon,
    root.KeetaPortal.PerformanceRuleResolver,
    root.KeetaV6 && root.KeetaV6.VdaEngine
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (Common, RuleResolver, VdaEngine) {
  "use strict";

  function evaluateVdaResult(input, rules, options) {
    options = options || {};
    var policy = RuleResolver.getVdaPolicy(rules);
    if (!input || (Array.isArray(input) && !input.length)) {
      return {
        affectsSalaryEligibility: policy.affectsSalaryEligibility,
        affectsValidity: policy.affectsValidity,
        fallbackUsed: !rules || !!rules.fallbackUsed,
        policy: policy,
        reasons: ["No VDA result was found for this rider and month."],
        status: "no_data",
        summary: null
      };
    }

    var row = Array.isArray(input) ? input[0] : input;
    var summary = null;
    var normalizedStatus = normalizeStatus(row && Common.firstNonEmpty(row.status, row.finalStatus, row.vda));

    if (!normalizedStatus && VdaEngine && typeof VdaEngine.evaluateRiderVda === "function") {
      summary = VdaEngine.evaluateRiderVda(row, {
        dailyTargetByVehicleType: policy.dailyTargetByVehicleType,
        minimumFaceRate: policy.minimumFaceRate,
        minimumValidDays: policy.minimumValidDays,
        reportDate: options.reportDate || new Date()
      });
      normalizedStatus = summary.finalStatus === "Valid" ? "valid" : "invalid";
    }

    var isValid = policy.requiredStatus.indexOf(normalizedStatus) >= 0;
    var isInvalid = policy.invalidStatuses.indexOf(normalizedStatus) >= 0;
    return {
      affectsSalaryEligibility: policy.affectsSalaryEligibility,
      affectsValidity: policy.affectsValidity,
      fallbackUsed: !rules || !!rules.fallbackUsed,
      normalizedStatus: normalizedStatus,
      policy: policy,
      reasons: isValid
        ? []
        : ["VDA status is not acceptable for monthly validity (" + (normalizedStatus || "unknown") + ")."],
      status: isValid ? "valid" : isInvalid ? "invalid" : "under_review",
      summary: summary
    };
  }

  function normalizeStatus(value) {
    return Common.normalizeText(value).toLowerCase();
  }

  return {
    evaluateVdaResult: evaluateVdaResult
  };
});
