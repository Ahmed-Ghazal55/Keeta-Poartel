(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./formulaEngine.js").FormulaEngine);
    return;
  }

  root.KeetaV6 = root.KeetaV6 || {};
  Object.assign(root.KeetaV6, factory(root.KeetaV6.FormulaEngine));
})(typeof globalThis !== "undefined" ? globalThis : this, function (FormulaEngine) {
  "use strict";

  var PLATFORM_ALIASES = {
    express: {
      platform: "express",
      userId: ["المعرف"],
      fullName: ["الاسم بالكامل"],
      iqama: ["رقم بطاقة الهوية", "رقم الهوية1"],
      phone: ["رقم الهاتف", "رقم التواصل", "رقم الجوال2"],
      vehicle: ["المركبة", "نوع المركبة"],
      status: ["الحالة"],
      register: ["السجل"],
      replacementName: ["البديل 1"],
      replacementIqama: ["رقم الهوية1"],
    },
    albwaba: {
      platform: "albwaba",
      userId: ["المعرف"],
      fullName: ["الاسم بالكامل"],
      iqama: ["رقم بطاقة الهوية", "رقم الهوية1"],
      phone: ["رقم الهاتف", "رقم التواصل"],
      vehicle: ["المركبة", "نوع المركبة"],
      status: ["الحالة"],
      register: ["السجل"],
      replacementName: ["البديل 1"],
      replacementIqama: ["رقم الهوية1"],
    },
    toggary: {
      platform: "togary",
      userId: ["المعرف"],
      fullName: ["الاسم بالكامل"],
      iqama: ["رقم بطاقة الهوية", "رقم الهوية1"],
      phone: ["رقم الهاتف", "رقم التواصل"],
      vehicle: ["المركبة", "نوع المركبة"],
      status: ["الحالة"],
      register: ["السجل"],
      replacementName: ["البديل 1"],
      replacementIqama: ["رقم الهوية1"],
    },
    perOrder: {
      platform: "per_order",
      userId: ["المعرف"],
      fullName: ["الاسم بالكامل"],
      iqama: ["رقم بطاقة الهوية", "رقم الهوية1"],
      phone: ["رقم الهاتف", "رقم التواصل"],
      vehicle: ["المركبة", "نوع المركبة"],
      status: ["الحالة"],
      register: ["السجل"],
      replacementName: ["البديل 1"],
      replacementIqama: ["رقم الهوية1"],
    },
  };

  function pick(rawRow, aliases) {
    var keys = Object.keys(rawRow || {});
    for (var index = 0; index < aliases.length; index += 1) {
      var target = FormulaEngine.normalizeHeader(aliases[index]);
      for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        if (FormulaEngine.normalizeHeader(keys[keyIndex]) === target) {
          return rawRow[keys[keyIndex]];
        }
      }
    }
    return "";
  }

  function normalizeOprRow(rawRow, adapterKey) {
    var adapter = PLATFORM_ALIASES[adapterKey] || PLATFORM_ALIASES.express;
    return {
      platform: adapter.platform,
      userId: FormulaEngine.text(pick(rawRow, adapter.userId)),
      fullName: FormulaEngine.text(pick(rawRow, adapter.fullName)),
      iqama: FormulaEngine.text(pick(rawRow, adapter.iqama)),
      phone: FormulaEngine.text(pick(rawRow, adapter.phone)),
      vehicle: FormulaEngine.text(pick(rawRow, adapter.vehicle)),
      status: FormulaEngine.text(pick(rawRow, adapter.status)),
      register: FormulaEngine.text(pick(rawRow, adapter.register)),
      replacementName: FormulaEngine.text(pick(rawRow, adapter.replacementName)),
      replacementIqama: FormulaEngine.text(pick(rawRow, adapter.replacementIqama)),
      raw: rawRow,
    };
  }

  function buildIndexes(datasets) {
    var rows = [];
    Object.keys(datasets || {}).forEach(function (platformKey) {
      (datasets[platformKey] || []).forEach(function (row) {
        rows.push(normalizeOprRow(row, platformKey));
      });
    });

    return {
      rows: rows,
      byUserId: new Map(rows.filter(function (row) { return row.userId; }).map(function (row) { return [row.userId, row]; })),
      byIqama: new Map(rows.filter(function (row) { return row.iqama; }).map(function (row) { return [row.iqama, row]; })),
    };
  }

  function searchRiders(indexes, query) {
    var needle = FormulaEngine.normalizeHeader(query);
    if (!needle) {
      return (indexes && indexes.rows) || [];
    }

    return ((indexes && indexes.rows) || []).filter(function (row) {
      return [
        row.userId,
        row.iqama,
        row.fullName,
        row.phone,
        row.vehicle,
        row.register,
      ].some(function (value) {
        return FormulaEngine.normalizeHeader(value).indexOf(needle) >= 0;
      });
    });
  }

  function assignReplacement(record, replacement, note) {
    var updated = Object.assign({}, record, {
      replacementName: replacement.fullName,
      replacementIqama: replacement.iqama,
      status: "شغال",
      note: note || "",
    });

    return {
      item: updated,
      audit: {
        action: "ASSIGN_REPLACEMENT",
        userId: record.userId,
        replacementIqama: replacement.iqama,
      },
    };
  }

  function swapAssignments(currentRecord, replacementRecord, note) {
    return {
      current: Object.assign({}, currentRecord, {
        replacementName: replacementRecord.fullName,
        replacementIqama: replacementRecord.iqama,
        note: note || "",
      }),
      replacement: Object.assign({}, replacementRecord, {
        replacementName: currentRecord.fullName,
        replacementIqama: currentRecord.iqama,
        note: note || "",
      }),
      audit: {
        action: "SWAP_ASSIGNMENT",
        userId: currentRecord.userId,
        replacementUserId: replacementRecord.userId,
      },
    };
  }

  function stopWithoutReplacement(record, note) {
    return {
      item: Object.assign({}, record, {
        replacementName: "",
        replacementIqama: "",
        status: "لا يعمل حاليا",
        note: note || "",
      }),
      audit: {
        action: "STOP_WITHOUT_REPLACEMENT",
        userId: record.userId,
      },
    };
  }

  return {
    OprEngine: {
      normalizeOprRow: normalizeOprRow,
      buildIndexes: buildIndexes,
      searchRiders: searchRiders,
      assignReplacement: assignReplacement,
      swapAssignments: swapAssignments,
      stopWithoutReplacement: stopWithoutReplacement,
    },
  };
});
