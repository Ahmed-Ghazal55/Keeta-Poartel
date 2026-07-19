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
  root.KeetaPortal.AssignmentService = factory(
    root.KeetaPortal.OperationsCommon,
    root.KeetaPortal.AssignmentReadinessService,
    root.KeetaPortal.RiderArchive,
    root.KeetaPortal.AssignmentWorkflowSupport
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (OperationsCommon, AssignmentReadinessService, RiderArchive, AssignmentWorkflowSupport) {
  "use strict";

  var buildAssignmentId = OperationsCommon.buildAssignmentId;
  var buildHistoryId = OperationsCommon.buildHistoryId;
  var cloneRecord = OperationsCommon.cloneRecord;
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
  var hasRegisterMatch = OperationsCommon.hasRegisterMatch;
  var mergeObjects = OperationsCommon.mergeObjects;
  var normalizeDate = OperationsCommon.normalizeDate;
  var normalizeList = OperationsCommon.normalizeList;
  var resolveOrCreateOperationalRider = OperationsCommon.resolveOrCreateOperationalRider;
  var ensureActiveRiderAvailability = AssignmentWorkflowSupport.ensureActiveRiderAvailability;
  var ensureDashboardUserAssignmentAllowed = AssignmentWorkflowSupport.ensureDashboardUserAssignmentAllowed;
  var normalizeOperationMode = AssignmentWorkflowSupport.normalizeOperationMode;
  var resolveVehiclePayload = AssignmentWorkflowSupport.resolveVehiclePayload;
  var upsertVehicleUsageForAssignment = AssignmentWorkflowSupport.upsertVehicleUsageForAssignment;
  var decorateDashboardUser = AssignmentReadinessService && typeof AssignmentReadinessService.decorateDashboardUser === "function"
    ? AssignmentReadinessService.decorateDashboardUser
    : null;

  function createAssignmentService(options) {
    options = options || {};
    var dataStore = options.dataStore;
    var auditLog = options.auditLog;
    var fleetIntegration = options.fleetIntegration || null;
    var repositories = options.repositories || null;

    function assignRider(payload) {
      payload = payload || {};
      ensurePermission(payload.user, "operations.assign");

      var dashboardUsers = dataStore.getAll("dashboardUsers");
      var assignments = dataStore.getAll("assignments");
      var assignmentHistory = dataStore.getAll("assignmentHistory");
      var dashboardUser = findDashboardUserById(dashboardUsers, payload.dashboardUserId);
      if (!dashboardUser) {
        throw new Error("Dashboard user does not exist.");
      }
      var resolvedCity = payload.city || getEffectiveCity(dashboardUser);
      var resolvedRegister = payload.register || getEffectiveRegister(dashboardUser);
      ensureScope(payload.user, resolvedCity, resolvedRegister);
      ensureOrganizationContextScope(payload.organizationContext, resolvedCity, resolvedRegister);
      ensureDashboardUserAssignmentAllowed(dashboardUser, payload);

      var activeAssignment = findActiveAssignment(assignments, payload.dashboardUserId);
      if (activeAssignment) {
        throw new Error("Dashboard user already has an active assignment.");
      }

      var riderBundle = resolveOrCreateOperationalRider(dataStore, {
        appPhone: payload.appPhone || "",
        city: resolvedCity,
        createdBy: payload.user && payload.user.email ? payload.user.email : payload.user && payload.user.id ? payload.user.id : "",
        dashboardUserId: getDashboardUserId(dashboardUser),
        displayName: payload.riderName || dashboardUser.currentRiderName || dashboardUser.fullName || "",
        fullName: payload.riderName || dashboardUser.currentRiderName || dashboardUser.fullName || "",
        gasCard: payload.gasCard || "",
        iban: payload.iban || "",
        iqama: payload.iqama || "",
        note: payload.note,
        phone: payload.riderPhone || "",
        platform: getEffectivePlatform(dashboardUser),
        reason: payload.reason || "",
        register: resolvedRegister || dashboardUser.register,
        riderId: payload.riderId || "",
        riderSource: payload.riderSource || "",
        sourceBatchId: payload.sourceBatchId || "",
        sourceFile: dashboardUser.sourceFile || "operations_assignment",
        tools: payload.tools || "",
        updatedBy: payload.user && payload.user.email ? payload.user.email : payload.user && payload.user.id ? payload.user.id : "",
        vehicleType: dashboardUser.vehicleType || ""
      }, {
        allowCreateExternal: true
      });
      if (!riderBundle) {
        throw new Error("Rider does not exist.");
      }
      var rider = riderBundle.rider;

      if (!hasCityMatch(rider, resolvedCity)) {
        throw new Error("Rider city does not match dashboard user city.");
      }
      ensureActiveRiderAvailability(assignments, rider, {
        currentDashboardUserId: getDashboardUserId(dashboardUser)
      });

      var warnings = [];
      var vehicle = resolveDashboardVehicle(repositories, dashboardUser);
      if (fleetIntegration && typeof fleetIntegration.validateVehicleBeforeAssignment === "function") {
        var fleetValidation = fleetIntegration.validateVehicleBeforeAssignment(dashboardUser, rider, vehicle, {
          user: payload.user
        });
        warnings = warnings.concat(fleetValidation.warnings || []);
        if (fleetValidation.blockingIssues && fleetValidation.blockingIssues.length) {
          throw new Error(fleetValidation.blockingIssues[0]);
        }
      }
      if (!hasRegisterMatch(rider, resolvedRegister)) {
        warnings.push("rider_register_mismatch");
      }

      var startDate = normalizeDate(payload.startDate);
      var riderReceiveDate = normalizeDate(payload.riderReceiveDate || startDate, startDate);
      var vehiclePayload = resolveVehiclePayload(dashboardUser, payload, {});
      var operationMode = normalizeOperationMode(payload.operationMode || dashboardUser.settlementMode || dashboardUser.operationMode || "");
      var now = new Date().toISOString();
      var assignment = dataStore.upsert("assignments", {
        id: buildAssignmentId(getDashboardUserId(dashboardUser), rider.id, "first_assignment", startDate),
        assignmentId: buildAssignmentId(getDashboardUserId(dashboardUser), rider.id, "first_assignment", startDate),
        dashboardUserId: getDashboardUserId(dashboardUser),
        courierId: getDashboardUserId(dashboardUser),
        userId: getDashboardUserId(dashboardUser),
        riderId: rider.id,
        riderIqama: rider.primaryIqama || payload.iqama || "",
        ownerIqama: dashboardUser.ownerIqama || "",
        ownerName: dashboardUser.fullName || "",
        actualRiderIqama: rider.primaryIqama || payload.iqama || "",
        actualRiderName: rider.displayName || payload.riderName || "",
        riderSource: riderBundle.riderSource || "External",
        actualRiderPhone: normalizeList((rider.phones || []).concat([payload.riderPhone || ""]))[0] || "",
        city: resolvedCity,
        register: resolvedRegister,
        platform: getEffectivePlatform(dashboardUser),
        assignmentType: "first_assignment",
        operationMode: operationMode,
        assignmentStatus: "active",
        assignmentStartDate: startDate,
        riderReceiveDate: riderReceiveDate,
        firstOnlineDate: payload.firstOnlineDate ? normalizeDate(payload.firstOnlineDate) : "",
        dashboardVehicle: vehiclePayload.dashboardVehicle,
        actualVehicle: vehiclePayload.actualVehicle,
        vehicleType: vehiclePayload.vehicleType,
        plateNumber: vehiclePayload.plateNumber,
        vehicleSerial: vehiclePayload.vehicleSerial,
        supervisor: payload.supervisor || "",
        startDate: startDate,
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
        currentAssignmentId: assignment.id,
        currentRiderId: rider.id,
        currentRiderIqama: rider.primaryIqama || payload.iqama || "",
        currentRiderName: rider.displayName || payload.riderName || "",
        handoverDate: startDate,
        returnDate: "",
        jobStatus: "working",
        operationMode: operationMode,
        matchStatus: warnings.length ? "warning" : "matched",
        reviewStatus: warnings.length ? "needs_swap" : "ok",
        recommendedAction: warnings.length ? "review_swap" : "none",
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
      var vehicleUsageResult = upsertVehicleUsageForAssignment(dataStore, assignment, {
        actorId: payload.user && payload.user.id ? payload.user.id : "",
        sourceBatchId: payload.sourceBatchId || "",
        sourceFile: dashboardUser.sourceFile || "",
        sourceOperation: "operations_assignment"
      });

      var history = dataStore.upsert("assignmentHistory", {
        id: buildHistoryId(getDashboardUserId(dashboardUser), "assign", startDate, rider.id),
        dashboardUserId: getDashboardUserId(dashboardUser),
        previousRiderId: "",
        previousRiderIqama: "",
        newRiderId: rider.id,
        newRiderIqama: rider.primaryIqama || payload.iqama || "",
        city: resolvedCity,
        register: resolvedRegister,
        platform: getEffectivePlatform(dashboardUser),
        action: "assign",
        actionDate: startDate,
        reason: payload.reason || "",
        before: null,
        after: assignment,
        createdBy: payload.user && payload.user.id ? payload.user.id : "",
        createdAt: now,
        status: "active"
      });

      var archiveEvent = dataStore.upsert("riderArchiveEvents", RiderArchive.createArchiveEvent({
        id: "riderArchiveEvents::assigned::" + rider.id + "::" + getDashboardUserId(dashboardUser) + "::" + startDate,
        riderId: rider.id,
        eventType: "assigned",
        eventDate: startDate,
        city: resolvedCity,
        register: resolvedRegister,
        platform: getEffectivePlatform(dashboardUser),
        after: {
          assignmentId: assignment.id,
          dashboardUserId: getDashboardUserId(dashboardUser)
        },
        source: "operations_assignment",
        sourceFile: dashboardUser.sourceFile || "",
        note: payload.note || payload.reason || "Assigned rider to dashboard user.",
        createdBy: payload.user && payload.user.id ? payload.user.id : ""
      }));

      if (auditLog && typeof auditLog.createAuditEvent === "function") {
        auditLog.createAuditEvent({
          actor: payload.user,
          after: assignment,
          before: null,
          context: {
            city: assignment.city,
            platform: assignment.platform,
            register: assignment.register
          },
          entityId: assignment.id,
          entityType: "assignments",
          eventType: "assignment_created",
          idempotencyKey: "assignment_created:" + String(assignment.id || ""),
          metadata: {
            warnings: warnings.slice()
          },
          reason: warnings.join(", "),
          source: "operations_assignment"
        });
      }

      return {
        archiveEvent: archiveEvent,
        assignment: assignment,
        assignmentHistory: history,
        dashboardUser: updatedDashboardUser,
        rider: rider,
        vehicleUsage: vehicleUsageResult,
        warnings: warnings
      };
    }

    return {
      assignRider: assignRider
    };
  }

  function resolveDashboardVehicle(repositories, dashboardUser) {
    if (!repositories || !repositories.vehicles || typeof repositories.vehicles.all !== "function") {
      return null;
    }
    var vehicleSerial = normalizeList([dashboardUser && dashboardUser.vehicleSerial])[0] || "";
    var plateNumber = normalizeList([dashboardUser && dashboardUser.plateNumber])[0] || "";
    return repositories.vehicles.all().filter(function (vehicle) {
      return (vehicleSerial && vehicle.vehicleSerial === vehicleSerial) ||
        (plateNumber && vehicle.plateNumber === plateNumber);
    })[0] || null;
  }

  return {
    createAssignmentService: createAssignmentService
  };
});
