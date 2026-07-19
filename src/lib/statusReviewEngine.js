(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./formulaEngine.js").FormulaEngine);
    return;
  }

  root.KeetaV6 = root.KeetaV6 || {};
  Object.assign(root.KeetaV6, factory(root.KeetaV6.FormulaEngine));
})(typeof globalThis !== "undefined" ? globalThis : this, function (FormulaEngine) {
  "use strict";

  var ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

  function normalizeDigits(text) {
    return String(text == null ? "" : text).replace(/[٠-٩]/g, function (digit) {
      return String(ARABIC_DIGITS.indexOf(digit));
    });
  }

  function parseArabicDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Date(value.getTime());
    }

    var raw = normalizeDigits(String(value == null ? "" : value))
      .replace(/،/g, ",")
      .replace(/\s+/g, " ")
      .trim();

    if (!raw) {
      return null;
    }

    var meridiem = "";
    if (/(^|\s)ص($|\s)|am/i.test(raw)) {
      meridiem = "AM";
    } else if (/(^|\s)م($|\s)|pm/i.test(raw)) {
      meridiem = "PM";
    }

    raw = raw
      .replace(/\bAM\b/gi, "")
      .replace(/\bPM\b/gi, "")
      .replace(/(^|\s)[صم]($|\s)/g, " ")
      .trim();

    if (/^\d{8}$/.test(raw)) {
      return new Date(Number(raw.slice(0, 4)), Number(raw.slice(4, 6)) - 1, Number(raw.slice(6, 8)));
    }

    var pieces = raw.split(",");
    var datePart = pieces[0].trim();
    var timePart = pieces[1] ? pieces[1].trim() : "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return new Date(datePart + "T" + (timePart || "00:00:00"));
    }

    var dateSegments = datePart.split(/[\/\-.]/);
    if (dateSegments.length === 3) {
      var day = Number(dateSegments[0]);
      var month = Number(dateSegments[1]) - 1;
      var year = Number(dateSegments[2]);
      if (year < 100) {
        year += 2000;
      }

      var hours = 0;
      var minutes = 0;
      var seconds = 0;
      if (timePart) {
        var timeSegments = timePart.split(":").map(Number);
        hours = timeSegments[0] || 0;
        minutes = timeSegments[1] || 0;
        seconds = timeSegments[2] || 0;
        if (meridiem === "PM" && hours < 12) {
          hours += 12;
        }
        if (meridiem === "AM" && hours === 12) {
          hours = 0;
        }
      }

      return new Date(year, month, day, hours, minutes, seconds);
    }

    return FormulaEngine && FormulaEngine.parseDateLike ? FormulaEngine.parseDateLike(raw) : null;
  }

  function formatDateTime(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-") + " " + [
      String(date.getHours()).padStart(2, "0"),
      String(date.getMinutes()).padStart(2, "0"),
      String(date.getSeconds()).padStart(2, "0"),
    ].join(":");
  }

  function addDays(date, count) {
    var result = new Date(date.getTime());
    result.setDate(result.getDate() + Number(count || 0));
    return result;
  }

  function reviewStatusRows(rows, options) {
    var settings = Object.assign({
      now: new Date(),
      idField: "المعرف",
      statusField: "الحالة",
      dateField: "تاريخ التقييد",
      daysField: "عدد الايام",
      restrictedStatus: "مقيد بالايام",
      activeStatus: "شغال",
      notePrefix: "تاريخ اخر تقييد للمعرف:",
    }, options || {});

    var outputRows = [];
    var changes = [];

    (rows || []).forEach(function (row) {
      var next = Object.assign({}, row);
      var status = String(next[settings.statusField] == null ? "" : next[settings.statusField]).trim();

      if (status !== settings.restrictedStatus) {
        outputRows.push(next);
        return;
      }

      var startDate = parseArabicDate(next[settings.dateField]);
      var days = Number(next[settings.daysField] || 0);
      if (!startDate || Number.isNaN(startDate.getTime()) || !Number.isFinite(days)) {
        outputRows.push(next);
        return;
      }

      var endDate = addDays(startDate, days);
      if (settings.now >= endDate) {
        next[settings.statusField] = settings.activeStatus;
        next[settings.dateField] = settings.notePrefix + " " + formatDateTime(startDate) + " لمدة " + days + " يوم";
        changes.push({
          id: next[settings.idField],
          previousStatus: status,
          nextStatus: settings.activeStatus,
          restrictionStart: formatDateTime(startDate),
          days: days,
          endDate: formatDateTime(endDate),
        });
      }

      outputRows.push(next);
    });

    return {
      rows: outputRows,
      changes: changes,
    };
  }

  return {
    StatusReviewEngine: {
      parseArabicDate: parseArabicDate,
      formatDateTime: formatDateTime,
      addDays: addDays,
      reviewStatusRows: reviewStatusRows,
    },
  };
});
