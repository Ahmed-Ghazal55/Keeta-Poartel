(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.KeetaV6 = root.KeetaV6 || {};
  Object.assign(root.KeetaV6, factory());
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .replace(/\u00a0/g, " ")
      .replace(/\r/g, " ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeHeader(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/[ـ_]+/g, " ")
      .trim();
  }

  function trim(value) {
    return normalizeText(value);
  }

  function value(valueLike) {
    if (typeof valueLike === "number") {
      return Number.isFinite(valueLike) ? valueLike : NaN;
    }

    var text = normalizeText(valueLike)
      .replace(/,/g, "")
      .replace(/٪/g, "")
      .replace(/[٠-٩]/g, function (digit) {
        return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
      });

    if (!text) {
      return NaN;
    }

    return Number(text);
  }

  function text(valueLike) {
    return normalizeText(valueLike);
  }

  function ifError(fn, fallback) {
    try {
      var result = typeof fn === "function" ? fn() : fn;
      if (result instanceof Error) {
        return fallback;
      }
      if (typeof result === "number" && Number.isNaN(result)) {
        return fallback;
      }
      return result;
    } catch (_error) {
      return fallback;
    }
  }

  function ifFn(condition, truthyValue, falsyValue) {
    return condition ? truthyValue : falsyValue;
  }

  function ifs(branches, fallback) {
    var list = toArray(branches);
    for (var index = 0; index < list.length; index += 1) {
      if (list[index] && list[index].when) {
        return list[index].value;
      }
    }
    return fallback;
  }

  function regexMatch(valueLike, pattern, flags) {
    var expression = pattern instanceof RegExp ? pattern : new RegExp(pattern, flags || "");
    return expression.test(normalizeText(valueLike));
  }

  function parseDateLike(valueLike) {
    if (valueLike instanceof Date && !Number.isNaN(valueLike.getTime())) {
      return new Date(valueLike.getTime());
    }

    var textValue = normalizeText(valueLike).replace(/[٠-٩]/g, function (digit) {
      return String("٠١٢٣٤٥٦٧٨٩".indexOf(digit));
    });

    if (!textValue) {
      return null;
    }

    if (/^\d{8}$/.test(textValue)) {
      return new Date(Number(textValue.slice(0, 4)), Number(textValue.slice(4, 6)) - 1, Number(textValue.slice(6, 8)));
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(textValue)) {
      return new Date(textValue + "T00:00:00");
    }

    if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(textValue)) {
      var parts = textValue.split(/[\/\-.]/);
      var day = Number(parts[0]);
      var month = Number(parts[1]) - 1;
      var year = Number(parts[2]);
      if (year < 100) {
        year += 2000;
      }
      return new Date(year, month, day);
    }

    var parsed = new Date(textValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  }

  function dateValue(year, month, day) {
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  function weekday(dateLike, returnType) {
    var parsed = parseDateLike(dateLike);
    if (!parsed) {
      return null;
    }

    var day = parsed.getDay();
    if (returnType === 2) {
      return day === 0 ? 7 : day;
    }
    return day + 1;
  }

  function makeComparator(criteria) {
    if (typeof criteria === "function") {
      return criteria;
    }

    if (criteria instanceof RegExp) {
      return function (candidate) {
        return criteria.test(normalizeText(candidate));
      };
    }

    if (criteria && typeof criteria === "object" && Object.prototype.hasOwnProperty.call(criteria, "op")) {
      return function (candidate) {
        var left = value(candidate);
        var right = value(criteria.value);
        switch (criteria.op) {
          case ">":
            return left > right;
          case ">=":
            return left >= right;
          case "<":
            return left < right;
          case "<=":
            return left <= right;
          case "!=":
            return normalizeText(candidate) !== normalizeText(criteria.value);
          default:
            return normalizeText(candidate) === normalizeText(criteria.value);
        }
      };
    }

    return function (candidate) {
      return normalizeText(candidate) === normalizeText(criteria);
    };
  }

  function countIf(values, criteria) {
    var comparator = makeComparator(criteria);
    return toArray(values).filter(function (item) {
      return comparator(item);
    }).length;
  }

  function countIfs(entries) {
    var criteriaEntries = toArray(entries);
    if (!criteriaEntries.length) {
      return 0;
    }

    var length = toArray(criteriaEntries[0].values).length;
    var total = 0;

    for (var rowIndex = 0; rowIndex < length; rowIndex += 1) {
      var matches = criteriaEntries.every(function (entry) {
        return makeComparator(entry.criteria)(toArray(entry.values)[rowIndex]);
      });
      if (matches) {
        total += 1;
      }
    }

    return total;
  }

  function sumIf(criteriaValues, criteria, sumValues) {
    var left = toArray(criteriaValues);
    var right = toArray(sumValues);
    var comparator = makeComparator(criteria);
    var total = 0;

    for (var index = 0; index < left.length; index += 1) {
      if (comparator(left[index])) {
        total += Number(value(right[index]) || 0);
      }
    }

    return total;
  }

  function sumIfs(sumValues, entries) {
    var values = toArray(sumValues);
    var criteriaEntries = toArray(entries);
    if (!criteriaEntries.length) {
      return 0;
    }

    var total = 0;
    for (var rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
      var matches = criteriaEntries.every(function (entry) {
        return makeComparator(entry.criteria)(toArray(entry.values)[rowIndex]);
      });
      if (matches) {
        total += Number(value(values[rowIndex]) || 0);
      }
    }
    return total;
  }

  function filterRows(rows, predicate) {
    var list = toArray(rows);
    if (typeof predicate === "function") {
      return list.filter(predicate);
    }

    var filters = predicate || {};
    return list.filter(function (row) {
      return Object.keys(filters).every(function (key) {
        return makeComparator(filters[key])(row[key]);
      });
    });
  }

  function unique(values, keyFn) {
    var seen = new Set();
    var result = [];

    toArray(values).forEach(function (item) {
      var key = keyFn ? keyFn(item) : normalizeText(item);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    });

    return result;
  }

  function xmatchIndex(lookupValue, lookupArray, options) {
    var list = toArray(lookupArray);
    var comparator = options && options.caseSensitive
      ? function (item) { return String(item) === String(lookupValue); }
      : function (item) { return normalizeText(item) === normalizeText(lookupValue); };

    for (var index = 0; index < list.length; index += 1) {
      if (comparator(list[index])) {
        return index;
      }
    }

    return -1;
  }

  function xmatch(lookupValue, lookupArray, options) {
    var index = xmatchIndex(lookupValue, lookupArray, options);
    return index >= 0 ? index + 1 : null;
  }

  function xlookup(lookupValue, lookupArray, returnArray, fallback, options) {
    var index = xmatchIndex(lookupValue, lookupArray, options);
    if (index < 0) {
      return fallback;
    }
    return toArray(returnArray)[index];
  }

  function xlookupRow(rows, lookupField, lookupValue, fallback) {
    var list = toArray(rows);
    var normalizedField = normalizeHeader(lookupField);

    for (var index = 0; index < list.length; index += 1) {
      var row = list[index] || {};
      var keys = Object.keys(row);
      for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        if (normalizeHeader(keys[keyIndex]) === normalizedField && normalizeText(row[keys[keyIndex]]) === normalizeText(lookupValue)) {
          return row;
        }
      }
    }

    return fallback;
  }

  function letIn(scope, resolver) {
    return resolver(scope || {});
  }

  function groupBy(rows, keyFn) {
    var groups = new Map();

    toArray(rows).forEach(function (row) {
      var key = keyFn(row);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(row);
    });

    return groups;
  }

  var FormulaEngine = {
    normalizeText: normalizeText,
    normalizeHeader: normalizeHeader,
    trim: trim,
    value: value,
    text: text,
    ifError: ifError,
    ifFn: ifFn,
    ifs: ifs,
    regexMatch: regexMatch,
    parseDateLike: parseDateLike,
    dateValue: dateValue,
    weekday: weekday,
    countIf: countIf,
    countIfs: countIfs,
    sumIf: sumIf,
    sumIfs: sumIfs,
    filterRows: filterRows,
    unique: unique,
    xmatch: xmatch,
    xmatchIndex: xmatchIndex,
    xlookup: xlookup,
    xlookupRow: xlookupRow,
    letIn: letIn,
    groupBy: groupBy,
  };

  return {
    FormulaEngine: FormulaEngine,
  };
});
