(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportAuditLib = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function recordImportAudit(auditLog, batch, user, outcome, note) {
    if (!auditLog || typeof auditLog.createAuditEvent !== "function" || !batch || !user) {
      return null;
    }
    var eventType = resolveImportAuditEventType(batch);
    return auditLog.createAuditEvent({
      actor: user,
      after: {
        fileName: batch.sourceFileName || batch.fileName || "",
        rowCount: batch.rowCount || 0,
        savedRecordCount: outcome && outcome.savedRecordCount ? outcome.savedRecordCount : 0,
        targetEntity: batch.targetEntity || "",
        templateId: batch.templateId || "",
        type: batch.type || ""
      },
      context: {
        city: batch.city || "",
        month: batch.month || "",
        platform: inferBatchPlatform(batch),
        register: batch.register || ""
      },
      entityId: batch.id,
      entityType: "importBatches",
      eventType: eventType,
      idempotencyKey: eventType + ":" + String(batch.id || ""),
      importBatchId: batch.id,
      metadata: {
        fileName: batch.sourceFileName || batch.fileName || "",
        savedRecordCount: outcome && outcome.savedRecordCount ? outcome.savedRecordCount : 0,
        type: batch.type || ""
      },
      reason: note || "Saved import batch.",
      source: "import_center"
    });
  }

  function recordRejectedImportAudit(auditLog, batch, user, note) {
    if (!auditLog || typeof auditLog.createAuditEvent !== "function" || !batch || !user) {
      return null;
    }
    return auditLog.createAuditEvent({
      actor: user,
      after: {
        fileName: batch.sourceFileName || batch.fileName || "",
        type: batch.type || ""
      },
      context: {
        city: batch.city || "",
        month: batch.month || "",
        platform: inferBatchPlatform(batch),
        register: batch.register || ""
      },
      entityId: batch.id,
      entityType: "importBatches",
      eventType: "import_batch_rejected",
      idempotencyKey: "import_batch_rejected:" + String(batch.id || ""),
      importBatchId: batch.id,
      metadata: {
        fileName: batch.sourceFileName || batch.fileName || "",
        type: batch.type || ""
      },
      reason: note || "Rejected import batch.",
      source: "import_center"
    });
  }

  function inferBatchPlatform(batch) {
    var text = String(batch && (batch.type || batch.sourceFileName || batch.fileName || "")).toLowerCase();
    if (text.indexOf("amazon") >= 0) {
      return "amazon";
    }
    if (text.indexOf("jahez") >= 0) {
      return "jahez";
    }
    if (text.indexOf("chefz") >= 0) {
      return "chefz";
    }
    if (text.indexOf("hunger") >= 0) {
      return "hungerstation";
    }
    return "keeta";
  }

  function resolveImportAuditEventType(batch) {
    var type = String(batch && batch.type || "");
    if (/^performance_(daily|overall)_/.test(type)) {
      return "performance_report_imported";
    }
    if (/^vda_/.test(type)) {
      return "vda_report_imported";
    }
    if (/^face_verification_/.test(type)) {
      return "face_verification_imported";
    }
    if (/^delivery_experience_/.test(type)) {
      return "delivery_experience_imported";
    }
    if (type === "company_invoice_workbook") {
      return "invoice_imported";
    }
    if (type === "internal_settlement_workbook") {
      return "internal_settlement_saved";
    }
    return "import_batch_saved";
  }

  return {
    inferBatchPlatform: inferBatchPlatform,
    recordImportAudit: recordImportAudit,
    recordRejectedImportAudit: recordRejectedImportAudit,
    resolveImportAuditEventType: resolveImportAuditEventType
  };
});
