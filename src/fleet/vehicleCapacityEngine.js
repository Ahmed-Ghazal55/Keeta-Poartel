(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("./vehicleValidator.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.VehicleCapacityEngine = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.VehicleValidator
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, VehicleValidator) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function getCapacityByVehicleType(vehicleType) {
    var normalized = VehicleValidator.normalizeVehicleType(vehicleType);
    if (normalized === "car") {
      return 2;
    }
    if (normalized === "bike") {
      return 3;
    }
    return 1;
  }

  function reviewVehicleCapacity(vehicle, linkedRows) {
    vehicle = vehicle || {};
    linkedRows = (linkedRows || []).filter(Boolean);
    var capacityMax = getCapacityByVehicleType(vehicle.vehicleType);
    var assignedCount = linkedRows.length;
    var remainingCapacity = Math.max(capacityMax - assignedCount, 0);
    var warnings = [];
    var blockingIssues = [];

    if (!VehicleValidator.isAssignableVehicle(vehicle)) {
      blockingIssues = blockingIssues.concat(VehicleValidator.buildVehicleBlockingReasons(vehicle));
    }
    if (assignedCount === capacityMax) {
      warnings.push("capacity_full");
    }
    if (assignedCount > capacityMax) {
      warnings.push("capacity_over_limit");
    }

    return {
      id: stableId("vehicleCapacityReviews", [vehicle.vehicleSerial]),
      vehicleId: vehicle.id || stableId("vehicles", [vehicle.vehicleSerial]),
      vehicleSerial: normalizeText(vehicle.vehicleSerial),
      plateNumber: normalizeText(vehicle.plateNumber),
      vehicleType: VehicleValidator.normalizeVehicleType(vehicle.vehicleType),
      city: normalizeText(vehicle.city || vehicle.currentCity),
      register: normalizeText(vehicle.register || vehicle.targetedBranch),
      capacityMax: capacityMax,
      assignedCount: assignedCount,
      remainingCapacity: remainingCapacity,
      assignedDashboardUserIds: linkedRows.map(function (item) {
        return normalizeText(item.dashboardUserId || item.userId);
      }).filter(Boolean),
      assignedIqamas: linkedRows.map(function (item) {
        return normalizeText(item.currentRiderIqama || item.ownerIqama || item.riderIqama);
      }).filter(Boolean),
      reviewStatus: blockingIssues.length ? "blocked" : assignedCount > capacityMax ? "over_capacity" : assignedCount === capacityMax ? "full" : "available",
      warnings: warnings,
      blockingIssues: blockingIssues,
      status: blockingIssues.length ? "blocked" : "active"
    };
  }

  function buildVehicleCapacityReviews(vehicles, dashboardUsers) {
    var usersBySerial = (dashboardUsers || []).reduce(function (memo, item) {
      var serial = normalizeText(item.registeredVehicleSerial || item.vehicleSerial || item.actualUsedVehicleSerial);
      if (!serial) {
        return memo;
      }
      memo[serial] = memo[serial] || [];
      memo[serial].push(item);
      return memo;
    }, {});
    return (vehicles || []).map(function (vehicle) {
      return reviewVehicleCapacity(vehicle, usersBySerial[normalizeText(vehicle.vehicleSerial)] || []);
    });
  }

  function stableId(entityName, parts) {
    return entityName + "::" + (parts || []).map(function (value) {
      return normalizeText(value).replace(/\s+/g, "_");
    }).join("::");
  }

  return {
    buildVehicleCapacityReviews: buildVehicleCapacityReviews,
    getCapacityByVehicleType: getCapacityByVehicleType,
    reviewVehicleCapacity: reviewVehicleCapacity
  };
});
