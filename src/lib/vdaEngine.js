(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./formulaEngine.js").FormulaEngine);
    return;
  }

  root.KeetaV6 = root.KeetaV6 || {};
  Object.assign(root.KeetaV6, factory(root.KeetaV6.FormulaEngine));
})(typeof globalThis !== "undefined" ? globalThis : this, function (FormulaEngine) {
  "use strict";

  function pick(row, aliases) {
    var keys = Object.keys(row || {});
    for (var index = 0; index < aliases.length; index += 1) {
      var target = FormulaEngine.normalizeHeader(aliases[index]);
      for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        if (FormulaEngine.normalizeHeader(keys[keyIndex]) === target) {
          return row[keys[keyIndex]];
        }
      }
    }
    return "";
  }

  function normalizeVehicleType(value) {
    var text = FormulaEngine.normalizeHeader(value);
    if (text.indexOf("bike") >= 0 || text.indexOf("دباب") >= 0 || text.indexOf("motor") >= 0) {
      return "bike";
    }
    if (text.indexOf("car") >= 0 || text.indexOf("سيارة") >= 0) {
      return "car";
    }
    return "default";
  }

  function daysSince(firstOnlineDate, reportDate) {
    if (!firstOnlineDate || !reportDate) {
      return 0;
    }
    var diff = reportDate.getTime() - firstOnlineDate.getTime();
    return diff < 0 ? 0 : Math.floor(diff / 86400000) + 1;
  }

  function evaluateRiderVda(rawRow, options) {
    var settings = Object.assign({
      reportDate: new Date(),
      minimumFaceRate: 0.9,
      minimumValidDays: 1,
      expectedOnlineDays: null,
      dailyTargetByVehicleType: {
        car: 12,
        bike: 12,
        default: 12,
      },
    }, options || {});

    var riderId = FormulaEngine.text(pick(rawRow, ["Rider ID", "معرّف السائق", "المعرف"]));
    var vehicleType = normalizeVehicleType(pick(rawRow, ["Vehicle Type", "المركبة", "نوع المركبة"]));
    var firstOnlineDate = FormulaEngine.parseDateLike(pick(rawRow, ["First online date", "بداية عمل الايدي"]));
    var onlineDays = Number(FormulaEngine.value(pick(rawRow, ["Online Day", "عدد ايام العمل للايدي"])) || 0);
    var validDays = Number(FormulaEngine.value(pick(rawRow, ["Sum of Valid Shifts", "الأيام الصالحة"])) || onlineDays || 0);
    var deliveredTasks = Number(FormulaEngine.value(pick(rawRow, ["Sum of total delivered tasks", "الطلبات المسلمة"])) || 0);
    var facePassRate = Number(FormulaEngine.value(pick(rawRow, ["Face Pass Rate", "نسبة التحقق من الوجه"])) || 0);

    if (facePassRate > 1) {
      facePassRate = facePassRate / 100;
    }

    var daysWorked = onlineDays || daysSince(firstOnlineDate, settings.reportDate);
    var invalidDays = Math.max(daysWorked - validDays, 0);
    var expectedOnlineDays = settings.expectedOnlineDays != null ? settings.expectedOnlineDays : daysWorked;
    var dailyTarget = settings.dailyTargetByVehicleType[vehicleType] || settings.dailyTargetByVehicleType.default;
    var currentTarget = daysWorked * dailyTarget;
    var expectedTarget = expectedOnlineDays * dailyTarget;
    var orderValid = deliveredTasks >= currentTarget;
    var keetaValid = validDays >= settings.minimumValidDays && (facePassRate === 0 || facePassRate >= settings.minimumFaceRate);

    var reasons = [];
    if (!orderValid) {
      reasons.push("الطلبات أقل من التارجت الحالي");
    }
    if (facePassRate > 0 && facePassRate < settings.minimumFaceRate) {
      reasons.push("التحقق من الوجه أقل من الحد الأدنى");
    }
    if (validDays < settings.minimumValidDays) {
      reasons.push("الأيام الصالحة أقل من الحد الأدنى");
    }
    if (invalidDays > validDays) {
      reasons.push("الأيام غير الصالحة أعلى من الأيام الصالحة");
    }

    return {
      riderId: riderId,
      vehicleType: vehicleType,
      firstOnlineDate: firstOnlineDate,
      workingDays: daysWorked,
      validDays: validDays,
      invalidDays: invalidDays,
      currentTarget: currentTarget,
      expectedTarget: expectedTarget,
      deliveredTasks: deliveredTasks,
      orderValid: orderValid,
      keetaValid: keetaValid,
      finalStatus: reasons.length ? "Invalid" : "Valid",
      reasons: reasons,
      missingDays: Math.max(settings.minimumValidDays - validDays, 0),
      actionNeeded: reasons.length ? "Follow up" : "None",
      facePassRate: facePassRate,
    };
  }

  function summarizeVda(rows, options) {
    var evaluated = (rows || []).map(function (row) {
      return evaluateRiderVda(row, options);
    });

    return {
      items: evaluated,
      summary: {
        total: evaluated.length,
        valid: evaluated.filter(function (item) { return item.finalStatus === "Valid"; }).length,
        invalid: evaluated.filter(function (item) { return item.finalStatus !== "Valid"; }).length,
      },
    };
  }

  return {
    VdaEngine: {
      evaluateRiderVda: evaluateRiderVda,
      summarizeVda: summarizeVda,
    },
  };
});
