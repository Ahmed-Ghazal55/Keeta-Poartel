(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.StorageBridgeLib = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createStorageBridge(options) {
    options = options || {};
    var dataStore = options.dataStore || null;
    var fetchImpl = Object.prototype.hasOwnProperty.call(options, "fetchImpl")
      ? options.fetchImpl
      : (typeof fetch === "function" ? fetch.bind(typeof window !== "undefined" ? window : globalThis) : null);
    var apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl || "http://127.0.0.1:4174/api");
    var healthCheckTimeoutMs = Number(options.healthCheckTimeoutMs) || 1200;
    var statusCacheTtlMs = Number(options.statusCacheTtlMs) || 15000;
    var trackedEntities = unique((options.entityNames || []).slice());
    var listeners = [];
    var status = buildInitialStatus(dataStore, apiBaseUrl, !!fetchImpl);
    var refreshPromise = null;

    function subscribe(listener) {
      if (typeof listener !== "function") {
        return function () {};
      }
      listeners.push(listener);
      return function unsubscribe() {
        listeners = listeners.filter(function (entry) {
          return entry !== listener;
        });
      };
    }

    function notify() {
      var payload = getStatus();
      listeners.slice().forEach(function (listener) {
        try {
          listener(payload);
        } catch (_error) {
          // Keep the bridge resilient for UI listeners.
        }
      });
    }

    function getStatus() {
      return JSON.parse(JSON.stringify(status));
    }

    async function refreshStatus(forceRefresh) {
      var startedAt = Date.now();
      if (!forceRefresh && refreshPromise) {
        return refreshPromise;
      }
      if (!forceRefresh && status.lastCheckedAt && (Date.now() - new Date(status.lastCheckedAt).getTime()) < statusCacheTtlMs) {
        return getStatus();
      }
      refreshPromise = runStatusRefresh().finally(function () {
        notifyProfiler("storageBridge.refreshStatus", Date.now() - startedAt, {
          apiAvailable: !!status.apiAvailable,
          mode: status.mode || ""
        });
        refreshPromise = null;
      });
      return refreshPromise;
    }

    async function runStatusRefresh() {
      var adapterInfo = resolveAdapterInfo(dataStore);
      var checkedAt = new Date().toISOString();
      if (!fetchImpl) {
        status = mergeObjects({}, status, {
          adapterInfo: adapterInfo,
          apiAvailable: false,
          label: adapterInfo.persistent ? "Browser Local" : "API unavailable / fallback mode",
          lastCheckedAt: checkedAt,
          lastError: "fetch_unavailable",
          mode: adapterInfo.persistent ? "browser_local" : "api_unavailable_fallback"
        });
        notify();
        return getStatus();
      }

      try {
        var response = await fetchWithTimeout(apiBaseUrl + "/health", {
          method: "GET"
        });
        if (!response || !response.ok) {
          throw new Error("Health check failed with status " + (response ? response.status : "unknown"));
        }
        var payload = await response.json();
        status = mergeObjects({}, status, {
          adapterInfo: adapterInfo,
          apiAvailable: !!(payload && payload.ok),
          health: payload || null,
          label: payload && payload.ok ? "Node Local DB" : (adapterInfo.persistent ? "Browser Local" : "API unavailable / fallback mode"),
          lastCheckedAt: checkedAt,
          lastError: "",
          mode: payload && payload.ok ? "node_local_db" : (adapterInfo.persistent ? "browser_local" : "api_unavailable_fallback")
        });
      } catch (error) {
        status = mergeObjects({}, status, {
          adapterInfo: adapterInfo,
          apiAvailable: false,
          health: null,
          label: adapterInfo.persistent ? "API unavailable / fallback mode" : "API unavailable / fallback mode",
          lastCheckedAt: checkedAt,
          lastError: error && error.message ? error.message : "api_unavailable",
          mode: adapterInfo.persistent ? "api_unavailable_fallback" : "api_unavailable_fallback"
        });
      }
      notify();
      return getStatus();
    }

    async function initialize(entityNames) {
      trackedEntities = unique(trackedEntities.concat(entityNames || []));
      await refreshStatus();
      if (!status.apiAvailable) {
        return getStatus();
      }
      for (var index = 0; index < trackedEntities.length; index += 1) {
        await hydrateEntity(trackedEntities[index]);
      }
      status = mergeObjects({}, status, {
        lastSyncedAt: new Date().toISOString()
      });
      notify();
      return getStatus();
    }

    async function hydrateEntity(entityName) {
      if (!entityName || !dataStore || typeof dataStore.getAll !== "function" || typeof dataStore.save !== "function") {
        return [];
      }
      await refreshStatus();
      if (!status.apiAvailable) {
        return dataStore.getAll(entityName);
      }
      var remoteRecords = await readRemoteCollection(entityName);
      var localRecords = dataStore.getAll(entityName);
      if (remoteRecords.length) {
        dataStore.save(entityName, remoteRecords);
        return remoteRecords;
      }
      if (localRecords.length) {
        await writeRemoteCollection(entityName, localRecords);
      }
      return localRecords;
    }

    async function persistCollections(entityNames) {
      var names = unique((entityNames || []).concat(trackedEntities));
      if (!names.length || !dataStore || typeof dataStore.getAll !== "function") {
        return getStatus();
      }
      await refreshStatus();
      if (!status.apiAvailable) {
        return getStatus();
      }
      for (var index = 0; index < names.length; index += 1) {
        var entityName = names[index];
        if (!entityName) {
          continue;
        }
        await writeRemoteCollection(entityName, dataStore.getAll(entityName));
      }
      status = mergeObjects({}, status, {
        label: "Node Local DB",
        lastSyncedAt: new Date().toISOString(),
        mode: "node_local_db"
      });
      notify();
      return getStatus();
    }

    async function requestDevReset(payload) {
      assertFetch();
      var response = await fetchWithTimeout(apiBaseUrl + "/dev/reset", {
        body: JSON.stringify({
          backupBeforeReset: !payload || payload.backupBeforeReset !== false,
          entityNames: payload && payload.entityNames ? payload.entityNames : [],
          reseedCoreCollections: !payload || payload.reseedCoreCollections !== false
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Failed to reset local dev database.");
      }
      var result = await response.json();
      await refreshStatus();
      return result;
    }

    async function readRemoteCollection(entityName) {
      assertFetch();
      var response = await fetchWithTimeout(apiBaseUrl + "/data/" + encodeURIComponent(entityName), {
        method: "GET"
      });
      if (!response.ok) {
        throw new Error("Failed to read remote collection: " + entityName);
      }
      var payload = await response.json();
      return Array.isArray(payload) ? payload : [];
    }

    async function writeRemoteCollection(entityName, records) {
      assertFetch();
      var response = await fetchWithTimeout(apiBaseUrl + "/data/" + encodeURIComponent(entityName), {
        body: JSON.stringify({ records: Array.isArray(records) ? records : [] }),
        headers: { "Content-Type": "application/json" },
        method: "PUT"
      });
      if (!response.ok) {
        throw new Error("Failed to persist remote collection: " + entityName);
      }
      return response.json();
    }

    async function fetchWithTimeout(url, requestOptions) {
      assertFetch();
      if (typeof AbortController !== "function") {
        return fetchImpl(url, requestOptions);
      }
      var controller = new AbortController();
      var timerId = setTimeout(function () {
        controller.abort();
      }, healthCheckTimeoutMs);
      try {
        return await fetchImpl(url, mergeObjects({}, requestOptions || {}, {
          signal: controller.signal
        }));
      } finally {
        clearTimeout(timerId);
      }
    }

    function assertFetch() {
      if (!fetchImpl) {
        throw new Error("Fetch is not available for storage bridge operations.");
      }
    }

    return {
      getStatus: getStatus,
      hydrateEntity: hydrateEntity,
      initialize: initialize,
      persistCollections: persistCollections,
      requestDevReset: requestDevReset,
      readRemoteCollection: readRemoteCollection,
      refreshStatus: refreshStatus,
      subscribe: subscribe,
      writeRemoteCollection: writeRemoteCollection
    };
  }

  function buildInitialStatus(dataStore, apiBaseUrl, hasFetch) {
    var adapterInfo = resolveAdapterInfo(dataStore);
    return {
      adapterInfo: adapterInfo,
      apiAvailable: false,
      endpoint: apiBaseUrl,
      hasFetch: hasFetch,
      health: null,
      label: adapterInfo.persistent ? "Browser Local" : "API unavailable / fallback mode",
      lastCheckedAt: "",
      lastError: "",
      lastSyncedAt: "",
      mode: adapterInfo.persistent ? "browser_local" : "api_unavailable_fallback"
    };
  }

  function resolveAdapterInfo(dataStore) {
    if (!dataStore || typeof dataStore.getAdapterInfo !== "function") {
      return {
        active: "unknown",
        fallback: null,
        persistent: false
      };
    }
    return dataStore.getAdapterInfo();
  }

  function normalizeApiBaseUrl(value) {
    return String(value || "").replace(/\/+$/, "");
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

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  function notifyProfiler(name, durationMs, meta) {
    var profiler = typeof globalThis !== "undefined" ? globalThis.__keetaStartupProfilerInstance : null;
    if (!profiler || typeof profiler.record !== "function") {
      return;
    }
    profiler.record(name, durationMs, meta || {});
  }

  return {
    createStorageBridge: createStorageBridge
  };
});
