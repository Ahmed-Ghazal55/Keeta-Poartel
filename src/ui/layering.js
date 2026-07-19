(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.UILayering = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var LAYERS = {
    base: 1,
    tableHeader: 20,
    rowActions: 120,
    hero: 140,
    sidebar: 320,
    topbar: 400,
    dropdown: 440,
    overlaySidebar: 500,
    overlayDrawer: 520,
    drawer: 540,
    overlayModal: 560,
    modal: 580,
    toast: 640,
    loading: 700
  };

  function toCssVariables() {
    return {
      "--ui-layer-base": String(LAYERS.base),
      "--ui-layer-table-header": String(LAYERS.tableHeader),
      "--ui-layer-row-actions": String(LAYERS.rowActions),
      "--ui-layer-hero": String(LAYERS.hero),
      "--ui-layer-sidebar": String(LAYERS.sidebar),
      "--ui-layer-topbar": String(LAYERS.topbar),
      "--ui-layer-dropdown": String(LAYERS.dropdown),
      "--ui-layer-overlay-sidebar": String(LAYERS.overlaySidebar),
      "--ui-layer-overlay-drawer": String(LAYERS.overlayDrawer),
      "--ui-layer-drawer": String(LAYERS.drawer),
      "--ui-layer-overlay-modal": String(LAYERS.overlayModal),
      "--ui-layer-modal": String(LAYERS.modal),
      "--ui-layer-toast": String(LAYERS.toast),
      "--ui-layer-loading": String(LAYERS.loading)
    };
  }

  function applyToRoot(node) {
    if (!node || !node.style) {
      return null;
    }
    var variables = toCssVariables();
    Object.keys(variables).forEach(function (key) {
      node.style.setProperty(key, variables[key]);
    });
    return variables;
  }

  return {
    LAYERS: LAYERS,
    applyToRoot: applyToRoot,
    toCssVariables: toCssVariables
  };
});
