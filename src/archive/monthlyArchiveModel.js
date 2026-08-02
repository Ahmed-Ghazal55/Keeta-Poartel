(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); return; }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.MonthlyArchiveModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ARCHIVE_TYPE = "monthly_snapshot";
  var RUN_STATUSES = ["draft", "previewed", "created", "blocked"];
  var VALIDATION_STATUSES = ["ready", "warning", "blocked", "missing_data", "scope_mismatch", "under_review"];
  var ITEM_FAMILIES = [
    "dashboard_users", "assignments", "assignment_history", "swaps", "terminations", "riders",
    "hr_profiles", "external_riders", "vehicles", "vehicle_usage_history", "performance_daily",
    "performance_overall", "vda", "face_verification", "delivery_experience", "validity_results",
    "issues", "import_batches", "audit_references"
  ];
  var ROUTES = {
    AR1: { code: "AR1", group: "archive", page: "archive-shell", subPage: "archive_overview" },
    AR2: { code: "AR2", group: "archive", page: "archive-shell", subPage: "monthly_archive_preview" },
    AR3: { code: "AR3", group: "archive", page: "archive-shell", subPage: "archive_runs" },
    AR4: { code: "AR4", group: "archive", page: "archive-shell", subPage: "archive_issues" },
    AR5: { code: "AR5", group: "archive", page: "archive-shell", subPage: "archive_source_traceability" }
  };

  function createArchiveRun(value) {
    value = value || {};
    var items = normalizeItems(value.items || {});
    var counts = {};
    ITEM_FAMILIES.forEach(function (family) { counts[family] = items[family].length; });
    return {
      archiveRunId: text(value.archiveRunId || value.id), archiveType: ARCHIVE_TYPE,
      status: RUN_STATUSES.indexOf(value.status) >= 0 ? value.status : "draft",
      register: text(value.register), city: text(value.city), platform: text(value.platform),
      month: text(value.month), cycleStartDate: text(value.cycleStartDate), cycleEndDate: text(value.cycleEndDate),
      createdAt: text(value.createdAt), createdBy: text(value.createdBy), sourceProfile: text(value.sourceProfile),
      sourceCollections: unique(value.sourceCollections || []), sourceBatchIds: unique(value.sourceBatchIds || []),
      snapshotCounts: Object.assign(counts, value.snapshotCounts || {}), warningCount: number(value.warningCount),
      blockedCount: number(value.blockedCount), notes: text(value.notes), items: items,
      validation: clone(value.validation || []), immutable: true, readOnly: true
    };
  }

  function normalizeItems(value) {
    var result = {};
    ITEM_FAMILIES.forEach(function (family) {
      result[family] = (value[family] || []).map(function (item) { return Object.freeze(clone(item)); });
    });
    return result;
  }

  function identityOf(row) {
    row = row || {};
    return {
      dashboardUserId: text(row.dashboardUserId || row.userId), courierId: text(row.courierId),
      ownerIqama: text(row.ownerIqama), ownerName: text(row.ownerName),
      actualRiderIqama: text(row.actualRiderIqama || row.riderIqama), actualRiderName: text(row.actualRiderName || row.riderName),
      actualRiderSource: riderSource(row.actualRiderSource || row.riderSource), assignmentId: text(row.assignmentId || row.id),
      registeredVehicleSerial: text(row.registeredVehicleSerial || row.vehicleSerial),
      registeredVehiclePlate: text(row.registeredVehiclePlate || row.plateNumber),
      actualVehicleSerial: text(row.actualVehicleSerial), actualVehiclePlate: text(row.actualVehiclePlate)
    };
  }

  function createRunContract() {
    return Object.freeze({
      preview: "buildPreview", validate: "validatePreview", futureCreate: "createArchiveExplicitly",
      requiresExplicitConfirmation: true, implementedCreate: false, mutatesLiveData: false,
      forbidden: ["silent_save", "status_change", "cycle_reset", "live_delete", "assignment_change", "month_close", "settlement_calculation"]
    });
  }
  function riderSource(value) { value = text(value).toLowerCase(); return value === "hr" || value === "external" ? value : "unknown"; }
  function text(value) { return String(value == null ? "" : value).trim(); }
  function number(value) { return Number(value) || 0; }
  function clone(value) { return JSON.parse(JSON.stringify(value == null ? null : value)); }
  function unique(values) { var seen = {}; return values.map(text).filter(function (v) { if (!v || seen[v]) return false; seen[v] = true; return true; }); }
  return { ARCHIVE_TYPE: ARCHIVE_TYPE, ITEM_FAMILIES: ITEM_FAMILIES, ROUTES: ROUTES, RUN_STATUSES: RUN_STATUSES,
    VALIDATION_STATUSES: VALIDATION_STATUSES, createArchiveRun: createArchiveRun, createRunContract: createRunContract,
    identityOf: identityOf, normalizeItems: normalizeItems };
});
