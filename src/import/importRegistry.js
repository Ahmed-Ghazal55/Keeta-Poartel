(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportRegistryCore = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  function createImportRegistry(options) {
    options = options || {};
    var dataStore = options.dataStore || null;

    function getAllBatches() {
      return dataStore && typeof dataStore.getAll === "function" ? dataStore.getAll("importBatches") : [];
    }

    function findDuplicates(batch) {
      var sourceFileName = batch.sourceFileName || batch.sourceFile || batch.fileName || "";
      return getAllBatches().filter(function (item) {
        return normalize(item.sourceFileName || item.sourceFile) === normalize(sourceFileName) &&
          normalize(item.fileType || item.importType || item.type) === normalize(batch.fileType || batch.importType || batch.type) &&
          normalize(item.city) === normalize(batch.city) &&
          normalize(item.register) === normalize(batch.register) &&
          normalize(item.month) === normalize(batch.month) &&
          normalize(item.id) !== normalize(batch.id);
      });
    }

    function registerBatch(batch) {
      var record = sanitizeBatch(batch);
      var duplicates = findDuplicates(record);
      record.duplicateCount = duplicates.length;
      if (duplicates.length && record.status === "preview") {
        record.warnings = (record.warnings || []).concat(["duplicate_batch_detected"]);
      }
      if (!dataStore || typeof dataStore.upsert !== "function") {
        return record;
      }
      return dataStore.upsert("importBatches", record);
    }

    function listRecent(limit) {
      return getAllBatches()
        .slice()
        .sort(function (left, right) {
          return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
        })
        .slice(0, limit || 20);
    }

    return {
      findDuplicates: findDuplicates,
      getConfidenceState: ImportTypes.getConfidenceState,
      getSupportedTargetEntities: ImportTypes.getSupportedTargetEntities,
      getTargetEntity: function (typeId) {
        return ImportTypes.getImportType(typeId).targetEntity || "";
      },
      getType: ImportTypes.getImportType,
      listRecent: listRecent,
      listTypes: ImportTypes.listImportTypes,
      registerBatch: registerBatch,
      sanitizeBatch: sanitizeBatch
    };
  }

  function sanitizeBatch(batch) {
    batch = batch || {};
    return {
      id: batch.id || "",
      sourceFileName: batch.sourceFileName || batch.sourceFile || batch.fileName || "",
      sourceFile: batch.sourceFile || batch.sourceFileName || batch.fileName || "",
      fileType: batch.fileType || batch.importType || batch.type || "unknown",
      importType: batch.importType || batch.fileType || batch.type || "unknown",
      type: batch.type || batch.fileType || batch.importType || "unknown",
      extension: batch.extension || "",
      confidence: Number(batch.confidence) || 0,
      confidenceState: batch.confidenceState || ImportTypes.getConfidenceState(batch.confidence),
      city: batch.city || "",
      register: batch.register || "",
      month: batch.month || "",
      targetEntity: batch.targetEntity || "",
      templateId: batch.templateId || "",
      rowCount: Number(batch.rowCount) || 0,
      sheetNames: batch.sheetNames || [],
      headers: batch.headers || [],
      status: batch.status || "preview",
      warnings: batch.warnings || [],
      errors: batch.errors || [],
      mapping: batch.mapping ? {
        byField: batch.mapping.byField || {},
        mappedFields: batch.mapping.mappedFields || [],
        missingRequired: batch.mapping.missingRequired || []
      } : {},
      reasons: batch.reasons || [],
      scoreBreakdown: batch.scoreBreakdown || {},
      savedRecordCount: Number(batch.savedRecordCount) || 0,
      auditEventId: batch.auditEventId || "",
      note: batch.note || ""
    };
  }

  function normalize(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  return {
    createImportRegistry: createImportRegistry,
    sanitizeBatch: sanitizeBatch
  };
});
