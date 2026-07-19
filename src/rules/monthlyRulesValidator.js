(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./monthlyRulesDefaults.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.MonthlyRulesValidator = factory(
    root.KeetaPortal.MonthlyRulesDefaults
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (MonthlyRulesDefaults) {
  "use strict";

  var createDefaultMonthlyRule = MonthlyRulesDefaults.createDefaultMonthlyRule;
  var deepMerge = MonthlyRulesDefaults.deepMerge;

  var ALLOWED_PLATFORMS = ["all", "keeta", "ninja", "jahez", "chefz", "hungerstation", "amazon"];
  var ALLOWED_SCOPES = ["all", "single", "multi"];
  var ALLOWED_VALID_DAY_MODES = ["orders_only", "hours_only", "orders_or_hours", "orders_and_hours"];

  function validateMonthlyRules(rules, options) {
    options = options || {};
    var normalized = deepMerge({}, createDefaultMonthlyRule(), rules || {});
    var issues = [];
    var existingRules = options.existingRules || [];

    function addIssue(code, severity, message, path) {
      issues.push({
        code: code,
        severity: severity,
        message: message,
        path: path || ""
      });
    }

    if (!/^\d{4}-\d{2}$/.test(String(normalized.month || ""))) {
      addIssue("missing_month", "blocking", "Month is required and must use YYYY-MM format.", "month");
    }
    if (ALLOWED_PLATFORMS.indexOf(String(normalized.platform || "")) < 0) {
      addIssue("invalid_platform", "blocking", "Platform is invalid.", "platform");
    }
    if (ALLOWED_SCOPES.indexOf(String(normalized.cityScope || "")) < 0) {
      addIssue("invalid_city_scope", "blocking", "City scope is invalid.", "cityScope");
    }
    if (ALLOWED_SCOPES.indexOf(String(normalized.registerScope || "")) < 0) {
      addIssue("invalid_register_scope", "blocking", "Register scope is invalid.", "registerScope");
    }

    validateScope("city", normalized.cityScope, normalized.selectedCities, addIssue);
    validateScope("register", normalized.registerScope, normalized.selectedRegisters, addIssue);

    if (normalized.validDayRules && normalized.validDayRules.enabled) {
      if (ALLOWED_VALID_DAY_MODES.indexOf(String(normalized.validDayRules.validDayMode || "")) < 0) {
        addIssue("invalid_valid_day_mode", "blocking", "Valid day mode is invalid.", "validDayRules.validDayMode");
      }
      var hasOrderCriteria = toNumber(normalized.validDayRules.minOrdersCar) > 0 || toNumber(normalized.validDayRules.minOrdersBike) > 0;
      var hasHourCriteria = toNumber(normalized.validDayRules.minWorkingHoursCar) > 0 || toNumber(normalized.validDayRules.minWorkingHoursBike) > 0 || toNumber(normalized.validDayRules.minOnlineHours) > 0;
      if (!hasOrderCriteria && !hasHourCriteria) {
        addIssue("missing_valid_day_criteria", "blocking", "Valid day rules must define minimum orders or minimum hours.", "validDayRules");
      }
    }

    if (normalized.mandatoryDaysRules && normalized.mandatoryDaysRules.enabled) {
      var mandatoryDates = uniqueStrings(normalized.mandatoryDaysRules.mandatoryDates);
      var requiredMandatoryDays = toNumber(normalized.mandatoryDaysRules.minRequiredValidMandatoryDays);
      if (mandatoryDates.length && requiredMandatoryDays > mandatoryDates.length) {
        addIssue("mandatory_days_overflow", "blocking", "Required valid mandatory days cannot exceed defined mandatory dates.", "mandatoryDaysRules.minRequiredValidMandatoryDays");
      }
      mandatoryDates.forEach(function (dateValue) {
        if (!isIsoDate(dateValue)) {
          addIssue("invalid_mandatory_date", "medium", "One or more mandatory dates are not valid ISO dates.", "mandatoryDaysRules.mandatoryDates");
          return;
        }
        if (normalized.month && dateValue.slice(0, 7) !== normalized.month) {
          addIssue("mandatory_date_outside_month", "low", "Mandatory dates should normally remain inside the selected month.", "mandatoryDaysRules.mandatoryDates");
        }
      });
    }

    validateTiers(normalized.incentiveRules && normalized.incentiveRules.carTiers, "incentiveRules.carTiers", addIssue);
    validateTiers(normalized.incentiveRules && normalized.incentiveRules.bikeTiers, "incentiveRules.bikeTiers", addIssue);

    if (normalized.incentiveRules && normalized.incentiveRules.companyCommission && normalized.incentiveRules.companyCommission.enabled && String(normalized.incentiveRules.companyCommission.type || "") === "percent") {
      if (toNumber(normalized.incentiveRules.companyCommission.value) < 0 || toNumber(normalized.incentiveRules.companyCommission.value) > 100) {
        addIssue("invalid_commission_percent", "blocking", "Company commission percent must be between 0 and 100.", "incentiveRules.companyCommission.value");
      }
    }

    if (normalized.faceVerificationRules && normalized.faceVerificationRules.enabled) {
      if (toNumber(normalized.faceVerificationRules.passRateRequired) < 0 || toNumber(normalized.faceVerificationRules.passRateRequired) > 100) {
        addIssue("invalid_face_pass_rate", "blocking", "Face pass rate must be between 0 and 100.", "faceVerificationRules.passRateRequired");
      }
    }

    if (options.mode === "activate" || String(normalized.status || "") === "active") {
      var duplicateActiveRule = (existingRules || []).filter(function (item) {
        return item && item.id !== normalized.id && String(item.status || "") === "active" && buildScopeSignature(item) === buildScopeSignature(normalized);
      })[0] || null;
      if (duplicateActiveRule) {
        addIssue("duplicate_active_rule", "blocking", "Another active rule already exists for the same month/platform/scope.", "status");
      }
    }

    if (options.lockedUpdate && !options.allowLockedUpdate) {
      addIssue("locked_rule_update_rejected", "blocking", "Locked rules cannot be updated without monthlyRules.unlock permission.", "status");
    }

    return finalizeValidation(issues);
  }

  function buildScopeSignature(rule) {
    return [
      String(rule.month || ""),
      String(rule.platform || ""),
      String(rule.cityScope || "all"),
      uniqueStrings(rule.selectedCities).sort().join("|"),
      String(rule.registerScope || "all"),
      uniqueStrings(rule.selectedRegisters).sort().join("|")
    ].join("::");
  }

  function finalizeValidation(issues) {
    var blockingIssues = issues.filter(function (item) {
      return item.severity === "blocking";
    });
    return {
      isValid: blockingIssues.length === 0,
      issues: issues,
      blockingIssues: blockingIssues,
      summary: {
        total: issues.length,
        blocking: blockingIssues.length,
        high: issues.filter(bySeverity("high")).length,
        medium: issues.filter(bySeverity("medium")).length,
        low: issues.filter(bySeverity("low")).length,
        info: issues.filter(bySeverity("info")).length
      }
    };
  }

  function bySeverity(severity) {
    return function (item) {
      return item.severity === severity;
    };
  }

  function validateScope(kind, scope, values, addIssue) {
    var selectedValues = uniqueStrings(values);
    if (scope === "single" && selectedValues.length !== 1) {
      addIssue("invalid_" + kind + "_single_scope", "blocking", capitalize(kind) + " scope is single but exactly one selection was not provided.", "selected" + capitalize(kind) + "s");
    }
    if (scope === "multi" && selectedValues.length < 2) {
      addIssue("invalid_" + kind + "_multi_scope", "blocking", capitalize(kind) + " scope is multi but fewer than two selections were provided.", "selected" + capitalize(kind) + "s");
    }
    if (scope !== "all" && !selectedValues.length) {
      addIssue("missing_" + kind + "_scope_values", "blocking", "At least one " + kind + " must be selected when scope is not all.", "selected" + capitalize(kind) + "s");
    }
  }

  function validateTiers(tiers, path, addIssue) {
    var sorted = (tiers || []).map(function (item, index) {
      return {
        maxOrders: item && item.maxOrders == null ? null : toNumber(item && item.maxOrders),
        minOrders: toNumber(item && item.minOrders),
        rate: toNumber(item && item.rate),
        index: index
      };
    }).sort(function (left, right) {
      return left.minOrders - right.minOrders;
    });

    sorted.forEach(function (tier) {
      if (tier.maxOrders != null && tier.minOrders > tier.maxOrders) {
        addIssue("tier_min_gt_max", "blocking", "Tier minOrders cannot be greater than maxOrders.", path + "[" + tier.index + "]");
      }
    });

    for (var index = 0; index < sorted.length - 1; index += 1) {
      var current = sorted[index];
      var next = sorted[index + 1];
      if (current.maxOrders == null) {
        addIssue("tier_open_end_overlap", "blocking", "An open-ended tier must be the last tier.", path + "[" + current.index + "]");
        continue;
      }
      if (next.minOrders <= current.maxOrders) {
        addIssue("overlapping_tiers", "blocking", "Tier ranges overlap.", path);
      }
    }
  }

  function isIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  }

  function uniqueStrings(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = String(value == null ? "" : value).trim();
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    }).map(function (value) {
      return String(value).trim();
    });
  }

  function toNumber(value) {
    var numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function capitalize(value) {
    return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
  }

  return {
    ALLOWED_PLATFORMS: ALLOWED_PLATFORMS,
    buildScopeSignature: buildScopeSignature,
    validateMonthlyRules: validateMonthlyRules
  };
});
