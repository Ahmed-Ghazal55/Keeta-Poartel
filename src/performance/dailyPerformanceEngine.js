(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./performanceCommon.js"),
      require("./performanceRuleResolver.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DailyPerformanceEngine = factory(
    root.KeetaPortal.PerformanceCommon,
    root.KeetaPortal.PerformanceRuleResolver
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (Common, RuleResolver) {
  "use strict";

  function normalizeDailyPerformanceRows(rawRows, context) {
    context = context || {};
    var rows = (rawRows || []).map(function (row) {
      var date = Common.normalizeIsoDate(row && (row.date || row.dateKey)) || "";
      var month = Common.monthKey(row && row.month ? row.month : date);
      var orders = Common.parseNumber(Common.firstNonEmpty(row && row.orders, row && row.completedOrders, row && row.deliveredTasks), 0);
      return Common.mergeObjects({}, row || {}, {
        date: date,
        dateKey: Common.normalizeDateKey(date),
        month: month,
        platform: Common.normalizePlatform(Common.firstNonEmpty(row && row.platform, context.platform, "keeta")),
        city: Common.normalizeText(Common.firstNonEmpty(row && row.city, context.city)),
        register: Common.normalizeRegisterCode(Common.firstNonEmpty(row && row.register, context.register)),
        vehicleType: Common.normalizeVehicleType(Common.firstNonEmpty(row && row.vehicleType, context.vehicleType)),
        workMode: Common.normalizeWorkMode(Common.firstNonEmpty(row && row.workMode, context.workMode), Common.firstNonEmpty(row && row.register, context.register)),
        dashboardUserId: Common.normalizeText(Common.firstNonEmpty(row && row.dashboardUserId, row && row.userId)),
        userId: Common.normalizeText(Common.firstNonEmpty(row && row.userId, row && row.dashboardUserId, row && row.riderId)),
        riderId: Common.normalizeText(Common.firstNonEmpty(row && row.riderId)),
        iqama: Common.normalizeText(row && row.iqama),
        orders: orders,
        completedOrders: Common.parseNumber(Common.firstNonEmpty(row && row.completedOrders, row && row.orders, row && row.deliveredTasks), orders),
        deliveredTasks: Common.parseNumber(Common.firstNonEmpty(row && row.deliveredTasks, row && row.completedOrders, row && row.orders), orders),
        cancelledOrders: Common.parseNumber(Common.firstNonEmpty(row && row.cancelledOrders, row && row.cancellations), 0),
        rejectedOrders: Common.parseNumber(Common.firstNonEmpty(row && row.rejectedOrders, row && row.rejects), 0),
        workingHours: Common.parseNumber(Common.firstNonEmpty(row && row.workingHours, row && row.onlineHours), 0),
        onlineHours: Common.parseNumber(Common.firstNonEmpty(row && row.onlineHours, row && row.workingHours), 0),
        ataScore: row && row.ataScore == null ? null : Common.parseNumber(row.ataScore, 0),
        lateCount: Common.parseNumber(row && row.lateCount, 0),
        cancellationRate: row && row.cancellationRate == null ? null : Common.parseNumber(row.cancellationRate, 0),
        attendanceStatus: Common.normalizeText(row && row.attendanceStatus) || "",
        sourceSheet: Common.normalizeText(row && row.sourceSheet),
        sourceRow: Common.parseNumber(row && row.sourceRow, 0),
        importBatchId: Common.normalizeText(row && row.importBatchId),
        validDayReasons: Array.isArray(row && row.validDayReasons) ? row.validDayReasons.slice() : []
      });
    });

    if (!context.rules) {
      return rows;
    }
    return rows.map(function (row) {
      return calculateDailyPerformance(row, context.rules);
    });
  }

  function calculateDailyPerformance(row, rules) {
    var normalized = normalizeDailyPerformanceRows([row], {})[0] || {};
    var validDetail = evaluateValidDay(normalized, rules, normalized.vehicleType);
    var baseWithStatus = Common.mergeObjects({}, normalized, {
      validDayStatus: validDetail.status,
      validDayReasons: validDetail.reasons.slice()
    });
    var mandatoryDetail = evaluateMandatoryDay(baseWithStatus, rules);
    return Common.mergeObjects({}, normalized, {
      attendanceStatus: normalized.attendanceStatus || inferAttendanceStatus(normalized),
      validDayStatus: validDetail.status,
      validDayReasons: validDetail.reasons.slice(),
      mandatoryDayStatus: mandatoryDetail.status,
      mandatoryDayReasons: mandatoryDetail.reasons.slice()
    });
  }

  function isValidDay(row, rules, vehicleType) {
    return evaluateValidDay(row, rules, vehicleType).status === "valid";
  }

  function isMandatoryDate(date, rules) {
    var month = Common.monthKey(date);
    var policy = RuleResolver.getMandatoryDayPolicy(rules, month);
    return policy.mandatoryDates.indexOf(Common.normalizeIsoDate(date)) >= 0;
  }

  function evaluateMandatoryDay(row, rules) {
    var normalized = normalizeDailyPerformanceRows([row], {})[0] || {};
    var policy = RuleResolver.getMandatoryDayPolicy(rules, normalized.month);
    if (!policy.enabled || !normalized.date || policy.mandatoryDates.indexOf(normalized.date) < 0) {
      return {
        isMandatory: false,
        reasons: [],
        status: "not_mandatory"
      };
    }
    if (!hasAnyPerformanceData(normalized)) {
      return {
        isMandatory: true,
        reasons: ["No performance data is available for this mandatory date."],
        status: "no_data"
      };
    }
    var mandatoryOrderTarget = Common.parseNumber(
      rules && rules.orderRules && rules.orderRules.mandatoryDayMinOrders,
      0
    );
    var completedOrders = Common.parseNumber(
      Common.firstNonEmpty(normalized.completedOrders, normalized.orders, normalized.deliveredTasks),
      0
    );
    var validDetail = normalized.validDayStatus
      ? { status: normalized.validDayStatus, reasons: normalized.validDayReasons || [] }
      : evaluateValidDay(normalized, rules, normalized.vehicleType);
    var isValid = mandatoryOrderTarget > 0
      ? completedOrders >= mandatoryOrderTarget
      : validDetail.status === "valid";
    return {
      isMandatory: true,
      reasons: isValid
        ? []
        : ["Mandatory day target was not met (" + completedOrders + "/" + mandatoryOrderTarget + " orders)."],
      status: isValid ? "mandatory_valid" : "mandatory_invalid"
    };
  }

  function buildDailyReasons(row, rules) {
    var calculated = calculateDailyPerformance(row, rules);
    return Common.uniqueList((calculated.validDayReasons || []).concat(calculated.mandatoryDayReasons || []));
  }

  function evaluateValidDay(row, rules, vehicleType) {
    var normalized = normalizeDailyPerformanceRows([row], {})[0] || {};
    var criteria = RuleResolver.getValidDayCriteria(rules, vehicleType || normalized.vehicleType);
    if (!criteria.enabled) {
      return {
        criteria: criteria,
        hasData: hasAnyPerformanceData(normalized),
        reasons: [],
        status: "valid"
      };
    }

    if (!hasAnyPerformanceData(normalized)) {
      return {
        criteria: criteria,
        hasData: false,
        reasons: ["No daily performance data is available."],
        status: "no_data"
      };
    }

    var orders = Common.parseNumber(Common.firstNonEmpty(normalized.completedOrders, normalized.orders, normalized.deliveredTasks), 0);
    var workingHours = Common.parseNumber(Common.firstNonEmpty(normalized.workingHours, normalized.onlineHours), 0);
    var onlineHours = Common.parseNumber(Common.firstNonEmpty(normalized.onlineHours, normalized.workingHours), 0);
    var ordersOk = criteria.minOrders <= 0 ? true : orders >= criteria.minOrders;
    var hoursTarget = criteria.minOnlineHours == null ? criteria.minWorkingHours : criteria.minOnlineHours;
    var hoursActual = criteria.minOnlineHours == null ? workingHours : onlineHours;
    var hoursOk = hoursTarget <= 0 ? true : hoursActual >= hoursTarget;
    var reasons = [];
    var passed = false;

    if (criteria.validDayMode === "orders_only") {
      passed = ordersOk;
    } else if (criteria.validDayMode === "hours_only") {
      passed = hoursOk;
    } else if (criteria.validDayMode === "orders_and_hours") {
      passed = ordersOk && hoursOk;
    } else {
      passed = ordersOk || hoursOk;
    }

    if (!ordersOk && (criteria.validDayMode === "orders_only" || criteria.validDayMode === "orders_or_hours" || criteria.validDayMode === "orders_and_hours")) {
      reasons.push("Orders are below the valid-day target (" + orders + "/" + criteria.minOrders + ").");
    }
    if (!hoursOk && (criteria.validDayMode === "hours_only" || criteria.validDayMode === "orders_or_hours" || criteria.validDayMode === "orders_and_hours")) {
      reasons.push("Hours are below the valid-day target (" + hoursActual + "/" + hoursTarget + ").");
    }

    return {
      criteria: criteria,
      hasData: true,
      reasons: passed ? [] : reasons,
      status: passed ? "valid" : "invalid"
    };
  }

  function hasAnyPerformanceData(row) {
    if (!row) {
      return false;
    }
    return [
      row.orders,
      row.completedOrders,
      row.deliveredTasks,
      row.cancelledOrders,
      row.rejectedOrders,
      row.workingHours,
      row.onlineHours,
      row.ataScore,
      row.lateCount
    ].some(function (value) {
      return value != null && String(value) !== "";
    });
  }

  function inferAttendanceStatus(row) {
    return hasAnyPerformanceData(row) ? "present" : "no_data";
  }

  return {
    buildDailyReasons: buildDailyReasons,
    calculateDailyPerformance: calculateDailyPerformance,
    evaluateMandatoryDay: evaluateMandatoryDay,
    isMandatoryDate: isMandatoryDate,
    isValidDay: isValidDay,
    normalizeDailyPerformanceRows: normalizeDailyPerformanceRows
  };
});
