(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.HrViewModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var BASE_FILTER_KEYS = [
    "query",
    "register",
    "city",
    "employmentStatus",
    "kafalaStatus",
    "nationality",
    "documentStatus"
  ];

  var TAB_DEFINITIONS = [
    tab({ key: "hr_master", label: "HR Master" }),
    tab({ key: "active_hr_riders", label: "Active HR Riders" }),
    tab({ key: "inactive_hr_riders", label: "Inactive HR Riders" }),
    tab({ key: "documents", label: "Documents" }),
    tab({ key: "kafala_status", label: "Kafala Status" }),
    tab({ key: "hr_archive", label: "HR Archive", page: "archive-shell" })
  ];

  var TAB_DEFINITION_MAP = TAB_DEFINITIONS.reduce(function (memo, definition) {
    memo[definition.key] = definition;
    return memo;
  }, {});

  var ROUTE_ALIASES = {
    active: "active_hr_riders",
    active_hr_riders: "active_hr_riders",
    "active-hr-riders": "active_hr_riders",
    archive: "hr_archive",
    documents: "documents",
    document: "documents",
    hr_archive: "hr_archive",
    "hr-archive": "hr_archive",
    hr_master: "hr_master",
    "hr-master": "hr_master",
    inactive: "inactive_hr_riders",
    inactive_hr_riders: "inactive_hr_riders",
    "inactive-hr-riders": "inactive_hr_riders",
    kafala: "kafala_status",
    kafala_status: "kafala_status",
    "kafala-status": "kafala_status",
    master: "hr_master"
  };

  var SIDEBAR_ROUTE_MAP = {
    HR1: sidebarRoute("HR1", "hr-shell", "hr_master"),
    HR2: sidebarRoute("HR2", "hr-shell", "kafala_status"),
    HR3: sidebarRoute("HR3", "rider-master", "external_riders"),
    HR4: sidebarRoute("HR4", "archive-shell", "hr_archive"),
    HR5: sidebarRoute("HR5", "hr-shell", "documents")
  };

  function tab(options) {
    return mergeObjects({
      key: "",
      label: "",
      page: "hr-shell",
      visibleFilters: BASE_FILTER_KEYS.slice()
    }, options || {});
  }

  function sidebarRoute(code, page, subPage) {
    return {
      code: code,
      group: "hr",
      page: page,
      subPage: subPage
    };
  }

  function normalizeHrRoute(subPage) {
    var key = normalizeText(subPage).toLowerCase().replace(/\s+/g, "_");
    return ROUTE_ALIASES[key] || (TAB_DEFINITION_MAP[key] ? key : "hr_master");
  }

  function getTabDefinition(tabKey) {
    return TAB_DEFINITION_MAP[normalizeHrRoute(tabKey)] || TAB_DEFINITION_MAP.hr_master;
  }

  function listHrTabs() {
    return TAB_DEFINITIONS.map(function (definition) {
      return mergeObjects({}, definition, {
        visibleFilters: definition.visibleFilters.slice()
      });
    });
  }

  function getVisibleFilterKeys(tabKey) {
    return getTabDefinition(tabKey).visibleFilters.slice();
  }

  function buildHrRows(payload) {
    payload = payload || {};
    var hrProfiles = Array.isArray(payload.hrProfiles) ? payload.hrProfiles : [];
    var dashboardUsers = Array.isArray(payload.dashboardUsers) ? payload.dashboardUsers : [];
    var assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
    var assignmentHistory = Array.isArray(payload.assignmentHistory) ? payload.assignmentHistory : [];
    var terminations = Array.isArray(payload.terminations) ? payload.terminations : [];
    var riderOperationalProfiles = Array.isArray(payload.riderOperationalProfiles) ? payload.riderOperationalProfiles : [];

    var dashboardUsersByOwnerIqama = groupByNormalized(dashboardUsers, "ownerIqama");
    var activeAssignmentsByActualIqama = groupByNormalized(assignments.filter(isActiveAssignment), "actualRiderIqama");
    var activeAssignmentsByOwnerIqama = groupByNormalized(assignments.filter(isActiveAssignment), "ownerIqama");
    var historicalAssignmentsByIqama = {};
    var operationalProfilesByIqama = indexByNormalized(riderOperationalProfiles, "iqama");

    assignmentHistory.forEach(function (item) {
      addHistoryItem(historicalAssignmentsByIqama, item.previousRiderIqama, item);
      addHistoryItem(historicalAssignmentsByIqama, item.newRiderIqama, item);
    });
    terminations.forEach(function (item) {
      addHistoryItem(historicalAssignmentsByIqama, item.riderIqama, item);
    });

    return hrProfiles.map(function (profile) {
      var iqama = normalizeText(profile && profile.iqama);
      var linkedDashboardUsers = dashboardUsersByOwnerIqama[iqama] || [];
      var currentActualAssignments = activeAssignmentsByActualIqama[iqama] || [];
      var currentOwnerAssignments = activeAssignmentsByOwnerIqama[iqama] || [];
      var historicalAssignments = historicalAssignmentsByIqama[iqama] || [];
      var operationalProfile = operationalProfilesByIqama[iqama] || null;
      var employmentStatus = normalizeEmploymentStatus(profile);
      var isActive = employmentStatus === "active";
      var kafalaStatus = normalizeKafalaStatus(profile);
      var documentStatus = deriveDocumentStatus(profile);
      var warnings = deriveWarnings({
        currentActualAssignments: currentActualAssignments,
        currentOwnerAssignments: currentOwnerAssignments,
        documentStatus: documentStatus,
        linkedDashboardUsers: linkedDashboardUsers,
        profile: profile
      });
      var row = {
        id: profile.id || iqama,
        profileId: profile.id || "",
        iqama: profile.iqama || "",
        name: profile.fullNameArabic || profile.fullName || profile.fullNameEnglish || profile.employeeName || "",
        mobile: profile.mobile || profile.phoneNumber || profile.phone || "",
        nationality: profile.nationality || "",
        register: profile.register || profile.registerCode || "",
        registerName: profile.registerName || profile.register || "",
        city: profile.city || profile.branch || "",
        employmentStatus: employmentStatus,
        employmentType: normalizeText(profile.employmentType || profile.workType || ""),
        hrStatus: normalizeText(profile.hrStatus || employmentStatus),
        kafalaStatus: kafalaStatus,
        documentStatus: documentStatus,
        linkedDashboardUsers: linkedDashboardUsers.slice(),
        linkedDashboardUserCount: linkedDashboardUsers.length,
        currentActualAssignments: currentActualAssignments.slice(),
        currentActualAssignmentCount: currentActualAssignments.length,
        currentOwnerAssignments: currentOwnerAssignments.slice(),
        currentOwnerAssignmentCount: currentOwnerAssignments.length,
        historicalAssignments: historicalAssignments.slice(),
        historicalAssignmentCount: historicalAssignments.length,
        operationalProfile: operationalProfile,
        operationalProfileId: operationalProfile ? operationalProfile.id || "" : "",
        notes: profile.notes || "",
        warningCodes: warnings,
        warningCount: warnings.length,
        isActive: isActive,
        isOnKafala: kafalaStatus === "on_kafala",
        isDocumentMissing: documentStatus === "missing" || documentStatus === "expired",
        isCurrentlyWorking: currentActualAssignments.length > 0,
        isLinkedToDashboard: linkedDashboardUsers.length > 0,
        needsReview: warnings.length > 0,
        sourceType: "hr_profile"
      };
      row.__searchText = [
        row.profileId,
        row.iqama,
        row.name,
        row.mobile,
        row.nationality,
        row.register,
        row.registerName,
        row.city,
        row.employmentStatus,
        row.kafalaStatus,
        row.documentStatus,
        linkedDashboardUsers.map(function (item) { return item.dashboardUserId || item.userId || ""; }).join(" "),
        currentActualAssignments.map(function (item) { return item.dashboardUserId || item.userId || ""; }).join(" "),
        warnings.join(" ")
      ].join(" ").toLowerCase();
      return row;
    }).sort(function (left, right) {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }
      return String(left.name || "").localeCompare(String(right.name || ""));
    });
  }

  function filterHrRows(rows, filters, tabKey) {
    filters = filters || {};
    return (rows || []).filter(function (row) {
      if (!matchesSearch(row.__searchText, filters.query)) {
        return false;
      }
      if (!matchesFilter(row.register, filters.register)) {
        return false;
      }
      if (!matchesFilter(row.city, filters.city)) {
        return false;
      }
      if (!matchesFilter(row.employmentStatus, filters.employmentStatus)) {
        return false;
      }
      if (!matchesFilter(row.kafalaStatus, filters.kafalaStatus, normalizeKafalaValue)) {
        return false;
      }
      if (!matchesFilter(row.nationality, filters.nationality)) {
        return false;
      }
      if (!matchesFilter(row.documentStatus, filters.documentStatus)) {
        return false;
      }
      return matchesTab(row, tabKey);
    });
  }

  function buildHrKpis(rows) {
    var list = Array.isArray(rows) ? rows : [];
    return {
      active: count(list, function (row) { return row.isActive; }),
      currentlyWorking: count(list, function (row) { return row.isCurrentlyWorking; }),
      inactive: count(list, function (row) { return !row.isActive; }),
      linkedDashboardUsers: count(list, function (row) { return row.isLinkedToDashboard; }),
      missingDocuments: count(list, function (row) { return row.isDocumentMissing; }),
      needsReview: count(list, function (row) { return row.needsReview; }),
      offKafala: count(list, function (row) { return !row.isOnKafala; }),
      onKafala: count(list, function (row) { return row.isOnKafala; }),
      totalHrRiders: list.length
    };
  }

  function findHrRow(rows, focus) {
    focus = focus || {};
    var normalizedIqama = normalizeText(focus.iqama || focus.ownerIqama || focus.actualRiderIqama);
    var normalizedProfileId = normalizeText(focus.profileId || focus.entityId);
    return (rows || []).filter(function (row) {
      return (normalizedProfileId && normalizeText(row.profileId) === normalizedProfileId) ||
        (normalizedIqama && normalizeText(row.iqama) === normalizedIqama);
    })[0] || null;
  }

  function buildHrFocusDetail(row, options) {
    row = row || {};
    options = options || {};
    var tabKey = normalizeHrRoute(options.tabKey || options.linkedSubPage || "hr_master");
    return {
      sourceModule: "hr",
      entityType: "hr_profile",
      entityId: row.profileId || row.id || row.iqama || "",
      ownerIqama: options.ownerIqama || row.iqama || "",
      actualRiderIqama: options.actualRiderIqama || "",
      vehicleSerial: options.vehicleSerial || "",
      plateNumber: options.plateNumber || "",
      dashboardUserId: options.dashboardUserId || "",
      assignmentId: options.assignmentId || "",
      register: row.register || options.register || "",
      city: row.city || options.city || "",
      platform: options.platform || "",
      linkedPage: getTabDefinition(tabKey).page,
      linkedSubPage: tabKey,
      linkedFilters: mergeObjects({
        city: row.city || "",
        query: row.iqama || row.name || "",
        register: row.register || ""
      }, cloneValue(options.linkedFilters) || {}),
      linkedDrawer: "hr_profile",
      missingTarget: !row.profileId && !row.iqama
    };
  }

  function buildHrIssueFocus(issueType, options) {
    options = options || {};
    return mergeObjects({
      sourceModule: "hr",
      issueType: issueType,
      entityType: "hr_profile",
      entityId: options.entityId || options.ownerIqama || options.actualRiderIqama || "",
      ownerIqama: options.ownerIqama || "",
      actualRiderIqama: options.actualRiderIqama || "",
      dashboardUserId: options.dashboardUserId || "",
      assignmentId: options.assignmentId || "",
      register: options.register || "",
      city: options.city || "",
      platform: options.platform || "",
      linkedPage: options.linkedPage || "hr-shell",
      linkedSubPage: normalizeHrRoute(options.linkedSubPage || "hr_master"),
      linkedFilters: cloneValue(options.linkedFilters) || {},
      linkedDrawer: "hr_profile"
    }, cloneValue(options.extra) || {});
  }

  function getSidebarRouteMap() {
    return cloneValue(SIDEBAR_ROUTE_MAP);
  }

  function addHistoryItem(bucket, iqama, item) {
    var key = normalizeText(iqama);
    if (!key) {
      return;
    }
    bucket[key] = bucket[key] || [];
    bucket[key].push(item);
  }

  function deriveWarnings(context) {
    var warnings = [];
    if (context.documentStatus === "missing" || context.documentStatus === "expired") {
      warnings.push("documents_incomplete");
    }
    if (context.currentOwnerAssignments.length && normalizeEmploymentStatus(context.profile) !== "active") {
      warnings.push("owner_not_active_but_dashboard_linked");
    }
    if (context.currentActualAssignments.length && !normalizeText(context.profile.iqama)) {
      warnings.push("actual_assignment_without_iqama");
    }
    if (normalizeKafalaStatus(context.profile) !== "on_kafala") {
      warnings.push("outside_kafala");
    }
    return warnings;
  }

  function deriveDocumentStatus(profile) {
    var expiryFlags = [
      profile && profile.licenseExpiry,
      profile && profile.healthCardExpiry,
      profile && profile.residencyExpiry
    ];
    if (expiryFlags.some(isExpiredDateLike)) {
      return "expired";
    }
    var statusValues = [
      normalizeText(profile && profile.licenseState).toLowerCase(),
      normalizeText(profile && profile.healthCardStatus).toLowerCase(),
      normalizeText(profile && profile.residencyStatus).toLowerCase()
    ].filter(Boolean);
    if (!statusValues.length) {
      return "missing";
    }
    if (statusValues.some(function (value) {
      return value.indexOf("missing") >= 0 || value.indexOf("expired") >= 0 || value.indexOf("not") >= 0;
    })) {
      return "missing";
    }
    if (statusValues.some(function (value) {
      return value.indexOf("review") >= 0 || value.indexOf("pending") >= 0;
    })) {
      return "review";
    }
    return "complete";
  }

  function normalizeEmploymentStatus(profile) {
    var value = normalizeText(profile && (profile.hrStatus || profile.employmentStatus || profile.status)).toLowerCase();
    if (value.indexOf("exit") >= 0 || value.indexOf("terminate") >= 0 || value.indexOf("left") >= 0) {
      return "exited";
    }
    if (value.indexOf("inactive") >= 0 || value.indexOf("not_started") >= 0 || value.indexOf("stopped") >= 0) {
      return "inactive";
    }
    if (value.indexOf("review") >= 0 || value.indexOf("pending") >= 0) {
      return "under_review";
    }
    if (value.indexOf("active") >= 0 || value.indexOf("working") >= 0 || value.indexOf("service") >= 0 || value.indexOf("ÙÙŠ Ø§Ù„Ø®Ø¯Ù…Ø©") >= 0) {
      return "active";
    }
    return value || "inactive";
  }

  function normalizeKafalaStatus(profile) {
    return normalizeKafalaValue(profile && (profile.kafalaStatus || profile.employmentType || profile.workType || ""));
  }

  function normalizeKafalaValue(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (!normalized) {
      return "unknown";
    }
    if ((normalized.indexOf("على") >= 0 || normalized.indexOf("داخل") >= 0) && normalized.indexOf("كفال") >= 0) {
      return "on_kafala";
    }
    if ((normalized.indexOf("خارج") >= 0 || normalized.indexOf("off") >= 0) && normalized.indexOf("كفال") >= 0) {
      return "off_kafala";
    }
    if (normalized === "on_kafala" || normalized.indexOf("ÙƒÙØ§Ù„Ø©") >= 0 || normalized.indexOf("Ø§Ù„ÙƒÙØ§Ù„Ø©") >= 0 || normalized.indexOf("sponsorship") >= 0) {
      if (normalized.indexOf("outside") >= 0 || normalized.indexOf("external") >= 0 || normalized.indexOf("off_") >= 0) {
        return "off_kafala";
      }
      return "on_kafala";
    }
    if (normalized === "off_kafala") {
      return "off_kafala";
    }
    if (normalized.indexOf("kafala") >= 0 || normalized.indexOf("sponsorship") >= 0 || normalized.indexOf("ÙƒÙØ§Ù„Ø©") >= 0) {
      return normalized.indexOf("outside") >= 0 || normalized.indexOf("external") >= 0
        ? "off_kafala"
        : "on_kafala";
    }
    if (normalized.indexOf("free") >= 0 || normalized.indexOf("external") >= 0 || normalized.indexOf("freelancer") >= 0) {
      return "off_kafala";
    }
    return normalized;
  }

  function isActiveAssignment(item) {
    return normalizeText(item && (item.assignmentStatus || item.status)).toLowerCase() === "active";
  }

  function matchesTab(row, tabKey) {
    switch (normalizeHrRoute(tabKey)) {
      case "active_hr_riders":
        return row.isActive;
      case "inactive_hr_riders":
        return !row.isActive;
      case "documents":
        return row.documentStatus !== "complete";
      case "kafala_status":
        return true;
      case "hr_archive":
        return !row.isActive || row.historicalAssignmentCount > 0;
      case "hr_master":
      default:
        return true;
    }
  }

  function matchesSearch(text, query) {
    var normalizedQuery = normalizeText(query).toLowerCase();
    if (!normalizedQuery) {
      return true;
    }
    var normalizedText = normalizeText(text).toLowerCase();
    if (normalizedText.indexOf(normalizedQuery) >= 0) {
      return true;
    }
    return normalizedQuery.split(/\s+/).filter(Boolean).every(function (token) {
      return normalizedText.indexOf(token) >= 0;
    });
  }

  function matchesFilter(value, expected, normalizer) {
    var normalizedExpected = normalizeText(expected);
    if (!normalizedExpected || normalizedExpected === "all") {
      return true;
    }
    var transform = typeof normalizer === "function" ? normalizer : normalizeText;
    return transform(value).toLowerCase() === transform(normalizedExpected).toLowerCase();
  }

  function groupByNormalized(rows, fieldName) {
    return (rows || []).reduce(function (memo, item) {
      var key = normalizeText(item && item[fieldName]);
      if (!key) {
        return memo;
      }
      memo[key] = memo[key] || [];
      memo[key].push(item);
      return memo;
    }, {});
  }

  function indexByNormalized(rows, fieldName) {
    return (rows || []).reduce(function (memo, item) {
      var key = normalizeText(item && item[fieldName]);
      if (key) {
        memo[key] = item;
      }
      return memo;
    }, {});
  }

  function isExpiredDateLike(value) {
    var normalized = normalizeText(value);
    if (!normalized) {
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
      return false;
    }
    return normalized.slice(0, 10) < "2026-07-19";
  }

  function count(rows, predicate) {
    return (rows || []).filter(predicate).length;
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  function cloneValue(value) {
    if (!value || typeof value !== "object") {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  return {
    BASE_FILTER_KEYS: BASE_FILTER_KEYS.slice(),
    ROUTE_ALIASES: mergeObjects({}, ROUTE_ALIASES),
    SIDEBAR_ROUTE_MAP: getSidebarRouteMap(),
    TAB_DEFINITIONS: listHrTabs(),
    buildHrFocusDetail: buildHrFocusDetail,
    buildHrIssueFocus: buildHrIssueFocus,
    buildHrKpis: buildHrKpis,
    buildHrRows: buildHrRows,
    filterHrRows: filterHrRows,
    findHrRow: findHrRow,
    getSidebarRouteMap: getSidebarRouteMap,
    getTabDefinition: getTabDefinition,
    getVisibleFilterKeys: getVisibleFilterKeys,
    listHrTabs: listHrTabs,
    normalizeHrRoute: normalizeHrRoute
  };
});
