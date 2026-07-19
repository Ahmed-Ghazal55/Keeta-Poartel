(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./operationsCommon.js"),
      require("./assignmentReadinessService.js"),
      require("../hr/riderArchive.js"),
      require("./assignmentWorkflowSupport.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.SwapService = factory(
    root.KeetaPortal.OperationsCommon,
    root.KeetaPortal.AssignmentReadinessService,
    root.KeetaPortal.RiderArchive,
    root.KeetaPortal.AssignmentWorkflowSupport
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (OperationsCommon, AssignmentReadinessService, RiderArchive, AssignmentWorkflowSupport) {
  "use strict";

  var buildAssignmentId = OperationsCommon.buildAssignmentId;
  var buildHistoryId = OperationsCommon.buildHistoryId;
  var ensureOrganizationContextScope = OperationsCommon.ensureOrganizationContextScope;
  var ensurePermission = OperationsCommon.ensurePermission;
  var ensureScope = OperationsCommon.ensureScope;
  var findActiveAssignment = OperationsCommon.findActiveAssignment;
  var findDashboardUserById = OperationsCommon.findDashboardUserById;
  var getDashboardUserId = OperationsCommon.getDashboardUserId;
  var getEffectiveCity = OperationsCommon.getEffectiveCity;
  var getEffectivePlatform = OperationsCommon.getEffectivePlatform;
  var getEffectiveRegister = OperationsCommon.getEffectiveRegister;
  var hasCityMatch = OperationsCommon.hasCityMatch;
  var mergeObjects = OperationsCommon.mergeObjects;
  var normalizeDate = OperationsCommon.normalizeDate;
  var normalizeList = OperationsCommon.normalizeList;
  var resolveOrCreateOperationalRider = OperationsCommon.resolveOrCreateOperationalRider;
  var closeActiveVehicleUsageRecords = AssignmentWorkflowSupport.closeActiveVehicleUsageRecords;
  var ensureActiveRiderAvailability = AssignmentWorkflowSupport.ensureActiveRiderAvailability;
  var ensureDashboardUserAssignmentAllowed = AssignmentWorkflowSupport.ensureDashboardUserAssignmentAllowed;
  var normalizeOperationMode = AssignmentWorkflowSupport.normalizeOperationMode;
  var resolveVehiclePayload = AssignmentWorkflowSupport.resolveVehiclePayload;
  var upsertVehicleUsageForAssignment = AssignmentWorkflowSupport.upsertVehicleUsageForAssignment;
  var decorateDashboardUser = AssignmentReadinessService && typeof AssignmentReadinessService.decorateDashboardUser === "function"
    ? AssignmentReadinessService.decorateDashboardUser
    : null;

  function createSwapService(options) {
    options = options || {};
    var dataStore = options.dataStore;
    var auditLog = options.auditLog;

    function swapRider(payload) {
      payload = payload || {};
      ensurePermission(payload.user, "operations.swap");

      var dashboardUsers = dataStore.getAll("dashboardUsers");
      var dashboardUser = findDashboardUserById(dashboardUsers, payload.dashboardUserId);
      if (!dashboardUser) {
        reject("Dashboard user does not exist.", payload.user, payload.dashboardUserId);
      }
      var resolvedCity = payload.city || getEffectiveCity(dashboardUser);
      var resolvedRegister = payload.register || getEffectiveRegister(dashboardUser);
      ensureScope(payload.user, resolvedCity, resolvedRegister);
      ensureOrganizationContextScope(payload.organizationContext, resolvedCity, resolvedRegister);
      ensureDashboardUserAssignmentAllowed(dashboardUser, payload);

      var activeAssignment = findActiveAssignment(dataStore.getAll("assignments"), payload.dashboardUserId);
      if (!activeAssignment) {
        reject("Dashboard user does not have an active assignment.", payload.user, payload.dashboardUserId);
      }
      if (payload.previousRiderId && String(activeAssignment.riderId || "") !== String(payload.previousRiderId)) {
        reject("Previous rider does not match the active assignment.", payload.user, activeAssignment.id);
      }

      var riderBundle = resolveOrCreateOperationalRider(dataStore, {
        appPhone: payload.appPhone || "",
        city: resolvedCity,
        createdBy: payload.user && payload.user.email ? payload.user.email : payload.user && payload.user.id ? payload.user.id : "",
        dashboardUserId: getDashboardUserId(dashboardUser),
        displayName: payload.newRiderName || "",
        fullName: payload.newRiderName || "",
        gasCard: payload.gasCard || "",
        iban: payload.iban || "",
        iqama: payload.newRiderIqama || "",
        note: payload.reason,
        phone: payload.newRiderPhone || "",
        platform: getEffectivePlatform(dashboardUser),
        reason: payload.reason || "",
        register: resolvedRegister,
        riderId: payload.newRiderId || "",
        riderSource: payload.riderSource || "",
        sourceBatchId: payload.sourceBatchId || "",
        sourceFile: dashboardUser.sourceFile || "operations_swap",
        tools: payload.tools || "",
        updatedBy: payload.user && payload.user.email ? payload.user.email : payload.user && payload.user.id ? payload.user.id : "",
        vehicleType: dashboardUser.vehicleType || ""
      }, {
        allowCreateExternal: true
      });
      if (!riderBundle) {
        reject("New rider does not exist.", payload.user, payload.newRiderId || "");
      }
      var newRider = riderBundle.rider;
      if (!hasCityMatch(newRider, resolvedCity)) {
        reject("New rider city does not match dashboard user city.", payload.user, newRider.id);
      }
      if (String(newRider.id || "") === String(activeAssignment.riderId || "")) {
        reject("New rider must be different from the current active rider.", payload.user, activeAssignment.id);
      }
      ensureActiveRiderAvailability(dataStore.getAll("assignments"), newRider, {
        currentAssignmentId: activeAssignment.id,
        currentDashboardUserId: getDashboardUserId(dashboardUser)
      });

      var swapDate = normalizeDate(payload.swapDate);
      var riderReceiveDate = normalizeDate(payload.riderReceiveDate || swapDate, swapDate);
      var vehiclePayload = resolveVehiclePayload(dashboardUser, payload, activeAssignment);
      var operationMode = normalizeOperationMode(payload.operationMode || activeAssignment.operationMode || dashboardUser.settlementMode || dashboardUser.operationMode || "");
      var now = new Date().toISOString();
      var endedAssignment = dataStore.upsert("assignments", mergeObjects({}, activeAssignment, {
        assignmentStatus: "ended",
        endDate: swapDate,
        status: "ended",
        updatedBy: payload.user && payload.user.id ? payload.user.id : "",
        updatedAt: now
      }));
      var newAssignment = dataStore.upsert("assignments", {
        id: buildAssignmentId(getDashboardUserId(dashboardUser), newRider.id, "swap", swapDate),
        assignmentId: buildAssignmentId(getDashboardUserId(dashboardUser), newRider.id, "swap", swapDate),
        dashboardUserId: getDashboardUserId(dashboardUser),
        courierId: getDashboardUserId(dashboardUser),
        userId: getDashboardUserId(dashboardUser),
        riderId: newRider.id,
        riderIqama: newRider.primaryIqama || payload.newRiderIqama || "",
        ownerIqama: dashboardUser.ownerIqama || "",
        ownerName: dashboardUser.fullName || "",
        actualRiderIqama: newRider.primaryIqama || payload.newRiderIqama || "",
        actualRiderName: newRider.displayName || payload.newRiderName || "",
        riderSource: riderBundle.riderSource || "External",
        actualRiderPhone: normalizeList((newRider.phones || []).concat([payload.newRiderPhone || ""]))[0] || "",
        city: resolvedCity,
        register: resolvedRegister,
        platform: getEffectivePlatform(dashboardUser),
        assignmentType: "swap",
        operationMode: operationMode,
        assignmentStatus: "active",
        assignmentStartDate: swapDate,
        riderReceiveDate: riderReceiveDate,
        firstOnlineDate: payload.firstOnlineDate ? normalizeDate(payload.firstOnlineDate) : "",
        dashboardVehicle: vehiclePayload.dashboardVehicle,
        actualVehicle: vehiclePayload.actualVehicle,
        vehicleType: vehiclePayload.vehicleType,
        plateNumber: vehiclePayload.plateNumber,
        vehicleSerial: vehiclePayload.vehicleSerial,
        supervisor: payload.supervisor || "",
        startDate: swapDate,
        endDate: "",
        status: "active",
        reason: payload.reason || "",
        note: payload.note || "",
        notes: payload.note || "",
        sourceBatchId: payload.sourceBatchId || "",
        sourceImportBatchId: payload.sourceBatchId || "",
        createdBy: payload.user && payload.user.id ? payload.user.id : "",
        updatedBy: payload.user && payload.user.id ? payload.user.id : "",
        createdAt: now,
        updatedAt: now,
        sourceFile: dashboardUser.sourceFile || ""
      });
      var updatedDashboardUserRecord = mergeObjects({}, dashboardUser, {
        assignmentStatus: "active",
        currentAssignmentId: newAssignment.id,
        currentRiderId: newRider.id,
        currentRiderIqama: newRider.primaryIqama || payload.newRiderIqama || "",
        currentRiderName: newRider.displayName || payload.newRiderName || "",
        handoverDate: swapDate,
        returnDate: "",
        jobStatus: "working",
        operationMode: operationMode,
        matchStatus: "matched",
        reviewStatus: "ok",
        recommendedAction: "none",
        status: "working",
        latestImportPresence: "present",
        missingFromLatestImport: false,
        updatedAt: now
      });
      if (decorateDashboardUser) {
        updatedDashboardUserRecord = decorateDashboardUser(updatedDashboardUserRecord, {
          assignments: dataStore.getAll("assignments"),
          externalRiders: dataStore.getAll("externalRiders"),
          hrProfiles: dataStore.getAll("hrProfiles"),
          riderOperationalProfiles: dataStore.getAll("riderOperationalProfiles"),
          riders: dataStore.getAll("riders")
        }, {
          lifecycleStatus: "active_assigned"
        });
      } else {
        updatedDashboardUserRecord.lifecycleStatus = "active_assigned";
        updatedDashboardUserRecord.assignmentReadiness = "already_assigned";
      }
      var updatedDashboardUser = dataStore.upsert("dashboardUsers", updatedDashboardUserRecord);
      var closedVehicleUsage = closeActiveVehicleUsageRecords(dataStore, activeAssignment.actualRiderIqama || activeAssignment.riderIqama || dashboardUser.currentRiderIqama || "", {
        city: activeAssignment.city || resolvedCity,
        platform: activeAssignment.platform || getEffectivePlatform(dashboardUser),
        register: activeAssignment.register || resolvedRegister
      }, swapDate, payload.user && payload.user.id ? payload.user.id : "", "operations_swap");
      var nextVehicleUsage = upsertVehicleUsageForAssignment(dataStore, newAssignment, {
        actorId: payload.user && payload.user.id ? payload.user.id : "",
        sourceBatchId: payload.sourceBatchId || "",
        sourceFile: dashboardUser.sourceFile || "",
        sourceOperation: "operations_swap"
      });

      var history = dataStore.upsert("assignmentHistory", {
        id: buildHistoryId(getDashboardUserId(dashboardUser), "swap", swapDate, newRider.id),
        dashboardUserId: getDashboardUserId(dashboardUser),
        previousRiderId: activeAssignment.riderId || "",
        previousRiderIqama: activeAssignment.riderIqama || "",
        newRiderId: newRider.id,
        newRiderIqama: newRider.primaryIqama || payload.newRiderIqama || "",
        city: resolvedCity,
        register: resolvedRegister,
        platform: getEffectivePlatform(dashboardUser),
        action: "swap",
        actionDate: swapDate,
        reason: payload.reason || "",
        before: activeAssignment,
        after: newAssignment,
        createdBy: payload.user && payload.user.id ? payload.user.id : "",
        createdAt: now,
        status: "active"
      });

      var previousArchive = dataStore.upsert("riderArchiveEvents", RiderArchive.createArchiveEvent({
        id: "riderArchiveEvents::swap-out::" + activeAssignment.riderId + "::" + getDashboardUserId(dashboardUser) + "::" + swapDate,
        riderId: activeAssignment.riderId,
        eventType: "swapped",
        eventDate: swapDate,
        city: newAssignment.city,
        register: newAssignment.register,
        platform: newAssignment.platform,
        before: { assignmentId: activeAssignment.id, dashboardUserId: getDashboardUserId(dashboardUser) },
        after: { assignmentId: newAssignment.id, dashboardUserId: getDashboardUserId(dashboardUser) },
        source: "operations_swap",
        sourceFile: dashboardUser.sourceFile || "",
        note: payload.reason || "Rider swapped out.",
        createdBy: payload.user && payload.user.id ? payload.user.id : ""
      }));
      var newArchive = dataStore.upsert("riderArchiveEvents", RiderArchive.createArchiveEvent({
        id: "riderArchiveEvents::swap-in::" + newRider.id + "::" + getDashboardUserId(dashboardUser) + "::" + swapDate,
        riderId: newRider.id,
        eventType: "assigned",
        eventDate: swapDate,
        city: newAssignment.city,
        register: newAssignment.register,
        platform: newAssignment.platform,
        after: { assignmentId: newAssignment.id, dashboardUserId: getDashboardUserId(dashboardUser) },
        source: "operations_swap",
        sourceFile: dashboardUser.sourceFile || "",
        note: payload.reason || "Rider swapped in.",
        createdBy: payload.user && payload.user.id ? payload.user.id : ""
      }));

      if (auditLog && typeof auditLog.createAuditEvent === "function") {
        auditLog.createAuditEvent({
          actor: payload.user,
          after: newAssignment,
          before: activeAssignment,
          context: {
            city: newAssignment.city,
            platform: newAssignment.platform,
            register: newAssignment.register
          },
          entityId: newAssignment.id,
          entityType: "assignments",
          eventType: "swap_confirmed",
          idempotencyKey: "swap_confirmed:" + String(newAssignment.id || ""),
          reason: payload.reason || "",
          source: "operations_swap"
        });
      }

      return {
        assignmentHistory: history,
        dashboardUser: updatedDashboardUser,
        endedAssignment: endedAssignment,
        newAssignment: newAssignment,
        newArchiveEvent: newArchive,
        previousArchiveEvent: previousArchive,
        vehicleUsage: {
          closed: closedVehicleUsage,
          opened: nextVehicleUsage.opened
        }
      };
    }

    function reject(message, user, entityId) {
      throw new Error(message);
    }

    return {
      swapRider: swapRider
    };
  }

  return {
    createSwapService: createSwapService
  };
});
