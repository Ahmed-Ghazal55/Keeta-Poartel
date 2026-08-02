(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./performanceCommon.js"),
      require("../operations/assignmentPeriodResolver.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.PerformanceAttribution = factory(
    root.KeetaPortal.PerformanceCommon,
    root.KeetaPortal.AssignmentPeriodResolver
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (Common, AssignmentPeriodResolver) {
  "use strict";

  function attributePerformanceRow(row, context) {
    row = row || {};
    context = context || {};
    var dashboardUserId = text(first(row.dashboardUserId, row.courierId, row.userId));
    var dashboardUser = findDashboardUser(context.dashboardUsers, dashboardUserId);
    var performanceDate = date(first(row.performanceDate, row.date, row.dateKey, row.month));
    var scope = {
      city: text(first(row.city, dashboardUser && dashboardUser.city)),
      dashboardUserId: dashboardUserId,
      date: performanceDate,
      platform: text(first(row.platform, dashboardUser && dashboardUser.platform, "keeta")).toLowerCase(),
      register: text(first(row.register, dashboardUser && dashboardUser.register)).toUpperCase()
    };
    var assignment = AssignmentPeriodResolver.resolveAssignmentForRow(
      context.assignments || [],
      row,
      scope
    );
    var issues = [];

    if (!dashboardUserId) {
      issues.push(issue("performance_dashboard_user_missing", "critical"));
    }
    if (!assignment) {
      issues.push(issue("performance_assignment_unresolved", "critical"));
    }
    if (dashboardUser && !text(dashboardUser.ownerIqama)) {
      issues.push(issue("performance_owner_missing", "warning"));
    }

    var actualRiderIqama = assignment
      ? text(first(assignment.actualRiderIqama, assignment.riderIqama))
      : "";
    var actualRiderSource = assignment
      ? normalizeRiderSource(first(assignment.actualRiderSource, assignment.riderSource))
      : "unknown";
    if (assignment && !actualRiderIqama) {
      issues.push(issue("performance_actual_rider_missing", "critical"));
    }
    if (assignment && actualRiderIqama && actualRiderSource === "unknown") {
      issues.push(issue("performance_actual_rider_source_mismatch", "warning"));
    }

    return merge({}, row, {
      assignmentId: assignment ? text(first(assignment.assignmentId, assignment.id)) : "",
      assignmentStartDate: assignment ? date(first(assignment.assignmentStartDate, assignment.startDate)) : "",
      assignmentEndDate: assignment ? date(first(assignment.assignmentEndDate, assignment.endDate)) : "",
      assignmentStatus: assignment ? text(first(assignment.assignmentStatus, assignment.status)) : "unresolved",
      attributionStatus: assignment && actualRiderIqama ? "attributed" : "unresolved",
      actualRiderIqama: actualRiderIqama,
      actualRiderName: assignment ? text(assignment.actualRiderName) : "",
      actualRiderSource: actualRiderSource,
      riderSource: actualRiderSource,
      ownerIqama: text(dashboardUser && dashboardUser.ownerIqama),
      ownerName: text(first(dashboardUser && dashboardUser.ownerName, dashboardUser && dashboardUser.fullName)),
      dashboardUserId: dashboardUserId,
      courierId: dashboardUserId,
      performanceDate: performanceDate,
      month: text(first(row.month, performanceDate.slice(0, 7))),
      city: scope.city,
      register: scope.register,
      platform: scope.platform,
      registeredVehicleSerial: text(dashboardUser && dashboardUser.vehicleSerial),
      registeredVehiclePlate: text(dashboardUser && dashboardUser.plateNumber),
      actualVehicleSerial: assignment ? text(first(assignment.actualVehicleSerial, assignment.vehicleSerial)) : "",
      actualVehiclePlate: assignment ? text(first(assignment.actualVehiclePlate, assignment.plateNumber)) : "",
      attributionIssues: issues
    });
  }

  function findDashboardUser(rows, id) {
    return (rows || []).find(function (row) {
      return text(first(row.dashboardUserId, row.courierId, row.userId)) === id;
    }) || null;
  }

  function normalizeRiderSource(value) {
    var normalized = text(value).toLowerCase();
    if (normalized === "hr" || normalized === "sponsorship" || normalized === "company") {
      return "hr";
    }
    if (normalized === "external" || normalized === "outsource" || normalized === "outsourced") {
      return "external";
    }
    return "unknown";
  }

  function issue(code, severity) {
    return { issueCode: code, severity: severity };
  }

  function date(value) {
    return AssignmentPeriodResolver.normalizeIsoDate(value);
  }

  function text(value) {
    return Common && Common.normalizeText ? Common.normalizeText(value) : String(value == null ? "" : value).trim();
  }

  function first() {
    for (var index = 0; index < arguments.length; index += 1) {
      if (text(arguments[index])) {
        return arguments[index];
      }
    }
    return "";
  }

  function merge(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  return {
    attributePerformanceRow: attributePerformanceRow,
    normalizeRiderSource: normalizeRiderSource
  };
});
