(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.FleetViewModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var BASE_FILTER_KEYS = [
    "query",
    "register",
    "city",
    "vehicleType",
    "vehicleStatus",
    "ownershipType",
    "capacityStatus"
  ];

  var TAB_DEFINITIONS = [
    tab({ key: "operating_vehicles", label: "Operating Vehicles" }),
    tab({ key: "vehicle_assignments", label: "Vehicle Assignments" }),
    tab({ key: "vehicle_usage_history", label: "Vehicle Usage History" }),
    tab({ key: "capacity_review", label: "Capacity Review" }),
    tab({ key: "exceptions", label: "Exceptions" }),
    tab({ key: "maintenance_or_excluded", label: "Maintenance / Excluded" })
  ];

  var TAB_DEFINITION_MAP = TAB_DEFINITIONS.reduce(function (memo, definition) {
    memo[definition.key] = definition;
    return memo;
  }, {});

  var ROUTE_ALIASES = {
    available: "operating_vehicles",
    "available-vehicles": "operating_vehicles",
    capacity: "capacity_review",
    "capacity-review": "capacity_review",
    exceptions: "exceptions",
    full: "capacity_review",
    "full-vehicles": "capacity_review",
    handover: "vehicle_usage_history",
    history: "vehicle_usage_history",
    issues: "exceptions",
    maintenance: "maintenance_or_excluded",
    maintenance_or_excluded: "maintenance_or_excluded",
    "maintenance-or-excluded": "maintenance_or_excluded",
    matching: "vehicle_assignments",
    movement: "vehicle_usage_history",
    operating: "operating_vehicles",
    operating_vehicles: "operating_vehicles",
    "operating-vehicles": "operating_vehicles",
    "vehicle-handover": "vehicle_usage_history",
    vehicle_assignments: "vehicle_assignments",
    "vehicle-assignments": "vehicle_assignments",
    "vehicle-issues": "exceptions",
    "vehicle-user-matching": "vehicle_assignments",
    vehicle_usage_history: "vehicle_usage_history",
    "vehicle-usage-history": "vehicle_usage_history"
  };

  var SIDEBAR_ROUTE_MAP = {
    FL1: sidebarRoute("FL1", "operating_vehicles"),
    FL2: sidebarRoute("FL2", "operating_vehicles"),
    FL3: sidebarRoute("FL3", "capacity_review"),
    FL4: sidebarRoute("FL4", "vehicle_usage_history"),
    FL5: sidebarRoute("FL5", "exceptions"),
    FL6: sidebarRoute("FL6", "vehicle_assignments")
  };

  function tab(options) {
    return mergeObjects({
      key: "",
      label: "",
      page: "fleet-shell",
      visibleFilters: BASE_FILTER_KEYS.slice()
    }, options || {});
  }

  function sidebarRoute(code, subPage) {
    return {
      code: code,
      group: "fleet",
      page: "fleet-shell",
      subPage: subPage
    };
  }

  function normalizeFleetRoute(subPage) {
    var key = normalizeText(subPage).toLowerCase().replace(/\s+/g, "_");
    return ROUTE_ALIASES[key] || (TAB_DEFINITION_MAP[key] ? key : "operating_vehicles");
  }

  function getTabDefinition(tabKey) {
    return TAB_DEFINITION_MAP[normalizeFleetRoute(tabKey)] || TAB_DEFINITION_MAP.operating_vehicles;
  }

  function listFleetTabs() {
    return TAB_DEFINITIONS.map(function (definition) {
      return mergeObjects({}, definition, {
        visibleFilters: definition.visibleFilters.slice()
      });
    });
  }

  function getVisibleFilterKeys(tabKey) {
    return getTabDefinition(tabKey).visibleFilters.slice();
  }

  function buildFleetRows(payload) {
    payload = payload || {};
    var vehicles = Array.isArray(payload.vehicles) ? payload.vehicles : [];
    var vehicleAssignments = Array.isArray(payload.vehicleAssignments) ? payload.vehicleAssignments : [];
    var vehicleCapacityReviews = Array.isArray(payload.vehicleCapacityReviews) ? payload.vehicleCapacityReviews : [];
    var vehicleComplianceIssues = Array.isArray(payload.vehicleComplianceIssues) ? payload.vehicleComplianceIssues : [];
    var vehicleMovementEvents = Array.isArray(payload.vehicleMovementEvents) ? payload.vehicleMovementEvents : [];
    var riderVehicleUsageHistory = Array.isArray(payload.riderVehicleUsageHistory) ? payload.riderVehicleUsageHistory : [];
    var dashboardUsers = Array.isArray(payload.dashboardUsers) ? payload.dashboardUsers : [];
    var assignments = Array.isArray(payload.assignments) ? payload.assignments : [];

    var capacityBySerial = indexLatestBy(vehicleCapacityReviews, "vehicleSerial", function (item) {
      return item.updatedAt || item.reviewDate || item.createdAt || "";
    });
    var issuesBySerial = groupByNormalized(vehicleComplianceIssues, "vehicleSerial");
    var movementBySerial = groupByNormalized(vehicleMovementEvents, "vehicleSerial");
    var assignmentsBySerial = groupByNormalized(vehicleAssignments, "vehicleSerial");
    var actualUsageBySerial = groupByNormalized(riderVehicleUsageHistory, "vehicleSerial");
    var dashboardUsersBySerial = groupByNormalized(dashboardUsers, "vehicleSerial");
    var activeAssignmentsByActualSerial = groupByComputed(assignments.filter(isActiveAssignment), function (item) {
      return item.actualVehicleSerial || item.vehicleSerial || "";
    });

    return dedupeVehiclesBySerial(vehicles).map(function (vehicle) {
      var serial = normalizeText(vehicle.vehicleSerial);
      var capacityReview = capacityBySerial[serial] || null;
      var complianceIssues = issuesBySerial[serial] || [];
      var movementEvents = movementBySerial[serial] || [];
      var registeredAssignments = assignmentsBySerial[serial] || [];
      var actualUsageHistory = actualUsageBySerial[serial] || [];
      var registeredDashboardUsers = dashboardUsersBySerial[serial] || [];
      var currentActualAssignments = activeAssignmentsByActualSerial[serial] || [];
      var currentActualUsage = actualUsageHistory.filter(isActiveUsageHistory);
      var ownershipType = deriveOwnershipType(vehicle, capacityReview);
      var vehicleStatus = deriveVehicleStatus(vehicle, capacityReview);
      var capacityStatus = deriveCapacityStatus(vehicle, capacityReview, currentActualAssignments, currentActualUsage);
      var plateHistory = unique(
        [vehicle.plateNumber].concat(
          movementEvents.reduce(function (memo, item) {
            memo.push(item.plateNumber || "");
            memo.push(item.oldPlateNumber || "");
            memo.push(item.newPlateNumber || "");
            return memo;
          }, [])
        )
      );
      var warnings = deriveWarnings(vehicleStatus, capacityStatus, complianceIssues, plateHistory);
      return {
        id: vehicle.id || serial,
        vehicleId: vehicle.id || "",
        vehicleSerial: vehicle.vehicleSerial || "",
        plateNumber: vehicle.plateNumber || "",
        plateHistory: plateHistory,
        register: vehicle.register || vehicle.targetedBranch || "",
        city: vehicle.currentCity || vehicle.city || "",
        currentCity: vehicle.currentCity || vehicle.city || "",
        currentBranch: vehicle.currentBranch || "",
        targetedBranch: vehicle.targetedBranch || "",
        vehicleType: normalizeVehicleType(vehicle.vehicleType || vehicle.registrationType || vehicle.transportType),
        vehicleStatus: vehicleStatus,
        ownershipType: ownershipType,
        companyStatus: normalizeText(vehicle.vehicleCompanyStatus || vehicle.companyStatus || ""),
        capacityStatus: capacityStatus,
        capacityReview: capacityReview,
        capacityWarnings: capacityReview && Array.isArray(capacityReview.warnings) ? capacityReview.warnings.slice() : [],
        registeredDashboardUsers: registeredDashboardUsers.slice(),
        registeredDashboardUserCount: registeredDashboardUsers.length,
        registeredAssignments: registeredAssignments.slice(),
        registeredAssignmentCount: registeredAssignments.length,
        currentActualAssignments: currentActualAssignments.slice(),
        currentActualAssignmentCount: currentActualAssignments.length,
        currentUsage: currentActualUsage.slice(),
        currentUsageCount: currentActualUsage.length,
        usageHistory: actualUsageHistory.slice().sort(sortByDateDesc("usageStartDate", "createdAt")),
        usageHistoryCount: actualUsageHistory.length,
        complianceIssues: complianceIssues.slice(),
        complianceIssueCount: complianceIssues.length,
        warnings: warnings,
        needsReview: warnings.length > 0 || (capacityReview && normalizeText(capacityReview.reviewStatus) === "under_review"),
        rawVehicle: vehicle
      };
    }).sort(function (left, right) {
      if (left.needsReview !== right.needsReview) {
        return left.needsReview ? -1 : 1;
      }
      return String(left.vehicleSerial || "").localeCompare(String(right.vehicleSerial || ""));
    });
  }

  function filterFleetRows(rows, filters, tabKey) {
    filters = filters || {};
    return (rows || []).filter(function (row) {
      var searchable = [
        row.vehicleSerial,
        row.plateNumber,
        row.city,
        row.register,
        row.vehicleType,
        row.vehicleStatus,
        row.ownershipType,
        row.capacityStatus,
        row.registeredDashboardUsers.map(function (item) { return item.dashboardUserId || item.userId || ""; }).join(" "),
        row.currentActualAssignments.map(function (item) { return item.actualRiderIqama || item.dashboardUserId || ""; }).join(" ")
      ].join(" ").toLowerCase();
      if (!matchesSearch(searchable, filters.query)) {
        return false;
      }
      if (!matchesFilter(row.register, filters.register)) {
        return false;
      }
      if (!matchesFilter(row.city, filters.city)) {
        return false;
      }
      if (!matchesFilter(row.vehicleType, filters.vehicleType, normalizeVehicleType)) {
        return false;
      }
      if (!matchesFilter(row.vehicleStatus, filters.vehicleStatus)) {
        return false;
      }
      if (!matchesFilter(row.ownershipType, filters.ownershipType)) {
        return false;
      }
      if (!matchesFilter(row.capacityStatus, filters.capacityStatus)) {
        return false;
      }
      return matchesTab(row, tabKey);
    });
  }

  function buildFleetKpis(rows) {
    var list = Array.isArray(rows) ? rows : [];
    return {
      active: count(list, function (row) { return row.vehicleStatus === "active" || row.vehicleStatus === "available"; }),
      bikes: count(list, function (row) { return row.vehicleType === "bike"; }),
      cars: count(list, function (row) { return row.vehicleType === "car"; }),
      companyVehicles: count(list, function (row) { return row.ownershipType === "company"; }),
      excluded: count(list, function (row) { return row.vehicleStatus === "excluded"; }),
      needsReview: count(list, function (row) { return row.needsReview; }),
      overCapacity: count(list, function (row) { return row.capacityStatus === "over_capacity" || row.capacityStatus === "full"; }),
      privateVehicles: count(list, function (row) { return row.ownershipType === "private"; }),
      maintenance: count(list, function (row) { return row.vehicleStatus === "maintenance"; }),
      totalVehicles: list.length
    };
  }

  function findFleetRow(rows, focus) {
    focus = focus || {};
    var normalizedSerial = normalizeText(focus.vehicleSerial || focus.registeredVehicleSerial || focus.actualVehicleSerial);
    var normalizedPlate = normalizeText(focus.plateNumber);
    var normalizedDashboardUserId = normalizeText(focus.dashboardUserId);
    var normalizedRiderIqama = normalizeText(focus.actualRiderIqama || focus.ownerIqama || focus.riderIqama);
    var list = rows || [];
    if (normalizedSerial) {
      return list.filter(function (row) {
        return normalizeText(row.vehicleSerial) === normalizedSerial;
      })[0] || null;
    }
    if (normalizedPlate) {
      return list.filter(function (row) {
        return row.plateHistory.some(function (value) {
          return normalizeText(value) === normalizedPlate;
        });
      })[0] || null;
    }
    if (normalizedDashboardUserId) {
      return list.filter(function (row) {
        return row.registeredDashboardUsers.some(function (item) {
          return normalizeText(item.dashboardUserId || item.userId) === normalizedDashboardUserId;
        });
      })[0] || null;
    }
    if (normalizedRiderIqama) {
      return list.filter(function (row) {
        return row.currentActualAssignments.some(function (item) {
          return normalizeText(item.actualRiderIqama || item.ownerIqama) === normalizedRiderIqama;
        });
      })[0] || null;
    }
    return null;
  }

  function buildFleetFocusDetail(row, options) {
    row = row || {};
    options = options || {};
    var tabKey = normalizeFleetRoute(options.tabKey || options.linkedSubPage || "operating_vehicles");
    return {
      sourceModule: "fleet",
      entityType: "vehicle",
      entityId: row.vehicleId || row.id || row.vehicleSerial || "",
      ownerIqama: options.ownerIqama || "",
      actualRiderIqama: options.actualRiderIqama || "",
      vehicleSerial: row.vehicleSerial || options.vehicleSerial || "",
      plateNumber: row.plateNumber || options.plateNumber || "",
      dashboardUserId: options.dashboardUserId || "",
      assignmentId: options.assignmentId || "",
      register: row.register || options.register || "",
      city: row.city || options.city || "",
      platform: options.platform || "",
      linkedPage: "fleet-shell",
      linkedSubPage: tabKey,
      linkedFilters: mergeObjects({
        city: row.city || "",
        query: row.vehicleSerial || row.plateNumber || "",
        register: row.register || ""
      }, cloneValue(options.linkedFilters) || {}),
      linkedDrawer: normalizeText(options.linkedDrawer || drawerForTab(tabKey)),
      missingTarget: !row.vehicleSerial && !row.plateNumber
    };
  }

  function buildFleetIssueFocus(issueType, options) {
    options = options || {};
    return mergeObjects({
      sourceModule: "fleet",
      issueType: issueType,
      entityType: "vehicle",
      entityId: options.entityId || options.vehicleSerial || options.plateNumber || "",
      ownerIqama: options.ownerIqama || "",
      actualRiderIqama: options.actualRiderIqama || "",
      vehicleSerial: options.vehicleSerial || "",
      plateNumber: options.plateNumber || "",
      dashboardUserId: options.dashboardUserId || "",
      assignmentId: options.assignmentId || "",
      register: options.register || "",
      city: options.city || "",
      platform: options.platform || "",
      linkedPage: "fleet-shell",
      linkedSubPage: normalizeFleetRoute(options.linkedSubPage || "operating_vehicles"),
      linkedFilters: cloneValue(options.linkedFilters) || {},
      linkedDrawer: normalizeText(options.linkedDrawer || "details")
    }, cloneValue(options.extra) || {});
  }

  function getSidebarRouteMap() {
    return cloneValue(SIDEBAR_ROUTE_MAP);
  }

  function drawerForTab(tabKey) {
    switch (normalizeFleetRoute(tabKey)) {
      case "capacity_review":
        return "capacity";
      case "exceptions":
        return "issues";
      case "vehicle_usage_history":
        return "movement";
      case "vehicle_assignments":
        return "linked";
      case "maintenance_or_excluded":
      case "operating_vehicles":
      default:
        return "details";
    }
  }

  function deriveWarnings(vehicleStatus, capacityStatus, complianceIssues, plateHistory) {
    var warnings = [];
    if (capacityStatus === "over_capacity" || capacityStatus === "full") {
      warnings.push("vehicle_capacity_exceeded");
    }
    if (vehicleStatus === "excluded" || vehicleStatus === "maintenance" || vehicleStatus === "withdrawn") {
      warnings.push("vehicle_status_excluded");
    }
    if ((plateHistory || []).length > 1) {
      warnings.push("plate_serial_mismatch");
    }
    if ((complianceIssues || []).length) {
      warnings.push("registered_vehicle_missing");
    }
    return warnings;
  }

  function deriveCapacityStatus(vehicle, review, currentActualAssignments, currentActualUsage) {
    var normalizedReviewStatus = normalizeText(review && review.reviewStatus).toLowerCase();
    if (normalizedReviewStatus === "over_capacity" || normalizedReviewStatus === "full") {
      return normalizedReviewStatus;
    }
    var vehicleType = normalizeVehicleType(vehicle && (vehicle.vehicleType || vehicle.registrationType || vehicle.transportType));
    var maxCapacity = vehicleType === "car" ? 2 : 3;
    var countInUse = Math.max(
      Array.isArray(currentActualAssignments) ? currentActualAssignments.length : 0,
      Array.isArray(currentActualUsage) ? currentActualUsage.length : 0
    );
    if (countInUse > maxCapacity) {
      return "over_capacity";
    }
    if (countInUse === maxCapacity && countInUse > 0) {
      return "full";
    }
    if (countInUse > 0) {
      return "in_use";
    }
    return normalizedReviewStatus || "available";
  }

  function deriveOwnershipType(vehicle, review) {
    var normalized = normalizeText(vehicle && (vehicle.vehicleCompanyStatus || vehicle.companyStatus || review && review.vehicleCompanyStatus)).toLowerCase();
    if (normalized.indexOf("private") >= 0) {
      return "private";
    }
    if (normalized.indexOf("company") >= 0) {
      return "company";
    }
    return normalized || "unknown";
  }

  function deriveVehicleStatus(vehicle, review) {
    var normalized = normalizeText(vehicle && (vehicle.status || vehicle.movementStatus || vehicle.vehicleStatus || review && review.reviewStatus)).toLowerCase();
    if (!normalized) {
      return "unknown";
    }
    if (normalized.indexOf("maintenance") >= 0) {
      return "maintenance";
    }
    if (normalized.indexOf("exclude") >= 0 || normalized.indexOf("withdraw") >= 0 || normalized.indexOf("damage") >= 0 || normalized.indexOf("dealer") >= 0) {
      return "excluded";
    }
    if (normalized.indexOf("review") >= 0) {
      return "under_review";
    }
    if (normalized.indexOf("active") >= 0 || normalized.indexOf("available") >= 0 || normalized.indexOf("working") >= 0) {
      return normalized.indexOf("available") >= 0 ? "available" : "active";
    }
    return normalized;
  }

  function normalizeVehicleType(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (normalized.indexOf("car") >= 0 || normalized.indexOf("sedan") >= 0 || normalized.indexOf("vehicle") >= 0 || normalized.indexOf("Ù…Ø±ÙƒØ¨Ø©") >= 0 || normalized.indexOf("Ø³ÙŠØ§Ø±Ø©") >= 0) {
      return "car";
    }
    if (normalized.indexOf("bike") >= 0 || normalized.indexOf("motor") >= 0 || normalized.indexOf("ÙˆÙ†Ø´") >= 0 || normalized.indexOf("Ø¯Ø¨Ø§Ø¨") >= 0) {
      return "bike";
    }
    return normalized || "unknown";
  }

  function isActiveAssignment(item) {
    return normalizeText(item && (item.assignmentStatus || item.status)).toLowerCase() === "active";
  }

  function isActiveUsageHistory(item) {
    return !normalizeText(item && (item.usageEndDate || item.endDate)) ||
      normalizeText(item && (item.status || "")).toLowerCase() === "active";
  }

  function matchesTab(row, tabKey) {
    switch (normalizeFleetRoute(tabKey)) {
      case "vehicle_assignments":
        return row.registeredAssignmentCount > 0 || row.currentActualAssignmentCount > 0;
      case "vehicle_usage_history":
        return row.usageHistoryCount > 0;
      case "capacity_review":
        return row.capacityStatus === "full" || row.capacityStatus === "over_capacity" || !!row.capacityReview;
      case "exceptions":
        return row.complianceIssueCount > 0 || row.needsReview;
      case "maintenance_or_excluded":
        return row.vehicleStatus === "maintenance" || row.vehicleStatus === "excluded" || row.vehicleStatus === "withdrawn";
      case "operating_vehicles":
      default:
        return true;
    }
  }

  function dedupeVehiclesBySerial(rows) {
    var indexed = {};
    (rows || []).forEach(function (item) {
      var key = normalizeText(item && item.vehicleSerial);
      if (!key) {
        return;
      }
      if (!indexed[key]) {
        indexed[key] = item;
        return;
      }
      var currentStamp = normalizeText(indexed[key].updatedAt || indexed[key].createdAt);
      var nextStamp = normalizeText(item.updatedAt || item.createdAt);
      if (nextStamp >= currentStamp) {
        indexed[key] = item;
      }
    });
    return Object.keys(indexed).sort().map(function (key) {
      return indexed[key];
    });
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

  function groupByComputed(rows, resolver) {
    return (rows || []).reduce(function (memo, item) {
      var key = normalizeText(resolver(item));
      if (!key) {
        return memo;
      }
      memo[key] = memo[key] || [];
      memo[key].push(item);
      return memo;
    }, {});
  }

  function indexLatestBy(rows, fieldName, stampResolver) {
    return (rows || []).reduce(function (memo, item) {
      var key = normalizeText(item && item[fieldName]);
      if (!key) {
        return memo;
      }
      if (!memo[key]) {
        memo[key] = item;
        return memo;
      }
      var currentStamp = normalizeText(stampResolver(memo[key]));
      var nextStamp = normalizeText(stampResolver(item));
      if (nextStamp >= currentStamp) {
        memo[key] = item;
      }
      return memo;
    }, {});
  }

  function sortByDateDesc(primaryField, fallbackField) {
    return function (left, right) {
      var rightStamp = normalizeText(right && (right[primaryField] || right[fallbackField]));
      var leftStamp = normalizeText(left && (left[primaryField] || left[fallbackField]));
      return rightStamp.localeCompare(leftStamp);
    };
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

  function count(rows, predicate) {
    return (rows || []).filter(predicate).length;
  }

  function unique(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = normalizeText(value);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
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
    TAB_DEFINITIONS: listFleetTabs(),
    buildFleetFocusDetail: buildFleetFocusDetail,
    buildFleetIssueFocus: buildFleetIssueFocus,
    buildFleetKpis: buildFleetKpis,
    buildFleetRows: buildFleetRows,
    filterFleetRows: filterFleetRows,
    findFleetRow: findFleetRow,
    getSidebarRouteMap: getSidebarRouteMap,
    getTabDefinition: getTabDefinition,
    getVisibleFilterKeys: getVisibleFilterKeys,
    listFleetTabs: listFleetTabs,
    normalizeFleetRoute: normalizeFleetRoute
  };
});
