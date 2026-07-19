(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./auditPolicy.js"),
      require("./auditLogRepository.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.AuditLogService = factory(
    root.KeetaPortal.AuditPolicy,
    root.KeetaPortal.AuditLogRepository
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (AuditPolicy, AuditLogRepository) {
  "use strict";

  function createAuditLogService(options) {
    var resolved = normalizeOptions(options);
    var repository = resolved.repository || AuditLogRepository.createAuditLogRepository({
      dataStore: resolved.dataStore
    });
    var nowProvider = typeof resolved.nowProvider === "function" ? resolved.nowProvider : function () {
      return new Date().toISOString();
    };

    function createAuditEvent(payload) {
      var normalized = normalizePayload(payload);
      if (!normalized.eventType || !AuditPolicy.isAllowedEventType(normalized.eventType)) {
        return null;
      }
      if (!normalized.entityType) {
        return null;
      }
      if (!normalized.entityId && !normalized.operationId && !normalized.importBatchId) {
        return null;
      }
      if (AuditPolicy.isUserTriggeredEventType(normalized.eventType) && !normalized.actor.userId) {
        return null;
      }
      if (AuditPolicy.isForbiddenSource(normalized.source)) {
        return null;
      }
      if (AuditPolicy.requiresIdempotencyKey(normalized.eventType) && !normalized.idempotencyKey) {
        return null;
      }
      if (normalized.idempotencyKey) {
        var existing = repository.findByIdempotencyKey(normalized.idempotencyKey);
        if (existing) {
          return existing;
        }
      }

      return repository.upsert(buildAuditEvent(normalized, nowProvider));
    }

    function append(eventPayload) {
      return createAuditEvent(eventPayload);
    }

    function listRecent(limit, filters) {
      return repository.listRecent(limit, filters);
    }

    function record(action, entity, entityId, before, after, user, extra) {
      extra = extra || {};
      return createAuditEvent({
        after: after,
        before: before,
        context: {
          city: extra.city || (after && after.city) || (before && before.city) || "",
          month: extra.month || (after && after.month) || (before && before.month) || "",
          page: extra.page || "",
          platform: extra.platform || (after && after.platform) || (before && before.platform) || "",
          register: extra.register || (after && after.register) || (before && before.register) || "",
          scope: extra.scope || "",
          subPage: extra.subPage || ""
        },
        entityId: entityId,
        entityType: entity,
        eventType: action,
        idempotencyKey: extra.idempotencyKey || "",
        importBatchId: extra.importBatchId || "",
        metadata: extra.metadata || {},
        operationId: extra.operationId || "",
        reason: extra.reason || extra.note || "",
        source: extra.source || "browser",
        actor: normalizeActor(user)
      });
    }

    return {
      append: append,
      createAuditEvent: createAuditEvent,
      listRecent: listRecent,
      policy: AuditPolicy,
      record: record,
      repository: repository
    };
  }

  function buildAuditEvent(payload, nowProvider) {
    var timestamp = payload.timestamp || nowProvider();
    return {
      action: payload.eventType,
      actor: payload.actor,
      actorName: payload.actor.name,
      actorRole: payload.actor.role,
      actorUserId: payload.actor.userId,
      after: payload.after == null ? null : payload.after,
      before: payload.before == null ? null : payload.before,
      city: payload.context.city,
      context: payload.context,
      entity: payload.entityType,
      entityId: payload.entityId || payload.operationId || payload.importBatchId,
      entityType: payload.entityType,
      eventType: payload.eventType,
      id: payload.id || ("audit_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8)),
      idempotencyKey: payload.idempotencyKey,
      importBatchId: payload.importBatchId,
      metadata: payload.metadata,
      note: payload.reason,
      operationId: payload.operationId,
      platform: payload.context.platform,
      reason: payload.reason,
      register: payload.context.register,
      source: payload.source,
      status: "active",
      timestamp: timestamp,
      userEmail: payload.actor.email,
      userId: payload.actor.userId,
      userName: payload.actor.name,
      userRole: payload.actor.role
    };
  }

  function normalizeActor(user) {
    return AuditPolicy.normalizeActor(user);
  }

  function normalizeOptions(options) {
    if (options && typeof options.getAll === "function" && typeof options.save === "function") {
      return { dataStore: options };
    }
    return options || {};
  }

  function normalizePayload(payload) {
    payload = payload || {};
    var before = payload.before || null;
    var after = payload.after || null;
    var context = AuditPolicy.normalizeContext(payload.context || {});
    if (!context.city) {
      context.city = AuditPolicy.normalizeText(payload.city || (after && after.city) || (before && before.city));
    }
    if (!context.register) {
      context.register = AuditPolicy.normalizeText(payload.register || (after && after.register) || (before && before.register));
    }
    if (!context.platform) {
      context.platform = AuditPolicy.normalizeText(payload.platform || (after && after.platform) || (before && before.platform));
    }
    if (!context.month) {
      context.month = AuditPolicy.normalizeText(payload.month || (after && after.month) || (before && before.month));
    }
    return {
      actor: normalizeActor(payload.actor || payload.user || {}),
      after: after,
      before: before,
      context: context,
      entityId: AuditPolicy.normalizeText(payload.entityId),
      entityType: AuditPolicy.normalizeText(payload.entityType || payload.entity),
      eventType: AuditPolicy.normalizeKey(payload.eventType || payload.action),
      id: AuditPolicy.normalizeText(payload.id),
      idempotencyKey: AuditPolicy.normalizeText(payload.idempotencyKey),
      importBatchId: AuditPolicy.normalizeText(payload.importBatchId),
      metadata: clone(payload.metadata || {}),
      operationId: AuditPolicy.normalizeText(payload.operationId),
      reason: AuditPolicy.normalizeText(payload.reason || payload.note),
      source: AuditPolicy.normalizeKey(payload.source || "browser"),
      timestamp: AuditPolicy.normalizeText(payload.timestamp)
    };
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  return {
    buildAuditEvent: buildAuditEvent,
    createAuditLogService: createAuditLogService,
    normalizeActor: normalizeActor
  };
});
