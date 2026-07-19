(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./notificationSourceMapping.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.NotificationDrawerModel = factory(root.KeetaPortal.NotificationSourceMapping);
})(typeof globalThis !== "undefined" ? globalThis : this, function (NotificationSourceMapping) {
  "use strict";

  var QUICK_FILTERS = [
    { id: "all", label: "الكل" },
    { id: "critical", label: "حرجة" },
    { id: "warning", label: "تحذيرات" },
    { id: "unread", label: "غير مقروءة" },
    { id: "operations", label: "عمليات التشغيل" },
    { id: "import", label: "الاستيراد" }
  ];

  var SOURCE_LABELS = NotificationSourceMapping && NotificationSourceMapping.SOURCE_LABELS
    ? NotificationSourceMapping.SOURCE_LABELS
    : {};

  function createFilterState() {
    return {
      quickFilter: "all",
      search: "",
      severity: "all",
      sourceModule: "all",
      status: "all"
    };
  }

  function buildDrawerModel(notifications, filterState) {
    var normalizedFilters = normalizeFilterState(filterState);
    var items = filterNotifications(notifications, normalizedFilters);
    var unreadCount = (notifications || []).filter(function (item) {
      return normalizeStatus(item && item.status) === "unread" && !isHiddenOrResolved(item);
    }).length;
    var counts = {};
    QUICK_FILTERS.forEach(function (filter) {
      counts[filter.id] = filterNotifications(notifications, mergeFilters(normalizedFilters, {
        quickFilter: filter.id
      }), true).length;
    });
    return {
      emptyState: !items.length,
      filterState: normalizedFilters,
      items: items.map(buildViewItem),
      quickFilters: QUICK_FILTERS.map(function (filter) {
        return {
          count: counts[filter.id] || 0,
          id: filter.id,
          isActive: normalizedFilters.quickFilter === filter.id,
          label: filter.label
        };
      }),
      totalCount: (notifications || []).filter(function (item) {
        return !isHiddenOrResolved(item);
      }).length,
      unreadCount: unreadCount
    };
  }

  function buildViewItem(notification) {
    notification = notification || {};
    return mergeFilters(notification, {
      canOpenDrawer: !!notification.linkedDrawer,
      entitySummary: buildEntitySummary(notification),
      openDrawerLabel: deriveDrawerActionLabel(notification.linkedDrawer),
      sourceModuleLabel: getSourceModuleLabel(notification.sourceModule || notification.source),
      statusLabel: normalizeStatus(notification.status) === "read" ? "مقروء" : "غير مقروء"
    });
  }

  function filterNotifications(notifications, filterState, ignoreQuick) {
    filterState = normalizeFilterState(filterState);
    return (notifications || []).filter(function (item) {
      item = item || {};
      if (isHiddenOrResolved(item)) {
        return false;
      }
      if (!ignoreQuick && !matchesQuickFilter(item, filterState.quickFilter)) {
        return false;
      }
      if (filterState.severity !== "all" && normalizeText(item.severity).toLowerCase() !== filterState.severity) {
        return false;
      }
      if (filterState.status !== "all" && normalizeStatus(item.status) !== filterState.status) {
        return false;
      }
      if (filterState.sourceModule !== "all" && normalizeText(item.sourceModule || item.source).toLowerCase() !== filterState.sourceModule) {
        return false;
      }
      if (!matchesSearch(item, filterState.search)) {
        return false;
      }
      return true;
    });
  }

  function matchesQuickFilter(item, quickFilter) {
    if (!quickFilter || quickFilter === "all") {
      return true;
    }
    if (quickFilter === "critical") {
      return normalizeText(item.severity).toLowerCase() === "critical";
    }
    if (quickFilter === "warning") {
      var severity = normalizeText(item.severity).toLowerCase();
      return severity === "warning" || severity === "danger" || severity === "task";
    }
    if (quickFilter === "unread") {
      return normalizeStatus(item.status) === "unread";
    }
    if (quickFilter === "operations") {
      return ["operations", "dashboard_users", "current_assignments"].indexOf(normalizeText(item.sourceModule || item.source).toLowerCase()) >= 0;
    }
    if (quickFilter === "import") {
      return normalizeText(item.sourceModule || item.source).toLowerCase() === "import";
    }
    return true;
  }

  function matchesSearch(item, search) {
    search = normalizeText(search).toLowerCase();
    if (!search) {
      return true;
    }
    var haystack = [
      item.id,
      item.title,
      item.message,
      item.sourceModule,
      item.source,
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
      buildEntitySummary(item)
    ].join(" ").toLowerCase();
    return haystack.indexOf(search) >= 0;
  }

  function buildEntitySummary(notification) {
    notification = notification || {};
    var parts = [];
    if (notification.courierId) {
      parts.push("Courier: " + notification.courierId);
    }
    if (notification.ownerIqama) {
      parts.push("Owner Iqama: " + notification.ownerIqama);
    }
    if (notification.actualRiderIqama) {
      parts.push("Actual Rider Iqama: " + notification.actualRiderIqama);
    }
    if (notification.assignmentId) {
      parts.push("Assignment: " + notification.assignmentId);
    }
    if (notification.importBatchId) {
      parts.push("Batch: " + notification.importBatchId);
    }
    if (!parts.length && notification.entityId) {
      parts.push("Entity: " + notification.entityId);
    }
    return parts.join(" • ");
  }

  function deriveDrawerActionLabel(linkedDrawer) {
    var key = normalizeText(linkedDrawer).toLowerCase();
    var labels = {
      "actual-rider-details": "عرض المندوب الفعلي",
      assign: "فتح التسكين",
      details: "عرض التفاصيل",
      "owner-details": "عرض صاحب اليوزر",
      resolver: "فتح Resolver",
      "source-batch": "فتح المصدر",
      stop: "فتح الإيقاف",
      swap: "فتح التبديل",
      termination: "فتح الإجراء"
    };
    return labels[key] || "فتح العرض المرتبط";
  }

  function getSourceModuleLabel(sourceModule) {
    var key = normalizeText(sourceModule).toLowerCase();
    return SOURCE_LABELS[key] || sourceModule || "system";
  }

  function isHiddenOrResolved(item) {
    var status = normalizeStatus(item && item.status);
    return status === "hidden" || status === "resolved";
  }

  function normalizeFilterState(filterState) {
    return mergeFilters(createFilterState(), filterState || {}, {
      quickFilter: normalizeText(filterState && filterState.quickFilter).toLowerCase() || "all",
      search: normalizeText(filterState && filterState.search),
      severity: normalizeText(filterState && filterState.severity).toLowerCase() || "all",
      sourceModule: normalizeText(filterState && filterState.sourceModule).toLowerCase() || "all",
      status: normalizeText(filterState && filterState.status).toLowerCase() || "all"
    });
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

  function mergeFilters(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  return {
    QUICK_FILTERS: QUICK_FILTERS.slice(),
    buildDrawerModel: buildDrawerModel,
    buildEntitySummary: buildEntitySummary,
    createFilterState: createFilterState,
    deriveDrawerActionLabel: deriveDrawerActionLabel,
    filterNotifications: filterNotifications,
    getSourceModuleLabel: getSourceModuleLabel,
    normalizeFilterState: normalizeFilterState
  };
});
