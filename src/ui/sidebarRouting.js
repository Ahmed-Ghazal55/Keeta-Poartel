(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../operations/operationsViewModel.js"),
      require("../hr/hrViewModel.js"),
      require("../fleet/fleetViewModel.js"),
      require("../performance/performanceViewModel.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.SidebarRouting = factory(
    root.KeetaPortal.OperationsViewModel || null,
    root.KeetaPortal.HrViewModel || null,
    root.KeetaPortal.FleetViewModel || null,
    root.KeetaPortal.PerformanceViewModel || null
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (OperationsViewModel, HrViewModel, FleetViewModel, PerformanceViewModel) {
  "use strict";

  var ROUTES = mergeObjects({}, getOperationsRoutes(), getHrRoutes(), getFleetRoutes(), getPerformanceRoutes(), getArchiveRoutes(), getMonthlyClosingRoutes(), getFinanceRoutes(), {
    RL1: { code: "RL1", group: "rules", page: "monthly-rules-shell", subPage: "settings" },
    RL2: { code: "RL2", group: "rules", page: "monthly-rules-shell", subPage: "mandatory" },
    RL3: { code: "RL3", group: "rules", page: "monthly-rules-shell", subPage: "incentives_cars" },
    RL4: { code: "RL4", group: "rules", page: "monthly-rules-shell", subPage: "incentives_bikes" },
    RL5: { code: "RL5", group: "rules", page: "monthly-rules-shell", subPage: "quality" }
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

  function getHrRoutes() {
    if (HrViewModel && typeof HrViewModel.getSidebarRouteMap === "function") {
      return HrViewModel.getSidebarRouteMap();
    }
    if (
      typeof globalThis !== "undefined" &&
      globalThis.KeetaPortal &&
      globalThis.KeetaPortal.HrViewModel &&
      typeof globalThis.KeetaPortal.HrViewModel.getSidebarRouteMap === "function"
    ) {
      return globalThis.KeetaPortal.HrViewModel.getSidebarRouteMap();
    }
    return {
      HR1: { code: "HR1", group: "hr", page: "hr-shell", subPage: "hr_master" },
      HR2: { code: "HR2", group: "hr", page: "hr-shell", subPage: "kafala_status" },
      HR3: { code: "HR3", group: "hr", page: "rider-master", subPage: "external_riders" },
      HR4: { code: "HR4", group: "hr", page: "archive-shell", subPage: "hr_archive" },
      HR5: { code: "HR5", group: "hr", page: "hr-shell", subPage: "documents" }
    };
  }

  function getFleetRoutes() {
    if (FleetViewModel && typeof FleetViewModel.getSidebarRouteMap === "function") {
      return FleetViewModel.getSidebarRouteMap();
    }
    if (
      typeof globalThis !== "undefined" &&
      globalThis.KeetaPortal &&
      globalThis.KeetaPortal.FleetViewModel &&
      typeof globalThis.KeetaPortal.FleetViewModel.getSidebarRouteMap === "function"
    ) {
      return globalThis.KeetaPortal.FleetViewModel.getSidebarRouteMap();
    }
    return {
      FL1: { code: "FL1", group: "fleet", page: "fleet-shell", subPage: "operating_vehicles" },
      FL2: { code: "FL2", group: "fleet", page: "fleet-shell", subPage: "operating_vehicles" },
      FL3: { code: "FL3", group: "fleet", page: "fleet-shell", subPage: "capacity_review" },
      FL4: { code: "FL4", group: "fleet", page: "fleet-shell", subPage: "vehicle_usage_history" },
      FL5: { code: "FL5", group: "fleet", page: "fleet-shell", subPage: "exceptions" },
      FL6: { code: "FL6", group: "fleet", page: "fleet-shell", subPage: "vehicle_assignments" }
    };
  }

  function getPerformanceRoutes() {
    if (PerformanceViewModel && typeof PerformanceViewModel.getSidebarRouteMap === "function") {
      return PerformanceViewModel.getSidebarRouteMap();
    }
    return {
      PF1: { code: "PF1", group: "performance", page: "performance-shell", subPage: "performance_overview" },
      PF2: { code: "PF2", group: "performance", page: "performance-shell", subPage: "overall_performance" },
      PF3: { code: "PF3", group: "performance", page: "performance-shell", subPage: "daily_performance" },
      PF4: { code: "PF4", group: "performance", page: "performance-shell", subPage: "vda" },
      PF5: { code: "PF5", group: "performance", page: "performance-shell", subPage: "face_verification" },
      PF6: { code: "PF6", group: "performance", page: "performance-shell", subPage: "delivery_experience" },
      PF7: { code: "PF7", group: "performance", page: "performance-shell", subPage: "validity_results" },
      PF8: { code: "PF8", group: "performance", page: "performance-shell", subPage: "issues" }
    };
  }

  function getArchiveRoutes() {
    return {
      AR1: { code: "AR1", group: "archive", page: "archive-shell", subPage: "archive_overview" },
      AR2: { code: "AR2", group: "archive", page: "archive-shell", subPage: "monthly_archive_preview" },
      AR3: { code: "AR3", group: "archive", page: "archive-shell", subPage: "archive_runs" },
      AR4: { code: "AR4", group: "archive", page: "archive-shell", subPage: "archive_issues" },
      AR5: { code: "AR5", group: "archive", page: "archive-shell", subPage: "archive_source_traceability" }
    };
  }
  function getMonthlyClosingRoutes() { return {
    CL1:{code:"CL1",group:"monthly_closing",page:"monthly-closing-shell",subPage:"closing_overview"},CL2:{code:"CL2",group:"monthly_closing",page:"monthly-closing-shell",subPage:"closing_readiness"},CL3:{code:"CL3",group:"monthly_closing",page:"monthly-closing-shell",subPage:"rider_periods"},CL4:{code:"CL4",group:"monthly_closing",page:"monthly-closing-shell",subPage:"evidence_matrix"},CL5:{code:"CL5",group:"monthly_closing",page:"monthly-closing-shell",subPage:"closing_issues"},CL6:{code:"CL6",group:"monthly_closing",page:"monthly-closing-shell",subPage:"future_finance_boundary"}
  }; }
  function getFinanceRoutes() { return {
    FN1:{code:"FN1",group:"finance",page:"finance-shell",subPage:"finance_overview"},FN2:{code:"FN2",group:"finance",page:"finance-shell",subPage:"finance_input_staging"},FN3:{code:"FN3",group:"finance",page:"finance-shell",subPage:"required_inputs"},FN4:{code:"FN4",group:"finance",page:"finance-shell",subPage:"finance_issues"},FN5:{code:"FN5",group:"finance",page:"finance-shell",subPage:"source_traceability"},FN6:{code:"FN6",group:"finance",page:"finance-shell",subPage:"future_finance_boundary"}
  }; }

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
