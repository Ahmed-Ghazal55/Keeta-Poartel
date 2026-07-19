(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.PageRenderController = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createPageRenderController(options) {
    options = options || {};

    var doc = options.documentObject || (typeof document !== "undefined" ? document : null);
    var win = options.windowObject || (typeof window !== "undefined" ? window : null);
    var onRender = typeof options.onRender === "function" ? options.onRender : function () {};
    var debounceMs = Number(options.debounceMs);
    var pendingTimer = null;
    var dirty = true;
    var lastReason = "init";
    var pageIds = toArray(options.pageIds || options.pageId).map(normalizePageId).filter(Boolean);

    if (!Number.isFinite(debounceMs) || debounceMs < 0) {
      debounceMs = 90;
    }

    function getActivePageId() {
      if (!doc || typeof doc.getElementById !== "function") {
        return "";
      }
      for (var index = 0; index < pageIds.length; index += 1) {
        var pageNode = doc.getElementById(pageIds[index]);
        if (pageNode && pageNode.classList && typeof pageNode.classList.contains === "function" && pageNode.classList.contains("active")) {
          return pageIds[index];
        }
      }
      return "";
    }

    function isActive() {
      return !!getActivePageId();
    }

    function clearPending() {
      if (pendingTimer && win && typeof win.clearTimeout === "function") {
        win.clearTimeout(pendingTimer);
      }
      pendingTimer = null;
    }

    function flush() {
      clearPending();
      if (!dirty) {
        return false;
      }
      var activePageId = getActivePageId();
      if (!activePageId) {
        return false;
      }
      dirty = false;
      onRender({
        activePageId: activePageId,
        reason: lastReason
      });
      return true;
    }

    function requestRender(meta) {
      meta = meta || {};
      dirty = true;
      if (meta.reason) {
        lastReason = meta.reason;
      }
      if (meta.immediate && isActive()) {
        return flush();
      }
      if (!win || typeof win.setTimeout !== "function") {
        return flush();
      }
      clearPending();
      pendingTimer = win.setTimeout(flush, resolveDelay(meta.delayMs, debounceMs));
      return true;
    }

    function markDirty(reason) {
      dirty = true;
      if (reason) {
        lastReason = reason;
      }
    }

    return {
      cleanup: clearPending,
      flush: flush,
      getActivePageId: getActivePageId,
      isActive: isActive,
      isDirty: function () {
        return dirty;
      },
      markDirty: markDirty,
      requestRender: requestRender
    };
  }

  function normalizePageId(value) {
    var text = String(value || "").trim();
    if (!text) {
      return "";
    }
    return text.indexOf("page-") === 0 ? text : "page-" + text;
  }

  function resolveDelay(value, fallback) {
    var delay = Number(value);
    if (!Number.isFinite(delay) || delay < 0) {
      return fallback;
    }
    return delay;
  }

  function toArray(value) {
    if (Array.isArray(value)) {
      return value.slice();
    }
    return value ? [value] : [];
  }

  return {
    createPageRenderController: createPageRenderController,
    normalizePageId: normalizePageId
  };
});
