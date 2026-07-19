(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.OperationsLogView = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createOperationsLogView(options) {
    options = options || {};
    var repository = options.repository || null;
    var pageSize = Number(options.pageSize) > 0 ? Number(options.pageSize) : 25;

    function listEvents(filters, pagination) {
      var normalizedFilters = normalizeFilters(filters);
      var rows = repository && typeof repository.list === "function"
        ? repository.list(normalizedFilters)
        : repository && typeof repository.all === "function"
          ? filterRows(repository.all(), normalizedFilters)
          : [];
      var sorted = rows.slice().sort(function (left, right) {
        return String(right.timestamp || "").localeCompare(String(left.timestamp || ""));
      });
      var page = Math.max(1, Number(pagination && pagination.page) || 1);
      var effectivePageSize = Math.max(1, Number(pagination && pagination.pageSize) || pageSize);
      var total = sorted.length;
      var totalPages = Math.max(1, Math.ceil(total / effectivePageSize));
      var boundedPage = Math.min(page, totalPages);
      var start = (boundedPage - 1) * effectivePageSize;
      return {
        items: sorted.slice(start, start + effectivePageSize),
        page: boundedPage,
        pageSize: effectivePageSize,
        total: total,
        totalPages: totalPages
      };
    }

    function getFilterOptions() {
      var rows = repository && typeof repository.all === "function"
        ? repository.all()
        : [];
      return {
        actorUserIds: unique(rows.map(function (item) {
          return item.userId || item.actorUserId || item.actor && item.actor.userId || "";
        })),
        cities: unique(rows.map(function (item) { return item.city || ""; })),
        entityTypes: unique(rows.map(function (item) { return item.entityType || item.entity || ""; })),
        eventTypes: unique(rows.map(function (item) { return item.eventType || item.action || ""; })),
        registers: unique(rows.map(function (item) { return item.register || ""; }))
      };
    }

    return {
      getFilterOptions: getFilterOptions,
      listEvents: listEvents,
      normalizeFilters: normalizeFilters
    };
  }

  function normalizeFilters(filters) {
    filters = filters || {};
    return {
      actorUserId: normalizeText(filters.actorUserId),
      city: normalizeText(filters.city),
      dateFrom: normalizeText(filters.dateFrom),
      dateTo: normalizeText(filters.dateTo),
      entityType: normalizeText(filters.entityType),
      eventType: normalizeText(filters.eventType),
      query: normalizeText(filters.query),
      register: normalizeText(filters.register)
    };
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  function filterRows(rows, filters) {
    return (rows || []).filter(function (item) {
      if (filters.eventType && normalizeText(item.eventType || item.action) !== filters.eventType) {
        return false;
      }
      if (filters.entityType && normalizeText(item.entityType || item.entity) !== filters.entityType) {
        return false;
      }
      if (filters.actorUserId && normalizeText(item.userId || item.actorUserId || item.actor && item.actor.userId) !== filters.actorUserId) {
        return false;
      }
      if (filters.city && normalizeText(item.city) !== filters.city) {
        return false;
      }
      if (filters.register && normalizeText(item.register) !== filters.register) {
        return false;
      }
      if (filters.dateFrom && String(item.timestamp || "") < String(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && String(item.timestamp || "") > String(filters.dateTo)) {
        return false;
      }
      if (filters.query) {
        var haystack = [
          item.action,
          item.eventType,
          item.entity,
          item.entityType,
          item.entityId,
          item.note,
          item.reason,
          item.userId,
          item.actorName
        ].join(" ").toLowerCase();
        if (haystack.indexOf(filters.query.toLowerCase()) < 0) {
          return false;
        }
      }
      return true;
    });
  }

  function unique(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = normalizeText(value);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  return {
    createOperationsLogView: createOperationsLogView
  };
});
