(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./entitySchemas.js"),
      require("./dataMigrations.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DataStoreLib = factory(
    root.KeetaPortal.DataEntitySchemas,
    root.KeetaPortal.DataMigrations
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (schemaRegistry, dataMigrations) {
  "use strict";

  function createDataStore(options) {
    var primaryAdapter = options.primaryAdapter;
    var fallbackAdapter = options.fallbackAdapter;
    var migrations = options.migrations || dataMigrations;
    var activeAdapter = primaryAdapter;

    function useAdapter(action) {
      try {
        return action(activeAdapter);
      } catch (primaryError) {
        if (!fallbackAdapter) {
          throw primaryError;
        }
        activeAdapter = fallbackAdapter;
        return action(activeAdapter);
      }
    }

    function generateId(entityName) {
      return [
        entityName,
        Date.now().toString(36),
        Math.random().toString(36).slice(2, 8)
      ].join("_");
    }

    function normalizeRecord(entityName, record, existingRecord) {
      var schema = schemaRegistry.getEntitySchema(entityName);
      var now = new Date().toISOString();
      var next = mergeObjects({}, existingRecord || {}, record || {});
      if (!next[schema.idField]) {
        next[schema.idField] = generateId(entityName);
      }
      if (!next.createdAt) {
        next.createdAt = existingRecord && existingRecord.createdAt ? existingRecord.createdAt : now;
      }
      next.updatedAt = now;
      if (next.sourceFile == null) {
        next.sourceFile = existingRecord && existingRecord.sourceFile ? existingRecord.sourceFile : "";
      }
      if (next.city == null) {
        next.city = existingRecord && existingRecord.city ? existingRecord.city : "";
      }
      if (next.register == null) {
        next.register = existingRecord && existingRecord.register ? existingRecord.register : "";
      }
      if (next.status == null && schema.defaults && schema.defaults.status != null) {
        next.status = schema.defaults.status;
      }
      return next;
    }

    function ensureEntity(entityName) {
      return schemaRegistry.getEntitySchema(entityName);
    }

    function getAll(entityName) {
      ensureEntity(entityName);
      var startedAt = Date.now();
      var records = useAdapter(function (adapter) {
        return adapter.readCollection(entityName);
      });
      notifyProfiler("DataStore.getAll:" + entityName, Date.now() - startedAt, {
        entityName: entityName,
        rowCount: Array.isArray(records) ? records.length : 0
      });
      return records;
    }

    function save(entityName, records) {
      ensureEntity(entityName);
      var normalized = (records || []).map(function (record) {
        return normalizeRecord(entityName, record);
      });
      return useAdapter(function (adapter) {
        var saved = adapter.writeCollection(entityName, normalized);
        updateCollectionMeta(adapter, entityName, saved || normalized);
        return saved;
      });
    }

    function findById(entityName, id) {
      var schema = ensureEntity(entityName);
      return getAll(entityName).filter(function (record) {
        return String(record[schema.idField]) === String(id);
      })[0] || null;
    }

    function upsert(entityName, record) {
      var schema = ensureEntity(entityName);
      var collection = getAll(entityName);
      var index = collection.findIndex(function (item) {
        return record && item[schema.idField] && String(item[schema.idField]) === String(record[schema.idField]);
      });
      var existingRecord = index >= 0 ? collection[index] : null;
      var normalized = normalizeRecord(entityName, record, existingRecord);
      if (index >= 0) {
        collection[index] = normalized;
      } else {
        collection.push(normalized);
      }
      save(entityName, collection);
      return normalized;
    }

    function remove(entityName, id) {
      var schema = ensureEntity(entityName);
      var nextCollection = getAll(entityName).filter(function (record) {
        return String(record[schema.idField]) !== String(id);
      });
      save(entityName, nextCollection);
      return nextCollection;
    }

    function query(entityName, filters) {
      ensureEntity(entityName);
      return getAll(entityName).filter(function (record) {
        return matchesFilters(record, filters || {});
      });
    }

    function getMeta(key) {
      return useAdapter(function (adapter) {
        return adapter.getMeta(key);
      });
    }

    function setMeta(key, value) {
      return useAdapter(function (adapter) {
        return adapter.setMeta(key, value);
      });
    }

    function updateCollectionMeta(adapter, entityName, records) {
      if (!adapter || typeof adapter.setMeta !== "function") {
        return;
      }
      var latest = (records || []).reduce(function (memo, record) {
        var stamp = record && (record.updatedAt || record.createdAt || record.timestamp || record.eventDate || "");
        return String(stamp || "") > memo ? String(stamp || "") : memo;
      }, "");
      var changedAt = latest || new Date().toISOString();
      adapter.setMeta("entity:" + entityName + ":count", Array.isArray(records) ? records.length : 0);
      adapter.setMeta("entity:" + entityName + ":lastUpdated", changedAt);
      adapter.setMeta("system:lastDataUpdate", changedAt);
    }

    function seedCollections(seedMap) {
      Object.keys(seedMap || {}).forEach(function (entityName) {
        if (!schemaRegistry.hasEntitySchema(entityName)) {
          return;
        }
        if (!getAll(entityName).length) {
          save(entityName, seedMap[entityName]);
        }
      });
    }

    var migrationSummary = migrations.runDataMigrations({
      adapter: activeAdapter,
      generateId: generateId,
      schemaRegistry: schemaRegistry
    });

    return {
      activeAdapterName: function () {
        return activeAdapter.adapterName;
      },
      findById: findById,
      generateId: generateId,
      getAdapterInfo: function () {
        return {
          active: activeAdapter.adapterName,
          fallback: fallbackAdapter ? fallbackAdapter.adapterName : null,
          persistent: !!activeAdapter.isPersistent
        };
      },
      getAll: getAll,
      getMeta: getMeta,
      getMigrationSummary: function () {
        return migrationSummary;
      },
      query: query,
      remove: remove,
      save: save,
      seedCollections: seedCollections,
      setMeta: setMeta,
      upsert: upsert
    };
  }

  function matchesFilters(record, filters) {
    return Object.keys(filters || {}).every(function (key) {
      var expected = filters[key];
      var actual = record ? record[key] : undefined;
      if (expected == null || expected === "") {
        return true;
      }
      if (typeof expected === "function") {
        return !!expected(actual, record);
      }
      if (Array.isArray(expected)) {
        return expected.indexOf(actual) >= 0;
      }
      if (typeof expected === "object") {
        return applyOperator(actual, expected);
      }
      return normalizeValue(actual) === normalizeValue(expected);
    });
  }

  function applyOperator(actual, expected) {
    if (expected.op === "contains") {
      return String(actual == null ? "" : actual).toLowerCase().indexOf(String(expected.value || "").toLowerCase()) >= 0;
    }
    if (expected.op === "in") {
      return Array.isArray(expected.value) && expected.value.indexOf(actual) >= 0;
    }
    if (expected.op === "neq") {
      return normalizeValue(actual) !== normalizeValue(expected.value);
    }
    if (expected.op === "gte") {
      return Number(actual) >= Number(expected.value);
    }
    if (expected.op === "lte") {
      return Number(actual) <= Number(expected.value);
    }
    return normalizeValue(actual) === normalizeValue(expected.value);
  }

  function notifyProfiler(name, durationMs, meta) {
    var profiler = typeof globalThis !== "undefined" ? globalThis.__keetaStartupProfilerInstance : null;
    if (!profiler || typeof profiler.record !== "function") {
      return;
    }
    profiler.record(name, durationMs, meta || {});
  }

  function normalizeValue(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
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
    createDataStore: createDataStore,
    matchesFilters: matchesFilters
  };
});
