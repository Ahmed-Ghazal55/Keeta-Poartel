(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./formulaEngine.js").FormulaEngine);
    return;
  }

  root.KeetaV6 = root.KeetaV6 || {};
  Object.assign(root.KeetaV6, factory(root.KeetaV6.FormulaEngine));
})(typeof globalThis !== "undefined" ? globalThis : this, function (FormulaEngine) {
  "use strict";

  function isPass(value) {
    var text = FormulaEngine.normalizeHeader(value);
    return ["pass", "passed", "true", "1", "ناجح", "تم", "صالح"].some(function (item) {
      return text.indexOf(item) >= 0;
    });
  }

  function summarizeFaceVerification(rows, options) {
    var settings = Object.assign({
      passThreshold: 0.9,
      deductionPerFailedDay: 0,
      firstOnlineField: "date",
      passField: "result",
      triggeredField: "triggered",
    }, options || {});

    var list = (rows || []).filter(function (row) {
      if (!Object.prototype.hasOwnProperty.call(row, settings.triggeredField)) {
        return true;
      }
      return Boolean(row[settings.triggeredField]);
    });

    var passedRows = list.filter(function (row) {
      return isPass(row[settings.passField]);
    });
    var failedRows = list.filter(function (row) {
      return !isPass(row[settings.passField]);
    });
    var passRate = list.length ? passedRows.length / list.length : 0;
    var firstOnlineDay = list.length ? FormulaEngine.parseDateLike(list[0][settings.firstOnlineField]) : null;

    return {
      triggeredDays: list.length,
      passedDays: passedRows.length,
      failedDays: failedRows.length,
      passRate: passRate,
      isAboveThreshold: passRate >= settings.passThreshold,
      deduction: passRate >= settings.passThreshold ? 0 : failedRows.length * settings.deductionPerFailedDay,
      firstOnlineDay: firstOnlineDay,
      failedDayKeys: failedRows.map(function (row) { return row[settings.firstOnlineField]; }),
    };
  }

  function summarizeByRider(rows, options) {
    var grouped = FormulaEngine.groupBy(rows || [], function (row) {
      return FormulaEngine.text(row.riderId || row["Rider ID"] || row["معرّف السائق"]);
    });

    return Array.from(grouped.keys()).map(function (riderId) {
      return {
        riderId: riderId,
        summary: summarizeFaceVerification(grouped.get(riderId), options),
      };
    });
  }

  return {
    FaceVerificationEngine: {
      summarizeFaceVerification: summarizeFaceVerification,
      summarizeByRider: summarizeByRider,
    },
  };
});
