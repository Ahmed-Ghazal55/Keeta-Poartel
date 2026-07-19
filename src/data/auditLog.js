(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../audit/auditLogService.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.AuditLogLib = factory(root.KeetaPortal.AuditLogService);
})(typeof globalThis !== "undefined" ? globalThis : this, function (AuditLogService) {
  "use strict";

  function buildAuditEvent(payload) {
    payload = payload || {};
    return AuditLogService.buildAuditEvent({
      actor: AuditLogService.normalizeActor(payload.actor || {
        email: payload.userEmail,
        name: payload.userName,
        role: payload.userRole,
        userId: payload.userId
      }),
      after: payload.after,
      before: payload.before,
      context: payload.context || {
        city: payload.city || "",
        month: payload.month || "",
        page: payload.page || "",
        platform: payload.platform || "",
        register: payload.register || "",
        scope: payload.scope || "",
        subPage: payload.subPage || ""
      },
      entityId: payload.entityId || "",
      entityType: payload.entityType || payload.entity || "",
      eventType: payload.eventType || payload.action || "unknown",
      id: payload.id || "",
      idempotencyKey: payload.idempotencyKey || "",
      importBatchId: payload.importBatchId || "",
      metadata: payload.metadata || {},
      operationId: payload.operationId || "",
      reason: payload.reason || payload.note || "",
      source: payload.source || "browser",
      timestamp: payload.timestamp || ""
    }, function () {
      return payload.timestamp || new Date().toISOString();
    });
  }

  function createAuditLogService(dataStoreOrOptions) {
    return AuditLogService.createAuditLogService(dataStoreOrOptions);
  }

  return {
    buildAuditEvent: buildAuditEvent,
    createAuditLogService: createAuditLogService
  };
});
