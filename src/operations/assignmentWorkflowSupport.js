(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./operationsCommon.js"),
      require("../import/importTypes.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.AssignmentWorkflowSupport = factory(
    root.KeetaPortal.OperationsCommon,
    root.KeetaPortal.ImportTypes
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (OperationsCommon, ImportTypes) {
  "use strict";

  var findActiveAssignmentsByRider = OperationsCommon.findActiveAssignmentsByRider;
  var getDashboardUserId = OperationsCommon.getDashboardUserId;
  var mergeObjects = OperationsCommon.mergeObjects;
  var normalizeDate = OperationsCommon.normalizeDate;
  var normalizeText = ImportTypes.normalizeText;
  var normalizeRegisterCode = ImportTypes.normalizeRegisterCode;

  function normalizeOperationMode(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (!normalized) {
      return "";
    }
    if (normalized === "salary_tiers" || /salary|tiers|راتب|شرائح/.test(normalized)) {
      return "salary_tiers";
    }
    if (normalized === "per_order" || /per.?order|بالطلب/.test(normalized)) {
      return "per_order";
    }
    if (normalized === "external" || /external|خارجي/.test(normalized)) {
      return "external";
    }
    if (normalized === "replacement" || /replacement|replace|بديل/.test(normalized)) {
      return "replacement";
    }
    return normalized;
  }

  function normalizeAssignmentStatus(value, fallback) {
    var normalized = normalizeText(value).toLowerCase();
    if (!normalized) {
      return normalizeText(fallback);
    }
    if (normalized === "active" || /active|working|نشط|يعمل|في الخدمة/.test(normalized)) {
      return "active";
    }
    if (normalized === "replacement" || /swap|replace|replacement|تبديل|بديل/.test(normalized)) {
      return "replacement";
    }
    if (normalized === "stopped" || /stop|stopped|not.?working|موقوف|ايقاف/.test(normalized)) {
      return "stopped";
    }
    if (normalized === "terminated" || /dismiss|terminate|termination|مقال|اقالة/.test(normalized)) {
      return "terminated";
    }
    if (normalized === "cancelled" || /cancel/.test(normalized)) {
      return "cancelled";
    }
    if (normalized === "ended" || /ended|closed|unassigned/.test(normalized)) {
      return "ended";
    }
    if (normalized === "missing_from_latest_import" || /missing/.test(normalized)) {
      return "missing_from_latest_import";
    }
    if (normalized === "needs_assignment" || /needs_assignment|ready_for_assignment|unassigned/.test(normalized)) {
      return "needs_assignment";
    }
    return normalized;
  }

  function normalizeRiderSource(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (!normalized) {
      return "Unknown";
    }
    if (normalized === "hr" || /كفالة|sponsorship/.test(normalized)) {
      return "HR";
    }
    if (normalized === "external" || /خارجي/.test(normalized)) {
      return "External";
    }
    return "Unknown";
  }

  function sanitizeKeySegment(value) {
    return normalizeText(value).replace(/[^\w\u0600-\u06ff-]+/g, "_");
  }

  function deriveVehicleSource(vehicleFields) {
    vehicleFields = vehicleFields || {};
    var explicit = normalizeText(vehicleFields.vehicleSource).toLowerCase();
    if (explicit === "company" || explicit === "private" || explicit === "unknown") {
      return explicit;
    }
    var combined = normalizeText([
      vehicleFields.actualVehicle,
      vehicleFields.dashboardVehicle,
      vehicleFields.vehicleType
    ].join(" ")).toLowerCase();
    if (/private|personal|خاص/.test(combined)) {
      return "private";
    }
    if (vehicleFields.vehicleSerial || vehicleFields.plateNumber) {
      return "company";
    }
    return combined ? "unknown" : "unknown";
  }

  function resolveVehiclePayload(dashboardUser, payload, fallbackAssignment) {
    dashboardUser = dashboardUser || {};
    payload = payload || {};
    fallbackAssignment = fallbackAssignment || {};
    return {
      actualVehicle: normalizeText(payload.actualVehicle) ||
        normalizeText(fallbackAssignment.actualVehicle) ||
        normalizeText(dashboardUser.actualVehicle) ||
        normalizeText(dashboardUser.vehicleType) ||
        normalizeText(fallbackAssignment.dashboardVehicle),
      dashboardVehicle: normalizeText(payload.dashboardVehicle) ||
        normalizeText(fallbackAssignment.dashboardVehicle) ||
        normalizeText(dashboardUser.dashboardVehicle) ||
        normalizeText(dashboardUser.vehicleType),
      plateNumber: normalizeText(payload.plateNumber) ||
        normalizeText(fallbackAssignment.plateNumber) ||
        normalizeText(dashboardUser.plateNumber),
      vehicleSerial: normalizeText(payload.vehicleSerial) ||
        normalizeText(fallbackAssignment.vehicleSerial) ||
        normalizeText(dashboardUser.vehicleSerial),
      vehicleSource: deriveVehicleSource({
        actualVehicle: payload.actualVehicle || fallbackAssignment.actualVehicle || dashboardUser.actualVehicle || "",
        dashboardVehicle: payload.dashboardVehicle || fallbackAssignment.dashboardVehicle || dashboardUser.dashboardVehicle || dashboardUser.vehicleType || "",
        plateNumber: payload.plateNumber || fallbackAssignment.plateNumber || dashboardUser.plateNumber || "",
        vehicleSerial: payload.vehicleSerial || fallbackAssignment.vehicleSerial || dashboardUser.vehicleSerial || "",
        vehicleType: payload.vehicleType || fallbackAssignment.vehicleType || dashboardUser.vehicleType || ""
      }),
      vehicleType: normalizeText(payload.vehicleType) ||
        normalizeText(fallbackAssignment.vehicleType) ||
        normalizeText(dashboardUser.vehicleType)
    };
  }

  function ensureDashboardUserAssignmentAllowed(dashboardUser, options) {
    options = options || {};
    dashboardUser = dashboardUser || {};
    if (options.allowOverrideAssignment === true) {
      return true;
    }
    var lifecycle = normalizeText(dashboardUser.lifecycleStatus).toLowerCase();
    var activation = normalizeText(dashboardUser.activationStatus || dashboardUser.reviewStatus).toLowerCase();
    if (lifecycle === "dismissed" || lifecycle === "rejected") {
      throw new Error("Dashboard user is not eligible for assignment in the current lifecycle state.");
    }
    if (lifecycle === "pending_review" || lifecycle === "frozen" || activation === "pending") {
      throw new Error("Dashboard user is still pending review and cannot be assigned yet.");
    }
    return true;
  }

  function ensureActiveRiderAvailability(assignments, rider, options) {
    options = options || {};
    rider = rider || {};
    var excludedDashboardUserId = normalizeText(options.currentDashboardUserId);
    var excludedAssignmentId = normalizeText(options.currentAssignmentId);
    var candidateAssignments = [];
    if (rider.id) {
      candidateAssignments = candidateAssignments.concat(findActiveAssignmentsByRider(assignments, rider.id));
    }
    if (rider.primaryIqama) {
      candidateAssignments = candidateAssignments.concat((assignments || []).filter(function (item) {
        return String(item && item.status || "").toLowerCase() === "active" &&
          normalizeText(item && (item.actualRiderIqama || item.riderIqama)) === normalizeText(rider.primaryIqama);
      }));
    }
    var seen = {};
    candidateAssignments = candidateAssignments.filter(function (item) {
      var key = normalizeText(item && item.id);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      if (excludedAssignmentId && key === excludedAssignmentId) {
        return false;
      }
      if (excludedDashboardUserId && getDashboardUserId(item) === excludedDashboardUserId) {
        return false;
      }
      return true;
    });
    if (candidateAssignments.length) {
      throw new Error("Rider already has an active assignment on another dashboard user.");
    }
    return true;
  }

  function closeActiveVehicleUsageRecords(dataStore, riderIqama, context, endDate, actorId, sourceOperation) {
    var normalizedIqama = normalizeText(riderIqama);
    var normalizedPlatform = normalizeText(context && context.platform).toLowerCase();
    var normalizedCity = normalizeText(context && context.city);
    var normalizedRegister = normalizeRegisterCode(context && context.register);
    if (!dataStore || typeof dataStore.getAll !== "function" || typeof dataStore.upsert !== "function" || !normalizedIqama) {
      return [];
    }
    return dataStore.getAll("riderVehicleUsageHistory").filter(function (item) {
      if (!item || item.active !== true) {
        return false;
      }
      if (normalizeText(item.riderIqama) !== normalizedIqama) {
        return false;
      }
      if (normalizedPlatform && normalizeText(item.platform).toLowerCase() !== normalizedPlatform) {
        return false;
      }
      if (normalizedCity && normalizeText(item.city) !== normalizedCity) {
        return false;
      }
      if (normalizedRegister && normalizeRegisterCode(item.register || item.vehicleRegister) !== normalizedRegister) {
        return false;
      }
      return true;
    }).map(function (item) {
      return dataStore.upsert("riderVehicleUsageHistory", mergeObjects({}, item, {
        active: false,
        endDate: normalizeDate(endDate, item.endDate || ""),
        sourceOperation: sourceOperation || item.sourceOperation || "operations_flow",
        status: "inactive",
        updatedAt: new Date().toISOString(),
        updatedBy: actorId || item.updatedBy || ""
      }));
    });
  }

  function upsertVehicleUsageForAssignment(dataStore, assignment, options) {
    options = options || {};
    assignment = assignment || {};
    if (!dataStore || typeof dataStore.getAll !== "function" || typeof dataStore.upsert !== "function") {
      return { closed: [], opened: null };
    }
    var riderIqama = normalizeText(assignment.actualRiderIqama || assignment.riderIqama);
    var vehicleKey = normalizeText(assignment.vehicleSerial || assignment.plateNumber || assignment.actualVehicle || assignment.dashboardVehicle);
    var actorId = normalizeText(options.actorId);
    var sourceOperation = options.sourceOperation || "operations_flow";
    if (!riderIqama) {
      return { closed: [], opened: null };
    }
    var closed = [];
    if (vehicleKey) {
      closed = closeMismatchedVehicleUsageRecords(dataStore, assignment, actorId, sourceOperation);
    } else {
      closed = closeActiveVehicleUsageRecords(dataStore, riderIqama, assignment, assignment.endDate || assignment.assignmentStartDate, actorId, sourceOperation);
    }
    if (normalizeAssignmentStatus(assignment.assignmentStatus || assignment.status) !== "active" || !vehicleKey) {
      return { closed: closed, opened: null };
    }
    var usageId = [
      "riderVehicleUsageHistory",
      sanitizeKeySegment(riderIqama),
      sanitizeKeySegment(vehicleKey),
      sanitizeKeySegment(assignment.assignmentStartDate || assignment.startDate || "")
    ].join("::");
    var opened = dataStore.upsert("riderVehicleUsageHistory", {
      id: usageId,
      riderIqama: riderIqama,
      riderName: assignment.actualRiderName || "",
      riderSource: normalizeRiderSource(assignment.riderSource),
      vehicleSource: deriveVehicleSource(assignment),
      vehicleType: normalizeText(assignment.vehicleType),
      vehicleSerial: normalizeText(assignment.vehicleSerial),
      plateNumber: normalizeText(assignment.plateNumber),
      vehicleRegister: normalizeRegisterCode(assignment.register),
      city: normalizeText(assignment.city),
      register: normalizeRegisterCode(assignment.register),
      platform: normalizeText(assignment.platform).toLowerCase(),
      startDate: normalizeDate(assignment.riderReceiveDate || assignment.assignmentStartDate || assignment.startDate),
      endDate: "",
      active: true,
      sourceBatchId: normalizeText(options.sourceBatchId || assignment.sourceBatchId || assignment.sourceImportBatchId),
      sourceOperation: sourceOperation,
      createdBy: actorId || assignment.updatedBy || assignment.createdBy || "",
      updatedBy: actorId || assignment.updatedBy || assignment.createdBy || "",
      updatedAt: new Date().toISOString(),
      notes: normalizeText(assignment.actualVehicle || assignment.dashboardVehicle || assignment.notes || assignment.note),
      sourceFile: normalizeText(options.sourceFile || assignment.sourceFile),
      status: "active"
    });
    return { closed: closed, opened: opened };
  }

  function closeMismatchedVehicleUsageRecords(dataStore, assignment, actorId, sourceOperation) {
    var riderIqama = normalizeText(assignment.actualRiderIqama || assignment.riderIqama);
    var nextVehicleKey = normalizeText(assignment.vehicleSerial || assignment.plateNumber || assignment.actualVehicle || assignment.dashboardVehicle);
    if (!riderIqama || !nextVehicleKey) {
      return [];
    }
    return dataStore.getAll("riderVehicleUsageHistory").filter(function (item) {
      var sameRider = normalizeText(item && item.riderIqama) === riderIqama;
      var sameContext = normalizeText(item && item.platform).toLowerCase() === normalizeText(assignment.platform).toLowerCase() &&
        normalizeText(item && item.city) === normalizeText(assignment.city) &&
        normalizeRegisterCode(item && (item.register || item.vehicleRegister)) === normalizeRegisterCode(assignment.register);
      if (!sameRider || !sameContext || item.active !== true) {
        return false;
      }
      var existingKey = normalizeText(item.vehicleSerial || item.plateNumber || item.notes);
      return existingKey !== nextVehicleKey;
    }).map(function (item) {
      return dataStore.upsert("riderVehicleUsageHistory", mergeObjects({}, item, {
        active: false,
        endDate: normalizeDate(assignment.assignmentStartDate || assignment.startDate || assignment.endDate),
        sourceOperation: sourceOperation,
        status: "inactive",
        updatedAt: new Date().toISOString(),
        updatedBy: actorId || item.updatedBy || ""
      }));
    });
  }

  return {
    closeActiveVehicleUsageRecords: closeActiveVehicleUsageRecords,
    deriveVehicleSource: deriveVehicleSource,
    ensureActiveRiderAvailability: ensureActiveRiderAvailability,
    ensureDashboardUserAssignmentAllowed: ensureDashboardUserAssignmentAllowed,
    normalizeAssignmentStatus: normalizeAssignmentStatus,
    normalizeOperationMode: normalizeOperationMode,
    normalizeRiderSource: normalizeRiderSource,
    resolveVehiclePayload: resolveVehiclePayload,
    upsertVehicleUsageForAssignment: upsertVehicleUsageForAssignment
  };
});
