(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../import/importRegistry.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportRegistryLib = factory(root.KeetaPortal.ImportRegistryCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportRegistryCore) {
  "use strict";

  function createImportRegistry(dataStore) {
    if (ImportRegistryCore && typeof ImportRegistryCore.createImportRegistry === "function") {
      return ImportRegistryCore.createImportRegistry({ dataStore: dataStore });
    }
    return {
      findDuplicates: function () { return []; },
      getConfidenceState: function () { return "manual_mapping_required"; },
      getSupportedTargetEntities: function () { return []; },
      getTargetEntity: function () { return ""; },
      getType: function () { return { id: "unknown", targetEntity: "" }; },
      listRecent: function () { return []; },
      listTypes: function () { return []; },
      registerBatch: function (batch) { return batch; },
      sanitizeBatch: function (batch) { return batch; }
    };
  }

  return {
    createImportRegistry: createImportRegistry
  };
});
