(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./vehicleComputedFieldsService.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.VehicleComputedFields = factory(root.KeetaPortal.VehicleComputedFieldsService);
})(typeof globalThis !== "undefined" ? globalThis : this, function (VehicleComputedFieldsService) {
  "use strict";

  function computeCurrentBoundingAccounts(vehicleSerial, dataSources) {
    return VehicleComputedFieldsService.computeCurrentBoundingAccounts(vehicleSerial, dataSources);
  }

  function computeUsedByPartnerName(vehicleSerial, dataSources) {
    return VehicleComputedFieldsService.computeUsedByPartnerName(vehicleSerial, dataSources);
  }

  function computeCurrentBranch(vehicleSerial, dataSources) {
    return VehicleComputedFieldsService.computeCurrentBranch(vehicleSerial, dataSources);
  }

  function computeCurrentCity(vehicleSerial, dataSources) {
    return VehicleComputedFieldsService.computeCurrentCity(vehicleSerial, dataSources);
  }

  function computeTargetedBranch(vehicleSerial, dataSources) {
    return VehicleComputedFieldsService.computeTargetedBranch(vehicleSerial, dataSources);
  }

  function computeCityUsageCount(vehicleSerial, dataSources) {
    return VehicleComputedFieldsService.computeUsedInCityCount(vehicleSerial, dataSources);
  }

  function computeVehicleType(vehicleSerial, dataSources) {
    return VehicleComputedFieldsService.computeVehicleType(vehicleSerial, dataSources);
  }

  function computeCityAndBranch(vehicleSerial, dataSources) {
    return VehicleComputedFieldsService.computeCityAndBranch(vehicleSerial, dataSources);
  }

  function computeAccountsRegisteredOnVehicle(vehicleSerial, dataSources) {
    return VehicleComputedFieldsService.computeAccountsRegisteredOnVehicle(vehicleSerial, dataSources);
  }

  function computeIqamasRegisteredOnVehicle(vehicleSerial, dataSources) {
    var iqamas = VehicleComputedFieldsService.computeIqamaColumns(vehicleSerial, dataSources);
    return {
      iqama1: iqamas[0] || "",
      iqama2: iqamas[1] || "",
      iqama3: iqamas[2] || "",
      iqama4: iqamas[3] || ""
    };
  }

  function computeVehicleMovementStatus(vehicleSerial, dataSources) {
    return VehicleComputedFieldsService.computeVehicleMovementStatus(vehicleSerial, dataSources);
  }

  function computeOperatingVehicleDisplayRow(vehicle, dataSources) {
    return VehicleComputedFieldsService.computeOperatingVehicleDisplayRow(vehicle, dataSources);
  }

  return {
    computeAccountsRegisteredOnVehicle: computeAccountsRegisteredOnVehicle,
    computeCityAndBranch: computeCityAndBranch,
    computeCityUsageCount: computeCityUsageCount,
    computeCurrentBoundingAccounts: computeCurrentBoundingAccounts,
    computeCurrentBranch: computeCurrentBranch,
    computeCurrentCity: computeCurrentCity,
    computeIqamasRegisteredOnVehicle: computeIqamasRegisteredOnVehicle,
    computeOperatingVehicleDisplayRow: computeOperatingVehicleDisplayRow,
    computeTargetedBranch: computeTargetedBranch,
    computeUsedByPartnerName: computeUsedByPartnerName,
    computeVehicleMovementStatus: computeVehicleMovementStatus,
    computeVehicleType: computeVehicleType
  };
});
