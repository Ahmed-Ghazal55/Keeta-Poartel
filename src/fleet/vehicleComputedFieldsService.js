(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("./vehicleMovementService.js"),
      require("./vehicleValidator.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.VehicleComputedFieldsService = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.VehicleMovementService,
    root.KeetaPortal.VehicleValidator
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, VehicleMovementService, VehicleValidator) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function computeCurrentBoundingAccounts(vehicleSerial, dataSources) {
    var row = firstUpdateRow(vehicleSerial, dataSources);
    return normalizeText(row && (row.currentBoundingAccounts || row["current bounding accounts"])) || "Not Found";
  }

  function computeUsedByPartnerName(vehicleSerial, dataSources) {
    var row = firstUpdateRow(vehicleSerial, dataSources);
    return normalizeText(row && (row.usedByPartnerName || row["used by how name partner"])) || "Not found";
  }

  function computeCurrentCity(vehicleSerial, dataSources) {
    var cities = uniqueStrings(updateRows(vehicleSerial, dataSources).map(function (row) {
      return normalizeText(row.city || row.currentCity || row.branchCity || row.Branch);
    }).filter(Boolean));
    if (!cities.length) {
      return "لا يوجد ارتباط حاليا";
    }
    if (cities.length === 1) {
      return cities[0];
    }
    return "اختلاط المدينة: " + cities.join(" / ") + " - تحتاج توحيد المدينة أو مراجعة المدينة الصحيحة";
  }

  function computeCurrentBranch(vehicleSerial, dataSources) {
    var vehicle = findVehicle(vehicleSerial, dataSources);
    if (vehicle && normalizeText(vehicle.currentBranch)) {
      return normalizeText(vehicle.currentBranch);
    }
    var row = firstUpdateRow(vehicleSerial, dataSources);
    return normalizeText(row && (row.currentBranch || row.Branch)) || "لا يوجد ارتباط حاليا";
  }

  function computeTargetedBranch(vehicleSerial, dataSources) {
    var vehicle = findVehicle(vehicleSerial, dataSources);
    if (vehicle && normalizeText(vehicle.targetedBranch)) {
      return normalizeText(vehicle.targetedBranch);
    }
    var row = firstUpdateRow(vehicleSerial, dataSources);
    return normalizeText(row && (row.targetedBranch || row.register || row["السجل"])) || "";
  }

  function computeUsedInCityCount(vehicleSerial, dataSources) {
    return uniqueStrings(updateRows(vehicleSerial, dataSources).map(function (row) {
      return normalizeText(row.city || row.currentCity || row.Branch);
    }).filter(Boolean)).length;
  }

  function computeVehicleType(vehicleSerial, dataSources) {
    var vehicle = findVehicle(vehicleSerial, dataSources);
    if (vehicle && normalizeText(vehicle.vehicleType)) {
      return vehicle.vehicleType;
    }
    var row = firstUpdateRow(vehicleSerial, dataSources);
    return VehicleValidator.normalizeVehicleType(row && (row.vehicleType || row.complianceVehicleType || row["Vehicle Type"]));
  }

  function computeCityAndBranch(vehicleSerial, dataSources) {
    var rows = updateRows(vehicleSerial, dataSources).map(function (row) {
      return [normalizeText(row.Branch || row.branch || row.city), normalizeText(row.brandName || row.register || row["السجل"])].filter(Boolean).join(" - ");
    }).filter(Boolean);
    return rows.length ? uniqueStrings(rows).join("\n") : "لا يوجد";
  }

  function computeAccountsRegisteredOnVehicle(vehicleSerial, dataSources) {
    var rows = updateRows(vehicleSerial, dataSources).map(function (row) {
      return [
        normalizeText(row.courier_id || row.courierId),
        normalizeText(row.IQAMA || row.iqama),
        normalizeText(row.NAME || row.name)
      ].filter(Boolean).join(" - ");
    }).filter(Boolean);
    return rows.length ? uniqueStrings(rows).join("\n") : "لا يوجد";
  }

  function computeIqamaColumns(vehicleSerial, dataSources) {
    var values = uniqueStrings(updateRows(vehicleSerial, dataSources).map(function (row) {
      return normalizeText(row.IQAMA || row.iqama);
    }).filter(Boolean)).slice(0, 4);
    while (values.length < 4) {
      values.push(values.length ? "" : "لا يوجد");
    }
    return values;
  }

  function computeVehicleMovementStatus(vehicleSerial, dataSources) {
    return VehicleMovementService.deriveVehicleMovementStatus(vehicleSerial, dataSources && dataSources.vehicleMovementEvents || []);
  }

  function computeOperatingVehicleDisplayRow(vehicle, dataSources) {
    vehicle = vehicle || {};
    var iqamas = computeIqamaColumns(vehicle.vehicleSerial, dataSources);
    return mergeObjects({}, vehicle, {
      currentBoundingAccounts: normalizeText(vehicle.currentBoundingAccounts) || computeCurrentBoundingAccounts(vehicle.vehicleSerial, dataSources),
      usedByPartnerName: normalizeText(vehicle.usedByPartnerName) || computeUsedByPartnerName(vehicle.vehicleSerial, dataSources),
      currentBranch: normalizeText(vehicle.currentBranch) || computeCurrentBranch(vehicle.vehicleSerial, dataSources),
      currentCity: normalizeText(vehicle.currentCity) || computeCurrentCity(vehicle.vehicleSerial, dataSources),
      targetedBranch: normalizeText(vehicle.targetedBranch) || computeTargetedBranch(vehicle.vehicleSerial, dataSources),
      usedInCityCount: vehicle.usedInCityCount != null && vehicle.usedInCityCount !== "" ? vehicle.usedInCityCount : computeUsedInCityCount(vehicle.vehicleSerial, dataSources),
      vehicleType: normalizeText(vehicle.vehicleType) || computeVehicleType(vehicle.vehicleSerial, dataSources),
      cityAndBranch: normalizeText(vehicle.cityAndBranch) || computeCityAndBranch(vehicle.vehicleSerial, dataSources),
      accountsRegisteredOnVehicle: normalizeText(vehicle.accountsRegisteredOnVehicle) || computeAccountsRegisteredOnVehicle(vehicle.vehicleSerial, dataSources),
      iqama1: normalizeText(vehicle.iqama1) || iqamas[0],
      iqama2: normalizeText(vehicle.iqama2) || iqamas[1],
      iqama3: normalizeText(vehicle.iqama3) || iqamas[2],
      iqama4: normalizeText(vehicle.iqama4) || iqamas[3],
      movementStatus: normalizeText(vehicle.movementStatus) || computeVehicleMovementStatus(vehicle.vehicleSerial, dataSources)
    });
  }

  function findVehicle(vehicleSerial, dataSources) {
    var normalizedSerial = normalizeText(vehicleSerial);
    return firstMatch(dataSources && dataSources.vehicles || [], function (item) {
      return normalizeText(item.vehicleSerial) === normalizedSerial;
    });
  }

  function firstUpdateRow(vehicleSerial, dataSources) {
    return updateRows(vehicleSerial, dataSources)[0] || null;
  }

  function updateRows(vehicleSerial, dataSources) {
    var normalizedSerial = normalizeText(vehicleSerial);
    return (dataSources && dataSources.vehicleUpdateRows || []).filter(function (item) {
      return normalizeText(item.vehicleSerial || item.vehicle_sequence_number || item["الرقم التسلسلي"]) === normalizedSerial;
    });
  }

  function firstMatch(rows, predicate) {
    for (var index = 0; index < (rows || []).length; index += 1) {
      if (predicate(rows[index])) {
        return rows[index];
      }
    }
    return null;
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

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  return {
    computeAccountsRegisteredOnVehicle: computeAccountsRegisteredOnVehicle,
    computeCityAndBranch: computeCityAndBranch,
    computeCurrentBoundingAccounts: computeCurrentBoundingAccounts,
    computeCurrentBranch: computeCurrentBranch,
    computeCurrentCity: computeCurrentCity,
    computeIqamaColumns: computeIqamaColumns,
    computeOperatingVehicleDisplayRow: computeOperatingVehicleDisplayRow,
    computeTargetedBranch: computeTargetedBranch,
    computeUsedByPartnerName: computeUsedByPartnerName,
    computeUsedInCityCount: computeUsedInCityCount,
    computeVehicleMovementStatus: computeVehicleMovementStatus,
    computeVehicleType: computeVehicleType
  };
});
