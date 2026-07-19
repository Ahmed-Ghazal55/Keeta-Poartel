(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.RuntimeLoopGuard = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function stableHash(value) {
    return JSON.stringify(sortValue(value));
  }

  function shouldProceed(lastHash, nextValue) {
    var nextHash = stableHash(nextValue);
    return {
      changed: nextHash !== String(lastHash || ""),
      hash: nextHash
    };
  }

  function createState() {
    return {
      isHandlingDataChanged: false,
      lastFleetDerivedHash: "",
      lastHydrationKey: "",
      lastNotificationHash: "",
      notificationSyncInFlight: false,
      renderDepth: 0
    };
  }

  function sortValue(value) {
    if (Array.isArray(value)) {
      return value.map(sortValue);
    }
    if (!value || typeof value !== "object") {
      return value;
    }
    var target = {};
    Object.keys(value).sort().forEach(function (key) {
      target[key] = sortValue(value[key]);
    });
    return target;
  }

  return {
    createState: createState,
    shouldProceed: shouldProceed,
    stableHash: stableHash
  };
});
