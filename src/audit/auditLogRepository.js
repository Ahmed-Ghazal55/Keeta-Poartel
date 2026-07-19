(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.AuditLogRepository = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createAuditLogRepository(options) {
    options = options || {};
    if (typeof options.getAll === "function" && typeof options.save === "function") {
      options = { dataStore: options };
    }
    var dataStore = options.dataStore;
    var collectionName = options.collectionName || "auditLogs";
    var quarantineName = options.quarantineName || "auditLogsQuarantine";
    if (!dataStore || typeof dataStore.getAll !== "function" || typeof dataStore.save !== "function") {
      throw new Error("AuditLogRepository requires a DataStore instance.");
    }

    function all() {
      return dataStore.getAll(collectionName);
    }

    function allQuarantined() {
      return dataStore.getAll(quarantineName);
    }

    function findById(id) {
      return dataStore.findById(collectionName, id);
    }

    function findByIdempotencyKey(idempotencyKey) {
      var normalized = normalizeText(idempotencyKey);
      if (!normalized) {
        return null;
      }
      return all().filter(function (item) {
        return normalizeText(item.idempotencyKey) === normalized;
      })[0] || null;
    }

    function list(filters) {
      filters = filters || {};
      return all().filter(function (item) {
        if (filters.eventType && filters.eventType !== "all" && normalizeText(item.eventType || item.action) !== normalizeText(filters.eventType)) {
          return false;
        }
        if (filters.entityType && filters.entityType !== "all" && normalizeText(item.entityType || item.entity) !== normalizeText(filters.entityType)) {
          return false;
        }
        if (filters.actorUserId && normalizeText(item.userId || item.actorUserId || item.actor && item.actor.userId) !== normalizeText(filters.actorUserId)) {
          return false;
        }
        if (filters.city && normalizeText(item.city) !== normalizeText(filters.city)) {
          return false;
        }
        if (filters.register && normalizeText(item.register) !== normalizeText(filters.register)) {
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
          if (haystack.indexOf(normalizeText(filters.query).toLowerCase()) < 0) {
            return false;
          }
        }
        return true;
      });
    }

    function listRecent(limit, filters) {
      return list(filters).slice().sort(function (left, right) {
        return String(right.timestamp || "").localeCompare(String(left.timestamp || ""));
      }).slice(0, limit || 10);
    }

    function replaceAll(records) {
      return dataStore.save(collectionName, records || []);
    }

    function replaceAllQuarantine(records) {
      return dataStore.save(quarantineName, records || []);
    }

    function upsert(record) {
      return dataStore.upsert(collectionName, record);
    }

    function upsertQuarantine(record) {
      return dataStore.upsert(quarantineName, record);
    }

    return {
      all: all,
      allQuarantined: allQuarantined,
      findById: findById,
      findByIdempotencyKey: findByIdempotencyKey,
      list: list,
      listRecent: listRecent,
      replaceAll: replaceAll,
      replaceAllQuarantine: replaceAllQuarantine,
      upsert: upsert,
      upsertQuarantine: upsertQuarantine
    };
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  return {
    createAuditLogRepository: createAuditLogRepository
  };
});
