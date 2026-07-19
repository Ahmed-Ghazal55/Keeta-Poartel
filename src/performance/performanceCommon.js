(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../import/importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.PerformanceCommon = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  var normalizeText = ImportTypes && typeof ImportTypes.normalizeText === "function"
    ? ImportTypes.normalizeText
    : function (value) {
        return String(value == null ? "" : value).replace(/\uFEFF/g, "").trim();
      };

  var normalizeRegisterCode = ImportTypes && typeof ImportTypes.normalizeRegisterCode === "function"
    ? ImportTypes.normalizeRegisterCode
    : function (value) { return normalizeText(value).toUpperCase(); };

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function ensureArray(value) {
    if (Array.isArray(value)) {
      return value.slice();
    }
    if (value == null || value === "") {
      return [];
    }
    return [value];
  }

  function uniqueList(values) {
    var seen = {};
    return ensureArray(values).filter(function (value) {
      var key = normalizeText(value);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function parseNumber(value, fallback) {
    if (value == null || value === "") {
      return fallback == null ? 0 : Number(fallback) || 0;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    var text = String(value)
      .replace(/\u00a0/g, "")
      .replace(/,/g, "")
      .replace(/%/g, "")
      .replace(/[٠-٩]/g, function (digit) {
        return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
      })
      .trim();
    var parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : (fallback == null ? 0 : Number(fallback) || 0);
  }

  function normalizeVehicleType(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text) {
      return "default";
    }
    if (text.indexOf("bike") >= 0 || text.indexOf("motor") >= 0 || text.indexOf("\u062f\u0628\u0627\u0628") >= 0 || text.indexOf("\u062f\u0631\u0627\u062c") >= 0) {
      return "bike";
    }
    if (text.indexOf("car") >= 0 || text.indexOf("\u0633\u064a\u0627\u0631") >= 0) {
      return "car";
    }
    return text;
  }

  function normalizePlatform(value) {
    var text = normalizeText(value).toLowerCase();
    return text || "keeta";
  }

  function normalizeWorkMode(value, registerCode) {
    var text = normalizeText(value).toLowerCase();
    var register = normalizeText(registerCode).toUpperCase();
    if (text === "per_order" || text === "salary_tiers" || text === "all") {
      return text;
    }
    if (text.indexOf("per order") >= 0 || text.indexOf("fr 3pl") >= 0 || text.indexOf("\u0628\u0627\u0644\u0637\u0644\u0628") >= 0) {
      return "per_order";
    }
    if (register === "PER_ORDER" || register === "FR_3PL" || register === "PER_ORDER_FR3PL") {
      return "per_order";
    }
    return "salary_tiers";
  }

  function normalizeDateKey(value) {
    var text = normalizeText(value).replace(/[^\d]/g, "");
    if (/^\d{8}$/.test(text)) {
      return text;
    }
    var iso = normalizeIsoDate(value);
    return iso ? iso.replace(/-/g, "") : "";
  }

  function normalizeIsoDate(value) {
    var text = normalizeText(value);
    if (!text) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{8}$/.test(text)) {
      return text.slice(0, 4) + "-" + text.slice(4, 6) + "-" + text.slice(6, 8);
    }
    var normalized = text.replace(/[٠-٩]/g, function (digit) {
      return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
    });
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
      return normalized.slice(6, 10) + "-" + normalized.slice(3, 5) + "-" + normalized.slice(0, 2);
    }
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(normalized)) {
      return normalized.replace(/\//g, "-");
    }
    var parsed = new Date(normalized);
    if (isNaN(parsed.getTime())) {
      return "";
    }
    return [
      String(parsed.getFullYear()),
      String(parsed.getMonth() + 1).padStart(2, "0"),
      String(parsed.getDate()).padStart(2, "0")
    ].join("-");
  }

  function monthKey(value) {
    var text = normalizeText(value);
    if (!text) {
      return "";
    }
    if (/^\d{4}-\d{2}$/.test(text)) {
      return text;
    }
    var iso = normalizeIsoDate(text);
    if (iso) {
      return iso.slice(0, 7);
    }
    var digits = text.replace(/[^\d]/g, "");
    if (digits.length >= 6) {
      return digits.slice(0, 4) + "-" + digits.slice(4, 6);
    }
    return "";
  }

  function listDatesInMonth(month) {
    var key = monthKey(month);
    if (!key) {
      return [];
    }
    var parts = key.split("-");
    var year = Number(parts[0]);
    var monthIndex = Number(parts[1]) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return [];
    }
    var cursor = new Date(Date.UTC(year, monthIndex, 1));
    var dates = [];
    while (cursor.getUTCMonth() === monthIndex) {
      dates.push([
        String(cursor.getUTCFullYear()),
        String(cursor.getUTCMonth() + 1).padStart(2, "0"),
        String(cursor.getUTCDate()).padStart(2, "0")
      ].join("-"));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  }

  function weekdayName(value) {
    var iso = normalizeIsoDate(value);
    if (!iso) {
      return "";
    }
    var date = new Date(iso + "T00:00:00Z");
    var names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return names[date.getUTCDay()] || "";
  }

  function firstNonEmpty() {
    for (var index = 0; index < arguments.length; index += 1) {
      var value = arguments[index];
      if (value != null && String(value) !== "") {
        return value;
      }
    }
    return "";
  }

  function groupBy(list, keySelector) {
    var grouped = {};
    (list || []).forEach(function (item) {
      var key = normalizeText(typeof keySelector === "function" ? keySelector(item) : item && item[keySelector]);
      grouped[key] = grouped[key] || [];
      grouped[key].push(item);
    });
    return grouped;
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  function stableId(entityName, parts) {
    return entityName + "::" + (parts || []).map(function (value) {
      return normalizeText(value).replace(/[^\w\u0600-\u06ff-]+/g, "_");
    }).join("::");
  }

  function sortByDate(values) {
    return ensureArray(values).slice().sort(function (left, right) {
      return normalizeText(left).localeCompare(normalizeText(right));
    });
  }

  function matchesMonth(record, month) {
    var expected = monthKey(month);
    if (!expected) {
      return true;
    }
    return monthKey(record && (record.month || record.date || record.dateKey)) === expected;
  }

  return {
    clone: clone,
    ensureArray: ensureArray,
    firstNonEmpty: firstNonEmpty,
    groupBy: groupBy,
    listDatesInMonth: listDatesInMonth,
    matchesMonth: matchesMonth,
    mergeObjects: mergeObjects,
    monthKey: monthKey,
    normalizeDateKey: normalizeDateKey,
    normalizeIsoDate: normalizeIsoDate,
    normalizePlatform: normalizePlatform,
    normalizeRegisterCode: normalizeRegisterCode,
    normalizeText: normalizeText,
    normalizeVehicleType: normalizeVehicleType,
    normalizeWorkMode: normalizeWorkMode,
    parseNumber: parseNumber,
    sortByDate: sortByDate,
    stableId: stableId,
    uniqueList: uniqueList,
    weekdayName: weekdayName
  };
});
