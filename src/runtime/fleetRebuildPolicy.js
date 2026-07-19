(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.FleetRebuildPolicy = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SOURCE_ENTITIES = [
    "vehicles",
    "dashboardUsers",
    "assignments",
    "vehicleMovementEvents"
  ];

  var DERIVED_ENTITIES = [
    "vehicleAssignments",
    "vehicleCapacityReviews",
    "vehicleComplianceIssues"
  ];

  function createFleetSourceHash(snapshot) {
    snapshot = snapshot || {};
    return JSON.stringify(SOURCE_ENTITIES.map(function (entityName) {
      var rows = Array.isArray(snapshot[entityName]) ? snapshot[entityName] : [];
      return {
        count: rows.length,
        entityName: entityName,
        latest: rows.reduce(function (memo, item) {
          var value = item && (item.updatedAt || item.createdAt || item.eventDate || "");
          return String(value || "") > memo ? String(value || "") : memo;
        }, "")
      };
    }));
  }

  function hasDerivedCollections(snapshot) {
    snapshot = snapshot || {};
    return DERIVED_ENTITIES.every(function (entityName) {
      return Array.isArray(snapshot[entityName]) && snapshot[entityName].length >= 0;
    }) && (Array.isArray(snapshot.vehicleAssignments) && snapshot.vehicleAssignments.length > 0);
  }

  function shouldRebuildFleetDerived(options) {
    options = options || {};
    if (options.force) {
      return true;
    }
    if (!options.hasDerivedCollections) {
      return true;
    }
    return String(options.lastHash || "") !== String(options.nextHash || "");
  }

  return {
    DERIVED_ENTITIES: DERIVED_ENTITIES.slice(),
    SOURCE_ENTITIES: SOURCE_ENTITIES.slice(),
    createFleetSourceHash: createFleetSourceHash,
    hasDerivedCollections: hasDerivedCollections,
    shouldRebuildFleetDerived: shouldRebuildFleetDerived
  };
});
