(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./importTypes.js"),
      require("./fileDetector.js"),
      require("./importPreview.js"),
      require("./importValidator.js"),
      require("./importNormalizer.js"),
      require("./importAudit.js"),
      require("./importRegistry.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportBatchServiceLib = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.FileDetector,
    root.KeetaPortal.ImportPreviewLib,
    root.KeetaPortal.ImportValidatorLib,
    root.KeetaPortal.ImportNormalizerLib,
    root.KeetaPortal.ImportAuditLib,
    root.KeetaPortal.ImportRegistryCore
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  ImportTypes,
  FileDetector,
  ImportPreview,
  ImportValidator,
  ImportNormalizer,
  ImportAudit,
  ImportRegistryCore
) {
  "use strict";

  function createImportBatchService(options) {
    options = options || {};
    var dataStore = options.dataStore || null;
    var auditLog = options.auditLog || null;
    var authManager = options.authManager || null;
    var rbac = options.rbac || null;
    var registry = options.importRegistry || ImportRegistryCore.createImportRegistry({ dataStore: dataStore });
    var performanceRecalculationService = options.performanceRecalculationService || null;
    var fleetIntegration = options.fleetIntegration || null;

    function createPreviewBatch(payload) {
      payload = payload || {};
      var user = payload.user || getCurrentUser();
      if (user && rbac && typeof rbac.canPerform === "function" && !(rbac.canPerform(user, "imports.create") || rbac.canPerform(user, "imports.review"))) {
        throw new Error("Permission denied: imports.review");
      }
      var runtimeBatch = buildRuntimeBatch(payload);
      var validation = ImportValidator.validateImportRecord(runtimeBatch, {
        mode: "preview",
        dataStore: dataStore
      });
      runtimeBatch.validation = validation;
      runtimeBatch.preview = ImportPreview.buildImportPreview(runtimeBatch, {});
      registry.registerBatch(runtimeBatch);
      return runtimeBatch;
    }

    function saveImportBatch(payload) {
      payload = payload || {};
      var user = payload.user || getCurrentUser();
      assertPermission(user, "imports.save");
      var previewBatch = createPreviewBatch(payload);
      previewBatch.manualMappingApplied = payload.manualMappingApplied === true || !!previewBatch.manualMappingApplied;
      previewBatch.validation = ImportValidator.validateImportRecord(previewBatch, {
        mode: "save",
        dataStore: dataStore
      });
      if (previewBatch.validation.blockingIssues.length) {
        throw new Error(previewBatch.validation.blockingIssues[0].message);
      }
      assertSaveScope(user, previewBatch);

      var outputs = ImportNormalizer.normalizeImportRecord(previewBatch, {
        auditLog: auditLog,
        dataStore: dataStore,
        user: user,
        xlsxLib: options.xlsxLib
      });
      var routedOutputs = filterOutputsForApprovedSave(previewBatch, outputs);
      var savedRecordCount = 0;
      var entityCounts = [];
      var batchStats = createBatchStats();
      var normalizerConflicts = [];
      var normalizerWarnings = [];
      routedOutputs.forEach(function (item) {
        if (!item.entityName || !item.records || !item.records.length) {
          if (item && item.meta) {
            normalizerConflicts = normalizerConflicts.concat(item.meta.conflicts || []);
            normalizerWarnings = normalizerWarnings.concat(item.meta.warnings || []);
          }
          return;
        }
        var result = saveMany(item.entityName, item.records, {
          auditLog: auditLog,
          batch: previewBatch,
          user: user
        });
        savedRecordCount += item.records.length;
        entityCounts.push({
          entityName: item.entityName,
          count: item.records.length,
          created: result.created,
          updated: result.updated
        });
        normalizerConflicts = normalizerConflicts.concat(item.meta && item.meta.conflicts ? item.meta.conflicts : []);
        normalizerWarnings = normalizerWarnings.concat(item.meta && item.meta.warnings ? item.meta.warnings : []);
        mergeStats(batchStats, item.entityName, result);
      });

      attachFleetRebuild(previewBatch, user, {
        auditLog: auditLog,
        batchStats: batchStats,
        fleetIntegration: fleetIntegration
      });

      var auditEvent = ImportAudit.recordImportAudit(auditLog, previewBatch, user, {
        savedRecordCount: savedRecordCount
      }, payload.note || "Saved import batch");
      recordBatchAuditEvents(auditLog, previewBatch, routedOutputs, user, batchStats, {
        auditEventId: auditEvent && auditEvent.id ? auditEvent.id : ""
      });

      attachPerformanceRecalculation(previewBatch, user, {
        auditLog: auditLog,
        service: performanceRecalculationService
      });

      previewBatch.status = "saved";
      previewBatch.savedRecordCount = savedRecordCount;
      previewBatch.savedEntities = entityCounts;
      previewBatch.persistedEntities = entityCounts.map(function (item) {
        return item.entityName;
      });
      previewBatch.batchStats = batchStats;
      previewBatch.normalizerConflicts = dedupeByValue(normalizerConflicts);
      previewBatch.normalizerWarnings = dedupeByValue(normalizerWarnings);
      previewBatch.auditEventId = auditEvent && auditEvent.id ? auditEvent.id : "";
      previewBatch.recalculationSummary = previewBatch.recalculationSummary || null;
      registry.registerBatch(previewBatch);
      return previewBatch;
    }

    function rejectImportBatch(payload) {
      payload = payload || {};
      var user = payload.user || getCurrentUser();
      assertPermission(user, "imports.reject");
      var batch = buildRuntimeBatch(payload);
      batch.status = "rejected";
      batch.note = payload.note || "Rejected from import preview";
      registry.registerBatch(batch);
      ImportAudit.recordRejectedImportAudit(auditLog, batch, user, batch.note);
      return batch;
    }

    function buildRuntimeBatch(payload) {
      var analysis = payload.analysis || {};
      var detection = FileDetector.detectFile(analysis, payload.defaults || {});
      var manualMapping = sanitizeManualMapping(payload.manualMapping || {});
      var mappingOverride = sanitizeFieldMapping(payload.fieldMapping || {});
      var resolvedType = manualMapping.fileType || detection.type || "unknown";
      var resolvedCity = manualMapping.city || detection.detectedCity || payload.defaults && payload.defaults.city || "";
      var resolvedRegister = manualMapping.register || detection.detectedRegister || payload.defaults && payload.defaults.register || "";
      var resolvedMonth = manualMapping.month || detection.detectedMonth || payload.defaults && payload.defaults.month || "";
      var targetEntity = manualMapping.targetEntity || registry.getTargetEntity(resolvedType) || "";
      var typeDefinition = registry.getType(resolvedType);
      var mapping = analysis.tableSummary
        ? analysis.tableSummary.mapping
        : analysis.workbookSummary
          ? analysis.workbookSummary.bestMapping
          : { byField: {}, mappedFields: [], missingRequired: [] };
      var resolvedMapping = applyMappingOverride(mapping, mappingOverride, typeDefinition.requiredFields || []);
      var runtimeBatch = {
        id: payload.id || generateId(),
        sourceFileName: analysis.fileName || payload.sourceFileName || "",
        fileName: analysis.fileName || payload.sourceFileName || "",
        extension: analysis.extension || payload.extension || "",
        size: Number(payload.size) || Number(analysis.size) || 0,
        fileType: resolvedType,
        importType: resolvedType,
        type: resolvedType,
        confidence: detection.confidence,
        confidenceState: detection.confidenceState,
        city: resolvedCity === "multi" ? "" : resolvedCity,
        register: resolvedRegister === "MULTI" ? "" : resolvedRegister,
        month: resolvedMonth,
        targetEntity: targetEntity,
        templateId: payload.templateId || manualMapping.templateId || "",
        rowCount: Number(analysis.rowCount) || 0,
        sheetNames: analysis.workbookSummary ? analysis.workbookSummary.sheetNames : [],
        headers: analysis.workbookSummary ? analysis.workbookSummary.allHeaders : (analysis.tableSummary ? analysis.tableSummary.headers : []),
        status: payload.status || "preview",
        warnings: detection.warnings.slice(),
        errors: [],
        reasons: detection.reasons.slice(),
        scoreBreakdown: detection.scoreBreakdown,
        mapping: resolvedMapping,
        analysis: analysis,
        manualMapping: manualMapping,
        manualMappingApplied: payload.manualMappingApplied === true || (
          payload.reviewRequired !== true &&
          Object.keys(manualMapping).some(function (key) { return !!manualMapping[key]; })
        ),
        reviewRequired: payload.reviewRequired === true,
        fieldMapping: mappingOverride.byField || {},
        detectedCity: detection.detectedCity,
        detectedRegister: detection.detectedRegister,
        detectedMonth: detection.detectedMonth,
        detectedHeaders: detection.detectedHeaders,
        detectedSheets: detection.detectedSheets,
        typeDefinition: typeDefinition,
        meta: analysis.workbookSummary
          ? (analysis.workbookSummary.sheetNames.length + " sheets / " + ((analysis.workbookSummary.totalRowCount) || 0) + " rows")
          : (((analysis.rowCount) || 0) + " rows")
      };
      if (runtimeBatch.analysis && runtimeBatch.analysis.tableSummary) {
        runtimeBatch.analysis.tableSummary.mapping = resolvedMapping;
      }
      if (runtimeBatch.analysis && runtimeBatch.analysis.workbookSummary) {
        runtimeBatch.analysis.workbookSummary.bestMapping = resolvedMapping;
      }
      return runtimeBatch;
    }

    function listRecentBatches(limit) {
      return registry.listRecent(limit);
    }

    function saveMany(entityName, records, context) {
      if (!dataStore || typeof dataStore.getAll !== "function" || typeof dataStore.save !== "function") {
        return { created: 0, updated: 0, changes: [] };
      }
      var collection = dataStore.getAll(entityName).slice();
      var indexById = {};
      var changes = [];
      collection.forEach(function (record, index) {
        indexById[String(record.id)] = index;
      });
      records.forEach(function (record) {
        var key = String(record.id);
        if (Object.prototype.hasOwnProperty.call(indexById, key)) {
          var before = collection[indexById[key]];
          var after = mergeObjects({}, before, record);
          collection[indexById[key]] = after;
          changes.push({ before: before, after: after, operation: "updated" });
        } else {
          indexById[key] = collection.length;
          collection.push(record);
          changes.push({ before: null, after: record, operation: "created" });
        }
      });
      dataStore.save(entityName, collection);
      return {
        created: changes.filter(function (item) { return item.operation === "created"; }).length,
        updated: changes.filter(function (item) { return item.operation === "updated"; }).length,
        changes: changes
      };
    }

    function assertPermission(user, permission) {
      if (!rbac || typeof rbac.canPerform !== "function") {
        return true;
      }
      if (!rbac.canPerform(user, permission)) {
        throw new Error("Permission denied: " + permission);
      }
      return true;
    }

    function assertSaveScope(user, batch) {
      if (!user) {
        return true;
      }
      var role = user.role || "";
      if (role === "super_admin") {
        return true;
      }
      if (batch.city && user.cityScope !== "all" && (user.selectedCities || []).indexOf(batch.city) < 0) {
        throw new Error("City scope denied for this import batch.");
      }
      if (batch.register && user.registerScope !== "all" && !(user.selectedRegisters || []).some(function (registerCode) {
        return ImportTypes.matchUserRegisterScope(registerCode, batch.register);
      })) {
        throw new Error("Register scope denied for this import batch.");
      }
      var allowedDomains = {
        operations_admin: ["operations", "performance", "shifts"],
        city_supervisor: ["operations", "performance", "shifts"],
        hr_officer: ["hr"],
        fleet_officer: ["fleet"],
        finance_officer: ["finance"],
        viewer: []
      };
      var domain = registry.getType(batch.type).domain;
      if ((allowedDomains[role] || []).indexOf(domain) < 0) {
        throw new Error("Role is not allowed to save this import type.");
      }
      return true;
    }

    function getCurrentUser() {
      return authManager && typeof authManager.getCurrentUser === "function"
        ? authManager.getCurrentUser()
        : null;
    }

    return {
      buildRuntimeBatch: buildRuntimeBatch,
      createPreviewBatch: createPreviewBatch,
      listRecentBatches: listRecentBatches,
      rejectImportBatch: rejectImportBatch,
      saveImportBatch: saveImportBatch
    };
  }

  function sanitizeManualMapping(manualMapping) {
    return {
      fileType: manualMapping.fileType || "",
      city: manualMapping.city || "",
      register: manualMapping.register || "",
      month: manualMapping.month || "",
      targetEntity: manualMapping.targetEntity || ""
    };
  }

  function sanitizeFieldMapping(fieldMapping) {
    return {
      byField: Object.keys(fieldMapping || {}).reduce(function (memo, fieldName) {
        if (!fieldName || !fieldMapping[fieldName]) {
          return memo;
        }
        memo[fieldName] = fieldMapping[fieldName];
        return memo;
      }, {})
    };
  }

  function applyMappingOverride(baseMapping, mappingOverride, requiredFields) {
    var mergedMapping = {
      headers: (baseMapping && baseMapping.headers ? baseMapping.headers.slice() : []),
      byField: mergeObjects({}, baseMapping && baseMapping.byField ? baseMapping.byField : {}, mappingOverride.byField || {}),
      byHeader: mergeObjects({}, baseMapping && baseMapping.byHeader ? baseMapping.byHeader : {}),
      mappedFields: [],
      mappedCount: 0,
      coverage: 0,
      missingRequired: [],
      unknownHeaders: (baseMapping && baseMapping.unknownHeaders ? baseMapping.unknownHeaders.slice() : [])
    };
    Object.keys(mergedMapping.byField).forEach(function (fieldName) {
      var header = mergedMapping.byField[fieldName];
      if (!header) {
        delete mergedMapping.byField[fieldName];
        return;
      }
      mergedMapping.byHeader[header] = fieldName;
    });
    mergedMapping.mappedFields = Object.keys(mergedMapping.byField);
    mergedMapping.mappedCount = mergedMapping.mappedFields.length;
    mergedMapping.coverage = mergedMapping.headers.length
      ? mergedMapping.mappedCount / mergedMapping.headers.length
      : 0;
    mergedMapping.missingRequired = (requiredFields || []).filter(function (fieldName) {
      return !mergedMapping.byField[fieldName];
    });
    mergedMapping.unknownHeaders = mergedMapping.headers.filter(function (header) {
      return !mergedMapping.byHeader[header];
    });
    return mergedMapping;
  }

  function generateId() {
    return "importBatch_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  function createBatchStats() {
    return {
      archiveEventsCreated: 0,
      assignmentsCreated: 0,
      assignmentsUpdated: 0,
      conflictsFound: 0,
      dashboardUsersCreated: 0,
      dashboardUsersUpdated: 0,
      duplicatesFound: 0,
      externalRidersCreated: 0,
      externalRidersUpdated: 0,
      hrProfilesCreated: 0,
      hrProfilesUpdated: 0,
      identitiesCreated: 0,
      missingUsersDetected: 0,
      operationalStatusReviewsCreated: 0,
      platformAccountsCreated: 0,
      riderOperationalProfilesCreated: 0,
      riderOperationalProfilesUpdated: 0,
      riderVehicleUsageHistoryCreated: 0,
      riderVehicleUsageHistoryUpdated: 0,
      ridersCreated: 0,
      ridersUpdated: 0,
      statusReviewsCreated: 0,
      vehicleAssignmentsCreated: 0,
      vehicleCapacityReviewsCreated: 0,
      vehicleComplianceIssuesCreated: 0,
      vehicleMovementEventsCreated: 0,
      vehiclesCreated: 0,
      vehiclesUpdated: 0,
      warningsCount: 0
    };
  }

  function mergeStats(batchStats, entityName, result) {
    if (!batchStats || !result) {
      return batchStats;
    }
    if (entityName === "hrProfiles") {
      batchStats.hrProfilesCreated += result.created;
      batchStats.hrProfilesUpdated += result.updated;
      batchStats.duplicatesFound += result.updated;
    }
    if (entityName === "externalRiders") {
      batchStats.externalRidersCreated += result.created;
      batchStats.externalRidersUpdated += result.updated;
      batchStats.duplicatesFound += result.updated;
    }
    if (entityName === "riders") {
      batchStats.ridersCreated += result.created;
      batchStats.ridersUpdated += result.updated;
      batchStats.duplicatesFound += result.updated;
    }
    if (entityName === "riderOperationalProfiles") {
      batchStats.riderOperationalProfilesCreated += result.created;
      batchStats.riderOperationalProfilesUpdated += result.updated;
      batchStats.duplicatesFound += result.updated;
    }
    if (entityName === "riderIdentities") {
      batchStats.identitiesCreated += result.created;
      batchStats.duplicatesFound += result.updated;
    }
    if (entityName === "riderPlatformAccounts") {
      batchStats.platformAccountsCreated += result.created;
      batchStats.duplicatesFound += result.updated;
    }
    if (entityName === "riderArchiveEvents") {
      batchStats.archiveEventsCreated += result.created;
    }
    if (entityName === "dashboardUsers") {
      batchStats.dashboardUsersCreated += result.created;
      batchStats.dashboardUsersUpdated += result.updated;
      batchStats.duplicatesFound += result.updated;
      batchStats.missingUsersDetected += (result.changes || []).filter(function (item) {
        return item && item.after && item.after.missingFromLatestImport;
      }).length;
    }
    if (entityName === "operationalStatusReviews") {
      batchStats.operationalStatusReviewsCreated += result.created;
      batchStats.statusReviewsCreated += result.created;
    }
    if (entityName === "assignments") {
      batchStats.assignmentsCreated += result.created;
      batchStats.assignmentsUpdated += result.updated;
      batchStats.duplicatesFound += result.updated;
    }
    if (entityName === "riderVehicleUsageHistory") {
      batchStats.riderVehicleUsageHistoryCreated += result.created;
      batchStats.riderVehicleUsageHistoryUpdated += result.updated;
      batchStats.duplicatesFound += result.updated;
    }
    if (entityName === "vehicles") {
      batchStats.vehiclesCreated += result.created;
      batchStats.vehiclesUpdated += result.updated;
    }
    if (entityName === "vehicleMovementEvents") {
      batchStats.vehicleMovementEventsCreated += result.created;
    }
    return batchStats;
  }

  function recordEntityAuditEvents(entityName, changes, context) {
    return {
      changes: changes || [],
      context: context || {},
      entityName: entityName
    };
  }

  function attachPerformanceRecalculation(batch, user, services) {
    services = services || {};
    if (!isPerformanceImportType(batch && batch.type) || !services.service || typeof services.service.runPerformanceRecalculationForScope !== "function") {
      return null;
    }
    try {
      batch.recalculationSummary = services.service.runPerformanceRecalculationForScope({
        city: batch.city || "",
        month: batch.month || "",
        platform: inferBatchPlatform(batch),
        register: batch.register || ""
      }, user || null, {
        auditFinalization: false,
        source: "import_center"
      });
      return batch.recalculationSummary;
    } catch (error) {
      batch.recalculationSummary = {
        error: error.message,
        status: "rejected"
      };
      return batch.recalculationSummary;
    }
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

  function isPerformanceImportType(typeId) {
    return /^(performance_daily_|performance_overall_|vda_|face_verification_|delivery_experience_)/.test(String(typeId || ""));
  }

  function isFleetImportBatch(batch) {
    return !!(batch && batch.type === "vehicle_workbook");
  }

  function attachFleetRebuild(batch, user, services) {
    services = services || {};
    if (!isFleetImportBatch(batch) || !services.fleetIntegration || typeof services.fleetIntegration.rebuildDerivedCollections !== "function") {
      return null;
    }
    var summary = services.fleetIntegration.rebuildDerivedCollections({
      user: user || null
    });
    if (!summary) {
      return null;
    }
    if (services.batchStats) {
      services.batchStats.vehicleAssignmentsCreated += (summary.assignments || []).length;
      services.batchStats.vehicleCapacityReviewsCreated += (summary.capacityReviews || []).length;
      services.batchStats.vehicleComplianceIssuesCreated += (summary.complianceIssues || []).length;
    }
    batch.fleetSummary = {
      assignments: (summary.assignments || []).length,
      capacityReviews: (summary.capacityReviews || []).length,
      complianceIssues: (summary.complianceIssues || []).length
    };
    return summary;
  }

  function recordBatchAuditEvents(auditLog, batch, outputs, user, batchStats, extra) {
    var conflicts = [];
    var warnings = [];
    (outputs || []).forEach(function (item) {
      conflicts = conflicts.concat(item.meta && item.meta.conflicts ? item.meta.conflicts : []);
      warnings = warnings.concat(item.meta && item.meta.warnings ? item.meta.warnings : []);
    });
    batchStats.conflictsFound = dedupeByValue(conflicts).length;
    batchStats.warningsCount = dedupeByValue(warnings).length;
    return {
      auditEventId: extra && extra.auditEventId ? extra.auditEventId : "",
      conflictsFound: batchStats.conflictsFound,
      warningsCount: batchStats.warningsCount
    };
  }

  function dedupeByValue(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = typeof value === "string" ? value : JSON.stringify(value || {});
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function normalize(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function filterOutputsForApprovedSave(batch, outputs) {
    var allowedEntities = getApprovedEntitiesForBatch(batch);
    if (!allowedEntities.length) {
      return (outputs || []).slice();
    }
    return (outputs || []).filter(function (item) {
      return item && allowedEntities.indexOf(item.entityName) >= 0;
    });
  }

  function getApprovedEntitiesForBatch(batch) {
    var typeId = String(batch && batch.type || "");
    if (typeId === "dashboard_users_workbook" || typeId === "dashboard_users_csv") {
      return ["dashboardUsers", "operationalStatusReviews"];
    }
    if (typeId === "external_riders_workbook" || typeId === "external_riders_csv") {
      return ["externalRiders", "riderOperationalProfiles"];
    }
    if (typeId === "current_assignments_workbook" || typeId === "current_assignments_csv") {
      return ["assignments", "riderOperationalProfiles", "riderVehicleUsageHistory"];
    }
    return [];
  }

  return {
    createImportBatchService: createImportBatchService
  };
});
