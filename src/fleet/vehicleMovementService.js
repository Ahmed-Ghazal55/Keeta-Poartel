(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("./vehicleValidator.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.VehicleMovementService = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.VehicleValidator
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, VehicleValidator) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function createVehicleMovementEvent(values, options) {
    values = values || {};
    options = options || {};
    var vehicleSerial = normalizeText(values.vehicleSerial);
    var plateNumber = normalizeText(values.plateNumber || values.newPlateNumber);
    var statusText = normalizeText(values.statusText || values.primaryStatus || values.secondaryStatus || values.notes);
    var eventType = normalizeText(values.eventType) || inferEventType(statusText);
    var eventDate = normalizeDate(values.eventDate || values.receiptDate || values.authorizationStartDate || options.fallbackDate);
    return {
      id: stableId("vehicleMovementEvents", [vehicleSerial, eventDate, eventType, normalizeText(values.currentUserIqama || values.delegatedIqama || plateNumber || "none")]),
      vehicleId: values.vehicleId || stableId("vehicles", [vehicleSerial]),
      vehicleSerial: vehicleSerial,
      plateNumber: plateNumber,
      city: normalizeText(values.city),
      branch: normalizeText(values.branch),
      eventType: eventType,
      eventDate: eventDate,
      delegatedPersonName: normalizeText(values.delegatedPersonName),
      delegatedIqama: normalizeText(values.delegatedIqama),
      currentUserIqama: normalizeText(values.currentUserIqama),
      currentUserName: normalizeText(values.currentUserName),
      currentUserPhone: normalizeText(values.currentUserPhone),
      licenseType: normalizeText(values.licenseType),
      platform: normalizePlatform(values.platform || values.applicationName),
      dashboardUserId: normalizeText(values.dashboardUserId),
      notes: normalizeText(values.notes || statusText),
      sourceFile: normalizeText(values.sourceFile || options.sourceFile),
      sourceSheet: normalizeText(values.sourceSheet || options.sourceSheet),
      sourceRow: Number(values.sourceRow || options.sourceRow) || 0,
      createdBy: normalizeText(values.createdBy || options.createdBy),
      createdAt: options.createdAt || new Date().toISOString(),
      status: VehicleValidator.normalizeVehicleStatus(statusText)
    };
  }

  function buildVehicleMovementIndex(events) {
    return (events || []).reduce(function (memo, eventItem) {
      var key = normalizeText(eventItem && eventItem.vehicleSerial);
      if (!key) {
        return memo;
      }
      if (!memo[key] || compareEventOrder(eventItem, memo[key]) > 0) {
        memo[key] = eventItem;
      }
      return memo;
    }, {});
  }

  function deriveVehicleMovementStatus(vehicleSerial, events) {
    var eventItem = getLatestVehicleMovement(vehicleSerial, events);
    if (!eventItem) {
      return "لا توجد بيانات حركة";
    }
    return movementStatusLabel(eventItem.status || eventItem.eventType || eventItem.notes);
  }

  function getLatestVehicleMovement(vehicleSerial, events) {
    var normalizedSerial = normalizeText(vehicleSerial);
    var match = null;
    (events || []).forEach(function (eventItem) {
      if (normalizeText(eventItem && eventItem.vehicleSerial) !== normalizedSerial) {
        return;
      }
      if (!match || compareEventOrder(eventItem, match) > 0) {
        match = eventItem;
      }
    });
    return match;
  }

  function inferEventType(value) {
    var status = VehicleValidator.normalizeVehicleStatus(value);
    if (status === "insurance_withdrawn") {
      return "insurance_withdrawn";
    }
    if (status === "maintenance") {
      return "maintenance";
    }
    if (status === "accident") {
      return "accident";
    }
    if (status === "available") {
      return "received";
    }
    if (status === "received") {
      return "received";
    }
    if (status === "handed_over") {
      return "handed_over";
    }
    if (status === "excluded") {
      return "withdrawn";
    }
    return "note";
  }

  function movementStatusLabel(value) {
    var normalized = VehicleValidator.normalizeVehicleStatus(value);
    var labels = {
      accident: "حادث",
      available: "متاحة",
      excluded: "مستبعدة",
      handed_over: "مسلمة لمندوب",
      insurance_withdrawn: "سحبت من التأمين",
      maintenance: "صيانة",
      note: "ملاحظة",
      received: "مستلمة من مندوب",
      unknown: "غير معروف",
      withdrawn: "مسحوبة"
    };
    return labels[normalized] || normalizeText(value) || "غير معروف";
  }

  function compareEventOrder(left, right) {
    return String(normalizeDate(left && left.eventDate) || left && left.createdAt || "")
      .localeCompare(String(normalizeDate(right && right.eventDate) || right && right.createdAt || ""));
  }

  function normalizeDate(value) {
    var text = normalizeText(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      return text.slice(0, 10);
    }
    return "";
  }

  function normalizePlatform(value) {
    var text = normalizeText(value).toLowerCase();
    if (/هنقر|hunger/.test(text)) {
      return "hungerstation";
    }
    return text;
  }

  function stableId(entityName, parts) {
    return entityName + "::" + (parts || []).map(function (value) {
      return normalizeText(value).replace(/\s+/g, "_");
    }).join("::");
  }

  return {
    buildVehicleMovementIndex: buildVehicleMovementIndex,
    createVehicleMovementEvent: createVehicleMovementEvent,
    deriveVehicleMovementStatus: deriveVehicleMovementStatus,
    getLatestVehicleMovement: getLatestVehicleMovement,
    inferEventType: inferEventType,
    movementStatusLabel: movementStatusLabel
  };
});
