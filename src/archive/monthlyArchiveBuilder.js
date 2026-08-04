(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(require("./monthlyArchiveModel.js")); return; }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.MonthlyArchiveBuilder = factory(root.KeetaPortal.MonthlyArchiveModel);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Model) {
  "use strict";
  var COLLECTIONS = {
    dashboard_users: "dashboardUsers", assignments: "assignments", assignment_history: "assignmentHistory", swaps: "swaps",
    terminations: "terminations", riders: "riders", hr_profiles: "hrProfiles", external_riders: "externalRiders",
    vehicles: "vehicles", vehicle_usage_history: "riderVehicleUsageHistory", performance_daily: "performanceDaily",
    performance_overall: "performanceMonthly", vda: "vdaResults", face_verification: "faceVerification",
    delivery_experience: "deliveryExperience", validity_results: "validityResults", issues: "performanceIssues",
    import_batches: "importBatches", audit_references: "auditReferences"
  };

  function buildPreview(collections, scope, options) {
    collections = collections || {}; scope = normalizeScope(scope); options = options || {};
    var items = {}, sourceCollections = [];
    Model.ITEM_FAMILIES.forEach(function (family) {
      var collectionName = COLLECTIONS[family], rows = clone(collections[collectionName] || []);
      if (rows.length) sourceCollections.push(collectionName);
      items[family] = rows.filter(function (row) { return matchesScope(row, scope); }).map(function (row) {
        var next = Object.assign({}, row, Model.identityOf(row));
        next.archiveFamily = family; next.readOnly = true; next.focus = traceabilityFor(family, next);
        return next;
      });
    });
    enrichAssignments(items, collections);
    var validation = validatePreview({ scope: scope, items: items });
    return Model.createArchiveRun({
      archiveRunId: text(options.archiveRunId || "preview::" + [scope.register, scope.city, scope.platform, scope.month].join("::")),
      status: validation.blockedCount ? "blocked" : "previewed", register: scope.register, city: scope.city,
      platform: scope.platform, month: scope.month, cycleStartDate: text(scope.cycleStartDate || monthStart(scope.month)),
      cycleEndDate: text(scope.cycleEndDate || monthEnd(scope.month)), createdAt: text(options.createdAt),
      createdBy: text(options.createdBy), sourceProfile: text(options.sourceProfile), sourceCollections: sourceCollections,
      sourceBatchIds: items.import_batches.map(function (row) { return text(row.batchId || row.id); }).filter(Boolean),
      warningCount: validation.warningCount, blockedCount: validation.blockedCount, notes: text(options.notes),
      items: items, validation: validation.findings
    });
  }

  function validatePreview(input) {
    input = input || {}; var scope = normalizeScope(input.scope || input), items = input.items || {};
    var findings = [];
    ["register", "city", "platform", "month"].forEach(function (key) {
      if (!scope[key]) findings.push(finding("missing_" + key, "blocked", "missing_data", key + " is required"));
    });
    if (!(items.dashboard_users || []).length) findings.push(finding("no_dashboard_users", "blocked", "missing_data", "No dashboard users for scope"));
    if (!(items.assignments || []).length) findings.push(finding("no_current_assignments", "blocked", "missing_data", "No current assignments for scope"));
    (items.performance_daily || []).forEach(function (row) { if (!row.assignmentId) findings.push(finding("performance_without_assignment", "blocked", "under_review", "Performance row lacks assignment attribution", row)); });
    (items.validity_results || []).forEach(function (row) { if (!row.assignmentId || !text(row.actualRiderIqama)) findings.push(finding("validity_prerequisites_missing", "warning", "under_review", "Validity prerequisites are incomplete", row)); });
    (items.import_batches || []).forEach(function (row) { if (!text(row.sourceFileName || row.fileName) || !text(row.batchId || row.id)) findings.push(finding("import_source_traceability_missing", "warning", "missing_data", "Import batch source traceability is incomplete", row)); });
    (items.assignments || []).forEach(function (row) {
      if (!text(row.registeredVehicleSerial)) findings.push(finding("registered_vehicle_missing", "warning", "missing_data", "Registered vehicle is missing", row));
      if (!text(row.actualVehicleSerial)) findings.push(finding("actual_vehicle_missing", "warning", "missing_data", "Actual vehicle is missing", row));
      if (!text(row.actualRiderIqama)) findings.push(finding("actual_rider_missing", "warning", "missing_data", "Actual rider is missing", row));
      if (!text(row.ownerIqama)) findings.push(finding("owner_profile_missing", "warning", "missing_data", "Owner profile is missing", row));
    });
    Model.ITEM_FAMILIES.forEach(function (family) { (items[family] || []).forEach(function (row) { if (!matchesScope(row, scope)) findings.push(finding("scope_mismatch", "blocked", "scope_mismatch", "Cross-scope row detected", row)); }); });
    (items.issues || []).forEach(function (row) { if (text(row.severity).toLowerCase() === "critical" && text(row.status).toLowerCase() !== "resolved") findings.push(finding("unresolved_critical_issue", "blocked", "blocked", "Critical issue is unresolved", row)); });
    return { status: findings.some(isBlocked) ? "blocked" : findings.length ? "warning" : "ready", findings: findings,
      warningCount: findings.filter(function (f) { return f.level === "warning"; }).length,
      blockedCount: findings.filter(isBlocked).length };
  }

  function enrichAssignments(items, collections) {
    var hr = collections.hrProfiles || [], external = collections.externalRiders || [];
    items.assignments.forEach(function (row) {
      var iqama = text(row.actualRiderIqama), source = hr.some(function (x) { return text(x.iqama) === iqama; }) ? "hr" : external.some(function (x) { return text(x.iqama) === iqama; }) ? "external" : "unknown";
      row.actualRiderSource = source === "unknown" && (row.actualRiderSource === "hr" || row.actualRiderSource === "external") ? row.actualRiderSource : source;
    });
  }
  function traceabilityFor(family, row) {
    var maps = { dashboard_users: ["operations-shell", "dashboard_users"], assignments: ["operations-shell", "current_assignments"],
      performance_daily: ["performance-shell", "daily_performance"], performance_overall: ["performance-shell", "overall_performance"],
      validity_results: ["performance-shell", "validity_results"], issues: ["performance-shell", "issues"],
      hr_profiles: ["hr-shell", "hr_master"], external_riders: ["rider-master", "external_riders"], vehicles: ["fleet-shell", "operating_vehicles"],
      vehicle_usage_history: ["fleet-shell", "vehicle_usage_history"], import_batches: ["import-center", "focused_batch"] };
    var route = maps[family] || ["archive-shell", family];
    return { page: route[0], subPage: route[1], readOnly: true, nonAuditing: true,
      batchId: text(row.batchId || row.sourceBatchId || row.importBatchId), assignmentId: text(row.assignmentId),
      actualRiderIqama: text(row.actualRiderIqama), registeredVehicleSerial: text(row.registeredVehicleSerial),
      actualVehicleSerial: text(row.actualVehicleSerial), rowId: text(row.id) };
  }
  function matchesScope(row, scope) {
    return ["register", "city", "platform"].every(function (key) { return !scope[key] || !text(row[key]) || text(row[key]).toLowerCase() === scope[key].toLowerCase(); }) &&
      (!scope.month || !text(row.month || row.cycle || row.date).slice(0, 7) || text(row.month || row.cycle || row.date).slice(0, 7) === scope.month);
  }
  function normalizeScope(v) { v = v || {}; return { register: text(v.register), city: text(v.city), platform: text(v.platform), month: text(v.month || v.cycle).slice(0, 7), cycleStartDate: text(v.cycleStartDate), cycleEndDate: text(v.cycleEndDate) }; }
  function finding(code, level, status, message, row) { return { code: code, level: level, status: status, message: message, rowId: text(row && row.id), readOnly: true }; }
  function isBlocked(f) { return f.level === "blocked"; }
  function monthStart(m) { return /^\d{4}-\d{2}$/.test(m) ? m + "-01" : ""; }
  function monthEnd(m) { if (!/^\d{4}-\d{2}$/.test(m)) return ""; var p = m.split("-"); return new Date(Date.UTC(Number(p[0]), Number(p[1]), 0)).toISOString().slice(0, 10); }
  function text(v) { return String(v == null ? "" : v).trim(); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  return { COLLECTIONS: COLLECTIONS, buildPreview: buildPreview, validatePreview: validatePreview, matchesScope: matchesScope, normalizeScope: normalizeScope, traceabilityFor: traceabilityFor };
});
