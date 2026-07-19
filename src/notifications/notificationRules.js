(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../operations/currentAssignmentsViewModel.js"),
      require("./notificationSourceMapping.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.NotificationRules = factory(
    root.KeetaPortal.CurrentAssignmentsViewModel,
    root.KeetaPortal.NotificationSourceMapping
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (CurrentAssignmentsViewModel, NotificationSourceMapping) {
  "use strict";

  function deriveNotifications(payload) {
    payload = payload || {};
    var notifications = [];

    (payload.importBatches || []).forEach(function (batch) {
      if (NotificationSourceMapping && typeof NotificationSourceMapping.mapImportBatchNotifications === "function") {
        (NotificationSourceMapping.mapImportBatchNotifications(batch) || []).forEach(function (item) {
          notifications.push(item);
        });
      }
    });

    (payload.vehicleComplianceIssues || []).forEach(function (issue) {
      var notification = NotificationSourceMapping && typeof NotificationSourceMapping.mapVehicleIssue === "function"
        ? NotificationSourceMapping.mapVehicleIssue(issue)
        : null;
      if (notification) {
        notifications.push(notification);
      }
    });

    (payload.performanceIssues || []).forEach(function (issue) {
      var notification = NotificationSourceMapping && typeof NotificationSourceMapping.mapPerformanceIssue === "function"
        ? NotificationSourceMapping.mapPerformanceIssue(issue)
        : null;
      if (notification) {
        notifications.push(notification);
      }
    });

    (payload.operationalStatusReviews || []).forEach(function (review) {
      var notification = NotificationSourceMapping && typeof NotificationSourceMapping.mapOperationalReview === "function"
        ? NotificationSourceMapping.mapOperationalReview(review)
        : null;
      if (notification) {
        notifications.push(notification);
      }
    });

    (payload.dashboardUsers || []).forEach(function (user) {
      (deriveDashboardUserNotifications(user) || []).forEach(function (notification) {
        notifications.push(notification);
      });
    });

    if (CurrentAssignmentsViewModel && typeof CurrentAssignmentsViewModel.deriveAssignmentNotifications === "function") {
      (CurrentAssignmentsViewModel.deriveAssignmentNotifications(payload) || []).forEach(function (notification) {
        notifications.push(notification);
      });
    }

    (payload.auditLogs || []).forEach(function (entry) {
      var notification = NotificationSourceMapping && typeof NotificationSourceMapping.mapAuditEvent === "function"
        ? NotificationSourceMapping.mapAuditEvent(entry)
        : null;
      if (notification) {
        notifications.push(notification);
      }
    });

    if (payload.storageStatus) {
      var storageNotification = NotificationSourceMapping && typeof NotificationSourceMapping.mapStorageWarning === "function"
        ? NotificationSourceMapping.mapStorageWarning(payload.storageStatus)
        : null;
      if (storageNotification) {
        notifications.push(storageNotification);
      }
    }

    return dedupeById(notifications);
  }

  function createNotification(id, payload) {
    var base = {
      actionLabel: payload.actionLabel || "",
      actionPage: payload.actionPage || "",
      actionTarget: payload.actionTarget || "",
      id: id,
      message: payload.message || "",
      relatedCity: payload.relatedCity || "",
      relatedRegister: payload.relatedRegister || "",
      severity: payload.severity || "info",
      source: payload.source || "system",
      sourceEntity: payload.sourceEntity || "",
      sourceEntityId: payload.sourceEntityId || "",
      status: payload.status || "unread",
      title: payload.title || "Notification"
    };
    return NotificationSourceMapping && typeof NotificationSourceMapping.normalizeNotification === "function"
      ? NotificationSourceMapping.normalizeNotification(base)
      : base;
  }

  function normalizeDashboardUserNotification(issueCode, user) {
    if (NotificationSourceMapping && typeof NotificationSourceMapping.mapDashboardUserIssue === "function") {
      return NotificationSourceMapping.mapDashboardUserIssue(issueCode, user);
    }
    return createNotification("dashboard_issue_" + String(user.dashboardUserId || user.userId || user.id || "") + "_" + issueCode, {
      actionPage: "operations-shell",
      actionTarget: String(user.dashboardUserId || user.userId || ""),
      message: issueMessage(issueCode, user),
      relatedCity: user.city || "",
      relatedRegister: user.register || "",
      severity: issueSeverity(issueCode),
      source: "operations",
      sourceEntity: "dashboardUsers",
      sourceEntityId: user.id || user.dashboardUserId || user.userId || "",
      title: "Dashboard user issue"
    });
  }

  function dedupeById(notifications) {
    var seen = {};
    return (notifications || []).filter(function (item) {
      var key = String(item && item.id || "");
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function deriveDashboardUserNotifications(user) {
    user = user || {};
    var issueCodes = Array.isArray(user.assignmentReadinessIssues) ? user.assignmentReadinessIssues : [];
    return issueCodes.map(function (issueCode) {
      return normalizeDashboardUserNotification(issueCode, user);
    });
  }

  function issueMessage(issueCode, user) {
    var labels = {
      accepted_user_without_assignment: "Accepted dashboard user has no active assignment yet.",
      actual_rider_missing_profile: "Active assignment is missing an actual rider profile.",
      assignment_exists_for_dismissed_user: "Dismissed dashboard user still has an active assignment.",
      blocked_missing_owner_iqama: "Owner iqama is missing and assignment cannot proceed.",
      new_user_needs_assignment: "New dashboard user is ready for first assignment review.",
      owner_not_found_in_hr: "Owner iqama was not matched to HR Master.",
      register_city_scope_mismatch: "Assignment or rider scope does not match the dashboard city/register.",
      user_missing_from_latest_snapshot: "Dashboard user disappeared from the latest dashboard upload.",
      user_pending_review: "Dashboard user is still under review.",
      user_rejected_documents: "Dashboard user has rejected review/documents."
    };
    return labels[issueCode] || ("Dashboard user issue: " + issueCode);
  }

  function issueSeverity(issueCode) {
    if (issueCode === "assignment_exists_for_dismissed_user" || issueCode === "register_city_scope_mismatch") {
      return "critical";
    }
    if (issueCode === "user_rejected_documents" || issueCode === "blocked_missing_owner_iqama") {
      return "warning";
    }
    return "task";
  }

  return {
    createNotification: createNotification,
    deriveNotifications: deriveNotifications
  };
});
