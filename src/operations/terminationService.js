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
  root.KeetaPortal.TerminationService = factory(
    root.KeetaPortal.OperationsCommon,
    root.KeetaPortal.AssignmentReadinessService,
    root.KeetaPortal.RiderArchive,
    root.KeetaPortal.AssignmentWorkflowSupport
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (OperationsCommon, AssignmentReadinessService, RiderArchive, AssignmentWorkflowSupport) {
  "use strict";

  var buildHistoryId = OperationsCommon.buildHistoryId;
  var buildTerminationId = OperationsCommon.buildTerminationId;
  var ensureOrganizationContextScope = OperationsCommon.ensureOrganizationContextScope;
  var ensurePermission = OperationsCommon.ensurePermission;
  var ensureScope = OperationsCommon.ensureScope;
  var findActiveAssignment = OperationsCommon.findActiveAssignment;
  var findDashboardUserById = OperationsCommon.findDashboardUserById;
  var getDashboardUserId = OperationsCommon.getDashboardUserId;
  var getEffectiveCity = OperationsCommon.getEffectiveCity;
  var getEffectivePlatform = OperationsCommon.getEffectivePlatform;
  var getEffectiveRegister = OperationsCommon.getEffectiveRegister;
  var mergeObjects = OperationsCommon.mergeObjects;
  var normalizeDate = OperationsCommon.normalizeDate;
  var closeActiveVehicleUsageRecords = AssignmentWorkflowSupport.closeActiveVehicleUsageRecords;
  var decorateDashboardUser = AssignmentReadinessService && typeof AssignmentReadinessService.decorateDashboardUser === "function"
    ? AssignmentReadinessService.decorateDashboardUser
    : null;

  function createTerminationService(options) {
    options = options || {};
    var dataStore = options.dataStore;
    var auditLog = options.auditLog;

    function terminateUser(payload) {
      payload = payload || {};
      ensurePermission(payload.user, "operations.terminate");
      if (!payload.reason) {
        reject("Termination reason is required.", payload.user, payload.dashboardUserId || "");
      }

      var dashboardUser = findDashboardUserById(dataStore.getAll("dashboardUsers"), payload.dashboardUserId);
      if (!dashboardUser) {
        reject("Dashboard user does not exist.", payload.user, payload.dashboardUserId || "");
      }
      var resolvedCity = payload.city || getEffectiveCity(dashboardUser);
      var resolvedRegister = payload.register || getEffectiveRegister(dashboardUser);
      ensureScope(payload.user, resolvedCity, resolvedRegister);
      ensureOrganizationContextScope(payload.organizationContext, resolvedCity, resolvedRegister);

      var terminationDate = normalizeDate(payload.terminationDate);
      var now = new Date().toISOString();
      var activeAssignment = findActiveAssignment(dataStore.getAll("assignments"), payload.dashboardUserId);
      var endedAssignment = activeAssignment
        ? dataStore.upsert("assignments", mergeObjects({}, activeAssignment, {
            assignmentStatus: payload.action === "cancel_assignment" ? "cancelled" : "ended",
            endDate: terminationDate,
            status: payload.action === "cancel_assignment" ? "cancelled" : "ended",
            updatedBy: payload.user && payload.user.id ? payload.user.id : "",
            updatedAt: now
          }))
        : null;

      var statusAfter = payload.action === "mark_missing_from_dashboard"
        ? "missing_from_latest_import"
        : payload.action === "stop_without_replacement"
          ? "not_working"
          : "terminated";

      var nextLifecycleStatus = statusAfter === "terminated"
        ? "dismissed"
        : statusAfter === "missing_from_latest_import"
          ? "missing_from_latest_snapshot"
          : "active_unassigned";
      var keepRiderLink = payload.keepRiderLink === true;
      var updatedDashboardUserRecord = mergeObjects({}, dashboardUser, {
        assignmentStatus: endedAssignment ? endedAssignment.status : "none",
        currentAssignmentId: "",
        currentRiderId: keepRiderLink ? dashboardUser.currentRiderId || "" : "",
        currentRiderIqama: keepRiderLink ? dashboardUser.currentRiderIqama || "" : "",
        currentRiderName: keepRiderLink ? dashboardUser.currentRiderName || "" : "",
        returnDate: terminationDate,
        jobStatus: statusAfter,
        reviewStatus: statusAfter === "missing_from_latest_import" ? "missing_from_latest_import" : "terminated",
        recommendedAction: statusAfter === "missing_from_latest_import" ? "review_termination" : "none",
        missingFromLatestImport: statusAfter === "missing_from_latest_import",
        latestImportPresence: statusAfter === "missing_from_latest_import" ? "missing" : "present",
        status: statusAfter,
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
          lifecycleStatus: nextLifecycleStatus
        });
      } else {
        updatedDashboardUserRecord.lifecycleStatus = nextLifecycleStatus;
      }
      var updatedDashboardUser = dataStore.upsert("dashboardUsers", updatedDashboardUserRecord);
      var closedVehicleUsage = closeActiveVehicleUsageRecords(dataStore, dashboardUser.currentRiderIqama || activeAssignment && (activeAssignment.actualRiderIqama || activeAssignment.riderIqama) || "", {
        city: resolvedCity,
        platform: getEffectivePlatform(dashboardUser),
        register: resolvedRegister
      }, terminationDate, payload.user && payload.user.id ? payload.user.id : "", "operations_termination");

      var termination = dataStore.upsert("terminations", {
        id: buildTerminationId(getDashboardUserId(dashboardUser), payload.terminationType || payload.action || "manual_termination", terminationDate),
        dashboardUserId: getDashboardUserId(dashboardUser),
        riderId: dashboardUser.currentRiderId || "",
        riderIqama: dashboardUser.currentRiderIqama || "",
        city: resolvedCity,
        register: resolvedRegister,
        platform: getEffectivePlatform(dashboardUser),
        terminationDate: terminationDate,
        terminationType: payload.terminationType || mapActionToTerminationType(payload.action),
        reason: payload.reason,
        sourceImportBatchId: payload.sourceImportBatchId || "",
        previousAssignmentId: endedAssignment ? endedAssignment.id : "",
        statusBefore: dashboardUser.status || dashboardUser.jobStatus || "",
        statusAfter: statusAfter,
        createdBy: payload.user && payload.user.id ? payload.user.id : "",
        createdAt: now,
        status: statusAfter
      });

      var history = dataStore.upsert("assignmentHistory", {
        id: buildHistoryId(getDashboardUserId(dashboardUser), "unassign", terminationDate, ""),
        dashboardUserId: getDashboardUserId(dashboardUser),
        previousRiderId: dashboardUser.currentRiderId || "",
        previousRiderIqama: dashboardUser.currentRiderIqama || "",
        newRiderId: "",
        newRiderIqama: "",
        city: resolvedCity,
        register: resolvedRegister,
        platform: getEffectivePlatform(dashboardUser),
        action: "unassign",
        actionDate: terminationDate,
        reason: payload.reason,
        before: activeAssignment,
        after: endedAssignment,
        createdBy: payload.user && payload.user.id ? payload.user.id : "",
        createdAt: now,
        status: statusAfter
      });

      var archiveEvent = dashboardUser.currentRiderId
        ? dataStore.upsert("riderArchiveEvents", RiderArchive.createArchiveEvent({
            id: "riderArchiveEvents::terminated::" + dashboardUser.currentRiderId + "::" + getDashboardUserId(dashboardUser) + "::" + terminationDate,
            riderId: dashboardUser.currentRiderId,
            eventType: "terminated",
            eventDate: terminationDate,
            city: resolvedCity,
            register: resolvedRegister,
            platform: getEffectivePlatform(dashboardUser),
            before: activeAssignment,
            after: endedAssignment,
            source: "operations_termination",
            sourceFile: dashboardUser.sourceFile || "",
            note: payload.reason,
            createdBy: payload.user && payload.user.id ? payload.user.id : ""
          }))
        : null;

      if (auditLog && typeof auditLog.createAuditEvent === "function") {
        auditLog.createAuditEvent({
          actor: payload.user,
          after: termination,
          before: endedAssignment || dashboardUser,
          context: {
            city: termination.city,
            platform: termination.platform,
            register: termination.register
          },
          entityId: termination.id,
          entityType: "terminations",
          eventType: payload.action === "stop_without_replacement" ? "stop_without_replacement_confirmed" : "termination_created",
          idempotencyKey: (payload.action === "stop_without_replacement" ? "stop_without_replacement_confirmed:" : "termination_created:") + String(termination.id || ""),
          reason: payload.reason,
          source: "operations_termination"
        });
      }

      return {
        archiveEvent: archiveEvent,
        assignmentHistory: history,
        dashboardUser: updatedDashboardUser,
        endedAssignment: endedAssignment,
        vehicleUsage: closedVehicleUsage,
        termination: termination
      };
    }

    function mapActionToTerminationType(action) {
      if (action === "mark_missing_from_dashboard") {
        return "dashboard_missing";
      }
      if (action === "stop_without_replacement") {
        return "stopped_without_replacement";
      }
      if (action === "cancel_assignment") {
        return "duplicate_cleanup";
      }
      return "manual_termination";
    }

    function reject(message, user, entityId) {
      throw new Error(message);
    }

    return {
      terminateUser: terminateUser
    };
  }

  return {
    createTerminationService: createTerminationService
  };
});
