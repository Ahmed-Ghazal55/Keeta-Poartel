(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); return; }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ReportPipeline = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var STAGES = [
    stage("dashboard_users", [], "dashboard_users_import", "assignment_readiness"),
    stage("hr_external_riders", [], "hr_master_import", "rider_resolution"),
    stage("fleet", [], "fleet_operating_vehicles_import", "vehicle_matching"),
    stage("current_assignments", ["dashboard_users", "hr_external_riders"], "current_assignments_import", "performance_attribution"),
    stage("overall_performance", ["current_assignments"], "overall_performance_import", "daily_extraction"),
    stage("daily_performance", ["overall_performance", "current_assignments"], "daily_performance_import", "validity_preview"),
    stage("vda", ["daily_performance"], "vda_import", "validity_preview"),
    stage("face_verification", ["daily_performance"], "face_verification_import", "validity_preview"),
    stage("delivery_experience", ["daily_performance"], "delivery_experience_import", "validity_preview"),
    stage("validity_results", ["daily_performance", "vda", "face_verification", "delivery_experience"], "validity_results_import", "monthly_archive_later")
  ];
  function stage(id, dependencies, routeId, consumer) { return { id: id, dependencies: dependencies, routeId: routeId, consumer: consumer }; }
  function evaluate(available) {
    available = available || {};
    return STAGES.map(function (item) {
      var missing = item.dependencies.filter(function (id) { return !available[id]; });
      return Object.assign({}, item, { ready: missing.length === 0, status: missing.length ? "blocked" : (available[item.id] ? "ready" : "warning"), missingPrerequisites: missing, readOnly: true });
    });
  }
  function getStage(id) { var found = STAGES.filter(function (item) { return item.id === id; })[0]; return found ? JSON.parse(JSON.stringify(found)) : null; }
  return { STAGES: JSON.parse(JSON.stringify(STAGES)), evaluate: evaluate, getStage: getStage };
});
