(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DataMigrations = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var CURRENT_DATA_VERSION = 1;

  function runDataMigrations(options) {
    var adapter = options.adapter;
    var schemaRegistry = options.schemaRegistry;
    var generateId = options.generateId;
    var currentVersion = Number(adapter.getMeta("dataVersion")) || 0;

    if (currentVersion >= CURRENT_DATA_VERSION) {
      return {
        fromVersion: currentVersion,
        toVersion: currentVersion,
        changedCollections: []
      };
    }

    var changedCollections = [];
    schemaRegistry.listEntityNames().forEach(function (entityName) {
      var schema = schemaRegistry.getEntitySchema(entityName);
      var rows = adapter.readCollection(entityName);
      var normalizedRows = rows.map(function (row) {
        return normalizeMigratedRecord(entityName, schema, row, generateId);
      });
      adapter.writeCollection(entityName, normalizedRows);
      changedCollections.push(entityName);
    });

    adapter.setMeta("dataVersion", CURRENT_DATA_VERSION);
    adapter.setMeta("lastMigrationAt", new Date().toISOString());

    return {
      fromVersion: currentVersion,
      toVersion: CURRENT_DATA_VERSION,
      changedCollections: changedCollections
    };
  }

  function normalizeMigratedRecord(entityName, schema, row, generateId) {
    var now = new Date().toISOString();
    var next = row && typeof row === "object" ? shallowCopy(row) : {};
    if (!next[schema.idField]) {
      next[schema.idField] = generateId(entityName);
    }
    if (!next.createdAt) {
      next.createdAt = now;
    }
    next.updatedAt = now;
    if (next.sourceFile == null) {
      next.sourceFile = "";
    }
    if (next.city == null) {
      next.city = "";
    }
    if (next.register == null) {
      next.register = "";
    }
    if (next.status == null && schema.defaults && schema.defaults.status != null) {
      next.status = schema.defaults.status;
    }
    return next;
  }

  function shallowCopy(source) {
    var target = {};
    Object.keys(source || {}).forEach(function (key) {
      target[key] = source[key];
    });
    return target;
  }

  return {
    CURRENT_DATA_VERSION: CURRENT_DATA_VERSION,
    normalizeMigratedRecord: normalizeMigratedRecord,
    runDataMigrations: runDataMigrations
  };
});
