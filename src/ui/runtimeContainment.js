(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.RuntimeContainment = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var RUNTIME_WIDGET_IDS = [
    "topbarRuntimeStrip",
    "topbarCurrentUserChip",
    "topbarStorageModeChip",
    "topbarNotificationHost"
  ];

  function dedupeRuntimeWidgets(doc, options) {
    options = options || {};
    var hostId = String(options.hostId || "appTopbarRuntime");
    var widgetIds = (options.widgetIds || RUNTIME_WIDGET_IDS).slice();
    var summary = {
      hostFound: false,
      hostId: hostId,
      keptIds: [],
      movedCount: 0,
      removedCount: 0
    };
    if (!doc || typeof doc.getElementById !== "function" || typeof doc.querySelectorAll !== "function") {
      return summary;
    }

    var host = doc.getElementById(hostId);
    if (!host) {
      return summary;
    }
    summary.hostFound = true;

    widgetIds.forEach(function (widgetId) {
      var nodes = toArray(doc.querySelectorAll("#" + widgetId));
      var keeper = null;
      nodes.forEach(function (node) {
        if (!keeper && contains(host, node)) {
          keeper = node;
          return;
        }
        if (!keeper) {
          keeper = node;
          return;
        }
        removeNode(node);
        summary.removedCount += 1;
      });
      if (!keeper) {
        return;
      }
      if (keeper.parentNode !== host && typeof host.appendChild === "function") {
        host.appendChild(keeper);
        summary.movedCount += 1;
      }
      summary.keptIds.push(widgetId);
    });

    return summary;
  }

  function contains(host, node) {
    if (!host || !node || typeof host.contains !== "function") {
      return false;
    }
    return host.contains(node);
  }

  function removeNode(node) {
    if (node && node.parentNode && typeof node.parentNode.removeChild === "function") {
      node.parentNode.removeChild(node);
    }
  }

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList || []);
  }

  return {
    RUNTIME_WIDGET_IDS: RUNTIME_WIDGET_IDS.slice(),
    dedupeRuntimeWidgets: dedupeRuntimeWidgets
  };
});
