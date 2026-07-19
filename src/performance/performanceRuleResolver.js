(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./performanceCommon.js"),
      require("../rules/monthlyRulesDefaults.js"),
      require("../../keeta_operations_portal_logic.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.PerformanceRuleResolver = factory(
    root.KeetaPortal.PerformanceCommon,
    root.KeetaPortal.MonthlyRulesDefaults,
    root.KeetaPortal
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (Common, MonthlyRulesDefaults, LegacyPortal) {
  "use strict";

  var createDefaultMonthlyRule = MonthlyRulesDefaults.createDefaultMonthlyRule;
  var deepMerge = MonthlyRulesDefaults.deepMerge;

  var SECTION_KEYS = [
    "validDayRules",
    "mandatoryDaysRules",
    "vehicleRules",
    "incentiveRules",
    "attendanceRules",
    "orderRules",
    "ataRules",
    "cancellationRules",
    "faceVerificationRules",
    "vdaRules",
    "deliveryExperienceRules",
    "complianceRules",
    "salaryEligibilityRules"
  ];

  function resolvePerformanceRules(input) {
    input = input || {};
    var month = Common.monthKey(input.month || input.date || new Date().toISOString().slice(0, 7));
    var city = Common.normalizeText(input.city || pickSingle(input.globalContext && input.globalContext.selectedCities));
    var register = Common.normalizeRegisterCode(input.register || pickSingle(input.globalContext && input.globalContext.selectedRegisters));
    var platform = Common.normalizePlatform(
      input.platform ||
      input.selectedPlatform ||
      (input.globalContext && (input.globalContext.platform || input.globalContext.selectedPlatform)) ||
      "keeta"
    );
    var fallbackRules = buildFallbackRulesFromLegacyConfig({
      month: month,
      platform: platform,
      city: city,
      register: register
    });
    var service = input.monthlyRulesService || input.service || null;
    var resolvedRule = null;
    var matches = [];

    if (service && typeof service.resolveRulesForContext === "function") {
      var context = buildResolverContext(input.globalContext, {
        city: city,
        register: register,
        platform: platform
      });
      var resolved = service.resolveRulesForContext(context, input.date || month);
      resolvedRule = resolved && resolved.activeRule ? resolved.activeRule : null;
      matches = resolved && resolved.matches ? resolved.matches.slice() : [];
      if (!resolvedRule && typeof service.getActiveRules === "function") {
        matches = service.getActiveRules({
          month: month,
          city: city,
          register: register,
          platform: platform,
          selectedCities: context.selectedCities,
          selectedRegisters: context.selectedRegisters
        });
        resolvedRule = matches[0] || null;
      }
    }

    var merged = mergeRulesWithFallback(resolvedRule, fallbackRules);
    merged.month = month;
    merged.platform = platform;
    merged.city = city || merged.city || "";
    merged.register = register || merged.register || "";
    merged.activeRule = resolvedRule ? Common.clone(resolvedRule) : null;
    merged.matches = matches;
    return merged;
  }

  function buildFallbackRulesFromLegacyConfig(overrides) {
    overrides = overrides || {};
    var legacyConfig = LegacyPortal && LegacyPortal.Config ? LegacyPortal.Config : {};
    var salary = legacyConfig.salary || {};
    var fallback = createDefaultMonthlyRule(overrides);

    fallback.id = "legacy_fallback";
    fallback.version = 0;
    fallback.status = "fallback";
    fallback.source = "legacy_config";
    fallback.notes = "Generated from legacy salary, VDA, and face engines.";

    fallback.attendanceRules.minimumValidDays = Common.parseNumber(
      salary.validityDaysRequired,
      fallback.attendanceRules.minimumValidDays
    );
    fallback.salaryEligibilityRules.minimumValidDays = Common.parseNumber(
      salary.validityDaysRequired,
      fallback.salaryEligibilityRules.minimumValidDays
    );
    fallback.salaryEligibilityRules.minimumOrdersCar = Common.parseNumber(
      salary.minimumOrders && salary.minimumOrders.car,
      fallback.salaryEligibilityRules.minimumOrdersCar
    );
    fallback.salaryEligibilityRules.minimumOrdersBike = Common.parseNumber(
      salary.minimumOrders && salary.minimumOrders.bike,
      fallback.salaryEligibilityRules.minimumOrdersBike
    );
    fallback.faceVerificationRules.passRateRequired = 90;
    fallback.deliveryExperienceRules.legacyIncentiveByLevel = Common.clone(
      salary.experienceLevels || {
        car: { A: 400, B: 250, C: 100, NONE: 0 },
        bike: { A: 350, B: 220, C: 80, NONE: 0 },
        default: { A: 300, B: 200, C: 75, NONE: 0 }
      }
    );
    fallback.legacySettings = {
      salary: Common.clone(salary),
      vda: {
        minimumFaceRate: 0.9,
        minimumValidDays: 1,
        dailyTargetByVehicleType: {
          car: 12,
          bike: 12,
          default: 12
        }
      },
      faceVerification: {
        passThreshold: 0.9,
        deductionPerFailedDay: 0
      },
      deliveryExperience: {
        incentiveByLevel: Common.clone(fallback.deliveryExperienceRules.legacyIncentiveByLevel)
      }
    };
    fallback.fallbackWarnings = [
      "Legacy salary thresholds are active.",
      "Daily valid-day thresholds fall back to Prompt 6 defaults when the legacy engine does not define them."
    ];
    return fallback;
  }

  function mergeRulesWithFallback(resolvedRules, fallbackRules) {
    var baseFallback = Common.clone(fallbackRules || buildFallbackRulesFromLegacyConfig());
    if (!resolvedRules) {
      var fallbackOnly = deepMerge({}, baseFallback);
      fallbackOnly.appliedRuleId = "legacy_fallback";
      fallbackOnly.appliedRuleVersion = 0;
      fallbackOnly.fallbackUsed = true;
      fallbackOnly.fallbackParts = ["all"];
      fallbackOnly.warnings = (fallbackOnly.fallbackWarnings || []).concat([
        "No active monthly rule matched the requested city/register/month/platform scope."
      ]);
      return fallbackOnly;
    }

    var merged = deepMerge({}, baseFallback, resolvedRules);
    var fallbackParts = SECTION_KEYS.filter(function (sectionKey) {
      return resolvedRules[sectionKey] == null;
    });
    merged.appliedRuleId = resolvedRules.id || "";
    merged.appliedRuleVersion = Number(resolvedRules.version) || 1;
    merged.fallbackUsed = fallbackParts.length > 0;
    merged.fallbackParts = fallbackParts;
    merged.warnings = (baseFallback.fallbackWarnings || []).slice();
    fallbackParts.forEach(function (sectionKey) {
      merged.warnings.push("Using legacy fallback for " + sectionKey + ".");
    });
    return merged;
  }

  function getValidDayCriteria(rules, vehicleType) {
    var resolved = rules || buildFallbackRulesFromLegacyConfig();
    var normalizedVehicleType = Common.normalizeVehicleType(vehicleType);
    var vehicleRules = resolved.vehicleRules && resolved.vehicleRules[normalizedVehicleType]
      ? resolved.vehicleRules[normalizedVehicleType]
      : {};
    var validDayRules = resolved.validDayRules || {};
    var minOrdersFromValidDayRules = normalizedVehicleType === "bike"
      ? validDayRules.minOrdersBike
      : validDayRules.minOrdersCar;
    var minHoursFromValidDayRules = normalizedVehicleType === "bike"
      ? validDayRules.minWorkingHoursBike
      : validDayRules.minWorkingHoursCar;
    return {
      enabled: validDayRules.enabled !== false,
      validDayMode: validDayRules.validDayMode || "orders_or_hours",
      minOrders: Common.parseNumber(
        minOrdersFromValidDayRules,
        vehicleRules.validDayMinOrders
      ),
      minWorkingHours: Common.parseNumber(
        minHoursFromValidDayRules,
        vehicleRules.validDayMinHours
      ),
      minOnlineHours: validDayRules.minOnlineHours == null ? null : Common.parseNumber(validDayRules.minOnlineHours, 0),
      vehicleType: normalizedVehicleType
    };
  }

  function getMandatoryDayPolicy(rules, month) {
    var resolved = rules || buildFallbackRulesFromLegacyConfig({ month: month });
    var mandatoryRules = resolved.mandatoryDaysRules || {};
    return {
      enabled: mandatoryRules.enabled !== false,
      mandatoryDates: expandMandatoryDates(resolved, month),
      mandatoryWeekdays: Common.ensureArray(mandatoryRules.mandatoryWeekdays || []),
      minRequiredValidMandatoryDays: Common.parseNumber(
        mandatoryRules.minRequiredValidMandatoryDays,
        0
      ),
      allowMissedMandatoryDays: Common.parseNumber(
        mandatoryRules.allowMissedMandatoryDays,
        0
      ),
      note: Common.normalizeText(mandatoryRules.note)
    };
  }

  function getFaceVerificationPolicy(rules) {
    var source = rules || buildFallbackRulesFromLegacyConfig();
    var faceRules = source.faceVerificationRules || {};
    var passRateRequired = Common.parseNumber(faceRules.passRateRequired, 90);
    if (passRateRequired > 0 && passRateRequired <= 1) {
      passRateRequired = passRateRequired * 100;
    }
    return {
      enabled: faceRules.enabled !== false,
      passRateRequired: passRateRequired,
      passThreshold: passRateRequired / 100,
      skipCountsAsFail: faceRules.skipCountsAsFail !== false,
      firstResultDateIsStart: faceRules.firstResultDateIsStart !== false,
      excludeNoResultDays: faceRules.excludeNoResultDays !== false,
      allowExpectedProjection: faceRules.allowExpectedProjection !== false
    };
  }

  function getVdaPolicy(rules) {
    var source = rules || buildFallbackRulesFromLegacyConfig();
    var vdaRules = source.vdaRules || {};
    var legacySettings = source.legacySettings && source.legacySettings.vda ? source.legacySettings.vda : {};
    return {
      enabled: vdaRules.enabled !== false,
      requiredStatus: Common.ensureArray(vdaRules.requiredStatus || ["valid", "eligible"]).map(toLower),
      invalidStatuses: Common.ensureArray(vdaRules.invalidStatuses || ["invalid", "blocked", "missing"]).map(toLower),
      affectsValidity: vdaRules.affectsValidity !== false,
      affectsSalaryEligibility: vdaRules.affectsSalaryEligibility !== false,
      minimumFaceRate: legacySettings.minimumFaceRate == null ? 0.9 : Number(legacySettings.minimumFaceRate),
      minimumValidDays: Common.parseNumber(legacySettings.minimumValidDays, 1),
      dailyTargetByVehicleType: legacySettings.dailyTargetByVehicleType || {
        car: 12,
        bike: 12,
        default: 12
      }
    };
  }

  function getDeliveryExperiencePolicy(rules) {
    var source = rules || buildFallbackRulesFromLegacyConfig();
    var deliveryRules = source.deliveryExperienceRules || {};
    return {
      enabled: deliveryRules.enabled !== false,
      minGrade: Common.normalizeText(deliveryRules.minGrade).toUpperCase() || "",
      gradeScores: Common.clone(deliveryRules.gradeScores || {}),
      affectsIncentive: deliveryRules.affectsIncentive !== false,
      legacyIncentiveByLevel: Common.clone(deliveryRules.legacyIncentiveByLevel || (
        source.legacySettings &&
        source.legacySettings.deliveryExperience &&
        source.legacySettings.deliveryExperience.incentiveByLevel
      ) || {})
    };
  }

  function getCancellationPolicy(rules) {
    var source = rules || buildFallbackRulesFromLegacyConfig();
    var cancellationRules = source.cancellationRules || {};
    return {
      enabled: cancellationRules.enabled !== false,
      maxRejectsPerDay: Common.parseNumber(cancellationRules.maxRejectsPerDay, 2),
      penaltyAfterRejects: Common.parseNumber(cancellationRules.penaltyAfterRejects, 2),
      penaltyAmount: Common.parseNumber(cancellationRules.penaltyAmount, 50),
      affectsValidity: cancellationRules.affectsValidity === true,
      affectsIncentive: cancellationRules.affectsIncentive !== false
    };
  }

  function getAtaPolicy(rules) {
    var source = rules || buildFallbackRulesFromLegacyConfig();
    var ataRules = source.ataRules || {};
    return {
      enabled: ataRules.enabled !== false,
      minScore: ataRules.minScore == null ? null : Common.parseNumber(ataRules.minScore, 0),
      maxLateCount: ataRules.maxLateCount == null ? null : Common.parseNumber(ataRules.maxLateCount, 0),
      affectsValidity: ataRules.affectsValidity === true,
      affectsIncentive: ataRules.affectsIncentive !== false
    };
  }

  function getCompliancePolicy(rules) {
    var source = rules || buildFallbackRulesFromLegacyConfig();
    return Common.clone(source.complianceRules || {});
  }

  function expandMandatoryDates(rules, month) {
    var resolvedMonth = Common.monthKey(month || (rules && rules.month) || "");
    var mandatoryRules = rules && rules.mandatoryDaysRules ? rules.mandatoryDaysRules : {};
    var fixedDates = Common.ensureArray(mandatoryRules.mandatoryDates || []).map(Common.normalizeIsoDate).filter(Boolean);
    var weekdays = Common.ensureArray(mandatoryRules.mandatoryWeekdays || []).map(function (day) {
      return Common.normalizeText(day).toLowerCase();
    });
    if (!resolvedMonth) {
      return Common.sortByDate(fixedDates);
    }
    var weekdayDates = [];
    if (weekdays.length) {
      Common.listDatesInMonth(resolvedMonth).forEach(function (isoDate) {
        if (weekdays.indexOf(Common.weekdayName(isoDate)) >= 0) {
          weekdayDates.push(isoDate);
        }
      });
    }
    return Common.sortByDate(Common.uniqueList(fixedDates.concat(weekdayDates).filter(function (isoDate) {
      return Common.monthKey(isoDate) === resolvedMonth;
    })));
  }

  function buildResolverContext(globalContext, overrides) {
    var context = Common.mergeObjects({
      cityScope: "all",
      selectedCities: [],
      registerScope: "all",
      selectedRegisters: [],
      selectedDashboards: [],
      workMode: "all",
      platform: "keeta"
    }, Common.clone(globalContext || {}), overrides || {});

    if (context.city) {
      context.selectedCities = [context.city];
      context.cityScope = "single";
    }
    if (context.register) {
      context.selectedRegisters = [context.register];
      context.selectedDashboards = [context.register];
      context.registerScope = "single";
    }
    context.selectedCities = Common.uniqueList(context.selectedCities);
    context.selectedRegisters = Common.uniqueList(context.selectedRegisters).map(Common.normalizeRegisterCode);
    context.selectedDashboards = Common.uniqueList(context.selectedDashboards.length ? context.selectedDashboards : context.selectedRegisters).map(Common.normalizeRegisterCode);
    context.platform = Common.normalizePlatform(context.platform || overrides && overrides.platform);
    return context;
  }

  function pickSingle(values) {
    var list = Common.ensureArray(values);
    return list.length === 1 ? list[0] : "";
  }

  function toLower(value) {
    return Common.normalizeText(value).toLowerCase();
  }

  return {
    buildFallbackRulesFromLegacyConfig: buildFallbackRulesFromLegacyConfig,
    expandMandatoryDates: expandMandatoryDates,
    getAtaPolicy: getAtaPolicy,
    getCancellationPolicy: getCancellationPolicy,
    getCompliancePolicy: getCompliancePolicy,
    getDeliveryExperiencePolicy: getDeliveryExperiencePolicy,
    getFaceVerificationPolicy: getFaceVerificationPolicy,
    getMandatoryDayPolicy: getMandatoryDayPolicy,
    getValidDayCriteria: getValidDayCriteria,
    getVdaPolicy: getVdaPolicy,
    mergeRulesWithFallback: mergeRulesWithFallback,
    resolvePerformanceRules: resolvePerformanceRules
  };
});
