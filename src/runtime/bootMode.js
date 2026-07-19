(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.BootMode = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SAFE_QUERY_FLAGS = ["safe", "lite"];
  var DEBUG_QUERY_FLAG = "debugBoot";

  function parseBootMode(search) {
    var params = createParams(search);
    var safeMode = SAFE_QUERY_FLAGS.some(function (flag) {
      return isTruthy(params.get(flag));
    });
    var liteMode = isTruthy(params.get("lite"));
    var debugBoot = isTruthy(params.get(DEBUG_QUERY_FLAG));
    return {
      debugBoot: debugBoot,
      disableNodeSync: safeMode || liteMode,
      liteMode: liteMode,
      safeMode: safeMode,
      search: typeof search === "string" ? search : ""
    };
  }

  function getState() {
    if (typeof window === "undefined") {
      return parseBootMode("");
    }
    if (!window.__keetaBootModeState) {
      window.__keetaBootModeState = parseBootMode(window.location ? window.location.search : "");
    }
    return window.__keetaBootModeState;
  }

  function isSafeMode(state) {
    return !!(state || getState()).safeMode;
  }

  function isLiteMode(state) {
    return !!(state || getState()).liteMode;
  }

  function isDebugBoot(state) {
    return !!(state || getState()).debugBoot;
  }

  function createParams(search) {
    var query = typeof search === "string"
      ? search
      : (typeof window !== "undefined" && window.location ? window.location.search : "");
    if (typeof URLSearchParams === "function") {
      return new URLSearchParams(query || "");
    }
    return {
      get: function (key) {
        var pattern = new RegExp("[?&]" + escapeRegExp(key) + "=([^&]+)");
        var match = pattern.exec(query || "");
        return match ? decodeURIComponent(match[1]) : "";
      }
    };
  }

  function isTruthy(value) {
    var text = String(value == null ? "" : value).trim().toLowerCase();
    return text === "1" || text === "true" || text === "yes" || text === "on";
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  return {
    DEBUG_QUERY_FLAG: DEBUG_QUERY_FLAG,
    SAFE_QUERY_FLAGS: SAFE_QUERY_FLAGS.slice(),
    getState: getState,
    isDebugBoot: isDebugBoot,
    isLiteMode: isLiteMode,
    isSafeMode: isSafeMode,
    parseBootMode: parseBootMode
  };
});
