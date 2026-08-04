(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.PageScopedDataLoading = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PAGE_ENTITY_LOAD_MAP = {
    "dashboard": ["importBatches", "auditLogs", "notifications"],
    "archive-shell": ["auditLogs", "riderArchiveEvents", "riders"],
    "import-center": ["importBatches"],
    "operations-shell": ["dashboardUsers", "assignments", "assignmentHistory", "externalRiders", "riderOperationalProfiles", "riderVehicleUsageHistory", "riders", "vehicles", "vehicleAssignments", "vehicleComplianceIssues"],
    "hr-shell": ["hrProfiles", "riders", "riderIdentities", "riderPlatformAccounts"],
    "rider-master": ["hrProfiles", "externalRiders", "riderOperationalProfiles", "riderVehicleUsageHistory", "riders", "riderIdentities", "riderPlatformAccounts", "riderArchiveEvents"],
    "fleet-shell": ["vehicles", "vehicleAssignments", "vehicleCapacityReviews", "vehicleComplianceIssues", "vehicleMovementEvents", "dashboardUsers"],
    "performance-shell": ["performanceDaily", "performanceMonthly", "validityResults", "performanceIssues", "monthlyRules"],
    "monthly-rules-shell": ["monthlyRules", "auditLogs"],
    "monthly-closing-shell": ["dashboardUsers", "assignments", "assignmentHistory", "hrProfiles", "externalRiders", "vehicles", "riderVehicleUsageHistory", "performanceDaily", "performanceMonthly", "validityResults", "performanceIssues", "importBatches", "auditLogs"],
    "finance-shell": ["dashboardUsers", "assignments", "assignmentHistory", "hrProfiles", "externalRiders", "vehicles", "riderVehicleUsageHistory", "performanceDaily", "performanceMonthly", "validityResults", "performanceIssues", "importBatches", "auditLogs"],
    "settings": ["users", "roles", "auditLogs", "notifications"],
    "settings-shell": ["users", "roles", "auditLogs", "notifications"]
  };

  function normalizePageKey(pageKey) {
    var value = String(pageKey || "").trim();
    if (value.indexOf("page-") === 0) {
      return value.slice(5);
    }
    return value;
  }

  function resolvePageEntities(pageKey) {
    var normalized = normalizePageKey(pageKey);
    return unique((PAGE_ENTITY_LOAD_MAP[normalized] || []).slice());
  }

  function getStartupEntities() {
    return resolvePageEntities("dashboard");
  }

  function buildHydrationKey(pageKey, entityNames) {
    return [
      normalizePageKey(pageKey),
      unique(entityNames || []).sort().join("|")
    ].join("::");
  }

  function unique(values) {
    return (values || []).filter(function (value, index, list) {
      return value && list.indexOf(value) === index;
    });
  }

  return {
    PAGE_ENTITY_LOAD_MAP: JSON.parse(JSON.stringify(PAGE_ENTITY_LOAD_MAP)),
    buildHydrationKey: buildHydrationKey,
    getStartupEntities: getStartupEntities,
    normalizePageKey: normalizePageKey,
    resolvePageEntities: resolvePageEntities
  };
});
