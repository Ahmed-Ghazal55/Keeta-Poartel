(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./operationsCommon.js"),
      require("./operationsStatusEngine.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DashboardImportSnapshot = factory(
    root.KeetaPortal.OperationsCommon,
    root.KeetaPortal.OperationsStatusEngine
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (OperationsCommon, OperationsStatusEngine) {
  "use strict";

  var buildStatusReviewId = OperationsCommon.buildStatusReviewId;
  var cloneRecord = OperationsCommon.cloneRecord;
  var getDashboardUserId = OperationsCommon.getDashboardUserId;
  var getEffectiveCity = OperationsCommon.getEffectiveCity;
  var getEffectivePlatform = OperationsCommon.getEffectivePlatform;
  var getEffectiveRegister = OperationsCommon.getEffectiveRegister;
  var mergeObjects = OperationsCommon.mergeObjects;
  var normalizeDate = OperationsCommon.normalizeDate;
  var normalizeList = OperationsCommon.normalizeList;

  function compareWithPreviousDashboardSnapshot(previousUsers, currentUsers, scope) {
    var targetScope = scope || inferScope(currentUsers);
    var relevantPrevious = filterByScope(previousUsers || [], targetScope);
    var relevantCurrent = filterByScope(currentUsers || [], targetScope);
    return OperationsStatusEngine.detectImportChanges(relevantPrevious, relevantCurrent);
  }

  function createStatusReviews(users, diff, options) {
    options = options || {};
    var reviews = [];
    var context = {
      assignments: options.assignments || [],
      dashboardUsers: users || [],
      riders: options.riders || []
    };

    (users || []).forEach(function (user) {
      var review = OperationsStatusEngine.reviewDashboardUser(user, context);
      if (review.reviewStatus === "ok" && !user.forceStatusReview) {
        return;
      }
      reviews.push(mergeObjects({}, review, {
        id: buildStatusReviewId(review.dashboardUserId, options.sourceImportBatchId || user.lastSeenImportBatchId || "", review.reviewStatus),
        reviewedAt: options.reviewedAt || new Date().toISOString(),
        reviewedBy: options.reviewedBy || "",
        createdAt: options.reviewedAt || new Date().toISOString(),
        sourceImportBatchId: options.sourceImportBatchId || user.lastSeenImportBatchId || "",
        status: review.reviewStatus
      }));
    });

    return reviews;
  }

  function detectChangedDashboardUsers(diff) {
    return diff && diff.changedUsers ? diff.changedUsers : [];
  }

  function detectMissingDashboardUsers(diff) {
    return diff && diff.missingUsers ? diff.missingUsers : [];
  }

  function detectNewDashboardUsers(diff) {
    return diff && diff.newUsers ? diff.newUsers : [];
  }

  function updateOperationalState(currentUsers, diff, options) {
    options = options || {};
    var now = options.now || new Date().toISOString();
    var batchId = options.sourceImportBatchId || "";
    var previousById = {};
    var changedById = {};
    var duplicateIds = normalizeList(diff && diff.duplicateIds || []);

    (diff && diff.existingUsers || []).forEach(function (pair) {
      previousById[getDashboardUserId(pair.after)] = pair.before;
    });
    (diff && diff.changedUsers || []).forEach(function (pair) {
      changedById[getDashboardUserId(pair.after)] = pair.changedFields;
    });

    var updatedCurrentUsers = (currentUsers || []).map(function (user) {
      var dashboardUserId = getDashboardUserId(user);
      var previousUser = previousById[dashboardUserId];
      var merged = mergeObjects({}, previousUser || {}, user, {
        dashboardUserId: dashboardUserId,
        userId: dashboardUserId,
        firstSeenAt: previousUser && previousUser.firstSeenAt ? previousUser.firstSeenAt : (user && user.firstSeenAt ? user.firstSeenAt : now),
        importedAt: previousUser && previousUser.importedAt ? previousUser.importedAt : now,
        lastSeenAt: now,
        lastSeenImportBatchId: batchId,
        latestImportPresence: "present",
        missingFromLatestImport: false,
        sourceBatchId: batchId,
        duplicateDashboardUserId: duplicateIds.indexOf(dashboardUserId) >= 0
      });

      merged.__snapshotMeta = {
        changedFields: changedById[dashboardUserId] || [],
        isNew: !(previousUser),
        scopeKey: buildScopeKey(merged)
      };

      if (!previousUser) {
        merged.status = merged.currentRiderId ? "assigned" : "needs_assignment";
        merged.reviewStatus = merged.currentRiderId ? "ok" : "needs_assignment";
      }

      return merged;
    });

    var missingUsers = (diff && diff.missingUsers || []).map(function (user) {
      var updated = mergeObjects({}, cloneRecord(user), {
        latestImportPresence: "missing",
        missingFromLatestImport: true,
        recommendedAction: "review_termination",
        reviewStatus: "missing_from_latest_import",
        updatedAt: now,
        sourceImportBatchId: batchId,
        forceStatusReview: true
      });
      updated.__snapshotMeta = {
        changedFields: [],
        isMissing: true,
        scopeKey: buildScopeKey(updated)
      };
      return updated;
    });

    return {
      currentUsers: updatedCurrentUsers,
      missingUsers: missingUsers
    };
  }

  function buildScopeKey(user) {
    return [
      getEffectivePlatform(user) || "unknown",
      getEffectiveCity(user) || "all",
      getEffectiveRegister(user) || "all"
    ].join("::");
  }

  function filterByScope(users, scope) {
    if (!scope) {
      return users || [];
    }
    return (users || []).filter(function (user) {
      if (scope.platform && getEffectivePlatform(user) !== scope.platform) {
        return false;
      }
      if (scope.city && getEffectiveCity(user) !== scope.city) {
        return false;
      }
      if (scope.register && getEffectiveRegister(user) !== scope.register) {
        return false;
      }
      return true;
    });
  }

  function inferScope(users) {
    var row = (users || [])[0] || {};
    return {
      city: getEffectiveCity(row),
      platform: getEffectivePlatform(row),
      register: getEffectiveRegister(row)
    };
  }

  return {
    compareWithPreviousDashboardSnapshot: compareWithPreviousDashboardSnapshot,
    createStatusReviews: createStatusReviews,
    detectChangedDashboardUsers: detectChangedDashboardUsers,
    detectMissingDashboardUsers: detectMissingDashboardUsers,
    detectNewDashboardUsers: detectNewDashboardUsers,
    updateOperationalState: updateOperationalState
  };
});
