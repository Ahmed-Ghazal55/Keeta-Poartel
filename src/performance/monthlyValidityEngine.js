(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./performanceCommon.js"),
      require("./performanceRuleResolver.js"),
      require("./dailyPerformanceEngine.js"),
      require("./mandatoryDaysEngine.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.MonthlyValidityEngine = factory(
    root.KeetaPortal.PerformanceCommon,
    root.KeetaPortal.PerformanceRuleResolver,
    root.KeetaPortal.DailyPerformanceEngine,
    root.KeetaPortal.MandatoryDaysEngine
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (Common, RuleResolver, DailyPerformanceEngine, MandatoryDaysEngine) {
  "use strict";

  function calculateMonthlyPerformance(dailyRows, context, rules) {
    context = context || {};
    var rows = (dailyRows || []).map(function (row) {
      return row && row.validDayStatus ? row : DailyPerformanceEngine.calculateDailyPerformance(row, rules);
    });
    var firstRow = rows[0] || {};
    var month = Common.monthKey(context.month || firstRow.month || firstRow.date || (rules && rules.month));
    var mandatorySummary = MandatoryDaysEngine.evaluateMandatoryDays(rows, rules, {
      month: month,
      startDate: context.startDate
    });
    var totalCompletedOrders = rows.reduce(function (sum, row) {
      return sum + Common.parseNumber(Common.firstNonEmpty(row.completedOrders, row.orders, row.deliveredTasks), 0);
    }, 0);
    var totalCancelledOrders = rows.reduce(function (sum, row) {
      return sum + Common.parseNumber(row.cancelledOrders, 0);
    }, 0);
    var totalRejectedOrders = rows.reduce(function (sum, row) {
      return sum + Common.parseNumber(row.rejectedOrders, 0);
    }, 0);
    var totalWorkingHours = rows.reduce(function (sum, row) {
      return sum + Common.parseNumber(row.workingHours, 0);
    }, 0);
    var totalOnlineHours = rows.reduce(function (sum, row) {
      return sum + Common.parseNumber(row.onlineHours, 0);
    }, 0);
    var validDaysCount = rows.filter(function (row) { return row.validDayStatus === "valid"; }).length;
    var invalidDaysCount = rows.filter(function (row) { return row.validDayStatus === "invalid"; }).length;
    var noDataDaysCount = rows.filter(function (row) { return row.validDayStatus === "no_data"; }).length;
    var projectionSummary = buildProjection({
      month: month,
      totalCompletedOrders: totalCompletedOrders,
      totalOrders: totalCompletedOrders,
      validDaysCount: validDaysCount,
      invalidDaysCount: invalidDaysCount,
      noDataDaysCount: noDataDaysCount,
      mandatoryDaysSummary: mandatorySummary,
      vehicleType: Common.normalizeVehicleType(Common.firstNonEmpty(context.vehicleType, firstRow.vehicleType)),
      city: Common.normalizeText(Common.firstNonEmpty(context.city, firstRow.city)),
      register: Common.normalizeRegisterCode(Common.firstNonEmpty(context.register, firstRow.register))
    }, rules, context.today);

    return {
      id: context.id || Common.stableId("performanceMonthly", [
        Common.firstNonEmpty(context.register, firstRow.register, "unknown"),
        Common.firstNonEmpty(context.riderId, firstRow.riderId, firstRow.userId, firstRow.dashboardUserId, "unknown"),
        month || "unknown"
      ]),
      riderId: Common.normalizeText(Common.firstNonEmpty(context.riderId, firstRow.riderId)),
      dashboardUserId: Common.normalizeText(Common.firstNonEmpty(context.dashboardUserId, firstRow.dashboardUserId, firstRow.userId)),
      userId: Common.normalizeText(Common.firstNonEmpty(context.userId, firstRow.userId, firstRow.dashboardUserId)),
      iqama: Common.normalizeText(Common.firstNonEmpty(context.iqama, firstRow.iqama)),
      ownerIqama: Common.normalizeText(Common.firstNonEmpty(context.ownerIqama, firstRow.ownerIqama)),
      ownerName: Common.normalizeText(Common.firstNonEmpty(context.ownerName, firstRow.ownerName)),
      actualRiderIqama: Common.normalizeText(Common.firstNonEmpty(context.actualRiderIqama, firstRow.actualRiderIqama, context.iqama, firstRow.iqama)),
      actualRiderName: Common.normalizeText(Common.firstNonEmpty(context.actualRiderName, firstRow.actualRiderName)),
      actualRiderSource: Common.normalizeText(Common.firstNonEmpty(context.actualRiderSource, firstRow.actualRiderSource, context.riderSource, firstRow.riderSource, "unknown")),
      assignmentId: Common.normalizeText(Common.firstNonEmpty(context.assignmentId, firstRow.assignmentId)),
      assignmentStartDate: Common.normalizeIsoDate(Common.firstNonEmpty(context.assignmentStartDate, firstRow.assignmentStartDate)),
      assignmentEndDate: Common.normalizeIsoDate(Common.firstNonEmpty(context.assignmentEndDate, firstRow.assignmentEndDate)),
      registeredVehicleSerial: Common.normalizeText(Common.firstNonEmpty(context.registeredVehicleSerial, firstRow.registeredVehicleSerial)),
      registeredVehiclePlate: Common.normalizeText(Common.firstNonEmpty(context.registeredVehiclePlate, firstRow.registeredVehiclePlate)),
      actualVehicleSerial: Common.normalizeText(Common.firstNonEmpty(context.actualVehicleSerial, firstRow.actualVehicleSerial)),
      actualVehiclePlate: Common.normalizeText(Common.firstNonEmpty(context.actualVehiclePlate, firstRow.actualVehiclePlate)),
      platform: Common.normalizePlatform(Common.firstNonEmpty(context.platform, firstRow.platform, "keeta")),
      city: Common.normalizeText(Common.firstNonEmpty(context.city, firstRow.city)),
      register: Common.normalizeRegisterCode(Common.firstNonEmpty(context.register, firstRow.register)),
      vehicleType: Common.normalizeVehicleType(Common.firstNonEmpty(context.vehicleType, firstRow.vehicleType)),
      workMode: Common.normalizeWorkMode(Common.firstNonEmpty(context.workMode, firstRow.workMode), Common.firstNonEmpty(context.register, firstRow.register)),
      month: month,
      totalOrders: totalCompletedOrders,
      totalCompletedOrders: totalCompletedOrders,
      totalCancelledOrders: totalCancelledOrders,
      totalRejectedOrders: totalRejectedOrders,
      totalWorkingHours: totalWorkingHours,
      totalOnlineHours: totalOnlineHours,
      validDaysCount: validDaysCount,
      invalidDaysCount: invalidDaysCount,
      noDataDaysCount: noDataDaysCount,
      mandatoryDaysTotal: mandatorySummary.total,
      mandatoryDaysRequired: mandatorySummary.required,
      mandatoryDaysValid: mandatorySummary.valid,
      mandatoryDaysMissed: mandatorySummary.missed,
      mandatoryDaysAllowedMissed: mandatorySummary.allowedMissed,
      projectedValidDays: projectionSummary.projectedValidDays,
      projectedOrders: projectionSummary.projectedOrders,
      projectedEligibility: projectionSummary.canStillQualify ? "possible" : "unlikely",
      vdaStatus: "",
      faceStatus: "",
      deliveryExperienceStatus: "",
      complianceStatus: "",
      validityStatus: rows.length ? "under_review" : "no_data",
      salaryEligibilityStatus: rows.length ? "under_review" : "no_data",
      incentiveEligibilityStatus: rows.length ? "under_review" : "no_data",
      reasons: [],
      warnings: mandatorySummary.warnings.slice(),
      appliedRuleId: rules && rules.appliedRuleId ? rules.appliedRuleId : "",
      appliedRuleVersion: rules && rules.appliedRuleVersion ? rules.appliedRuleVersion : 0,
      fallbackUsed: !!(rules && rules.fallbackUsed),
      calculatedAt: new Date().toISOString(),
      mandatorySummary: mandatorySummary,
      projectionSummary: projectionSummary,
      dailyRows: rows
    };
  }

  function calculateValidityResult(monthlyPerformance, dependencies, rules) {
    dependencies = dependencies || {};
    var salary = evaluateSalaryEligibility(monthlyPerformance, dependencies, rules);
    var incentive = evaluateIncentiveEligibility(monthlyPerformance, dependencies, rules);
    var reasons = buildValidityReasons(monthlyPerformance, dependencies, rules, {
      incentive: incentive,
      salary: salary
    });
    var status = "eligible";
    if (!monthlyPerformance || (!monthlyPerformance.totalCompletedOrders && !monthlyPerformance.validDaysCount && !monthlyPerformance.invalidDaysCount)) {
      status = "no_data";
    } else if (salary.status === "under_review" || incentive.status === "under_review") {
      status = "under_review";
    } else if (salary.status === "not_eligible" || incentive.status === "not_eligible") {
      status = "not_eligible";
    }

    return {
      id: Common.stableId("validityResults", [
        monthlyPerformance && monthlyPerformance.register || "unknown",
        monthlyPerformance && (monthlyPerformance.riderId || monthlyPerformance.userId || monthlyPerformance.dashboardUserId) || "unknown",
        monthlyPerformance && monthlyPerformance.month || "unknown"
      ]),
      riderId: monthlyPerformance.riderId || "",
      dashboardUserId: monthlyPerformance.dashboardUserId || "",
      userId: monthlyPerformance.userId || "",
      iqama: monthlyPerformance.iqama || "",
      platform: monthlyPerformance.platform || "keeta",
      city: monthlyPerformance.city || "",
      register: monthlyPerformance.register || "",
      month: monthlyPerformance.month || "",
      vehicleType: monthlyPerformance.vehicleType || "",
      status: status,
      canonicalStatus: status === "eligible"
        ? "valid"
        : status === "not_eligible"
          ? "invalid"
          : status === "no_data"
            ? "missing_data"
            : "under_review",
      ownerIqama: monthlyPerformance.ownerIqama || "",
      ownerName: monthlyPerformance.ownerName || "",
      actualRiderIqama: monthlyPerformance.actualRiderIqama || monthlyPerformance.iqama || "",
      actualRiderName: monthlyPerformance.actualRiderName || "",
      actualRiderSource: monthlyPerformance.actualRiderSource || monthlyPerformance.riderSource || "unknown",
      assignmentId: monthlyPerformance.assignmentId || "",
      registeredVehicleSerial: monthlyPerformance.registeredVehicleSerial || "",
      registeredVehiclePlate: monthlyPerformance.registeredVehiclePlate || "",
      actualVehicleSerial: monthlyPerformance.actualVehicleSerial || "",
      actualVehiclePlate: monthlyPerformance.actualVehiclePlate || "",
      severity: status === "eligible" ? "ok" : status === "under_review" ? "warning" : status === "no_data" ? "warning" : "critical",
      reasons: reasons.reasons,
      blockingReasons: reasons.blockingReasons,
      nonBlockingWarnings: reasons.nonBlockingWarnings,
      salaryEligibilityStatus: salary.status,
      incentiveEligibilityStatus: incentive.status,
      dailySummary: {
        totalRows: monthlyPerformance.dailyRows ? monthlyPerformance.dailyRows.length : 0,
        validDaysCount: monthlyPerformance.validDaysCount || 0,
        invalidDaysCount: monthlyPerformance.invalidDaysCount || 0,
        noDataDaysCount: monthlyPerformance.noDataDaysCount || 0
      },
      mandatorySummary: monthlyPerformance.mandatorySummary || null,
      faceSummary: dependencies.faceVerificationResult || null,
      vdaSummary: dependencies.vdaResult || null,
      deliveryExperienceSummary: dependencies.deliveryExperienceResult || null,
      complianceSummary: dependencies.complianceResult || null,
      projectionSummary: monthlyPerformance.projectionSummary || null,
      appliedRuleId: monthlyPerformance.appliedRuleId || "",
      appliedRuleVersion: monthlyPerformance.appliedRuleVersion || 0,
      fallbackUsed: !!monthlyPerformance.fallbackUsed,
      source: "performance_validity_engine",
      calculatedAt: new Date().toISOString()
    };
  }

  function evaluateSalaryEligibility(monthlyPerformance, dependencies, rules) {
    dependencies = dependencies || {};
    var vehicleType = Common.normalizeVehicleType(monthlyPerformance && monthlyPerformance.vehicleType);
    var salaryRules = rules && rules.salaryEligibilityRules ? rules.salaryEligibilityRules : {};
    var minimumValidDays = Common.parseNumber(
      salaryRules.minimumValidDays,
      rules && rules.attendanceRules ? rules.attendanceRules.minimumValidDays : 6
    );
    var minimumOrders = vehicleType === "bike"
      ? Common.parseNumber(salaryRules.minimumOrdersBike, 350)
      : Common.parseNumber(salaryRules.minimumOrdersCar, 330);
    var mandatorySummary = monthlyPerformance.mandatorySummary || { met: true };
    var reasons = [];
    var warnings = [];
    var status = "eligible";

    if (dependencies.missingRiderLink) {
      status = "under_review";
      reasons.push("Rider linkage is missing.");
    }
    if ((monthlyPerformance.totalCompletedOrders || 0) < minimumOrders) {
      status = "not_eligible";
      reasons.push("Monthly orders are below the salary threshold.");
    }
    if ((monthlyPerformance.validDaysCount || 0) < minimumValidDays) {
      status = "not_eligible";
      reasons.push("Valid days are below the salary threshold.");
    }
    if (mandatorySummary && mandatorySummary.met === false) {
      status = "not_eligible";
      reasons.push("Mandatory attendance requirements were not met.");
    }
    if (
      dependencies.vdaResult &&
      dependencies.vdaResult.status === "invalid" &&
      dependencies.vdaResult.affectsSalaryEligibility
    ) {
      status = "not_eligible";
      reasons.push("VDA status blocks salary eligibility.");
    }
    if (dependencies.faceVerificationResult && dependencies.faceVerificationResult.status === "fail") {
      status = "not_eligible";
      reasons.push("Face verification pass rate is below target.");
    }
    if (!monthlyPerformance.dailyRows || !monthlyPerformance.dailyRows.length) {
      warnings.push("Daily performance rows are missing, so monthly eligibility may be incomplete.");
      if (status === "eligible") {
        status = "under_review";
      }
    }
    return {
      blockingReasons: reasons.slice(),
      status: status,
      warnings: warnings
    };
  }

  function evaluateIncentiveEligibility(monthlyPerformance, dependencies, rules) {
    dependencies = dependencies || {};
    var reasons = [];
    var warnings = [];
    var status = "eligible";
    var cancellationPolicy = RuleResolver.getCancellationPolicy(rules);
    var ataPolicy = RuleResolver.getAtaPolicy(rules);

    if (dependencies.missingRiderLink) {
      status = "under_review";
      reasons.push("Rider linkage is missing.");
    }
    if (dependencies.deliveryExperienceResult && dependencies.deliveryExperienceResult.status === "fail" && dependencies.deliveryExperienceResult.affectsIncentive) {
      status = "not_eligible";
      reasons.push("Delivery experience grade is below the incentive policy.");
    }
    if (dependencies.vdaResult && dependencies.vdaResult.status === "invalid" && dependencies.vdaResult.affectsValidity) {
      status = "not_eligible";
      reasons.push("VDA status blocks incentive eligibility.");
    }
    if (
      cancellationPolicy.enabled &&
      cancellationPolicy.affectsIncentive &&
      (monthlyPerformance.totalRejectedOrders || 0) > cancellationPolicy.maxRejectsPerDay * Math.max(1, monthlyPerformance.validDaysCount || 1)
    ) {
      status = "not_eligible";
      reasons.push("Rejected orders exceed the cancellation policy.");
    }
    if (
      ataPolicy.enabled &&
      ataPolicy.affectsIncentive &&
      ataPolicy.minScore != null &&
      monthlyPerformance.averageAtaScore != null &&
      monthlyPerformance.averageAtaScore < ataPolicy.minScore
    ) {
      status = "not_eligible";
      reasons.push("ATA score is below the required threshold.");
    }
    if (monthlyPerformance.projectionSummary && monthlyPerformance.projectionSummary.canStillQualify === false && status === "eligible") {
      warnings.push("Current projection suggests the rider may miss the target by month end.");
    }
    return {
      blockingReasons: reasons.slice(),
      status: status,
      warnings: warnings
    };
  }

  function buildValidityReasons(monthlyPerformance, dependencies, rules, evaluations) {
    evaluations = evaluations || {};
    var salary = evaluations.salary || evaluateSalaryEligibility(monthlyPerformance, dependencies, rules);
    var incentive = evaluations.incentive || evaluateIncentiveEligibility(monthlyPerformance, dependencies, rules);
    var blockingReasons = Common.uniqueList(
      (salary.blockingReasons || []).concat(incentive.blockingReasons || [])
    );
    var nonBlockingWarnings = Common.uniqueList(
      (monthlyPerformance.warnings || []).concat(salary.warnings || []).concat(incentive.warnings || [])
    );
    return {
      blockingReasons: blockingReasons,
      nonBlockingWarnings: nonBlockingWarnings,
      reasons: blockingReasons.concat(nonBlockingWarnings)
    };
  }

  function buildProjection(monthlyPerformance, rules, today) {
    return calculateExpectedEndOfMonth(monthlyPerformance, rules, today);
  }

  function calculateExpectedEndOfMonth(monthlyPerformance, rules, today) {
    var referenceDate = Common.normalizeIsoDate(today || new Date().toISOString().slice(0, 10));
    var month = monthlyPerformance && monthlyPerformance.month ? monthlyPerformance.month : "";
    var remainingDays = calculateRemainingDays(month, referenceDate);
    var requiredValidDaysRemaining = calculateRequiredValidDaysRemaining(monthlyPerformance, rules);
    var requiredOrdersRemaining = calculateRequiredOrdersRemaining(monthlyPerformance, rules);
    var vehicleType = Common.normalizeVehicleType(monthlyPerformance && monthlyPerformance.vehicleType);
    var criteria = RuleResolver.getValidDayCriteria(rules, vehicleType);
    var expectedDailyOrders = Math.max(
      criteria.minOrders || 0,
      (monthlyPerformance && monthlyPerformance.validDaysCount)
        ? Math.ceil((monthlyPerformance.totalCompletedOrders || 0) / Math.max(monthlyPerformance.validDaysCount, 1))
        : 0
    );
    var projectedOrders = (monthlyPerformance.totalCompletedOrders || 0) + (remainingDays * expectedDailyOrders);
    var projectedValidDays = (monthlyPerformance.validDaysCount || 0) + remainingDays;
    var mandatoryDates = RuleResolver.getMandatoryDayPolicy(rules, month).mandatoryDates;
    var remainingMandatoryDays = mandatoryDates.filter(function (isoDate) {
      return !referenceDate || isoDate > referenceDate;
    }).length;
    var canStillQualify = projectedValidDays >= ((monthlyPerformance.validDaysCount || 0) + requiredValidDaysRemaining) &&
      projectedOrders >= ((monthlyPerformance.totalCompletedOrders || 0) + requiredOrdersRemaining);
    return {
      canStillQualify: canStillQualify,
      message: canStillQualify
        ? "The rider can still qualify if the remaining days are completed at the current projected pace."
        : "Even a perfect finish would likely miss the remaining target.",
      projectedOrders: projectedOrders,
      projectedValidDays: projectedValidDays,
      remainingDays: remainingDays,
      remainingMandatoryDays: remainingMandatoryDays,
      requiredOrdersRemaining: requiredOrdersRemaining,
      requiredValidDaysRemaining: requiredValidDaysRemaining
    };
  }

  function calculateRemainingDays(month, today) {
    var monthDates = Common.listDatesInMonth(month);
    if (!monthDates.length) {
      return 0;
    }
    var referenceDate = Common.normalizeIsoDate(today || new Date().toISOString().slice(0, 10));
    if (!referenceDate || Common.monthKey(referenceDate) !== Common.monthKey(month)) {
      return monthDates.length;
    }
    return monthDates.filter(function (isoDate) {
      return isoDate > referenceDate;
    }).length;
  }

  function calculateRequiredValidDaysRemaining(summary, rules) {
    var salaryRules = rules && rules.salaryEligibilityRules ? rules.salaryEligibilityRules : {};
    var minimumValidDays = Common.parseNumber(
      salaryRules.minimumValidDays,
      rules && rules.attendanceRules ? rules.attendanceRules.minimumValidDays : 6
    );
    return Math.max(0, minimumValidDays - Common.parseNumber(summary && summary.validDaysCount, 0));
  }

  function calculateRequiredOrdersRemaining(summary, rules) {
    var salaryRules = rules && rules.salaryEligibilityRules ? rules.salaryEligibilityRules : {};
    var vehicleType = Common.normalizeVehicleType(summary && summary.vehicleType);
    var minimumOrders = vehicleType === "bike"
      ? Common.parseNumber(salaryRules.minimumOrdersBike, 350)
      : Common.parseNumber(salaryRules.minimumOrdersCar, 330);
    return Math.max(0, minimumOrders - Common.parseNumber(summary && summary.totalCompletedOrders, 0));
  }

  function buildPerformanceIssues(monthlyPerformance, validityResult, dependencies) {
    dependencies = dependencies || {};
    var issues = [];
    var riderKey = Common.firstNonEmpty(
      monthlyPerformance && monthlyPerformance.riderId,
      monthlyPerformance && monthlyPerformance.userId,
      monthlyPerformance && monthlyPerformance.dashboardUserId,
      monthlyPerformance && monthlyPerformance.iqama,
      "unknown"
    );
    if (dependencies.missingRiderLink) {
      issues.push(buildIssue(monthlyPerformance, riderKey, "missing_rider_link", "high", "missing_rider_link", "Performance rows could not be linked to a rider profile.", "Review dashboard user, assignment, or HR linkage."));
    }
    if (monthlyPerformance && monthlyPerformance.mandatorySummary && monthlyPerformance.mandatorySummary.met === false) {
      issues.push(buildIssue(monthlyPerformance, riderKey, "mandatory_days", "medium", "mandatory_days_missed", "Mandatory attendance requirements were not met.", "Follow up with operations before monthly closing."));
    }
    if (dependencies.faceVerificationResult && dependencies.faceVerificationResult.status === "fail") {
      issues.push(buildIssue(monthlyPerformance, riderKey, "face_verification", "medium", "face_verification_failed", "Face verification pass rate is below the active rule.", "Review the face verification report and rider compliance."));
    }
    if (dependencies.vdaResult && dependencies.vdaResult.status === "invalid") {
      issues.push(buildIssue(monthlyPerformance, riderKey, "vda", "high", "vda_invalid", "VDA result is invalid for this rider.", "Check VDA report and validity blockers."));
    }
    if (dependencies.deliveryExperienceResult && dependencies.deliveryExperienceResult.status === "fail") {
      issues.push(buildIssue(monthlyPerformance, riderKey, "delivery_experience", "low", "delivery_experience_below_min", "Delivery experience grade is below the configured minimum.", "Review quality KPIs before incentive export."));
    }
    if (validityResult && validityResult.status === "no_data") {
      issues.push(buildIssue(monthlyPerformance, riderKey, "no_data", "medium", "missing_performance_data", "No daily performance rows were found for monthly validation.", "Import daily performance before recalculating."));
    }
    return issues;
  }

  function buildIssue(monthlyPerformance, riderKey, issueType, severity, reasonCode, message, recommendedAction) {
    return {
      id: Common.stableId("performanceIssue", [
        monthlyPerformance && monthlyPerformance.month || "unknown",
        riderKey,
        issueType
      ]),
      riderId: monthlyPerformance && monthlyPerformance.riderId || "",
      dashboardUserId: monthlyPerformance && monthlyPerformance.dashboardUserId || "",
      userId: monthlyPerformance && monthlyPerformance.userId || "",
      iqama: monthlyPerformance && monthlyPerformance.iqama || "",
      platform: monthlyPerformance && monthlyPerformance.platform || "keeta",
      city: monthlyPerformance && monthlyPerformance.city || "",
      register: monthlyPerformance && monthlyPerformance.register || "",
      month: monthlyPerformance && monthlyPerformance.month || "",
      issueType: issueType,
      issueCode: reasonCode,
      sourceModule: issueType === "no_data" ? "validity" : "performance",
      entityType: "performance_issue",
      entityId: monthlyPerformance && monthlyPerformance.id || riderKey,
      severity: severity,
      reasonCode: reasonCode,
      message: message,
      recommendedAction: recommendedAction,
      relatedDate: "",
      relatedEntity: "validityResults",
      ownerIqama: monthlyPerformance && monthlyPerformance.ownerIqama || "",
      actualRiderIqama: monthlyPerformance && monthlyPerformance.actualRiderIqama || "",
      assignmentId: monthlyPerformance && monthlyPerformance.assignmentId || "",
      vehicleSerial: monthlyPerformance && (monthlyPerformance.actualVehicleSerial || monthlyPerformance.registeredVehicleSerial) || "",
      date: monthlyPerformance && monthlyPerformance.performanceDate || "",
      linkedPage: "performance-shell",
      linkedSubPage: "issues",
      linkedFilters: {
        month: monthlyPerformance && monthlyPerformance.month || "",
        dashboardUserId: monthlyPerformance && monthlyPerformance.dashboardUserId || ""
      },
      linkedDrawer: {
        entityId: monthlyPerformance && monthlyPerformance.id || "",
        mode: "details"
      },
      resolved: false,
      resolvedBy: "",
      resolvedAt: "",
      createdAt: new Date().toISOString()
    };
  }

  return {
    buildPerformanceIssues: buildPerformanceIssues,
    buildProjection: buildProjection,
    buildValidityReasons: buildValidityReasons,
    calculateExpectedEndOfMonth: calculateExpectedEndOfMonth,
    calculateMonthlyPerformance: calculateMonthlyPerformance,
    calculateRemainingDays: calculateRemainingDays,
    calculateRequiredOrdersRemaining: calculateRequiredOrdersRemaining,
    calculateRequiredValidDaysRemaining: calculateRequiredValidDaysRemaining,
    calculateValidityResult: calculateValidityResult,
    evaluateIncentiveEligibility: evaluateIncentiveEligibility,
    evaluateSalaryEligibility: evaluateSalaryEligibility
  };
});
