(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DataAdapters = root.KeetaPortal.DataAdapters || {};
  root.KeetaPortal.DataAdapters.MemoryStore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createMemoryStore(options) {
    var collections = shallowCopy(options && options.collections);
    var meta = shallowCopy(options && options.meta);

    return {
      adapterName: "memory",
      isPersistent: false,
      getMeta: function (key) {
        return meta[key];
      },
      readCollection: function (name) {
        return cloneArray(collections[name] || []);
      },
      setMeta: function (key, value) {
        meta[key] = value;
      },
      writeCollection: function (name, records) {
        collections[name] = cloneArray(records || []);
        return cloneArray(collections[name]);
      }
    };
  }

  function cloneArray(records) {
    return (records || []).map(function (record) {
      return shallowCopy(record);
    });
  }

  function shallowCopy(source) {
    var target = {};
    Object.keys(source || {}).forEach(function (key) {
      target[key] = source[key];
    });
    return target;
  }

  return {
    createMemoryStore: createMemoryStore
  };
});
