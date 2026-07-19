(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./formulaEngine.js").FormulaEngine);
    return;
  }

  root.KeetaV6 = root.KeetaV6 || {};
  Object.assign(root.KeetaV6, factory(root.KeetaV6.FormulaEngine));
})(typeof globalThis !== "undefined" ? globalThis : this, function (FormulaEngine) {
  "use strict";

  var BASE_FIELD_ALIASES = {
    city: ["city", "المدينة", "المدينه"],
    register: ["register", "company", "السجل", "اسم السجل"],
    courier_id: ["courier id", "rider id", "معرف السائق", "معرّف السائق", "المعرف"],
    rider_name: ["rider name", "full name", "الاسم", "الاسم بالكامل", "اسم المندوب"],
    iqama: ["iqama", "رقم الهوية", "رقم الاقامة", "رقم اقامة المندوب"],
    phone: ["phone", "رقم الهاتف", "رقم جوال التواصل"],
    vehicle: ["vehicle", "نوع المركبة", "المركبة"],
  };

  var METRIC_ALIASES = {
    orders: ["orders", "المهام التي تم تسليمها", "delivered tasks", "الطلبات"],
    driver_reject: ["المهام المرفوضة (السائق)", "driver reject", "رفض السائق"],
    auto_reject: ["المهام المرفوضة تلقائيًا", "auto reject", "رفض تلقائي"],
    cancel_rate: ["معدل الإلغاء", "cancel rate"],
    online_time: ["وقت اتصال السائقين", "online duration", "online time"],
    avg_delivery_time: ["متوسط مدة التوصيل", "avg delivery time"],
  };

  function normalizeHeader(value) {
    return FormulaEngine.normalizeHeader(value).replace(/[_]+/g, " ");
  }

  function findMatchingIndex(row, aliases, endExclusive) {
    for (var index = 0; index < Math.min(row.length, endExclusive); index += 1) {
      var candidate = normalizeHeader(row[index]);
      for (var aliasIndex = 0; aliasIndex < aliases.length; aliasIndex += 1) {
        if (candidate.indexOf(normalizeHeader(aliases[aliasIndex])) >= 0) {
          return index;
        }
      }
    }
    return -1;
  }

  function toArabicWeekday(dateLike) {
    var parsed = FormulaEngine.parseDateLike(dateLike);
    if (!parsed) {
      return "";
    }

    return ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][parsed.getDay()];
  }

  function normalizeOverallPerformance(matrix, options) {
    var settings = Object.assign({
      headerRowCount: 2,
      dateRowIndex: 0,
      metricRowIndex: 1,
    }, options || {});

    var rows = Array.isArray(matrix) ? matrix : [];
    if (rows.length <= settings.headerRowCount) {
      return [];
    }

    var dateRow = rows[settings.dateRowIndex] || [];
    var metricRow = rows[settings.metricRowIndex] || [];
    var firstDateColumn = -1;

    for (var index = 0; index < dateRow.length; index += 1) {
      if (/^\d{8}$/.test(String(dateRow[index] || "").trim())) {
        firstDateColumn = index;
        break;
      }
    }

    if (firstDateColumn < 0) {
      return [];
    }

    var baseIndexes = {};
    Object.keys(BASE_FIELD_ALIASES).forEach(function (field) {
      baseIndexes[field] = findMatchingIndex(metricRow, BASE_FIELD_ALIASES[field], firstDateColumn);
    });

    var dateBlocks = [];
    var currentBlock = null;
    for (var columnIndex = firstDateColumn; columnIndex < dateRow.length; columnIndex += 1) {
      var dateKey = String(dateRow[columnIndex] || "").trim();
      if (!/^\d{8}$/.test(dateKey)) {
        continue;
      }

      if (!currentBlock || currentBlock.date_key !== dateKey) {
        currentBlock = {
          date_key: dateKey,
          metricIndexes: {},
        };
        dateBlocks.push(currentBlock);
      }

      var normalizedMetric = normalizeHeader(metricRow[columnIndex]);
      Object.keys(METRIC_ALIASES).forEach(function (metricKey) {
        if (currentBlock.metricIndexes[metricKey] != null) {
          return;
        }

        var matches = METRIC_ALIASES[metricKey].some(function (alias) {
          return normalizedMetric.indexOf(normalizeHeader(alias)) >= 0;
        });

        if (matches) {
          currentBlock.metricIndexes[metricKey] = columnIndex;
        }
      });
    }

    var output = [];
    rows.slice(settings.headerRowCount).forEach(function (row) {
      if (!row || !row.length) {
        return;
      }

      var baseRecord = {};
      Object.keys(baseIndexes).forEach(function (field) {
        var fieldIndex = baseIndexes[field];
        baseRecord[field] = fieldIndex >= 0 ? row[fieldIndex] : "";
      });

      if (!FormulaEngine.normalizeText(baseRecord.courier_id) && !FormulaEngine.normalizeText(baseRecord.rider_name)) {
        return;
      }

      dateBlocks.forEach(function (block) {
        var record = Object.assign({}, baseRecord, {
          day: toArabicWeekday(block.date_key),
          date_key: block.date_key,
          orders: null,
          driver_reject: null,
          auto_reject: null,
          cancel_rate: null,
          online_time: null,
          avg_delivery_time: null,
        });

        Object.keys(block.metricIndexes).forEach(function (metricKey) {
          record[metricKey] = row[block.metricIndexes[metricKey]];
        });

        output.push(record);
      });
    });

    return output;
  }

  return {
    NormalizeOverallPerformance: {
      normalizeOverallPerformance: normalizeOverallPerformance,
      toArabicWeekday: toArabicWeekday,
    },
  };
});
