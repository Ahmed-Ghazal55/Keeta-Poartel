(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DataAdapters = root.KeetaPortal.DataAdapters || {};
  root.KeetaPortal.DataAdapters.BrowserLocalStore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createBrowserLocalStore(options) {
    var prefix = (options && options.prefix) || "keeta.prompt2.data";
    var storage = resolveStorage(options && options.storage);
    var backup = options && options.backupAdapter;
    var inMemoryMeta = {};

    return {
      adapterName: "browserLocalStorage",
      isPersistent: !!storage,
      getMeta: function (key) {
        return storage ? readJson(storage, prefix + ".meta." + key, null) : inMemoryMeta[key];
      },
      readCollection: function (name) {
        if (!storage) {
          return backup ? backup.readCollection(name) : [];
        }
        return readJson(storage, prefix + ".entity." + name, []);
      },
      setMeta: function (key, value) {
        if (!storage) {
          inMemoryMeta[key] = value;
          if (backup) {
            backup.setMeta(key, value);
          }
          return;
        }
        writeJson(storage, prefix + ".meta." + key, value);
      },
      writeCollection: function (name, records) {
        if (!storage) {
          return backup ? backup.writeCollection(name, records) : records;
        }
        writeJson(storage, prefix + ".entity." + name, records || []);
        return records || [];
      }
    };
  }

  function resolveStorage(candidate) {
    if (candidate) {
      return candidate;
    }
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        var probeKey = "__keeta_prompt2_probe__";
        window.localStorage.setItem(probeKey, "1");
        window.localStorage.removeItem(probeKey);
        return window.localStorage;
      }
    } catch (_error) {
      return null;
    }
    return null;
  }

  function readJson(storage, key, fallback) {
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  return {
    createBrowserLocalStore: createBrowserLocalStore
  };
});
