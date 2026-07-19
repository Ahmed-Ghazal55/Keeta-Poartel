(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DevDataResetLib = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var RESET_CONFIRM_TEXT = "RESET";
  var DEMO_SEED_META_KEY = "dev.skipDemoSeed";
  var DEFAULT_RESETTABLE_ENTITIES = [
    "importBatches",
    "dashboardUsers",
    "hrProfiles",
    "riders",
    "riderIdentities",
    "riderPlatformAccounts",
    "riderArchiveEvents",
    "vehicles",
    "vehicleAssignments",
    "vehicleCapacityReviews",
    "vehicleComplianceIssues",
    "vehicleImportSnapshots",
    "vehicleMovementEvents",
    "assignments",
    "assignmentHistory",
    "statusReviews",
    "operationalStatusReviews",
    "terminations",
    "performanceDaily",
    "performanceMonthly",
    "validityResults",
    "performanceIssues",
    "monthlyRules",
    "deliveryExperience",
    "faceVerification",
    "vdaResults",
    "shiftSchedules",
    "auditLogs",
    "auditLogsQuarantine",
    "notifications"
  ];

  function createDevDataResetService(options) {
    options = options || {};
    var auditLog = options.auditLog || null;
    var dataStore = options.dataStore || null;
    var nowProvider = typeof options.nowProvider === "function" ? options.nowProvider : function () {
      return new Date();
    };
    var storageBridge = options.storageBridge || null;
    var localDbClient = typeof options.localDbClient === "function" ? options.localDbClient : null;

    function setStorageBridge(nextStorageBridge) {
      storageBridge = nextStorageBridge || null;
      return storageBridge;
    }

    function setLocalDbClient(nextLocalDbClient) {
      localDbClient = typeof nextLocalDbClient === "function" ? nextLocalDbClient : null;
      return localDbClient;
    }

    function getResettableEntities() {
      return DEFAULT_RESETTABLE_ENTITIES.slice();
    }

    async function resetBrowserData(payload) {
      payload = normalizeResetPayload(payload);
      var resetSummary = buildResetSummary("browser", payload);
      var now = toIsoString(nowProvider);
      try {
        assertDataStore(dataStore);
        clearCollections(dataStore, payload.entityNames || DEFAULT_RESETTABLE_ENTITIES, resetSummary);
        dataStore.setMeta(DEMO_SEED_META_KEY, true);
        dataStore.setMeta("dev.lastResetAt", now);
        dataStore.setMeta("dev.lastResetMode", "browser");
        resetSummary.meta[DEMO_SEED_META_KEY] = true;
        resetSummary.meta.devLastResetAt = now;
        recordResetAuditEvent(auditLog, "dev_data_reset_requested", resetSummary, payload);
        recordResetAuditEvent(auditLog, "dev_data_reset_completed", resetSummary, payload);
        return resetSummary;
      } catch (error) {
        resetSummary.status = "failed";
        resetSummary.error = error && error.message ? error.message : String(error);
        throw error;
      }
    }

    async function resetNodeLocalDb(payload) {
      payload = normalizeResetPayload(payload);
      var resetSummary = buildResetSummary("node_local_db", payload);
      var client = resolveLocalDbClient();
      recordResetAuditEvent(auditLog, "dev_data_reset_requested", resetSummary, payload);
      if (!client) {
        resetSummary.status = "skipped";
        resetSummary.note = "local_db_unavailable";
        recordResetAuditEvent(auditLog, "dev_data_reset_completed", resetSummary, payload);
        return resetSummary;
      }
      try {
        var result = await client({
          backupBeforeReset: payload.backupBeforeReset,
          confirmText: payload.confirmText,
          entityNames: payload.entityNames || DEFAULT_RESETTABLE_ENTITIES.slice()
        });
        resetSummary = mergeObjects(resetSummary, result || {});
        recordResetAuditEvent(auditLog, "dev_data_reset_completed", resetSummary, payload);
        return resetSummary;
      } catch (error) {
        resetSummary.status = "failed";
        resetSummary.error = error && error.message ? error.message : String(error);
        throw error;
      }
    }

    async function resetAllDevData(payload) {
      payload = normalizeResetPayload(payload);
      var browser = await resetBrowserData(payload);
      var node = await resetNodeLocalDb(payload);
      return {
        browser: browser,
        mode: "all",
        node: node,
        status: node.status === "failed" ? "partial" : "completed"
      };
    }

    function buildResetSummary(mode, payload) {
      return {
        backupBeforeReset: payload.backupBeforeReset,
        clearedEntities: [],
        confirmText: payload.confirmText,
        error: "",
        meta: {},
        mode: mode,
        resetRunId: "dev_reset_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
        requestedEntities: (payload.entityNames || DEFAULT_RESETTABLE_ENTITIES).slice(),
        status: "completed"
      };
    }

    function resolveLocalDbClient() {
      if (localDbClient) {
        return localDbClient;
      }
      if (storageBridge && typeof storageBridge.requestDevReset === "function") {
        return function (payload) {
          return storageBridge.requestDevReset(payload);
        };
      }
      return null;
    }

    return {
      getResettableEntities: getResettableEntities,
      resetAllDevData: resetAllDevData,
      resetBrowserData: resetBrowserData,
      resetNodeLocalDb: resetNodeLocalDb,
      setLocalDbClient: setLocalDbClient,
      setStorageBridge: setStorageBridge
    };
  }

  function normalizeResetPayload(payload) {
    payload = payload || {};
    return {
      backupBeforeReset: payload.backupBeforeReset !== false,
      confirmText: payload.confirmText || RESET_CONFIRM_TEXT,
      entityNames: Array.isArray(payload.entityNames) && payload.entityNames.length
        ? uniqueValues(payload.entityNames)
        : DEFAULT_RESETTABLE_ENTITIES.slice(),
      note: payload.note || "",
      user: payload.user || null
    };
  }

  function clearCollections(dataStore, entityNames, resetSummary) {
    uniqueValues(entityNames).forEach(function (entityName) {
      dataStore.save(entityName, []);
      resetSummary.clearedEntities.push(entityName);
    });
  }

  function recordResetAuditEvent(auditLog, action, resetSummary, payload) {
    if (!auditLog || typeof auditLog.createAuditEvent !== "function") {
      return null;
    }
    return auditLog.createAuditEvent({
      actor: payload && payload.user ? payload.user : null,
      after: {
        backupBeforeReset: resetSummary.backupBeforeReset,
        clearedEntities: resetSummary.clearedEntities.slice(),
        mode: resetSummary.mode,
        requestedEntities: resetSummary.requestedEntities.slice(),
        resetRunId: resetSummary.resetRunId,
        status: resetSummary.status
      },
      context: {
        city: "",
        register: ""
      },
      entityId: resetSummary.mode,
      entityType: "devDataReset",
      eventType: action,
      idempotencyKey: action + ":" + String(resetSummary.resetRunId || resetSummary.mode || ""),
      operationId: resetSummary.resetRunId,
      reason: payload && payload.note ? payload.note : "",
      source: resetSummary.mode === "browser" ? "browser_reset" : "local_db_reset"
    });
  }

  function assertDataStore(dataStore) {
    if (!dataStore || typeof dataStore.save !== "function" || typeof dataStore.setMeta !== "function") {
      throw new Error("Dev data reset requires a DataStore instance.");
    }
  }

  function toIsoString(nowProvider) {
    var value = typeof nowProvider === "function" ? nowProvider() : new Date();
    return value && typeof value.toISOString === "function" ? value.toISOString() : new Date().toISOString();
  }

  function uniqueValues(values) {
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

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  return {
    DEFAULT_RESETTABLE_ENTITIES: DEFAULT_RESETTABLE_ENTITIES,
    DEMO_SEED_META_KEY: DEMO_SEED_META_KEY,
    RESET_CONFIRM_TEXT: RESET_CONFIRM_TEXT,
    createDevDataResetService: createDevDataResetService,
    normalizeResetPayload: normalizeResetPayload
  };
});
