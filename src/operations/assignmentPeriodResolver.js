(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../import/importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.AssignmentPeriodResolver = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  var normalizeText = ImportTypes && typeof ImportTypes.normalizeText === "function"
    ? ImportTypes.normalizeText
    : function (value) { return String(value == null ? "" : value).trim(); };
  var normalizeRegisterCode = ImportTypes && typeof ImportTypes.normalizeRegisterCode === "function"
    ? ImportTypes.normalizeRegisterCode
    : function (value) { return normalizeText(value).toUpperCase(); };
  var matchUserRegisterScope = ImportTypes && typeof ImportTypes.matchUserRegisterScope === "function"
    ? ImportTypes.matchUserRegisterScope
    : function (left, right) { return normalizeRegisterCode(left) === normalizeRegisterCode(right); };

  function resolveAssignmentForRow(assignments, row, options) {
    options = options || {};
    var targetDate = normalizeIsoDate(options.date || row.date || row.assignmentDate || row.dateKey || row.month);
    var dashboardUserId = normalizeText(options.dashboardUserId || row.dashboardUserId || row.courierId || row.userId);
    var city = normalizeText(options.city || row.city);
    var register = normalizeRegisterCode(options.register || row.register);
    var platform = normalizeText(options.platform || row.platform).toLowerCase();

    var candidates = (assignments || []).filter(function (assignment) {
      if (dashboardUserId && normalizeText(assignment && (assignment.dashboardUserId || assignment.courierId || assignment.userId)) !== dashboardUserId) {
        return false;
      }
      if (city && normalizeText(assignment && assignment.city) && normalizeText(assignment.city) !== city) {
        return false;
      }
      if (register && normalizeRegisterCode(assignment && assignment.register)) {
        var assignmentRegister = normalizeRegisterCode(assignment.register);
        if (!(assignmentRegister === register || matchUserRegisterScope(assignmentRegister, register) || matchUserRegisterScope(register, assignmentRegister))) {
          return false;
        }
      }
      if (platform && normalizeText(assignment && assignment.platform).toLowerCase() && normalizeText(assignment.platform).toLowerCase() !== platform) {
        return false;
      }
      return matchesAssignmentDate(assignment, targetDate);
    });

    if (!candidates.length) {
      return null;
    }
    return candidates.sort(function (left, right) {
      return rankAssignment(right, targetDate) - rankAssignment(left, targetDate);
    })[0] || null;
  }

  function matchesAssignmentDate(assignment, targetDate) {
    if (!assignment) {
      return false;
    }
    var startDate = normalizeIsoDate(assignment.assignmentStartDate || assignment.startDate);
    var endDate = normalizeIsoDate(assignment.endDate || assignment.assignmentEndDate);
    if (!targetDate) {
      return normalizeText(assignment.status).toLowerCase() === "active" || !endDate;
    }
    if (startDate && targetDate < startDate) {
      return false;
    }
    if (endDate && targetDate > endDate) {
      return false;
    }
    return true;
  }

  function rankAssignment(assignment, targetDate) {
    var score = 0;
    var status = normalizeText(assignment && (assignment.assignmentStatus || assignment.status)).toLowerCase();
    var startDate = normalizeIsoDate(assignment && (assignment.assignmentStartDate || assignment.startDate));
    var endDate = normalizeIsoDate(assignment && (assignment.endDate || assignment.assignmentEndDate));
    if (status === "active") {
      score += 400;
    }
    if (matchesAssignmentDate(assignment, targetDate)) {
      score += 300;
    }
    if (startDate) {
      score += dateWeight(startDate);
    }
    if (endDate) {
      score += 10;
    }
    return score;
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
    if (/^\d{4}-\d{2}$/.test(text)) {
      return text + "-01";
    }
    var digits = text.replace(/[^\d]/g, "");
    if (digits.length === 8) {
      return digits.slice(0, 4) + "-" + digits.slice(4, 6) + "-" + digits.slice(6, 8);
    }
    return "";
  }

  function dateWeight(value) {
    return Number(String(value).replace(/[^\d]/g, "").slice(0, 8)) || 0;
  }

  return {
    matchesAssignmentDate: matchesAssignmentDate,
    normalizeIsoDate: normalizeIsoDate,
    rankAssignment: rankAssignment,
    resolveAssignmentForRow: resolveAssignmentForRow
  };
});
