(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./auditPolicy.js"),
      require("./auditLogRepository.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.AuditLogCleanup = factory(
    root.KeetaPortal.AuditPolicy,
    root.KeetaPortal.AuditLogRepository
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (AuditPolicy, AuditLogRepository) {
  "use strict";

  function createAuditLogCleanup(options) {
    options = options || {};
    var repository = options.repository || AuditLogRepository.createAuditLogRepository({
      dataStore: options.dataStore
    });
    var nowProvider = typeof options.nowProvider === "function" ? options.nowProvider : function () {
      return new Date().toISOString();
    };

    function cleanupExistingLogs() {
      var existing = repository.all().slice();
      var backup = existing.map(clone);
      var quarantine = repository.allQuarantined().slice();
      var retained = [];
      var moved = [];
      var cleanupRunId = "audit_cleanup_" + Date.now().toString(36);
      var seenIdempotencyKeys = {};
      var seenSignatures = {};

      existing.forEach(function (record) {
        var classification = AuditPolicy.classifyAuditRecord(record, {});
        var idempotencyKey = AuditPolicy.normalizeText(record && record.idempotencyKey);
        var signature = AuditPolicy.buildRecordSignature(record);
        if (!classification.isPhantom && idempotencyKey && seenIdempotencyKeys[idempotencyKey]) {
          classification = mergeClassificationReason(classification, "duplicate_idempotency_key");
        }
        if (!classification.isPhantom && !idempotencyKey && seenSignatures[signature]) {
          classification = mergeClassificationReason(classification, "repeated_signature_without_idempotency");
        }
        if (idempotencyKey) {
          seenIdempotencyKeys[idempotencyKey] = true;
        } else {
          seenSignatures[signature] = true;
        }
        if (!classification.isPhantom) {
          retained.push(record);
          return;
        }
        var quarantineRecord = buildQuarantineRecord(record, classification.reasons, cleanupRunId, nowProvider);
        if (!findQuarantineRecord(quarantine, record.id)) {
          quarantine.push(quarantineRecord);
          moved.push(quarantineRecord);
        }
      });

      repository.replaceAll(retained);
      repository.replaceAllQuarantine(quarantine);

      return {
        backupCount: backup.length,
        backupSnapshot: backup,
        cleanupRunId: cleanupRunId,
        movedCount: moved.length,
        quarantined: moved,
        retainedCount: retained.length
      };
    }

    return {
      cleanupExistingLogs: cleanupExistingLogs
    };
  }

  function buildQuarantineRecord(record, reasons, cleanupRunId, nowProvider) {
    return {
      cleanupReasonCodes: reasons.slice(),
      cleanupRunId: cleanupRunId,
      id: "auditLogsQuarantine::" + String(record && record.id || ""),
      originalId: record && record.id ? record.id : "",
      originalRecord: clone(record),
      quarantinedAt: nowProvider(),
      source: AuditPolicy.normalizeText(record && record.source)
    };
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function findQuarantineRecord(records, originalId) {
    return (records || []).filter(function (item) {
      return String(item && item.originalId || "") === String(originalId || "");
    })[0] || null;
  }

  function mergeClassificationReason(classification, reason) {
    return {
      entityType: classification.entityType,
      eventType: classification.eventType,
      isPhantom: true,
      reasons: classification.reasons.concat([reason]),
      source: classification.source
    };
  }

  return {
    createAuditLogCleanup: createAuditLogCleanup
  };
});
