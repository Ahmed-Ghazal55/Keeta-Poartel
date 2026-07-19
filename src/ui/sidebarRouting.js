(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../operations/operationsViewModel.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.SidebarRouting = factory(root.KeetaPortal.OperationsViewModel || null);
})(typeof globalThis !== "undefined" ? globalThis : this, function (OperationsViewModel) {
  "use strict";

  var ROUTES = mergeObjects({}, getOperationsRoutes(), {
    PF1: { code: "PF1", group: "performance", page: "performance-shell", subPage: "results" },
    PF2: { code: "PF2", group: "performance", page: "performance-shell", subPage: "overall" },
    PF3: { code: "PF3", group: "performance", page: "performance-shell", subPage: "vda" },
    PF4: { code: "PF4", group: "performance", page: "performance-shell", subPage: "vda_keeta" },
    PF5: { code: "PF5", group: "performance", page: "performance-shell", subPage: "face_verification" },
    PF6: { code: "PF6", group: "performance", page: "performance-shell", subPage: "delivery_experience" },
    PF7: { code: "PF7", group: "performance", page: "performance-shell", subPage: "issues" },
    RL1: { code: "RL1", group: "rules", page: "monthly-rules-shell", subPage: "settings" },
    RL2: { code: "RL2", group: "rules", page: "monthly-rules-shell", subPage: "mandatory" },
    RL3: { code: "RL3", group: "rules", page: "monthly-rules-shell", subPage: "incentives_cars" },
    RL4: { code: "RL4", group: "rules", page: "monthly-rules-shell", subPage: "incentives_bikes" },
    RL5: { code: "RL5", group: "rules", page: "monthly-rules-shell", subPage: "quality" },
    FL1: { code: "FL1", group: "fleet", page: "fleet-shell", subPage: "operating" },
    FL2: { code: "FL2", group: "fleet", page: "fleet-shell", subPage: "available" },
    FL3: { code: "FL3", group: "fleet", page: "fleet-shell", subPage: "full" },
    FL4: { code: "FL4", group: "fleet", page: "fleet-shell", subPage: "handover" },
    FL5: { code: "FL5", group: "fleet", page: "fleet-shell", subPage: "issues" },
    FL6: { code: "FL6", group: "fleet", page: "fleet-shell", subPage: "matching" }
  });

  function resolveRoute(code, fallback) {
    if (code && ROUTES[code]) {
      return ROUTES[code];
    }
    return fallback || null;
  }

  function isActiveRoute(currentRoute, candidateRoute) {
    currentRoute = currentRoute || {};
    candidateRoute = candidateRoute || {};
    return String(currentRoute.page || "") === String(candidateRoute.page || "") &&
      String(currentRoute.subPage || "") === String(candidateRoute.subPage || "");
  }

  function toggleGroupState(currentState, groupKey, multiOpen) {
    var next = {};
    Object.keys(currentState || {}).forEach(function (key) {
      next[key] = !!currentState[key];
    });
    if (multiOpen) {
      next[groupKey] = !next[groupKey];
      return next;
    }
    Object.keys(next).forEach(function (key) {
      next[key] = false;
    });
    next[groupKey] = true;
    return next;
  }

  function getOperationsRoutes() {
    if (OperationsViewModel && typeof OperationsViewModel.getSidebarRouteMap === "function") {
      return OperationsViewModel.getSidebarRouteMap();
    }
    if (
      typeof globalThis !== "undefined" &&
      globalThis.KeetaPortal &&
      globalThis.KeetaPortal.OperationsViewModel &&
      typeof globalThis.KeetaPortal.OperationsViewModel.getSidebarRouteMap === "function"
    ) {
      return globalThis.KeetaPortal.OperationsViewModel.getSidebarRouteMap();
    }
    return {
      OP1: { code: "OP1", group: "ops", page: "operations-shell", subPage: "dashboard_users" },
      OP2: { code: "OP2", group: "ops", page: "operations-shell", subPage: "working" },
      OP3: { code: "OP3", group: "ops", page: "operations-shell", subPage: "working_riders" },
      OP4: { code: "OP4", group: "ops", page: "operations-shell", subPage: "needs_assignment" },
      OP5: { code: "OP5", group: "ops", page: "operations-shell", subPage: "swaps" },
      OP6: { code: "OP6", group: "ops", page: "operations-shell", subPage: "needs_review" },
      OP7: { code: "OP7", group: "ops", page: "operations-shell", subPage: "terminations" },
      OP8: { code: "OP8", group: "ops", page: "operations-shell", subPage: "audit_log" }
    };
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
    ROUTES: ROUTES,
    isActiveRoute: isActiveRoute,
    resolveRoute: resolveRoute,
    toggleGroupState: toggleGroupState
  };
});
