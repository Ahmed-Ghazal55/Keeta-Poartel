(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.PerformanceViewModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SUBPAGES = [
    "performance_overview",
    "overall_performance",
    "daily_performance",
    "vda",
    "face_verification",
    "delivery_experience",
    "validity_results",
    "issues"
  ];
  var ALIASES = {
    results: "validity_results",
    overview: "performance_overview",
    overall: "overall_performance",
    "overall-performance": "overall_performance",
    "daily-performance": "daily_performance",
    vda_keeta: "vda",
    "vda-keeta": "vda",
    "face-verification": "face_verification",
    "delivery-experience": "delivery_experience",
    "follow-up": "issues",
    validity: "validity_results"
  };
  var VALIDITY_STATUSES = ["valid", "warning", "invalid", "blocked", "missing_data", "under_review"];

  function normalizeSubPage(value) {
    var key = text(value).toLowerCase();
    key = ALIASES[key] || key;
    return SUBPAGES.indexOf(key) >= 0 ? key : "performance_overview";
  }

  function getSidebarRouteMap() {
    return {
      PF1: route("PF1", "performance_overview"),
      PF2: route("PF2", "overall_performance"),
      PF3: route("PF3", "daily_performance"),
      PF4: route("PF4", "vda"),
      PF5: route("PF5", "face_verification"),
      PF6: route("PF6", "delivery_experience"),
      PF7: route("PF7", "validity_results"),
      PF8: route("PF8", "issues")
    };
  }

  function normalizeFilters(filters) {
    filters = filters || {};
    return {
      register: text(filters.register),
      city: text(filters.city),
      platform: text(filters.platform).toLowerCase(),
      month: text(filters.month).slice(0, 7),
      dashboardUserId: text(filters.dashboardUserId || filters.courierId),
      ownerIqama: text(filters.ownerIqama),
      actualRiderIqama: text(filters.actualRiderIqama),
      riderSource: normalizeChoice(filters.riderSource, ["hr", "external"], "all"),
      vehicleType: normalizeChoice(filters.vehicleType, ["car", "bike"], "all"),
      assignmentStatus: normalizeChoice(filters.assignmentStatus, ["active", "ended", "unresolved"], "all"),
      validityStatus: normalizeChoice(filters.validityStatus, VALIDITY_STATUSES, "all"),
      issueSeverity: normalizeChoice(filters.issueSeverity, ["info", "low", "warning", "medium", "high", "critical"], "all"),
      query: text(filters.query).toLowerCase()
    };
  }

  function filterRows(rows, filters) {
    var target = normalizeFilters(filters);
    return (rows || []).filter(function (row) {
      if (!match(row.register, target.register) || !match(row.city, target.city) || !matchLower(row.platform, target.platform)) return false;
      if (target.month && text(row.month || row.performanceDate || row.date).slice(0, 7) !== target.month) return false;
      if (!match(row.dashboardUserId || row.courierId || row.userId, target.dashboardUserId)) return false;
      if (!match(row.ownerIqama, target.ownerIqama) || !match(row.actualRiderIqama, target.actualRiderIqama)) return false;
      if (target.riderSource !== "all" && text(row.actualRiderSource || row.riderSource).toLowerCase() !== target.riderSource) return false;
      if (target.vehicleType !== "all" && text(row.vehicleType).toLowerCase() !== target.vehicleType) return false;
      if (target.assignmentStatus !== "all" && text(row.assignmentStatus).toLowerCase() !== target.assignmentStatus) return false;
      if (target.validityStatus !== "all" && normalizeValidityStatus(row.status || row.validityStatus) !== target.validityStatus) return false;
      if (target.issueSeverity !== "all" && text(row.severity).toLowerCase() !== target.issueSeverity) return false;
      if (target.query && searchable(row).indexOf(target.query) < 0) return false;
      return true;
    });
  }

  function normalizeValidityStatus(value) {
    var key = text(value).toLowerCase();
    var aliases = { eligible: "valid", not_eligible: "invalid", no_data: "missing_data", pass: "valid", fail: "invalid" };
    key = aliases[key] || key;
    return VALIDITY_STATUSES.indexOf(key) >= 0 ? key : "under_review";
  }

  function buildIssueMetadata(issue, row) {
    issue = issue || {};
    row = row || {};
    return {
      sourceModule: text(issue.sourceModule || "performance"),
      entityType: text(issue.entityType || "performance_issue"),
      entityId: text(issue.entityId || issue.id),
      dashboardUserId: text(row.dashboardUserId || row.courierId || row.userId),
      courierId: text(row.dashboardUserId || row.courierId || row.userId),
      ownerIqama: text(row.ownerIqama),
      actualRiderIqama: text(row.actualRiderIqama),
      assignmentId: text(row.assignmentId),
      vehicleSerial: text(row.actualVehicleSerial || row.registeredVehicleSerial),
      date: text(row.performanceDate || row.date),
      month: text(row.month),
      register: text(row.register),
      city: text(row.city),
      platform: text(row.platform),
      issueCode: text(issue.issueCode || issue.issueType),
      severity: text(issue.severity || "warning"),
      linkedPage: text(issue.linkedPage || "performance-shell"),
      linkedSubPage: normalizeSubPage(issue.linkedSubPage || "issues"),
      linkedFilters: issue.linkedFilters || {
        month: text(row.month),
        dashboardUserId: text(row.dashboardUserId || row.courierId || row.userId)
      },
      linkedDrawer: issue.linkedDrawer || { entityId: text(row.id), mode: "details" }
    };
  }

  function route(code, subPage) {
    return { code: code, group: "performance", page: "performance-shell", subPage: subPage };
  }

  function searchable(row) {
    return [
      row.dashboardUserId, row.courierId, row.userId, row.ownerIqama, row.ownerName,
      row.actualRiderIqama, row.actualRiderName, row.assignmentId,
      row.registeredVehicleSerial, row.actualVehicleSerial, row.city, row.register, row.platform
    ].join(" ").toLowerCase();
  }

  function match(value, expected) {
    return !expected || text(value) === expected;
  }
  function matchLower(value, expected) {
    return !expected || text(value).toLowerCase() === expected;
  }
  function normalizeChoice(value, allowed, fallback) {
    var key = text(value).toLowerCase();
    return allowed.indexOf(key) >= 0 ? key : fallback;
  }
  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  return {
    ALIASES: ALIASES,
    SUBPAGES: SUBPAGES,
    VALIDITY_STATUSES: VALIDITY_STATUSES,
    buildIssueMetadata: buildIssueMetadata,
    filterRows: filterRows,
    getSidebarRouteMap: getSidebarRouteMap,
    normalizeFilters: normalizeFilters,
    normalizeSubPage: normalizeSubPage,
    normalizeValidityStatus: normalizeValidityStatus
  };
});
