(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./formulaEngine.js").FormulaEngine);
    return;
  }

  root.KeetaV6 = root.KeetaV6 || {};
  Object.assign(root.KeetaV6, factory(root.KeetaV6.FormulaEngine));
})(typeof globalThis !== "undefined" ? globalThis : this, function (FormulaEngine) {
  "use strict";

  function normalizeVehicleType(value) {
    var text = FormulaEngine.normalizeHeader(value);
    if (text.indexOf("bike") >= 0 || text.indexOf("دباب") >= 0) {
      return "bike";
    }
    if (text.indexOf("car") >= 0 || text.indexOf("سيارة") >= 0) {
      return "car";
    }
    return "default";
  }

  function scoreRow(row) {
    var onTimeRate = Number(FormulaEngine.value(row.onTimeRate || row["معدل التوصيل في الموعد"]) || 0);
    var orders = Number(FormulaEngine.value(row.orders || row["حجم الطلبات"]) || 0);
    if (onTimeRate > 1) {
      onTimeRate = onTimeRate / 100;
    }
    return Number((onTimeRate * 100 + Math.min(orders, 100) * 0.2).toFixed(2));
  }

  function assignLevel(rank, size) {
    if (rank <= Math.max(1, Math.ceil(size * 0.2))) {
      return "A";
    }
    if (rank <= Math.max(2, Math.ceil(size * 0.6))) {
      return "B";
    }
    return "C";
  }

  function buildExperienceRows(rows, options) {
    var settings = Object.assign({
      incentiveByLevel: {
        car: { A: 400, B: 250, C: 100 },
        bike: { A: 350, B: 220, C: 80 },
        default: { A: 300, B: 200, C: 75 },
      },
    }, options || {});

    var grouped = FormulaEngine.groupBy(rows || [], function (row) {
      return FormulaEngine.text(row.city || row["المدينة"]);
    });

    var result = [];
    grouped.forEach(function (cityRows, city) {
      var ranked = cityRows.slice().sort(function (left, right) {
        return scoreRow(right) - scoreRow(left);
      });

      ranked.forEach(function (row, index) {
        var level = assignLevel(index + 1, ranked.length);
        var vehicleType = normalizeVehicleType(row.vehicleType || row["Vehicle Type"] || row["المركبة"]);
        var invalid = row.isValid === false || FormulaEngine.normalizeHeader(row.validityStatus || row.status || "").indexOf("invalid") >= 0 || FormulaEngine.normalizeHeader(row.validityStatus || row.status || "").indexOf("غير صالح") >= 0;
        var incentives = settings.incentiveByLevel[vehicleType] || settings.incentiveByLevel.default;

        result.push(Object.assign({}, row, {
          city: city,
          rank: index + 1,
          score: scoreRow(row),
          level: level,
          incentive: invalid ? 0 : incentives[level],
          vehicleType: vehicleType,
        }));
      });
    });

    return result;
  }

  return {
    DeliveryExperienceEngine: {
      buildExperienceRows: buildExperienceRows,
      scoreRow: scoreRow,
    },
  };
});
