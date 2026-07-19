(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./operationsCommon.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.OperationsStatusEngine = factory(root.KeetaPortal.OperationsCommon);
})(typeof globalThis !== "undefined" ? globalThis : this, function (OperationsCommon) {
  "use strict";

  var normalizeList = OperationsCommon.normalizeList;
  var getDashboardUserId = OperationsCommon.getDashboardUserId;
  var getEffectiveCity = OperationsCommon.getEffectiveCity;
  var getEffectiveRegister = OperationsCommon.getEffectiveRegister;
  var findActiveAssignment = OperationsCommon.findActiveAssignment;
  var findActiveAssignmentsByRider = OperationsCommon.findActiveAssignmentsByRider;
  var findRiderByIdentifier = OperationsCommon.findRiderByIdentifier;
  var hasCityMatch = OperationsCommon.hasCityMatch;
  var hasRegisterMatch = OperationsCommon.hasRegisterMatch;

  function reviewDashboardUser(user, context) {
    context = context || {};
    var assignments = context.assignments || [];
    var riders = context.riders || [];
    var dashboardUsers = context.dashboardUsers || [];
    var activeAssignment = findActiveAssignment(assignments, getDashboardUserId(user));
    var rider = findRiderByIdentifier(
      riders,
      user && (user.currentRiderId || (activeAssignment && activeAssignment.riderId)),
      user && user.currentRiderIqama
    );
    var reasons = detectAssignmentIssues(user, assignments, riders);

    if (user && user.__snapshotMeta && user.__snapshotMeta.changedFields) {
      user.__snapshotMeta.changedFields.forEach(function (fieldName) {
        if (fieldName === "city") {
          reasons.push("dashboard_city_changed");
        } else if (fieldName === "register") {
          reasons.push("dashboard_register_changed");
        } else if (fieldName === "vehicleType" || fieldName === "vehicleSerial" || fieldName === "plateNumber") {
          reasons.push("vehicle_changed");
        } else if (fieldName === "ownerIqama") {
          reasons.push("owner_iqama_changed");
        }
      });
    }

    if (user && user.missingFromLatestImport) {
      reasons.push("missing_from_latest_import");
    }
    if (user && user.duplicateDashboardUserId) {
      reasons.push("duplicate_dashboard_user_id");
    }
    if (user && user.status === "terminated" && user.lastSeenImportBatchId === user.sourceImportBatchId) {
      reasons.push("terminated_but_seen_again");
    }
    if (rider && rider.currentWorkStatus === "under_review") {
      reasons.push("under_review_rider");
    }
    if (rider && !hasCityMatch(rider, getEffectiveCity(user))) {
      reasons.push("rider_city_mismatch");
    }
    if (rider && !hasRegisterMatch(rider, getEffectiveRegister(user))) {
      reasons.push("rider_register_mismatch");
    }
    if (rider) {
      var riderAssignments = findActiveAssignmentsByRider(assignments, rider.id).filter(function (item) {
        return String(getDashboardUserId(item)) !== String(getDashboardUserId(user));
      });
      if (riderAssignments.length) {
        reasons.push("same_rider_multiple_active_users");
      }
    }
    if (!reasons.length) {
      reasons.push("assigned_ok");
    }

    var uniqueReasons = dedupe(reasons);
    return {
      dashboardUserId: getDashboardUserId(user),
      riderId: rider ? rider.id : "",
      reasons: uniqueReasons,
      reviewStatus: resolveReviewStatus(uniqueReasons),
      recommendedAction: buildRecommendedAction({ reasons: uniqueReasons, reviewStatus: resolveReviewStatus(uniqueReasons) }),
      activeAssignmentId: activeAssignment ? activeAssignment.id : "",
      city: getEffectiveCity(user),
      register: getEffectiveRegister(user),
      platform: user && user.platform ? user.platform : "",
      statusBefore: user && user.reviewStatus ? user.reviewStatus : "",
      statusAfter: resolveReviewStatus(uniqueReasons),
      sourceImportBatchId: user && user.lastSeenImportBatchId ? user.lastSeenImportBatchId : "",
      currentRiderName: rider ? rider.displayName || "" : "",
      duplicateIds: detectDuplicateIds(dashboardUsers, getDashboardUserId(user))
    };
  }

  function reviewDashboardUsers(users, context) {
    return (users || []).map(function (user) {
      return reviewDashboardUser(user, mergeContext(context, { dashboardUsers: users || [] }));
    });
  }

  function detectAssignmentIssues(user, assignments, riders) {
    var reasons = [];
    var dashboardUserId = getDashboardUserId(user);
    var activeAssignments = (assignments || []).filter(function (item) {
      return String(getDashboardUserId(item)) === String(dashboardUserId) && String(item.status || "") === "active";
    });
    if (!activeAssignments.length && !(user && user.currentRiderId)) {
      reasons.push("needs_assignment");
      return reasons;
    }
    if (activeAssignments.length > 1) {
      reasons.push("same_dashboard_user_multiple_riders");
    }
    var rider = findRiderByIdentifier(riders || [], user && user.currentRiderId, user && user.currentRiderIqama);
    if (!rider) {
      reasons.push("missing_rider_profile");
    }
    return reasons;
  }

  function detectImportChanges(previousSnapshot, currentSnapshot) {
    var previousRows = previousSnapshot || [];
    var currentRows = currentSnapshot || [];
    var previousById = {};
    var currentById = {};
    var duplicateIds = [];

    previousRows.forEach(function (user) {
      previousById[getDashboardUserId(user)] = user;
    });
    currentRows.forEach(function (user) {
      var key = getDashboardUserId(user);
      if (currentById[key]) {
        duplicateIds.push(key);
      }
      currentById[key] = user;
    });

    var newUsers = currentRows.filter(function (user) {
      return !previousById[getDashboardUserId(user)];
    });
    var missingUsers = previousRows.filter(function (user) {
      return !currentById[getDashboardUserId(user)];
    });
    var changedUsers = currentRows.map(function (currentUser) {
      var previousUser = previousById[getDashboardUserId(currentUser)];
      if (!previousUser) {
        return null;
      }
      var changedFields = diffDashboardUserFields(previousUser, currentUser);
      if (!changedFields.length) {
        return null;
      }
      return {
        before: previousUser,
        after: currentUser,
        changedFields: changedFields
      };
    }).filter(Boolean);

    return {
      changedUsers: changedUsers,
      duplicateIds: dedupe(duplicateIds),
      existingUsers: currentRows.filter(function (user) {
        return !!previousById[getDashboardUserId(user)];
      }).map(function (user) {
        return {
          before: previousById[getDashboardUserId(user)],
          after: user
        };
      }),
      missingUsers: missingUsers,
      newUsers: newUsers
    };
  }

  function buildRecommendedAction(review) {
    var reasons = review && review.reasons ? review.reasons : [];
    if (reasons.indexOf("missing_from_latest_import") >= 0) {
      return "review_termination";
    }
    if (reasons.indexOf("needs_assignment") >= 0 || reasons.indexOf("missing_rider_profile") >= 0) {
      return "assign_rider";
    }
    if (
      reasons.indexOf("rider_city_mismatch") >= 0 ||
      reasons.indexOf("rider_register_mismatch") >= 0 ||
      reasons.indexOf("dashboard_city_changed") >= 0 ||
      reasons.indexOf("dashboard_register_changed") >= 0 ||
      reasons.indexOf("vehicle_changed") >= 0 ||
      reasons.indexOf("owner_iqama_changed") >= 0
    ) {
      return "review_swap";
    }
    if (
      reasons.indexOf("duplicate_dashboard_user_id") >= 0 ||
      reasons.indexOf("same_dashboard_user_multiple_riders") >= 0 ||
      reasons.indexOf("same_rider_multiple_active_users") >= 0
    ) {
      return "resolve_conflict";
    }
    if (reasons.indexOf("terminated_but_seen_again") >= 0) {
      return "restore_or_reassign";
    }
    return "none";
  }

  function diffDashboardUserFields(previousUser, currentUser) {
    var trackedFields = [
      "jobStatus",
      "vehicleType",
      "vehicleSerial",
      "plateNumber",
      "city",
      "register",
      "ownerIqama",
      "ownerPhone",
      "activationStatus"
    ];
    return trackedFields.filter(function (fieldName) {
      return String(previousUser && previousUser[fieldName] || "") !== String(currentUser && currentUser[fieldName] || "");
    });
  }

  function resolveReviewStatus(reasons) {
    reasons = reasons || [];
    if (reasons.indexOf("missing_from_latest_import") >= 0) {
      return "missing_from_latest_import";
    }
    if (
      reasons.indexOf("duplicate_dashboard_user_id") >= 0 ||
      reasons.indexOf("same_dashboard_user_multiple_riders") >= 0 ||
      reasons.indexOf("same_rider_multiple_active_users") >= 0
    ) {
      return "conflict";
    }
    if (reasons.indexOf("terminated_but_seen_again") >= 0) {
      return "conflict";
    }
    if (reasons.indexOf("needs_assignment") >= 0 || reasons.indexOf("missing_rider_profile") >= 0) {
      return "needs_assignment";
    }
    if (
      reasons.indexOf("rider_city_mismatch") >= 0 ||
      reasons.indexOf("rider_register_mismatch") >= 0 ||
      reasons.indexOf("dashboard_city_changed") >= 0 ||
      reasons.indexOf("dashboard_register_changed") >= 0 ||
      reasons.indexOf("vehicle_changed") >= 0 ||
      reasons.indexOf("owner_iqama_changed") >= 0
    ) {
      return "needs_swap";
    }
    if (reasons.indexOf("assigned_ok") >= 0) {
      return "ok";
    }
    return "ok";
  }

  function detectDuplicateIds(users, dashboardUserId) {
    return (users || []).filter(function (item) {
      return String(getDashboardUserId(item)) === String(dashboardUserId);
    }).length;
  }

  function dedupe(values) {
    return normalizeList(values);
  }

  function mergeContext(base, extra) {
    var merged = {};
    Object.keys(base || {}).forEach(function (key) {
      merged[key] = base[key];
    });
    Object.keys(extra || {}).forEach(function (key) {
      merged[key] = extra[key];
    });
    return merged;
  }

  return {
    buildRecommendedAction: buildRecommendedAction,
    detectAssignmentIssues: detectAssignmentIssues,
    detectImportChanges: detectImportChanges,
    reviewDashboardUser: reviewDashboardUser,
    reviewDashboardUsers: reviewDashboardUsers
  };
});
