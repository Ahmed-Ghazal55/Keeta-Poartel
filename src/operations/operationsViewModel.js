(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.OperationsViewModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var BASE_FILTER_KEYS = ["search", "register", "city", "platform"];
  var DASHBOARD_FILTER_KEYS = BASE_FILTER_KEYS.concat([
    "lifecycleStatus",
    "assignmentReadiness",
    "reviewStatus",
    "employmentStatus",
    "operationMode",
    "vehicleType"
  ]);
  var ASSIGNMENT_FILTER_KEYS = BASE_FILTER_KEYS.concat([
    "assignmentStatus",
    "riderSource",
    "supervisor",
    "operationMode",
    "vehicleType"
  ]);
  var SEARCH_ONLY_FILTER_KEYS = ["search"];

  var TAB_DEFINITIONS = [
    tab({
      key: "dashboard_users",
      label: "يوزرات الداشبورد",
      dataset: "dashboard",
      visibleFilters: DASHBOARD_FILTER_KEYS,
      importButtons: ["dashboard_users_import", "current_assignments_import"]
    }),
    tab({
      key: "needs_assignment",
      label: "التسكين لأول مرة",
      dataset: "dashboard",
      visibleFilters: DASHBOARD_FILTER_KEYS,
      importButtons: ["dashboard_users_import", "current_assignments_import"]
    }),
    tab({
      key: "current_assignments",
      label: "التسكين الحالي",
      dataset: "assignments",
      visibleFilters: ASSIGNMENT_FILTER_KEYS,
      importButtons: ["dashboard_users_import", "current_assignments_import"]
    }),
    tab({
      key: "working",
      label: "اليوزرات التي تعمل",
      dataset: "dashboard",
      visibleFilters: DASHBOARD_FILTER_KEYS,
      importButtons: ["dashboard_users_import", "current_assignments_import"]
    }),
    tab({
      key: "per_order",
      label: "بالطلب",
      dataset: "assignments",
      optional: true,
      visibleFilters: ASSIGNMENT_FILTER_KEYS,
      importButtons: ["dashboard_users_import", "current_assignments_import"]
    }),
    tab({
      key: "salary",
      label: "راتب",
      dataset: "assignments",
      optional: true,
      visibleFilters: ASSIGNMENT_FILTER_KEYS,
      importButtons: ["dashboard_users_import", "current_assignments_import"]
    }),
    tab({
      key: "external_mode",
      label: "خارجي",
      dataset: "assignments",
      optional: true,
      visibleFilters: ASSIGNMENT_FILTER_KEYS,
      importButtons: ["dashboard_users_import", "current_assignments_import"]
    }),
    tab({
      key: "replacement",
      label: "بديل",
      dataset: "assignments",
      optional: true,
      visibleFilters: ASSIGNMENT_FILTER_KEYS,
      importButtons: ["dashboard_users_import", "current_assignments_import"]
    }),
    tab({
      key: "stopped",
      label: "موقوفة",
      dataset: "assignments",
      optional: true,
      visibleFilters: ASSIGNMENT_FILTER_KEYS,
      importButtons: ["dashboard_users_import", "current_assignments_import"]
    }),
    tab({
      key: "working_riders",
      label: "المناديب التي تعمل",
      dataset: "riders",
      visibleFilters: SEARCH_ONLY_FILTER_KEYS
    }),
    tab({
      key: "needs_review",
      label: "تحتاج مراجعة",
      dataset: "dashboard",
      visibleFilters: DASHBOARD_FILTER_KEYS,
      importButtons: ["dashboard_users_import", "current_assignments_import"]
    }),
    tab({
      key: "swaps",
      label: "التبديلات",
      dataset: "swaps",
      visibleFilters: SEARCH_ONLY_FILTER_KEYS
    }),
    tab({
      key: "terminations",
      label: "الإقالات",
      dataset: "terminations",
      visibleFilters: SEARCH_ONLY_FILTER_KEYS
    }),
    tab({
      key: "audit_log",
      label: "سجل العمليات",
      dataset: "audit",
      visibleFilters: SEARCH_ONLY_FILTER_KEYS,
      requiresAuditPermission: true
    })
  ];

  var TAB_DEFINITION_MAP = TAB_DEFINITIONS.reduce(function (memo, definition) {
    memo[definition.key] = definition;
    return memo;
  }, {});

  var ROUTE_ALIASES = {
    audit_log: "audit_log",
    "audit-log": "audit_log",
    current_assignments: "current_assignments",
    "current-assignments": "current_assignments",
    dashboard_users: "dashboard_users",
    "dashboard-users": "dashboard_users",
    external: "external_mode",
    external_mode: "external_mode",
    "first-assignment": "needs_assignment",
    needs_assignment: "needs_assignment",
    "operations-log": "audit_log",
    per_order: "per_order",
    "per-order": "per_order",
    replacement: "replacement",
    salary: "salary",
    stopped: "stopped",
    swaps: "swaps",
    terminations: "terminations",
    working: "working",
    "working-riders": "working_riders",
    working_riders: "working_riders",
    "working-users": "working",
    "user-status": "needs_review",
    needs_review: "needs_review"
  };

  var SIDEBAR_ROUTE_MAP = {
    OP1: sidebarRoute("OP1", "dashboard_users"),
    OP2: sidebarRoute("OP2", "working"),
    OP3: sidebarRoute("OP3", "working_riders"),
    OP4: sidebarRoute("OP4", "needs_assignment"),
    OP5: sidebarRoute("OP5", "swaps"),
    OP6: sidebarRoute("OP6", "needs_review"),
    OP7: sidebarRoute("OP7", "terminations"),
    OP8: sidebarRoute("OP8", "audit_log")
  };

  function tab(options) {
    return mergeObjects({
      dataset: "dashboard",
      importButtons: [],
      key: "",
      label: "",
      optional: false,
      requiresAuditPermission: false,
      visibleFilters: BASE_FILTER_KEYS.slice()
    }, options || {});
  }

  function sidebarRoute(code, subPage) {
    return {
      code: code,
      group: "ops",
      page: "operations-shell",
      subPage: subPage
    };
  }

  function normalizeOperationsRoute(subPage) {
    var key = normalizeText(subPage).toLowerCase().replace(/\s+/g, "_");
    return ROUTE_ALIASES[key] || (TAB_DEFINITION_MAP[key] ? key : "dashboard_users");
  }

  function getTabDefinition(tabKey) {
    return TAB_DEFINITION_MAP[normalizeOperationsRoute(tabKey)] || TAB_DEFINITION_MAP.dashboard_users;
  }

  function listOperationTabs(options) {
    var includeOptional = !options || options.includeOptional !== false;
    var includeAudit = !options || options.includeAudit !== false;
    return TAB_DEFINITIONS.filter(function (definition) {
      if (!includeOptional && definition.optional) {
        return false;
      }
      if (!includeAudit && definition.key === "audit_log") {
        return false;
      }
      return true;
    }).map(function (definition) {
      return mergeObjects({}, definition, {
        importButtons: definition.importButtons.slice(),
        visibleFilters: definition.visibleFilters.slice()
      });
    });
  }

  function getVisibleFilterKeys(tabKey) {
    return getTabDefinition(tabKey).visibleFilters.slice();
  }

  function getImportButtons(tabKey) {
    return getTabDefinition(tabKey).importButtons.slice();
  }

  function isDashboardTab(tabKey) {
    return getTabDefinition(tabKey).dataset === "dashboard";
  }

  function isAssignmentTab(tabKey) {
    return getTabDefinition(tabKey).dataset === "assignments";
  }

  function filterDashboardRowsForTab(rows, tabKey) {
    var normalizedTab = normalizeOperationsRoute(tabKey);
    var list = Array.isArray(rows) ? rows : [];
    if (normalizedTab === "needs_assignment") {
      return list.filter(function (row) {
        return normalizeText(row && row.assignmentReadiness) === "ready_for_assignment";
      });
    }
    if (normalizedTab === "working") {
      return list.filter(isAssignedDashboardUser);
    }
    if (normalizedTab === "needs_review") {
      return list.filter(needsDashboardReview);
    }
    return list.slice();
  }

  function filterAssignmentRowsForTab(rows, tabKey) {
    var normalizedTab = normalizeOperationsRoute(tabKey);
    var list = Array.isArray(rows) ? rows : [];
    switch (normalizedTab) {
      case "per_order":
        return list.filter(function (row) {
          return isActiveAssignment(row) && normalizeText(row && row.operationMode) === "per_order";
        });
      case "salary":
        return list.filter(function (row) {
          return isActiveAssignment(row) && normalizeText(row && row.operationMode) === "salary_tiers";
        });
      case "external_mode":
        return list.filter(function (row) {
          return isActiveAssignment(row) && (
            normalizeText(row && row.operationMode) === "external" ||
            normalizeText(row && row.riderSource).toLowerCase() === "external"
          );
        });
      case "replacement":
        return list.filter(function (row) {
          return isActiveAssignment(row) && (
            normalizeText(row && row.operationMode) === "replacement" ||
            normalizeText(row && row.assignmentType) === "swap"
          );
        });
      case "stopped":
        return list.filter(function (row) {
          return normalizeText(row && row.statusBucket) === "stopped";
        });
      case "current_assignments":
      default:
        return list.slice();
    }
  }

  function applySearchToSimpleRows(rows, query, fields) {
    if (!normalizeText(query)) {
      return (rows || []).slice();
    }
    return (rows || []).filter(function (row) {
      var searchable = (fields || []).map(function (fieldName) {
        var value = row && row[fieldName];
        return Array.isArray(value) ? value.join(" ") : value;
      }).join(" ");
      return matchesSearch(searchable, query);
    });
  }

  function buildDashboardKpis(rows) {
    var list = Array.isArray(rows) ? rows : [];
    return {
      assigned: list.filter(function (row) {
        return normalizeText(row && row.lifecycleStatus) === "active_assigned";
      }).length,
      dismissedOrMissing: list.filter(function (row) {
        return ["dismissed", "missing_from_latest_snapshot"].indexOf(normalizeText(row && row.lifecycleStatus)) >= 0;
      }).length,
      needsReview: list.filter(function (row) {
        return normalizeText(row && row.lifecycleStatus) === "needs_review" ||
          normalizeText(row && row.assignmentReadiness) === "needs_manual_review";
      }).length,
      newUsers: list.filter(function (row) {
        return normalizeText(row && row.lifecycleStatus) === "new";
      }).length,
      pendingReview: list.filter(function (row) {
        return normalizeText(row && row.lifecycleStatus) === "pending_review";
      }).length,
      readyForAssignment: list.filter(function (row) {
        return normalizeText(row && row.assignmentReadiness) === "ready_for_assignment";
      }).length,
      rejected: list.filter(function (row) {
        return normalizeText(row && row.lifecycleStatus) === "rejected";
      }).length,
      totalDashboardUsers: list.length
    };
  }

  function buildNotificationSearchQuery(detail, linkedFilters) {
    return [
      linkedFilters && linkedFilters.query,
      linkedFilters && linkedFilters.vehicleSerial,
      linkedFilters && linkedFilters.assignmentId,
      linkedFilters && linkedFilters.courierId,
      linkedFilters && linkedFilters.dashboardUserId,
      linkedFilters && linkedFilters.ownerIqama,
      linkedFilters && linkedFilters.actualRiderIqama,
      detail && detail.courierId,
      detail && detail.assignmentId,
      detail && detail.ownerIqama,
      detail && detail.actualRiderIqama
    ].reduce(function (memo, value) {
      normalizeText(value).split(/\s+/).filter(Boolean).forEach(function (part) {
        memo.push(part);
      });
      return memo;
    }, []).filter(uniqueToken).join(" ");
  }

  function getSidebarRouteMap() {
    return cloneValue(SIDEBAR_ROUTE_MAP);
  }

  function isAssignedDashboardUser(row) {
    var lifecycleStatus = normalizeText(row && row.lifecycleStatus);
    if (lifecycleStatus === "active_assigned") {
      return true;
    }
    if (normalizeText(row && row.assignmentStatus) === "active") {
      return true;
    }
    return !!normalizeText(row && (row.currentAssignmentId || row.currentRiderId || row.actualRiderId)) &&
      lifecycleStatus !== "dismissed";
  }

  function needsDashboardReview(row) {
    return ["pending_review", "needs_review", "frozen"].indexOf(normalizeText(row && row.lifecycleStatus)) >= 0 ||
      normalizeText(row && row.assignmentReadiness) === "needs_manual_review";
  }

  function isActiveAssignment(row) {
    return !!(row && row.isActive);
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

  function uniqueToken(value, index, values) {
    return values.indexOf(value) === index;
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
    TAB_DEFINITIONS: listOperationTabs(),
    applySearchToSimpleRows: applySearchToSimpleRows,
    buildDashboardKpis: buildDashboardKpis,
    buildNotificationSearchQuery: buildNotificationSearchQuery,
    filterAssignmentRowsForTab: filterAssignmentRowsForTab,
    filterDashboardRowsForTab: filterDashboardRowsForTab,
    getImportButtons: getImportButtons,
    getSidebarRouteMap: getSidebarRouteMap,
    getTabDefinition: getTabDefinition,
    getVisibleFilterKeys: getVisibleFilterKeys,
    isAssignmentTab: isAssignmentTab,
    isDashboardTab: isDashboardTab,
    listOperationTabs: listOperationTabs,
    normalizeOperationsRoute: normalizeOperationsRoute
  };
});
