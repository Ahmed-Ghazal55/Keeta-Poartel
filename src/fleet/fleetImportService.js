(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("./vehicleNormalizer.js"),
      require("./vehicleValidator.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.FleetImportService = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.VehicleNormalizer,
    root.KeetaPortal.VehicleValidator
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, VehicleNormalizer, VehicleValidator) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function normalizeFleetImport(importRecord) {
    var templateId = normalizeText(importRecord && importRecord.templateId) || "vehicles";
    if (templateId === "vehicles_movement") {
      return normalizeVehicleMovementImport(importRecord);
    }
    return normalizeOperatingVehiclesImport(importRecord);
  }

  function normalizeOperatingVehiclesImport(importRecord) {
    var records = VehicleNormalizer.normalizeOperatingVehicleRows(importRecord);
    var warnings = [];
    records.forEach(function (record) {
      warnings = warnings.concat(VehicleValidator.validateOperatingVehicleRecord(record));
    });
    return [
      entityOutput("vehicles", records, records, {
        warnings: dedupe(warnings),
        conflicts: []
      }),
      entityOutput("vehicleImportSnapshots", records, [buildSnapshot(importRecord, "vehicles", records.length)], {
        warnings: [],
        conflicts: []
      })
    ];
  }

  function normalizeVehicleMovementImport(importRecord) {
    var events = VehicleNormalizer.normalizeVehicleMovementRows(importRecord);
    var warnings = [];
    var latestVehicles = {};
    events.forEach(function (eventItem) {
      warnings = warnings.concat(VehicleValidator.validateVehicleMovementEvent(eventItem));
      latestVehicles[eventItem.vehicleSerial] = {
        id: stableId("vehicles", [eventItem.vehicleSerial]),
        vehicleSerial: eventItem.vehicleSerial,
        plateNumber: eventItem.plateNumber,
        city: eventItem.city,
        currentCity: eventItem.city,
        currentBranch: eventItem.branch,
        movementStatus: eventItem.status,
        status: eventItem.status,
        actualUsedVehicleSerial: eventItem.vehicleSerial,
        actualUsedVehiclePlateNumber: eventItem.plateNumber,
        actualUserIqama: eventItem.currentUserIqama,
        actualUserName: eventItem.currentUserName,
        lastMovementEventId: eventItem.id,
        sourceFile: eventItem.sourceFile,
        sourceSheet: eventItem.sourceSheet,
        sourceRow: eventItem.sourceRow
      };
    });
    return [
      entityOutput("vehicles", events, Object.keys(latestVehicles).map(function (key) { return latestVehicles[key]; }), {
        warnings: [],
        conflicts: []
      }),
      entityOutput("vehicleMovementEvents", events, events, {
        warnings: dedupe(warnings),
        conflicts: []
      }),
      entityOutput("vehicleImportSnapshots", events, [buildSnapshot(importRecord, "vehicles_movement", events.length)], {
        warnings: [],
        conflicts: []
      })
    ];
  }

  function buildSnapshot(importRecord, templateId, recordCount) {
    return {
      id: stableId("vehicleImportSnapshots", [importRecord.id || Date.now().toString(36), templateId]),
      batchId: importRecord.id || "",
      templateId: templateId,
      city: importRecord.city || "",
      register: importRecord.register || "",
      recordCount: Number(recordCount) || 0,
      sourceSheet: importRecord.sourceSheet || ((importRecord.sheetNames || [])[0] || ""),
      summary: (importRecord.sourceFileName || importRecord.fileName || "") + " :: " + String(recordCount || 0),
      sourceFile: importRecord.sourceFileName || ""
    };
  }

  function entityOutput(entityName, sourceRows, records, meta) {
    return {
      entityName: entityName,
      rows: sourceRows || [],
      records: records || [],
      meta: meta || { warnings: [], conflicts: [] }
    };
  }

  function dedupe(values) {
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

  function stableId(entityName, parts) {
    return entityName + "::" + (parts || []).map(function (value) {
      return normalizeText(value).replace(/\s+/g, "_");
    }).join("::");
  }

  return {
    normalizeFleetImport: normalizeFleetImport
  };
});
