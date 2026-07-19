(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../import/importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.VehicleValidator = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  var EXCLUDED_STATUS_TOKENS = [
    "سحبت من التأمين",
    "تم سحبها من التأمين",
    "totaled",
    "تالف",
    "حادث جسيم",
    "صيانة",
    "maintenance",
    "مستبعد",
    "excluded",
    "غير معروف",
    "unknown",
    "وكالة",
    "dealer",
    "تحت نقل ملكية",
    "pending ownership transfer"
  ];

  function normalizeVehicleType(value) {
    var text = normalizeText(value).toLowerCase();
    if (/car|سيارة/.test(text)) {
      return "car";
    }
    if (/bike|دباب|motorcycle|دراجة|scooter/.test(text)) {
      return "bike";
    }
    return "unknown";
  }

  function normalizeTransportType(value) {
    var text = normalizeText(value).toLowerCase();
    if (/public|نقل عام/.test(text)) {
      return "public_transport";
    }
    if (/private|نقل خاص|خاص/.test(text)) {
      return "private_transport";
    }
    return "unknown_transport";
  }

  function normalizeVehicleStatus(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text) {
      return "unknown";
    }
    if (/سحبت من التأمين|مسحوبة من التأمين|insurance/.test(text)) {
      return "insurance_withdrawn";
    }
    if (/maintenance|صيانة|اعطال|أعطال|تحت الإصلاح/.test(text)) {
      return "maintenance";
    }
    if (/accident|حادث/.test(text)) {
      return "accident";
    }
    if (/جاهزة للتسليم|متاحة|available|ready/.test(text)) {
      return "available";
    }
    if (/مستلمة من مندوب|received/.test(text)) {
      return "received";
    }
    if (/مسلمة لمندوب|handed/.test(text)) {
      return "handed_over";
    }
    if (/unknown|غير معروف/.test(text)) {
      return "unknown";
    }
    if (/excluded|مستبعد|dealer|وكالة|تحت نقل ملكية/.test(text)) {
      return "excluded";
    }
    return text.replace(/\s+/g, "_");
  }

  function isExcludedVehicleStatus(value) {
    var text = normalizeText(value).toLowerCase();
    return EXCLUDED_STATUS_TOKENS.some(function (token) {
      return text.indexOf(normalizeText(token).toLowerCase()) >= 0;
    });
  }

  function isAssignableVehicle(vehicle) {
    vehicle = vehicle || {};
    return normalizeTransportType(vehicle.transportType || vehicle.registrationType) === "public_transport" &&
      !isExcludedVehicleStatus(vehicle.status || vehicle.movementStatus || vehicle.currentCity);
  }

  function buildVehicleBlockingReasons(vehicle) {
    var reasons = [];
    if (!vehicle) {
      return reasons;
    }
    if (normalizeTransportType(vehicle.transportType || vehicle.registrationType) === "private_transport") {
      reasons.push("private_transport_not_assignable");
    }
    if (isExcludedVehicleStatus(vehicle.status || vehicle.movementStatus || vehicle.currentCity)) {
      reasons.push("excluded_vehicle_status");
    }
    if (!normalizeText(vehicle.vehicleSerial)) {
      reasons.push("missing_vehicle_serial");
    }
    return reasons;
  }

  function validateOperatingVehicleRecord(record) {
    var issues = [];
    if (!record || !normalizeText(record.vehicleSerial)) {
      issues.push("missing_vehicle_serial");
    }
    if (!normalizeText(record.plateNumber)) {
      issues.push("missing_plate_number");
    }
    if (normalizeVehicleType(record.vehicleType) === "unknown") {
      issues.push("unknown_vehicle_type");
    }
    return issues;
  }

  function validateVehicleMovementEvent(eventItem) {
    var issues = [];
    if (!eventItem || !normalizeText(eventItem.vehicleSerial)) {
      issues.push("missing_vehicle_serial");
    }
    if (!normalizeText(eventItem.eventDate)) {
      issues.push("missing_event_date");
    }
    if (!normalizeText(eventItem.eventType)) {
      issues.push("missing_event_type");
    }
    return issues;
  }

  return {
    EXCLUDED_STATUS_TOKENS: EXCLUDED_STATUS_TOKENS,
    buildVehicleBlockingReasons: buildVehicleBlockingReasons,
    isAssignableVehicle: isAssignableVehicle,
    isExcludedVehicleStatus: isExcludedVehicleStatus,
    normalizeTransportType: normalizeTransportType,
    normalizeVehicleStatus: normalizeVehicleStatus,
    normalizeVehicleType: normalizeVehicleType,
    validateOperatingVehicleRecord: validateOperatingVehicleRecord,
    validateVehicleMovementEvent: validateVehicleMovementEvent
  };
});
