(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.AuditPolicy = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ALLOWED_EVENT_TYPES = [
    "import_batch_saved",
    "import_batch_rejected",
    "dashboard_user_created",
    "dashboard_user_updated",
    "dashboard_user_status_changed",
    "assignment_created",
    "assignment_updated",
    "assignment_cancelled",
    "swap_confirmed",
    "stop_without_replacement_confirmed",
    "termination_created",
    "termination_cancelled",
    "rider_profile_updated",
    "external_rider_created",
    "external_rider_updated",
    "hr_profile_updated",
    "vehicle_created",
    "vehicle_updated",
    "vehicle_plate_changed",
    "vehicle_status_changed",
    "vehicle_assigned",
    "vehicle_unassigned",
    "vehicle_marked_under_review",
    "vehicle_excluded",
    "monthly_rule_created",
    "monthly_rule_published",
    "monthly_rule_locked",
    "monthly_rule_archived",
    "performance_report_imported",
    "performance_calculation_finalized",
    "validity_result_approved",
    "vda_report_imported",
    "face_verification_imported",
    "delivery_experience_imported",
    "invoice_imported",
    "invoice_review_saved",
    "internal_settlement_saved",
    "shift_assignment_confirmed",
    "shift_assignment_removed",
    "dev_data_reset_requested",
    "dev_data_reset_completed"
  ];

  var USER_TRIGGERED_EVENT_TYPES = ALLOWED_EVENT_TYPES.slice();
  var IDEMPOTENCY_REQUIRED_EVENT_TYPES = ALLOWED_EVENT_TYPES.slice();
  var FORBIDDEN_SOURCE_PATTERNS = [
    "render",
    "route",
    "clock",
    "tick",
    "sync",
    "notification",
    "storage_status",
    "storage_bridge_health_check",
    "health_check",
    "data_hydrat",
    "data_load",
    "data_read",
    "readonly",
    "read_only",
    "read-only",
    "page_open",
    "page_view",
    "drawer_open",
    "modal_open",
    "search",
    "filter",
    "table",
    "sidebar",
    "debug",
    "browser_verification",
    "topbar",
    "hero",
    "kpi",
    "startup",
    "runtime"
  ];
  var FORBIDDEN_REASON_PATTERNS = [
    "page open",
    "page opened",
    "page render",
    "render",
    "notification sync",
    "live clock",
    "storage refresh",
    "health check",
    "filter",
    "search",
    "drawer",
    "modal",
    "navigation",
    "route"
  ];

  function classifyAuditRecord(record, options) {
    options = options || {};
    var reasons = [];
    var eventType = normalizeKey(record && (record.eventType || record.action));
    var entityType = normalizeText(record && (record.entityType || record.entity));
    var source = normalizeKey(record && record.source);
    var reason = normalizeText(record && (record.reason || record.note));
    var actor = normalizeActor(record && record.actor ? record.actor : {
      email: record && record.userEmail,
      name: record && (record.actorName || record.userName),
      role: record && (record.actorRole || record.userRole),
      userId: record && (record.userId || record.actorUserId)
    });
    var entityId = normalizeText(record && record.entityId);
    var idempotencyKey = normalizeText(record && record.idempotencyKey);
    var duplicateKeys = options.duplicateIdempotencyKeys || {};
    var repeatedSignatures = options.repeatedSignatures || {};
    var signature = buildRecordSignature(record);

    if (!isAllowedEventType(eventType)) {
      reasons.push("event_type_not_allowed");
    }
    if (!entityType) {
      reasons.push("entity_type_missing");
    }
    if (isUserTriggeredEventType(eventType) && !actor.userId) {
      reasons.push("actor_missing");
    }
    if (isForbiddenSource(source)) {
      reasons.push("source_forbidden");
    }
    if (matchesForbiddenReason(reason)) {
      reasons.push("reason_indicates_read_only_activity");
    }
    if (!entityId && !normalizeText(record && record.operationId) && !normalizeText(record && record.importBatchId)) {
      reasons.push("entity_reference_missing");
    }
    if (idempotencyKey && duplicateKeys[idempotencyKey]) {
      reasons.push("duplicate_idempotency_key");
    }
    if (!idempotencyKey && repeatedSignatures[signature] > 1) {
      reasons.push("repeated_signature_without_idempotency");
    }

    return {
      entityType: entityType,
      eventType: eventType,
      isPhantom: reasons.length > 0,
      reasons: unique(reasons),
      source: source
    };
  }

  function buildRecordSignature(record) {
    return [
      normalizeKey(record && (record.eventType || record.action)),
      normalizeText(record && (record.entityType || record.entity)),
      normalizeText(record && record.entityId),
      normalizeKey(record && record.source),
      normalizeText(record && (record.reason || record.note))
    ].join("|");
  }

  function isAllowedEventType(eventType) {
    return ALLOWED_EVENT_TYPES.indexOf(normalizeKey(eventType)) >= 0;
  }

  function isForbiddenSource(source) {
    var normalized = normalizeKey(source);
    if (!normalized) {
      return false;
    }
    return FORBIDDEN_SOURCE_PATTERNS.some(function (pattern) {
      return normalized.indexOf(pattern) >= 0;
    });
  }

  function isUserTriggeredEventType(eventType) {
    return USER_TRIGGERED_EVENT_TYPES.indexOf(normalizeKey(eventType)) >= 0;
  }

  function matchesForbiddenReason(reason) {
    var normalized = normalizeText(reason).toLowerCase();
    if (!normalized) {
      return false;
    }
    return FORBIDDEN_REASON_PATTERNS.some(function (pattern) {
      return normalized.indexOf(pattern) >= 0;
    });
  }

  function normalizeActor(actor) {
    actor = actor || {};
    var normalized = {
      email: normalizeText(actor.email),
      name: normalizeText(actor.name || actor.displayName || actor.username),
      role: normalizeText(actor.role),
      userId: normalizeText(actor.userId || actor.id)
    };
    return normalized;
  }

  function normalizeContext(context) {
    context = context || {};
    return {
      city: normalizeText(context.city),
      month: normalizeText(context.month),
      page: normalizeText(context.page),
      platform: normalizeText(context.platform),
      register: normalizeText(context.register),
      scope: normalizeText(context.scope),
      subPage: normalizeText(context.subPage)
    };
  }

  function normalizeKey(value) {
    return normalizeText(value).toLowerCase().replace(/\s+/g, "_");
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  function requiresIdempotencyKey(eventType) {
    return IDEMPOTENCY_REQUIRED_EVENT_TYPES.indexOf(normalizeKey(eventType)) >= 0;
  }

  function unique(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = String(value || "");
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  return {
    ALLOWED_EVENT_TYPES: ALLOWED_EVENT_TYPES.slice(),
    FORBIDDEN_REASON_PATTERNS: FORBIDDEN_REASON_PATTERNS.slice(),
    FORBIDDEN_SOURCE_PATTERNS: FORBIDDEN_SOURCE_PATTERNS.slice(),
    IDEMPOTENCY_REQUIRED_EVENT_TYPES: IDEMPOTENCY_REQUIRED_EVENT_TYPES.slice(),
    USER_TRIGGERED_EVENT_TYPES: USER_TRIGGERED_EVENT_TYPES.slice(),
    buildRecordSignature: buildRecordSignature,
    classifyAuditRecord: classifyAuditRecord,
    isAllowedEventType: isAllowedEventType,
    isForbiddenSource: isForbiddenSource,
    isUserTriggeredEventType: isUserTriggeredEventType,
    matchesForbiddenReason: matchesForbiddenReason,
    normalizeActor: normalizeActor,
    normalizeContext: normalizeContext,
    normalizeKey: normalizeKey,
    normalizeText: normalizeText,
    requiresIdempotencyKey: requiresIdempotencyKey
  };
});
