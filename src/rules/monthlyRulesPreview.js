(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./monthlyRulesDefaults.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.MonthlyRulesPreview = factory(
    root.KeetaPortal.MonthlyRulesDefaults
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (MonthlyRulesDefaults) {
  "use strict";

  var createDefaultMonthlyRule = MonthlyRulesDefaults.createDefaultMonthlyRule;
  var deepMerge = MonthlyRulesDefaults.deepMerge;

  function buildMonthlyRulesPreview(rule) {
    var normalized = deepMerge({}, createDefaultMonthlyRule(), rule || {});
    var title = [
      "شهر " + (normalized.month || "غير محدد"),
      "—",
      buildScopeLabel(normalized.selectedCities, normalized.cityScope, "المدن"),
      "/",
      buildScopeLabel(normalized.selectedRegisters, normalized.registerScope, "السجلات"),
      "—",
      platformLabel(normalized.platform)
    ].join(" ");

    var lines = [
      title,
      "",
      "اليوم الصالح:",
      "السيارة: " + buildValidDayText(normalized, "car"),
      "الدباب: " + buildValidDayText(normalized, "bike"),
      "",
      "الأيام الإلزامية:",
      buildMandatoryDaysText(normalized),
      "",
      "الحوافز:",
      "شرائح السيارات: " + buildTierText(normalized.incentiveRules.carTiers),
      "شرائح الدبابات: " + buildTierText(normalized.incentiveRules.bikeTiers),
      "",
      "Face Verification:",
      buildFaceText(normalized),
      "",
      "VDA:",
      buildVdaText(normalized),
      "",
      "Delivery Experience:",
      buildDeliveryText(normalized),
      "",
      "ATA والإلغاء:",
      buildAtaCancellationText(normalized)
    ];

    return {
      lines: lines,
      sections: buildSections(normalized),
      summaryText: lines.join("\n"),
      title: title
    };
  }

  function buildSections(rule) {
    return [
      { title: "اليوم الصالح", body: ["السيارة: " + buildValidDayText(rule, "car"), "الدباب: " + buildValidDayText(rule, "bike")] },
      { title: "الأيام الإلزامية", body: [buildMandatoryDaysText(rule)] },
      { title: "Face / VDA / Delivery", body: [buildFaceText(rule), buildVdaText(rule), buildDeliveryText(rule)] }
    ];
  }

  function buildValidDayText(rule, vehicleType) {
    var prefix = vehicleType === "car" ? "18 طلب أو 8 ساعات" : "18 طلب أو 8 ساعات";
    var validDayRules = rule.validDayRules || {};
    var orderValue = vehicleType === "car" ? validDayRules.minOrdersCar : validDayRules.minOrdersBike;
    var hourValue = vehicleType === "car" ? validDayRules.minWorkingHoursCar : validDayRules.minWorkingHoursBike;
    var parts = [];
    if (Number(orderValue) > 0) {
      parts.push(Number(orderValue) + " طلب");
    }
    if (Number(hourValue) > 0) {
      parts.push(Number(hourValue) + " ساعات");
    }
    if (!parts.length) {
      return prefix;
    }
    var mode = validDayRules.validDayMode || "orders_or_hours";
    if (mode === "orders_and_hours") {
      return parts.join(" و ");
    }
    return parts.join(" أو ");
  }

  function buildMandatoryDaysText(rule) {
    var config = rule.mandatoryDaysRules || {};
    var dates = config.mandatoryDates || [];
    var weekdays = config.mandatoryWeekdays || [];
    var parts = [];
    if (dates.length) {
      parts.push(dates.length + " تواريخ إلزامية");
    }
    if (weekdays.length) {
      parts.push("أيام أسبوع متكررة: " + weekdays.join("، "));
    }
    if (Number(config.minRequiredValidMandatoryDays) > 0) {
      parts.push("المطلوب تحقيق " + Number(config.minRequiredValidMandatoryDays) + " يوم صالح على الأقل");
    }
    if (Number(config.allowMissedMandatoryDays) > 0) {
      parts.push("مسموح بضياع " + Number(config.allowMissedMandatoryDays) + " يوم");
    }
    if (config.missingMandatoryDayPenalty && config.missingMandatoryDayPenalty.enabled) {
      parts.push("عقوبة الغياب " + Number(config.missingMandatoryDayPenalty.amount || 0) + " ريال" + (config.missingMandatoryDayPenalty.perDay ? " لكل يوم" : ""));
    }
    return parts.length ? parts.join("، ") + "." : "لا توجد أيام إلزامية معرفة.";
  }

  function buildTierText(tiers) {
    return (tiers || []).map(function (tier) {
      var endText = tier.maxOrders == null ? "+" : "-" + tier.maxOrders;
      return tier.minOrders + endText + " => " + tier.rate;
    }).join(" | ");
  }

  function buildFaceText(rule) {
    var config = rule.faceVerificationRules || {};
    return "المطلوب " + Number(config.passRateRequired || 0) + "%، " +
      (config.skipCountsAsFail ? "التخطي يحسب فشل" : "التخطي لا يحسب فشل") + "، " +
      (config.excludeNoResultDays ? "أيام بدون نتيجة مستبعدة" : "أيام بدون نتيجة محسوبة");
  }

  function buildVdaText(rule) {
    var config = rule.vdaRules || {};
    return "الحالات المقبولة: " + (config.requiredStatus || []).join("، ") +
      " / يؤثر على الصلاحية: " + (config.affectsValidity ? "نعم" : "لا") +
      " / يؤثر على أهلية الراتب: " + (config.affectsSalaryEligibility ? "نعم" : "لا");
  }

  function buildDeliveryText(rule) {
    var config = rule.deliveryExperienceRules || {};
    return "درجات Delivery: " + Object.keys(config.gradeScores || {}).map(function (grade) {
      return grade + "=" + config.gradeScores[grade];
    }).join("، ") + (config.affectsIncentive ? " / تؤثر على الحوافز" : "");
  }

  function buildAtaCancellationText(rule) {
    var ata = rule.ataRules || {};
    var cancellation = rule.cancellationRules || {};
    return "ATA يؤثر على الحوافز: " + (ata.affectsIncentive ? "نعم" : "لا") +
      " / الحد الأقصى للـ rejects اليومية: " + Number(cancellation.maxRejectsPerDay || 0) +
      " / غرامة بعد " + Number(cancellation.penaltyAfterRejects || 0) + " = " + Number(cancellation.penaltyAmount || 0) + " ريال";
  }

  function buildScopeLabel(values, scope, fallbackLabel) {
    if (scope === "all" || !(values || []).length) {
      return "كل " + fallbackLabel;
    }
    return values.join("، ");
  }

  function platformLabel(platform) {
    var labels = {
      all: "كل المنصات",
      amazon: "Amazon",
      chefz: "Chefz",
      hungerstation: "HungerStation",
      jahez: "Jahez",
      keeta: "Keeta",
      ninja: "Ninja"
    };
    return labels[platform] || (platform || "غير محدد");
  }

  return {
    buildMonthlyRulesPreview: buildMonthlyRulesPreview
  };
});
