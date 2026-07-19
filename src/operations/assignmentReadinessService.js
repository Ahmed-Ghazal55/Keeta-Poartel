(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./operationsCommon.js"),
      require("./dashboardUserLifecycle.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.AssignmentReadinessService = factory(
    root.KeetaPortal.OperationsCommon,
    root.KeetaPortal.DashboardUserLifecycle
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (OperationsCommon, DashboardUserLifecycle) {
  "use strict";

  var findActiveAssignment = OperationsCommon.findActiveAssignment;
  var findRiderByIdentifier = OperationsCommon.findRiderByIdentifier;
  var getDashboardUserId = OperationsCommon.getDashboardUserId;
  var getEffectiveCity = OperationsCommon.getEffectiveCity;
  var getEffectivePlatform = OperationsCommon.getEffectivePlatform;
  var getEffectiveRegister = OperationsCommon.getEffectiveRegister;
  var hasCityMatch = OperationsCommon.hasCityMatch;
  var hasRegisterMatch = OperationsCommon.hasRegisterMatch;
  var mergeObjects = OperationsCommon.mergeObjects;
  var normalizeList = OperationsCommon.normalizeList;

  var normalizeDocumentState = DashboardUserLifecycle.normalizeDocumentState;
  var normalizeEmploymentState = DashboardUserLifecycle.normalizeEmploymentState;
  var normalizeReviewState = DashboardUserLifecycle.normalizeReviewState;
  var computeDashboardLifecycleStatus = DashboardUserLifecycle.computeDashboardLifecycleStatus;

  function buildDashboardUserReadiness(user, dataSources, options) {
    user = user || {};
    dataSources = dataSources || {};
    options = options || {};

    var assignments = dataSources.assignments || [];
    var riders = dataSources.riders || [];
    var hrProfiles = dataSources.hrProfiles || [];
    var externalRiders = dataSources.externalRiders || [];
    var riderOperationalProfiles = dataSources.riderOperationalProfiles || [];
    var ownerIqama = normalizeIqama(user.ownerIqama || user.idNumber || "");
    var activeAssignment = findActiveAssignment(assignments, getDashboardUserId(user));
    var actualRiderIqama = normalizeIqama(
      user.currentRiderIqama ||
      user.actualRiderIqama ||
      activeAssignment && (activeAssignment.actualRiderIqama || activeAssignment.riderIqama) ||
      ""
    );
    var actualRider = findRiderByIdentifier(
      riders,
      user.currentRiderId || user.actualRiderId || activeAssignment && activeAssignment.riderId,
      actualRiderIqama
    );
    var ownerProfile = findHrProfileByIqama(hrProfiles, ownerIqama);
    var actualProfile = findOperationalProfileByIqama(riderOperationalProfiles, actualRiderIqama);
    var actualExternal = findExternalRiderByIqama(externalRiders, actualRiderIqama);
    var lifecycleStatus = String(options.lifecycleStatus || user.lifecycleStatus || (
      typeof computeDashboardLifecycleStatus === "function"
        ? computeDashboardLifecycleStatus(user, {
            hasActiveAssignment: !!activeAssignment,
            isNewRecord: false,
            presentInLatestImport: !user.missingFromLatestImport,
            reviewStatus: user.reviewStatus || ""
          })
        : ""
    ));
    var issues = deriveDashboardUserIssues(user, {
      activeAssignment: activeAssignment,
      actualExternal: actualExternal,
      actualProfile: actualProfile,
      actualRider: actualRider,
      ownerIqama: ownerIqama,
      ownerProfile: ownerProfile
    });
    var readinessStatus = resolveReadinessStatus(user, {
      activeAssignment: activeAssignment,
      issues: issues,
      lifecycleStatus: lifecycleStatus,
      ownerIqama: ownerIqama
    });
    var actualRiderSource = resolveActualRiderSource(activeAssignment, actualProfile, actualRider, actualExternal);
    var ownerName = ownerProfile
      ? resolveOwnerName(ownerProfile)
      : (normalizeText(user.ownerName || user.fullName) || "");

    return {
      actualRiderId: actualRider && actualRider.id ? actualRider.id : normalizeText(user.currentRiderId || user.actualRiderId || activeAssignment && activeAssignment.riderId || ""),
      actualRiderIqama: actualRiderIqama,
      actualRiderName: actualRider && actualRider.displayName ? actualRider.displayName : normalizeText(user.currentRiderName || user.actualRiderName || activeAssignment && activeAssignment.actualRiderName || ""),
      currentAssignmentId: normalizeText(user.currentAssignmentId || activeAssignment && activeAssignment.id || ""),
      canAssign: readinessStatus === "ready_for_assignment",
      canDismiss: lifecycleStatus !== "dismissed" && lifecycleStatus !== "missing_from_latest_snapshot",
      canStop: !!activeAssignment,
      canSwap: !!activeAssignment && lifecycleStatus !== "dismissed" && lifecycleStatus !== "missing_from_latest_snapshot",
      city: getEffectiveCity(user),
      courierId: getDashboardUserId(user),
      hasActiveAssignment: !!activeAssignment,
      issues: issues,
      lifecycleStatus: lifecycleStatus,
      operationMode: normalizeOperationMode(user.operationMode || user.settlementMode || ""),
      ownerExistsInHr: !!ownerProfile,
      ownerIqama: ownerIqama,
      ownerName: ownerName,
      ownerProfileId: ownerProfile && ownerProfile.id ? ownerProfile.id : "",
      ownerSource: ownerProfile ? "HR" : (ownerIqama ? "Unknown" : ""),
      platform: getEffectivePlatform(user),
      readinessReason: issues.length ? issues[0] : readinessStatus,
      readinessStatus: readinessStatus,
      register: getEffectiveRegister(user),
      riderSource: actualRiderSource
    };
  }

  function decorateDashboardUser(user, dataSources, options) {
    var readiness = buildDashboardUserReadiness(user, dataSources, options);
    return mergeObjects({}, user || {}, {
      actualRiderId: readiness.actualRiderId,
      actualRiderIqama: readiness.actualRiderIqama,
      actualRiderName: readiness.actualRiderName,
      actualRiderSource: readiness.riderSource,
      assignmentReadiness: readiness.readinessStatus,
      assignmentReadinessIssues: readiness.issues.slice(),
      assignmentReadinessReason: readiness.readinessReason,
      canAssign: readiness.canAssign,
      canDismiss: readiness.canDismiss,
      canStop: readiness.canStop,
      canSwap: readiness.canSwap,
      hasActiveAssignment: readiness.hasActiveAssignment,
      latestImportPresence: user && user.missingFromLatestImport ? "missing" : "present",
      needsReview: readiness.readinessStatus === "needs_manual_review" ||
        readiness.readinessStatus === "missing_from_latest_snapshot" ||
        readiness.readinessStatus === "under_review" ||
        String(readiness.lifecycleStatus || "") === "missing_from_latest_snapshot" ||
        String(readiness.lifecycleStatus || "").indexOf("review") >= 0,
      operationMode: readiness.operationMode,
      ownerExistsInHr: readiness.ownerExistsInHr,
      ownerName: readiness.ownerName || normalizeText(user && (user.ownerName || user.fullName)) || "",
      ownerProfileId: readiness.ownerProfileId,
      ownerSource: readiness.ownerSource
    });
  }

  function deriveDashboardUserIssues(user, context) {
    user = user || {};
    context = context || {};
    var lifecycleStatus = String(user.lifecycleStatus || "");
    var issues = [];
    var employmentState = normalizeEmploymentState(user.employmentStatus || user.jobStatus || user.status || "");
    var reviewState = normalizeReviewState(user.activationStatus || user.reviewStatus || "");
    var documentState = normalizeDocumentState(user.documentChangeStatus || "");

    if (lifecycleStatus === "new") {
      issues.push("new_user_needs_assignment");
    }
    if (lifecycleStatus === "pending_review") {
      issues.push("user_pending_review");
    }
    if (lifecycleStatus === "missing_from_latest_snapshot") {
      issues.push("user_missing_from_latest_snapshot");
    }
    if (!context.ownerIqama) {
      issues.push("blocked_missing_owner_iqama");
    } else if (!context.ownerProfile) {
      issues.push("owner_not_found_in_hr");
    }
    if (documentState === "rejected" || reviewState === "rejected" || lifecycleStatus === "rejected") {
      issues.push("user_rejected_documents");
    }
    if ((lifecycleStatus === "new" || lifecycleStatus === "ready_for_assignment" || lifecycleStatus === "active_unassigned") && !context.activeAssignment) {
      issues.push("accepted_user_without_assignment");
    }
    if (context.activeAssignment && lifecycleStatus === "dismissed") {
      issues.push("assignment_exists_for_dismissed_user");
    }
    if (context.activeAssignment && !context.actualRider) {
      issues.push("actual_rider_missing_profile");
    }
    if (employmentState === "in_service" && reviewState === "accepted" && context.actualRider && (
      !hasCityMatch(context.actualRider, getEffectiveCity(user)) ||
      !hasRegisterMatch(context.actualRider, getEffectiveRegister(user))
    )) {
      issues.push("register_city_scope_mismatch");
    }
    return normalizeList(issues);
  }

  function resolveReadinessStatus(user, context) {
    var lifecycleStatus = String(context.lifecycleStatus || user.lifecycleStatus || "");
    var issues = context.issues || [];
    if (!context.ownerIqama) {
      return "blocked_missing_owner_iqama";
    }
    if (lifecycleStatus === "dismissed") {
      return "dismissed";
    }
    if (lifecycleStatus === "missing_from_latest_snapshot") {
      return "missing_from_latest_snapshot";
    }
    if (lifecycleStatus === "rejected") {
      return "rejected";
    }
    if (issues.indexOf("register_city_scope_mismatch") >= 0) {
      return "blocked_register_city_scope";
    }
    if (issues.indexOf("user_rejected_documents") >= 0) {
      return "blocked_missing_required_documents";
    }
    if (issues.indexOf("owner_not_found_in_hr") >= 0 && lifecycleStatus !== "new") {
      return "needs_manual_review";
    }
    if (context.activeAssignment) {
      return "already_assigned";
    }
    if (lifecycleStatus === "pending_review" || lifecycleStatus === "frozen") {
      return "under_review";
    }
    if (lifecycleStatus === "needs_review") {
      return "needs_manual_review";
    }
    if (lifecycleStatus === "new" || lifecycleStatus === "ready_for_assignment" || lifecycleStatus === "active_unassigned") {
      return "ready_for_assignment";
    }
    return "needs_manual_review";
  }

  function resolveActualRiderSource(activeAssignment, actualProfile, actualRider, actualExternal) {
    var profileSource = normalizeText(actualProfile && actualProfile.riderSource);
    if (profileSource) {
      return profileSource;
    }
    if (normalizeText(activeAssignment && activeAssignment.riderSource)) {
      return normalizeText(activeAssignment.riderSource);
    }
    if (actualRider && actualRider.hrProfileId) {
      return "HR";
    }
    if (actualExternal) {
      return "External";
    }
    return "";
  }

  function resolveOwnerName(ownerProfile) {
    return normalizeText(
      ownerProfile && (
        ownerProfile.fullNameArabic ||
        ownerProfile.fullNameEnglish ||
        ownerProfile.fullName
      )
    );
  }

  function findExternalRiderByIqama(records, iqama) {
    return (records || []).filter(function (item) {
      return normalizeIqama(item && item.iqama) === iqama;
    })[0] || null;
  }

  function findHrProfileByIqama(records, iqama) {
    return (records || []).filter(function (item) {
      return normalizeIqama(item && item.iqama) === iqama;
    })[0] || null;
  }

  function findOperationalProfileByIqama(records, iqama) {
    return (records || []).filter(function (item) {
      return normalizeIqama(item && item.iqama) === iqama;
    })[0] || null;
  }

  function normalizeIqama(value) {
    return normalizeText(value).replace(/[^\d]/g, "");
  }

  function normalizeOperationMode(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text) {
      return "";
    }
    if (text.indexOf("per order") >= 0 || text.indexOf("بالطلب") >= 0 || text.indexOf("fr 3pl") >= 0) {
      return "per_order";
    }
    if (text.indexOf("salary") >= 0 || text.indexOf("راتب") >= 0 || text.indexOf("tiers") >= 0) {
      return "salary_tiers";
    }
    return text.replace(/\s+/g, "_");
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  return {
    buildDashboardUserReadiness: buildDashboardUserReadiness,
    decorateDashboardUser: decorateDashboardUser,
    deriveDashboardUserIssues: deriveDashboardUserIssues
  };
});
