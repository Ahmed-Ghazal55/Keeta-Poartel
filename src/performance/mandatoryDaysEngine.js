(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./performanceCommon.js"),
      require("./performanceRuleResolver.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.MandatoryDaysEngine = factory(
    root.KeetaPortal.PerformanceCommon,
    root.KeetaPortal.PerformanceRuleResolver
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (Common, RuleResolver) {
  "use strict";

  function getMandatoryDatesForMonth(rules, month) {
    return RuleResolver.expandMandatoryDates(rules, month);
  }

  function evaluateMandatoryDays(dailyRows, rules, options) {
    options = options || {};
    var rows = (dailyRows || []).slice();
    var month = Common.monthKey(
      options.month ||
      firstOf(rows, "month") ||
      firstOf(rows, "date") ||
      firstOf(rows, "dateKey") ||
      (rules && rules.month)
    );
    var dates = getMandatoryDatesForMonth(rules, month);
    var policy = RuleResolver.getMandatoryDayPolicy(rules, month);
    if (!policy.enabled || !dates.length) {
      return {
        allowedMissed: 0,
        dates: [],
        effectiveDates: [],
        invalid: 0,
        met: true,
        missed: 0,
        noData: 0,
        reasons: [],
        required: 0,
        total: 0,
        valid: 0,
        warnings: []
      };
    }

    var rowByDate = {};
    rows.forEach(function (row) {
      var date = Common.normalizeIsoDate(row && (row.date || row.dateKey));
      if (!date) {
        return;
      }
      rowByDate[date] = row;
    });

    var startDate = Common.normalizeIsoDate(options.startDate || inferStartDate(rows));
    var firstMonthDate = month ? month + "-01" : "";
    var excusedDates = startDate && firstMonthDate && startDate > firstMonthDate
      ? dates.filter(function (isoDate) {
          return isoDate < startDate && !rowByDate[isoDate];
        })
      : [];
    var effectiveDates = dates.filter(function (isoDate) {
      return excusedDates.indexOf(isoDate) < 0;
    });

    var counts = {
      invalid: 0,
      noData: 0,
      valid: 0
    };

    effectiveDates.forEach(function (isoDate) {
      var row = rowByDate[isoDate];
      var status = Common.normalizeText(row && row.mandatoryDayStatus);
      if (!row || status === "no_data" || status === "") {
        counts.noData += 1;
        return;
      }
      if (status === "mandatory_valid") {
        counts.valid += 1;
        return;
      }
      counts.invalid += 1;
    });

    var required = Common.parseNumber(policy.minRequiredValidMandatoryDays, effectiveDates.length);
    if (required <= 0) {
      required = effectiveDates.length;
    }
    required = Math.min(required, effectiveDates.length);
    var allowedMissed = Common.parseNumber(
      policy.allowMissedMandatoryDays,
      Math.max(0, effectiveDates.length - required)
    );
    var summary = {
      allowedMissed: allowedMissed,
      dates: dates,
      effectiveDates: effectiveDates,
      excusedDates: excusedDates,
      invalid: counts.invalid,
      met: false,
      missed: Math.max(effectiveDates.length - counts.valid, 0),
      noData: counts.noData,
      reasons: [],
      required: required,
      startedAfterMonthStart: excusedDates.length > 0,
      total: effectiveDates.length,
      valid: counts.valid,
      warnings: []
    };
    summary.met = isMandatoryRequirementMet(summary, rules);
    summary.reasons = buildMandatoryDayReasons(summary, rules);
    if (summary.startedAfterMonthStart) {
      summary.warnings.push("Rider appears to have started after the month began. Early mandatory days were excused.");
    }
    return summary;
  }

  function countValidMandatoryDays(dailyRows, rules) {
    return evaluateMandatoryDays(dailyRows, rules).valid;
  }

  function countMissedMandatoryDays(dailyRows, rules) {
    return evaluateMandatoryDays(dailyRows, rules).missed;
  }

  function isMandatoryRequirementMet(summary, rules) {
    var normalized = summary && summary.total != null ? summary : evaluateMandatoryDays(summary, rules);
    if (!normalized.total) {
      return true;
    }
    return normalized.valid >= normalized.required && normalized.missed <= normalized.allowedMissed;
  }

  function buildMandatoryDayReasons(summary, rules) {
    var normalized = summary && summary.total != null ? summary : evaluateMandatoryDays(summary, rules);
    if (!normalized.total) {
      return [];
    }
    if (normalized.met) {
      return [
        "Mandatory attendance met (" + normalized.valid + "/" + normalized.total + ")."
      ];
    }
    var reasons = [];
    if (normalized.valid < normalized.required) {
      reasons.push("Valid mandatory days are below the required threshold (" + normalized.valid + "/" + normalized.required + ").");
    }
    if (normalized.missed > normalized.allowedMissed) {
      reasons.push("Missed mandatory days exceed the allowed grace (" + normalized.missed + "/" + normalized.allowedMissed + ").");
    }
    if (normalized.noData > 0) {
      reasons.push("Some mandatory dates have no daily performance data.");
    }
    return reasons;
  }

  function inferStartDate(rows) {
    var dates = (rows || []).map(function (row) {
      return Common.normalizeIsoDate(row && (row.date || row.dateKey));
    }).filter(Boolean).sort();
    return dates[0] || "";
  }

  function firstOf(rows, key) {
    for (var index = 0; index < (rows || []).length; index += 1) {
      var value = rows[index] && rows[index][key];
      if (value != null && String(value) !== "") {
        return value;
      }
    }
    return "";
  }

  return {
    buildMandatoryDayReasons: buildMandatoryDayReasons,
    countMissedMandatoryDays: countMissedMandatoryDays,
    countValidMandatoryDays: countValidMandatoryDays,
    evaluateMandatoryDays: evaluateMandatoryDays,
    getMandatoryDatesForMonth: getMandatoryDatesForMonth,
    isMandatoryRequirementMet: isMandatoryRequirementMet
  };
});
