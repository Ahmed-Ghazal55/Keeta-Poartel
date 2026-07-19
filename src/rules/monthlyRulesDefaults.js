(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.MonthlyRulesDefaults = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createDefaultMonthlyRule(overrides) {
    return deepMerge({}, {
      id: "",
      month: "",
      cityScope: "all",
      selectedCities: [],
      registerScope: "all",
      selectedRegisters: [],
      platform: "keeta",
      status: "draft",
      version: 1,
      effectiveFrom: "",
      effectiveTo: "",
      validDayRules: {
        enabled: true,
        validDayMode: "orders_or_hours",
        minOrdersCar: 18,
        minOrdersBike: 18,
        minWorkingHoursCar: 8,
        minWorkingHoursBike: 8,
        minOnlineHours: null,
        allowManualOverride: true
      },
      mandatoryDaysRules: {
        enabled: true,
        mandatoryDates: [],
        mandatoryWeekdays: [],
        minRequiredValidMandatoryDays: 0,
        allowMissedMandatoryDays: 0,
        missingMandatoryDayPenalty: {
          enabled: false,
          amount: 0,
          perDay: true
        },
        note: ""
      },
      vehicleRules: {
        car: {
          enabled: true,
          monthlyTarget: 350,
          validDayMinOrders: 18,
          validDayMinHours: 8
        },
        bike: {
          enabled: true,
          monthlyTarget: 400,
          validDayMinOrders: 18,
          validDayMinHours: 8,
          middayBan: {
            enabled: false,
            from: "12:00",
            to: "15:00"
          }
        }
      },
      incentiveRules: {
        enabled: true,
        currency: "SAR",
        carTiers: [
          { minOrders: 0, maxOrders: 59, rate: 11 },
          { minOrders: 60, maxOrders: 79, rate: 14 },
          { minOrders: 80, maxOrders: 99, rate: 16 },
          { minOrders: 100, maxOrders: null, rate: 18 }
        ],
        bikeTiers: [
          { minOrders: 0, maxOrders: 59, rate: 10 },
          { minOrders: 60, maxOrders: 79, rate: 12 },
          { minOrders: 80, maxOrders: 99, rate: 15 },
          { minOrders: 100, maxOrders: null, rate: 17 }
        ],
        companyCommission: {
          enabled: true,
          type: "percent",
          value: 15
        }
      },
      attendanceRules: {
        enabled: true,
        minimumValidDays: 6,
        allowGraceDays: 0
      },
      orderRules: {
        enabled: true,
        mandatoryDayMinOrders: 6,
        regularDayMinOrders: 3
      },
      ataRules: {
        enabled: true,
        minScore: null,
        maxLateCount: null,
        penaltyRules: [],
        affectsValidity: false,
        affectsIncentive: true
      },
      cancellationRules: {
        enabled: true,
        maxRejectsPerDay: 2,
        penaltyAfterRejects: 2,
        penaltyAmount: 50,
        affectsValidity: false,
        affectsIncentive: true
      },
      faceVerificationRules: {
        enabled: true,
        passRateRequired: 90,
        skipCountsAsFail: true,
        firstResultDateIsStart: true,
        excludeNoResultDays: true,
        allowExpectedProjection: true
      },
      vdaRules: {
        enabled: true,
        requiredStatus: ["valid", "eligible"],
        invalidStatuses: ["invalid", "blocked", "missing"],
        affectsValidity: true,
        affectsSalaryEligibility: true
      },
      deliveryExperienceRules: {
        enabled: true,
        minGrade: null,
        gradeScores: {
          A: 2.75,
          B: 2.25,
          C: 1.75,
          D: 1.25,
          E: 0.75,
          F: 0
        },
        affectsIncentive: true
      },
      complianceRules: {
        stcPayRequired: false,
        bagRequired: false,
        vehiclePhotoRequired: false,
        licenseRequired: true,
        healthCardRequired: false
      },
      salaryEligibilityRules: {
        enabled: true,
        minimumValidDays: 6,
        minimumOrdersCar: 330,
        minimumOrdersBike: 350
      },
      notes: "",
      createdBy: "",
      createdAt: "",
      updatedBy: "",
      updatedAt: "",
      lockedBy: "",
      lockedAt: "",
      lockedFromStatus: "",
      archivedAt: "",
      archivedBy: "",
      source: "monthly_rules_manager",
      previousVersionId: ""
    }, overrides || {});
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function deepMerge(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      mergeInto(target, source);
    });
    return target;
  }

  function mergeInto(target, source) {
    if (!source || typeof source !== "object") {
      return target;
    }
    Object.keys(source).forEach(function (key) {
      var value = source[key];
      if (Array.isArray(value)) {
        target[key] = clone(value);
        return;
      }
      if (value && typeof value === "object") {
        if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
          target[key] = {};
        }
        mergeInto(target[key], value);
        return;
      }
      target[key] = value;
    });
    return target;
  }

  return {
    clone: clone,
    createDefaultMonthlyRule: createDefaultMonthlyRule,
    deepMerge: deepMerge
  };
});
