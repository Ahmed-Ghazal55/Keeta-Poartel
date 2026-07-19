(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../import/importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.RiderArchive = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;
  var normalizeCity = ImportTypes.normalizeCity;
  var normalizeRegisterCode = ImportTypes.normalizeRegisterCode;

  function createArchiveEvent(payload) {
    payload = payload || {};
    return {
      id: payload.id || buildEventId(payload),
      riderId: payload.riderId || "",
      eventType: payload.eventType || "imported",
      eventDate: payload.eventDate || new Date().toISOString().slice(0, 10),
      city: normalizeCity(payload.city || ""),
      register: normalizeRegisterCode(payload.register || "") || normalizeText(payload.register),
      platform: normalizeText(payload.platform).toLowerCase(),
      before: payload.before == null ? null : payload.before,
      after: payload.after == null ? null : payload.after,
      source: payload.source || "import_center",
      sourceFile: payload.sourceFile || "",
      note: payload.note || "",
      createdBy: payload.createdBy || "",
      createdAt: payload.createdAt || new Date().toISOString()
    };
  }

  function buildImportedEvent(riderId, record, extra) {
    extra = extra || {};
    return createArchiveEvent({
      riderId: riderId,
      eventType: extra.eventType || "imported",
      eventDate: extra.eventDate || today(),
      city: record.city || extra.city || "",
      register: record.register || extra.register || "",
      platform: extra.platform || record.platform || "",
      after: record,
      source: extra.source || "hr_import",
      sourceFile: record.sourceFile || extra.sourceFile || "",
      note: extra.note || "",
      createdBy: extra.createdBy || ""
    });
  }

  function sortTimeline(events) {
    return (events || []).slice().sort(function (left, right) {
      var leftKey = String(left.eventDate || left.createdAt || "");
      var rightKey = String(right.eventDate || right.createdAt || "");
      return rightKey.localeCompare(leftKey);
    });
  }

  function filterEvents(events, filters) {
    filters = filters || {};
    return (events || []).filter(function (event) {
      if (filters.riderId && String(event.riderId) !== String(filters.riderId)) {
        return false;
      }
      if (filters.city && normalizeCity(event.city) !== normalizeCity(filters.city)) {
        return false;
      }
      if (filters.register) {
        var eventRegister = normalizeRegisterCode(event.register) || normalizeText(event.register);
        var filterRegister = normalizeRegisterCode(filters.register) || normalizeText(filters.register);
        if (eventRegister !== filterRegister) {
          return false;
        }
      }
      if (filters.eventType && String(event.eventType) !== String(filters.eventType)) {
        return false;
      }
      return true;
    });
  }

  function buildEventId(payload) {
    return [
      "archive",
      normalizeText(payload.riderId || "unknown"),
      normalizeText(payload.eventType || "event"),
      normalizeText(payload.platform || ""),
      normalizeText(payload.sourceFile || ""),
      normalizeText(payload.eventDate || today())
    ].join("::");
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  return {
    buildImportedEvent: buildImportedEvent,
    createArchiveEvent: createArchiveEvent,
    filterEvents: filterEvents,
    sortTimeline: sortTimeline
  };
});
