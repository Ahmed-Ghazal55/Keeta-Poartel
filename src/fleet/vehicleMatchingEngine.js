(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("./vehicleValidator.js"),
      require("./vehicleMovementService.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.VehicleMatchingEngine = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.VehicleValidator,
    root.KeetaPortal.VehicleMovementService
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, VehicleValidator, VehicleMovementService) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function buildVehicleAssignments(dashboardUsers, dataSources, options) {
    options = options || {};
    var capacityMap = indexBy((options.capacityReviews || []), "vehicleSerial");
    return (dashboardUsers || []).map(function (dashboardUser) {
      return buildVehicleMatchRecord(dashboardUser, dataSources, {
        capacityReview: capacityMap[normalizeText(dashboardUser.vehicleSerial)],
        today: options.today || new Date().toISOString().slice(0, 10)
      });
    });
  }

  function buildVehicleMatchRecord(dashboardUser, dataSources, options) {
    dashboardUser = dashboardUser || {};
    dataSources = dataSources || {};
    options = options || {};
    var vehicles = dataSources.vehicles || [];
    var movementEvents = dataSources.vehicleMovementEvents || [];
    var registeredVehicle = resolveRegisteredVehicleOnDashboard(dashboardUser, vehicles);
    var actualVehicle = resolveActualUsedVehicle(dashboardUser, vehicles, movementEvents) || registeredVehicle;
    var warnings = [];
    var blockingIssues = [];
    var notes = [];
    var registeredVehicleSerial = normalizeText(dashboardUser.vehicleSerial || dashboardUser.registeredVehicleSerial);
    var registeredPlateNumber = normalizeText(dashboardUser.plateNumber);

    if (!registeredVehicleSerial) {
      warnings.push("serial_missing");
    }
    if (registeredVehicleSerial && !registeredVehicle) {
      warnings.push("registered_vehicle_not_found");
    }
    if (registeredVehicle && registeredPlateNumber && normalizeText(registeredVehicle.plateNumber) && normalizeText(registeredVehicle.plateNumber) !== registeredPlateNumber) {
      notes.push("plate_changed_same_serial");
    }
    if (registeredVehicle && !VehicleValidator.isAssignableVehicle(registeredVehicle)) {
      blockingIssues = blockingIssues.concat(VehicleValidator.buildVehicleBlockingReasons(registeredVehicle));
    }
    if (registeredVehicle && dashboardUser.city && normalizeText(registeredVehicle.currentCity || registeredVehicle.city) && normalizeText(registeredVehicle.currentCity || registeredVehicle.city) !== normalizeText(dashboardUser.city)) {
      blockingIssues.push("cross_city_conflict");
    }
    if (registeredVehicle && dashboardUser.register && normalizeText(registeredVehicle.register || registeredVehicle.targetedBranch) && normalizeText(registeredVehicle.register || registeredVehicle.targetedBranch) !== normalizeText(dashboardUser.register)) {
      blockingIssues.push("cross_register_conflict");
    }
    if (actualVehicle && registeredVehicle && normalizeText(actualVehicle.vehicleSerial) !== normalizeText(registeredVehicle.vehicleSerial)) {
      warnings.push("actual_vehicle_differs");
    }
    if (options.capacityReview && options.capacityReview.reviewStatus === "full") {
      warnings.push("capacity_full");
    }
    if (options.capacityReview && options.capacityReview.reviewStatus === "over_capacity") {
      warnings.push("capacity_over_limit");
    }

    return {
      id: stableId("vehicleAssignments", [normalizeText(dashboardUser.dashboardUserId || dashboardUser.userId || dashboardUser.id)]),
      vehicleId: registeredVehicle && registeredVehicle.id ? registeredVehicle.id : (actualVehicle && actualVehicle.id ? actualVehicle.id : ""),
      vehicleSerial: normalizeText(registeredVehicle && registeredVehicle.vehicleSerial || actualVehicle && actualVehicle.vehicleSerial),
      plateNumber: normalizeText(registeredVehicle && registeredVehicle.plateNumber || actualVehicle && actualVehicle.plateNumber),
      dashboardUserId: normalizeText(dashboardUser.dashboardUserId || dashboardUser.userId),
      riderId: normalizeText(dashboardUser.currentRiderId),
      riderIqama: normalizeText(dashboardUser.currentRiderIqama || dashboardUser.ownerIqama),
      platform: normalizeText(dashboardUser.platform) || "keeta",
      city: normalizeText(dashboardUser.city),
      register: normalizeText(dashboardUser.register),
      registeredVehicleSerial: registeredVehicleSerial,
      actualUsedVehicleSerial: normalizeText(actualVehicle && actualVehicle.vehicleSerial),
      actualUsedVehiclePlateNumber: normalizeText(actualVehicle && actualVehicle.plateNumber),
      movementStatus: registeredVehicle
        ? VehicleMovementService.deriveVehicleMovementStatus(registeredVehicle.vehicleSerial, movementEvents)
        : "لا توجد بيانات حركة",
      transportType: normalizeText(registeredVehicle && registeredVehicle.transportType || registeredVehicle && registeredVehicle.registrationType),
      matchStatus: blockingIssues.length ? "blocked" : warnings.length ? "warning" : registeredVehicle ? "matched" : "missing",
      capacityStatus: options.capacityReview ? options.capacityReview.reviewStatus : "unknown",
      warnings: uniqueStrings(warnings),
      blockingIssues: uniqueStrings(blockingIssues),
      notes: uniqueStrings(notes),
      registeredVehicleOnDashboard: summarizeVehicle(registeredVehicle),
      actualUsedVehicle: summarizeVehicle(actualVehicle),
      status: blockingIssues.length ? "blocked" : "active"
    };
  }

  function resolveRegisteredVehicleOnDashboard(dashboardUser, vehicles) {
    var serial = normalizeText(dashboardUser && (dashboardUser.vehicleSerial || dashboardUser.registeredVehicleSerial));
    var plate = normalizeText(dashboardUser && dashboardUser.plateNumber);
    return firstMatch(vehicles, function (vehicle) {
      return (serial && normalizeText(vehicle.vehicleSerial) === serial) || (plate && normalizeText(vehicle.plateNumber) === plate);
    });
  }

  function resolveActualUsedVehicle(dashboardUser, vehicles, movementEvents) {
    var latestEvent = firstMatch((movementEvents || []).slice().sort(function (left, right) {
      return String(right.eventDate || right.createdAt || "").localeCompare(String(left.eventDate || left.createdAt || ""));
    }), function (eventItem) {
      return matchesMovementUser(eventItem, dashboardUser);
    });
    if (!latestEvent) {
      return null;
    }
    return firstMatch(vehicles, function (vehicle) {
      return normalizeText(vehicle.vehicleSerial) === normalizeText(latestEvent.vehicleSerial);
    }) || summarizeVehicle(latestEvent);
  }

  function matchesMovementUser(eventItem, dashboardUser) {
    return [
      eventItem.currentUserIqama,
      eventItem.delegatedIqama,
      eventItem.dashboardUserId
    ].some(function (value) {
      var normalized = normalizeText(value);
      return normalized && (
        normalized === normalizeText(dashboardUser.currentRiderIqama) ||
        normalized === normalizeText(dashboardUser.ownerIqama) ||
        normalized === normalizeText(dashboardUser.dashboardUserId || dashboardUser.userId)
      );
    });
  }

  function summarizeVehicle(vehicle) {
    if (!vehicle) {
      return null;
    }
    return {
      id: vehicle.id || "",
      vehicleSerial: normalizeText(vehicle.vehicleSerial),
      plateNumber: normalizeText(vehicle.plateNumber),
      city: normalizeText(vehicle.currentCity || vehicle.city),
      register: normalizeText(vehicle.register || vehicle.targetedBranch),
      status: normalizeText(vehicle.status || vehicle.movementStatus),
      transportType: normalizeText(vehicle.transportType || vehicle.registrationType),
      vehicleType: normalizeText(vehicle.vehicleType)
    };
  }

  function firstMatch(rows, predicate) {
    for (var index = 0; index < (rows || []).length; index += 1) {
      if (predicate(rows[index])) {
        return rows[index];
      }
    }
    return null;
  }

  function indexBy(rows, fieldName) {
    return (rows || []).reduce(function (memo, item) {
      var key = normalizeText(item && item[fieldName]);
      if (key) {
        memo[key] = item;
      }
      return memo;
    }, {});
  }

  function stableId(entityName, parts) {
    return entityName + "::" + (parts || []).map(function (value) {
      return normalizeText(value).replace(/\s+/g, "_");
    }).join("::");
  }

  function uniqueStrings(values) {
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

  return {
    buildVehicleAssignments: buildVehicleAssignments,
    buildVehicleMatchRecord: buildVehicleMatchRecord,
    resolveActualUsedVehicle: resolveActualUsedVehicle,
    resolveRegisteredVehicleOnDashboard: resolveRegisteredVehicleOnDashboard
  };
});
