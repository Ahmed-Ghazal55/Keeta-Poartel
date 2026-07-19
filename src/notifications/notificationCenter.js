(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./notificationRules.js"),
      require("./notificationSourceMapping.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.NotificationCenter = factory(
    root.KeetaPortal.NotificationRules,
    root.KeetaPortal.NotificationSourceMapping
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (NotificationRules, NotificationSourceMapping) {
  "use strict";

  function createNotificationCenter(options) {
    options = options || {};
    var repositories = options.repositories || {};
    var nowProvider = typeof options.nowProvider === "function"
      ? options.nowProvider
      : function () {
          return new Date().toISOString();
        };

    function list(filters) {
      filters = filters || {};
      return getRepository().all().filter(function (item) {
        var status = normalizeStatus(item && item.status);
        if (!filters.includeHidden && filters.status !== "hidden" && status === "hidden") {
          return false;
        }
        if (!filters.includeResolved && filters.status !== "resolved" && status === "resolved") {
          return false;
        }
        if (filters.severity && filters.severity !== "all" && normalizeText(item.severity).toLowerCase() !== normalizeText(filters.severity).toLowerCase()) {
          return false;
        }
        if (filters.status && filters.status !== "all" && status !== normalizeText(filters.status).toLowerCase()) {
          return false;
        }
        if (filters.sourceModule && filters.sourceModule !== "all" && normalizeText(item.sourceModule || item.source).toLowerCase() !== normalizeText(filters.sourceModule).toLowerCase()) {
          return false;
        }
        if (filters.search && !matchesSearch(item, filters.search)) {
          return false;
        }
        return true;
      }).sort(sortNotifications);
    }

    function findById(id) {
      return getRepository().findById(id);
    }

    function upsert(notification, options) {
      options = options || {};
      var repository = getRepository();
      var normalized = normalizeNotification(notification, options);
      var existing = repository.findById(normalized.id);
      var next = mergeWithExisting(existing, normalized, {
        manualState: !!options.manualState,
        now: nowProvider()
      });
      if (existing && buildFingerprint(existing) === buildFingerprint(next)) {
        return existing;
      }
      return repository.upsert(next);
    }

    function markAsRead(id, userId) {
      return updateState(id, function (existing) {
        return mergeObjects({}, existing, {
          readAt: nowProvider(),
          readBy: normalizeText(userId),
          status: "read"
        });
      });
    }

    function markAsUnread(id) {
      return updateState(id, function (existing) {
        return mergeObjects({}, existing, {
          readAt: "",
          readBy: "",
          status: "unread"
        });
      });
    }

    function markAsSeen(ids) {
      return updateMany(ids, function (existing) {
        if (existing.lastSeenAt) {
          return existing;
        }
        return mergeObjects({}, existing, {
          lastSeenAt: nowProvider()
        });
      });
    }

    function markAsOpened(id) {
      return updateState(id, function (existing) {
        return mergeObjects({}, existing, {
          lastOpenedAt: nowProvider(),
          lastSeenAt: existing.lastSeenAt || nowProvider()
        });
      });
    }

    function hide(id, userId) {
      return updateState(id, function (existing) {
        return mergeObjects({}, existing, {
          hiddenAt: nowProvider(),
          hiddenBy: normalizeText(userId),
          status: "hidden"
        });
      });
    }

    function clearRead() {
      var repository = getRepository();
      var remaining = repository.all().filter(function (item) {
        return normalizeStatus(item && item.status) !== "read";
      });
      repository.replaceAll(remaining);
      return remaining;
    }

    function syncDerivedNotifications(payload) {
      var repository = getRepository();
      var existing = repository.all();
      var derived = NotificationRules && typeof NotificationRules.deriveNotifications === "function"
        ? NotificationRules.deriveNotifications(payload || {})
        : [];
      var seen = {};

      derived.forEach(function (item) {
        var next = upsert(mergeObjects({}, item, {
          type: "derived"
        }), {
          preserveState: true
        });
        seen[String(next && next.id || item && item.id || "")] = true;
      });

      existing.forEach(function (item) {
        var id = String(item && item.id || "");
        if (!id || seen[id] || !isDerivedNotification(item)) {
          return;
        }
        if (normalizeStatus(item.status) === "resolved") {
          return;
        }
        repository.upsert(mergeObjects({}, item, {
          resolvedAt: nowProvider(),
          resolvedBy: "system",
          status: "resolved",
          updatedAt: nowProvider()
        }));
      });

      return list();
    }

    function getStateHash() {
      return buildNotificationHash(getRepository().all());
    }

    function updateMany(ids, builder) {
      return uniqueIds(ids).map(function (id) {
        return updateState(id, builder);
      }).filter(Boolean);
    }

    function updateState(id, builder) {
      var repository = getRepository();
      var existing = repository.findById(id);
      if (!existing) {
        return null;
      }
      var next = normalizeNotification(builder(existing), {
        preserveExistingState: false
      });
      next = mergeObjects({}, existing, next, {
        updatedAt: nowProvider()
      });
      if (buildFingerprint(existing) === buildFingerprint(next)) {
        return existing;
      }
      return repository.upsert(next);
    }

    function getRepository() {
      if (!repositories.notifications) {
        throw new Error("notifications repository is required");
      }
      return repositories.notifications;
    }

    return {
      clearRead: clearRead,
      findById: findById,
      getStateHash: getStateHash,
      hide: hide,
      list: list,
      markAsOpened: markAsOpened,
      markAsRead: markAsRead,
      markAsSeen: markAsSeen,
      markAsUnread: markAsUnread,
      syncDerivedNotifications: syncDerivedNotifications,
      upsert: upsert
    };
  }

  function sortNotifications(left, right) {
    var leftStatus = normalizeStatus(left && left.status);
    var rightStatus = normalizeStatus(right && right.status);
    if (leftStatus !== rightStatus) {
      return compareStatusRank(leftStatus, rightStatus);
    }
    if (severityRank(left && left.severity) !== severityRank(right && right.severity)) {
      return severityRank(left && left.severity) - severityRank(right && right.severity);
    }
    return String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""));
  }

  function compareStatusRank(left, right) {
    return statusRank(left) - statusRank(right);
  }

  function statusRank(status) {
    var key = normalizeStatus(status);
    if (key === "unread") {
      return 0;
    }
    if (key === "read") {
      return 1;
    }
    if (key === "hidden") {
      return 2;
    }
    if (key === "resolved") {
      return 3;
    }
    return 4;
  }

  function severityRank(severity) {
    var key = normalizeText(severity).toLowerCase();
    if (key === "critical" || key === "danger") {
      return 0;
    }
    if (key === "warning" || key === "task") {
      return 1;
    }
    if (key === "info") {
      return 2;
    }
    if (key === "success") {
      return 3;
    }
    return 4;
  }

  function matchesSearch(item, search) {
    var query = normalizeText(search).toLowerCase();
    if (!query) {
      return true;
    }
    var haystack = [
      item.id,
      item.title,
      item.message,
      item.sourceModule,
      item.sourceType,
      item.entityType,
      item.entityId,
      item.courierId,
      item.ownerIqama,
      item.actualRiderIqama,
      item.assignmentId,
      item.importBatchId,
      item.city,
      item.register,
      item.platform,
      item.suggestedAction,
      item.actionLabel
    ].join(" ").toLowerCase();
    return haystack.indexOf(query) >= 0;
  }

  function mergeWithExisting(existing, normalized, options) {
    options = options || {};
    var next = mergeObjects({}, existing || {}, normalized);
    var now = options.now || new Date().toISOString();
    if (!next.createdAt) {
      next.createdAt = existing && existing.createdAt ? existing.createdAt : now;
    }
    next.updatedAt = now;

    if (!existing) {
      if (!next.status) {
        next.status = "unread";
      }
      return next;
    }

    if (options.manualState) {
      return next;
    }

    next.readAt = normalized.readAt || existing.readAt || "";
    next.readBy = normalized.readBy || existing.readBy || "";
    next.hiddenAt = normalized.hiddenAt || existing.hiddenAt || "";
    next.hiddenBy = normalized.hiddenBy || existing.hiddenBy || "";
    next.lastSeenAt = normalized.lastSeenAt || existing.lastSeenAt || "";
    next.lastOpenedAt = normalized.lastOpenedAt || existing.lastOpenedAt || "";

    if (normalizeStatus(existing.status) === "resolved" && normalizeStatus(normalized.status) === "unread") {
      next.resolvedAt = "";
      next.resolvedBy = "";
      next.status = "unread";
    } else {
      next.resolvedAt = normalized.resolvedAt || existing.resolvedAt || "";
      next.resolvedBy = normalized.resolvedBy || existing.resolvedBy || "";
      next.status = normalized.status || existing.status || "unread";
    }

    if (normalizeStatus(existing.status) === "read" && normalizeStatus(normalized.status) === "unread") {
      next.status = "read";
    }
    if (normalizeStatus(existing.status) === "hidden" && normalizeStatus(normalized.status) === "unread") {
      next.status = "hidden";
    }

    return next;
  }

  function normalizeNotification(notification) {
    if (NotificationSourceMapping && typeof NotificationSourceMapping.normalizeNotification === "function") {
      return NotificationSourceMapping.normalizeNotification(notification || {});
    }
    notification = notification || {};
    return {
      actionLabel: normalizeText(notification.actionLabel),
      actionPage: normalizeText(notification.actionPage),
      actionTarget: normalizeText(notification.actionTarget),
      actualRiderIqama: normalizeText(notification.actualRiderIqama),
      assignmentId: normalizeText(notification.assignmentId),
      city: normalizeText(notification.city || notification.relatedCity),
      courierId: normalizeText(notification.courierId),
      createdAt: normalizeText(notification.createdAt),
      entityId: normalizeText(notification.entityId || notification.sourceEntityId),
      entityType: normalizeText(notification.entityType || notification.sourceEntity),
      hiddenAt: normalizeText(notification.hiddenAt),
      hiddenBy: normalizeText(notification.hiddenBy),
      id: normalizeText(notification.id),
      importBatchId: normalizeText(notification.importBatchId),
      issueId: normalizeText(notification.issueId),
      lastOpenedAt: normalizeText(notification.lastOpenedAt),
      lastSeenAt: normalizeText(notification.lastSeenAt),
      linkedDrawer: normalizeText(notification.linkedDrawer),
      linkedFilters: cloneValue(notification.linkedFilters || {}),
      linkedPage: normalizeText(notification.linkedPage || notification.actionPage),
      linkedSubPage: normalizeText(notification.linkedSubPage),
      message: normalizeText(notification.message),
      ownerIqama: normalizeText(notification.ownerIqama),
      platform: normalizeText(notification.platform),
      readAt: normalizeText(notification.readAt),
      readBy: normalizeText(notification.readBy),
      register: normalizeText(notification.register || notification.relatedRegister),
      relatedCity: normalizeText(notification.city || notification.relatedCity),
      relatedRegister: normalizeText(notification.register || notification.relatedRegister),
      resolvedAt: normalizeText(notification.resolvedAt),
      resolvedBy: normalizeText(notification.resolvedBy),
      severity: normalizeText(notification.severity || "info").toLowerCase(),
      source: normalizeText(notification.source),
      sourceEntity: normalizeText(notification.sourceEntity),
      sourceEntityId: normalizeText(notification.sourceEntityId),
      sourceModule: normalizeText(notification.sourceModule || notification.source),
      sourceType: normalizeText(notification.sourceType || notification.type || "issue"),
      status: normalizeStatus(notification.status),
      suggestedAction: normalizeText(notification.suggestedAction),
      title: normalizeText(notification.title || "Notification"),
      type: normalizeText(notification.type || "manual"),
      updatedAt: normalizeText(notification.updatedAt)
    };
  }

  function isDerivedNotification(notification) {
    return normalizeText(notification && notification.type).toLowerCase() === "derived";
  }

  function buildNotificationHash(items) {
    return JSON.stringify((items || []).map(function (item) {
      return buildFingerprintObject(item);
    }).sort(function (left, right) {
      return String(left.id || "").localeCompare(String(right.id || ""));
    }));
  }

  function buildFingerprint(notification) {
    return JSON.stringify(buildFingerprintObject(notification));
  }

  function buildFingerprintObject(notification) {
    notification = notification || {};
    return {
      actionLabel: notification.actionLabel || "",
      actualRiderIqama: notification.actualRiderIqama || "",
      assignmentId: notification.assignmentId || "",
      city: notification.city || notification.relatedCity || "",
      courierId: notification.courierId || "",
      entityId: notification.entityId || "",
      entityType: notification.entityType || "",
      hiddenAt: notification.hiddenAt || "",
      hiddenBy: notification.hiddenBy || "",
      id: notification.id || "",
      importBatchId: notification.importBatchId || "",
      issueId: notification.issueId || "",
      lastOpenedAt: notification.lastOpenedAt || "",
      lastSeenAt: notification.lastSeenAt || "",
      linkedDrawer: notification.linkedDrawer || "",
      linkedFilters: cloneValue(notification.linkedFilters || {}),
      linkedPage: notification.linkedPage || notification.actionPage || "",
      linkedSubPage: notification.linkedSubPage || "",
      message: notification.message || "",
      ownerIqama: notification.ownerIqama || "",
      platform: notification.platform || "",
      readAt: notification.readAt || "",
      readBy: notification.readBy || "",
      register: notification.register || notification.relatedRegister || "",
      resolvedAt: notification.resolvedAt || "",
      resolvedBy: notification.resolvedBy || "",
      severity: notification.severity || "",
      source: notification.source || "",
      sourceEntity: notification.sourceEntity || "",
      sourceEntityId: notification.sourceEntityId || "",
      sourceModule: notification.sourceModule || "",
      sourceType: notification.sourceType || "",
      status: notification.status || "",
      suggestedAction: notification.suggestedAction || "",
      title: notification.title || "",
      type: notification.type || "",
      updatedAt: notification.updatedAt || ""
    };
  }

  function uniqueIds(ids) {
    var seen = {};
    return (ids || []).map(function (id) {
      return normalizeText(id);
    }).filter(function (id) {
      if (!id || seen[id]) {
        return false;
      }
      seen[id] = true;
      return true;
    });
  }

  function cloneValue(value) {
    if (!value || typeof value !== "object") {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  function normalizeStatus(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (["unread", "read", "resolved", "hidden"].indexOf(normalized) >= 0) {
      return normalized;
    }
    return "unread";
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  return {
    createNotificationCenter: createNotificationCenter
  };
});
