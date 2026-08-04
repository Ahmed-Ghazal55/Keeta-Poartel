(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportCenterViewModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var VALIDATION_STATUSES = ["ready", "warning", "invalid", "blocked", "duplicate", "needs_review"];
  var ROUTE_ALIASES = {
    dashboard_import: "dashboard_users_import",
    assignments_import: "current_assignments_import",
    external_import: "external_riders_import",
    hr_import: "hr_master_import",
    vehicles_import: "fleet_operating_vehicles_import",
    fleet_import: "fleet_operating_vehicles_import",
    performance_import: "performance_pipeline_import",
    company_invoice: "company_invoice_import",
    settlement_input: "rider_settlement_input_import",
    salary_input: "salary_base_input_import",
    bonus_import: "bonus_adjustment_import",
    deduction_import: "deduction_adjustment_import",
    gas_card_import: "gas_card_usage_import",
    bank_input: "bank_transfer_input_import"
  };

  var TEMPLATE_DEFINITIONS = [
    definition("dashboard_users", "dashboard_users_import", "dashboardUsers", "operations", ["userId"], ["ownerIqama", "city", "register", "platform"], "dashboard_users", ["userId", "ownerIqama", "city", "register", "platform"]),
    definition("current_assignments", "current_assignments_import", "assignments", "operations", ["userId", "ownerIqama", "actualRiderIqama", "assignmentStartDate"], ["registeredVehicleSerial", "actualVehicleSerial", "city", "register", "platform"], "current_assignments", ["userId", "ownerIqama", "actualRiderIqama", "assignmentStartDate", "city", "register"]),
    definition("external_riders", "external_riders_import", "externalRiders", "hr", ["iqama", "fullName"], ["userId", "phone", "city", "register", "platform"], "external_riders", ["iqama", "fullName", "userId", "city", "register"]),
    definition("hr_master", "hr_master_import", "hrProfiles", "hr", ["iqama", "fullName"], ["employeeNumber", "city", "register"], "hr_master", ["iqama", "fullName", "employeeNumber", "city", "register"]),
    definition("fleet_operating_vehicles", "fleet_operating_vehicles_import", "vehicles", "fleet", ["vehicleSerial"], ["plateNumber", "city", "register"], "vehicles", ["vehicleSerial", "plateNumber", "city", "register"]),
    definition("vehicle_assignments", "vehicle_assignments_import", "vehicleAssignments", "fleet", ["userId", "vehicleSerial"], ["actualVehicleSerial", "plateNumber", "city", "register", "platform"], "vehicles_movement", ["userId", "vehicleSerial", "actualVehicleSerial", "plateNumber"]),
    definition("overall_performance", "overall_performance_import", "performanceMonthly", "performance", ["userId", "month"], ["city", "register", "platform"], "overall_performance", ["userId", "month", "city", "register", "completedOrders"]),
    definition("daily_performance", "daily_performance_import", "performanceDaily", "performance", ["date", "userId"], ["actualRiderIqama", "city", "register", "platform"], "daily_performance", ["date", "userId", "actualRiderIqama", "city", "register", "completedOrders"]),
    definition("vda", "vda_import", "vdaResults", "performance", ["userId"], ["month", "city", "register", "platform"], "vda", ["userId", "month", "city", "register", "vda"]),
    definition("face_verification", "face_verification_import", "faceVerification", "performance", ["userId"], ["date", "month", "city", "register", "platform"], "face_verification", ["userId", "date", "month", "status"]),
    definition("delivery_experience", "delivery_experience_import", "deliveryExperience", "performance", ["userId"], ["month", "city", "register", "platform"], "delivery_experience", ["userId", "month", "city", "register", "status"]),
    definition("validity_results", "validity_results_import", "validityResults", "performance", ["userId", "month"], ["actualRiderIqama", "city", "register", "platform"], "validity_results", ["userId", "actualRiderIqama", "month", "status"]),
    definition("company_invoice", "company_invoice_import", "financeInputs", "finance", ["sourceRowNumber"], ["dashboardUserId", "amountRaw", "currency", "month"], "finance_placeholder", ["sourceRowNumber", "dashboardUserId", "amountRaw", "currency"]),
    definition("rider_settlement_input", "rider_settlement_input_import", "financeInputs", "finance", ["dashboardUserId", "periodStart", "periodEnd"], ["actualRiderIqama", "amountRaw"], "finance_placeholder", ["dashboardUserId", "actualRiderIqama", "periodStart", "periodEnd"]),
    definition("salary_base_input", "salary_base_input_import", "financeInputs", "finance", ["ownerIqama", "month"], ["dashboardUserId", "amountRaw"], "finance_placeholder", ["ownerIqama", "dashboardUserId", "month"]),
    definition("bonus_adjustment", "bonus_adjustment_import", "financeInputs", "finance", ["dashboardUserId", "reasonCode"], ["amountRaw", "currency"], "finance_placeholder", ["dashboardUserId", "reasonCode", "amountRaw"]),
    definition("deduction_adjustment", "deduction_adjustment_import", "financeInputs", "finance", ["dashboardUserId", "reasonCode"], ["amountRaw", "currency"], "finance_placeholder", ["dashboardUserId", "reasonCode", "amountRaw"]),
    definition("vehicle_deduction", "vehicle_deduction_import", "financeInputs", "finance", ["vehicleSerial", "reasonCode"], ["dashboardUserId", "amountRaw"], "finance_placeholder", ["vehicleSerial", "reasonCode", "amountRaw"]),
    definition("gas_card_usage", "gas_card_usage_import", "financeInputs", "finance", ["dashboardUserId", "month"], ["actualRiderIqama", "amountRaw"], "finance_placeholder", ["dashboardUserId", "actualRiderIqama", "month"]),
    definition("advance_adjustment", "advance_adjustment_import", "financeInputs", "finance", ["dashboardUserId", "reasonCode"], ["amountRaw", "currency"], "finance_placeholder", ["dashboardUserId", "reasonCode", "amountRaw"]),
    definition("bank_transfer_input", "bank_transfer_input_import", "financeInputs", "finance", ["ownerIqama"], ["dashboardUserId", "notes"], "finance_placeholder", ["ownerIqama", "dashboardUserId", "notes"])
  ];

  var ROUTES = buildRoutes();

  function definition(importType, routeId, targetEntity, sourceModule, requiredColumns, optionalColumns, normalizerKey, previewColumns) {
    return {
      templateId: importType,
      importType: importType,
      routeId: routeId,
      targetEntity: targetEntity,
      sourceModule: sourceModule,
      displayName: importType.split("_").map(capitalize).join(" "),
      requiredColumns: requiredColumns.slice(),
      optionalColumns: optionalColumns.slice(),
      normalizerKey: normalizerKey,
      validationRules: ["required_fields", "scope_compatibility", "duplicate_detection"],
      defaultScopeFields: ["register", "city", "platform", "month"],
      previewColumns: previewColumns.slice(),
      postSaveTarget: { page: sourceModule === "performance" ? "performance-shell" : sourceModule + "-shell", focus: targetEntity }
    };
  }

  function buildRoutes() {
    var routes = {};
    TEMPLATE_DEFINITIONS.forEach(function (item) {
      routes[item.routeId] = { id: item.routeId, templateId: item.templateId, importType: item.importType, targetEntity: item.targetEntity, sourceModule: item.sourceModule, readOnlyEntry: true };
    });
    routes.performance_pipeline_import = { id: "performance_pipeline_import", templateId: "daily_performance", importType: "daily_performance", targetEntity: "performanceDaily", sourceModule: "performance", readOnlyEntry: true };
    return routes;
  }

  function normalizeRoute(routeId) {
    var id = text(routeId).toLowerCase();
    id = ROUTE_ALIASES[id] || id;
    return clone(ROUTES[id] || null);
  }

  function getTemplate(templateId) {
    var id = text(templateId).toLowerCase();
    return clone(TEMPLATE_DEFINITIONS.filter(function (item) { return item.templateId === id; })[0] || null);
  }

  function createPreviewState(options) {
    options = options || {};
    var route = normalizeRoute(options.routeId) || normalizeRoute("performance_pipeline_import");
    var template = getTemplate(options.templateId || route && route.templateId);
    return {
      route: route,
      template: template,
      readOnly: true,
      selectedTemplateId: template ? template.templateId : "",
      scope: scopeOf(options),
      rows: (options.rows || []).map(function (row, index) { return normalizePreviewRow(row, index, options); }),
      focusedBatchId: text(options.focusedBatchId),
      validationStatus: VALIDATION_STATUSES.indexOf(options.validationStatus) >= 0 ? options.validationStatus : "needs_review"
    };
  }

  function normalizePreviewRow(row, index, context) {
    row = row || {};
    context = context || {};
    return Object.assign({}, row, {
      rowNumber: Number(row.rowNumber || row.sourceRowNumber) || index + 2,
      sourceRowNumber: Number(row.sourceRowNumber || row.rowNumber) || index + 2,
      sourceFileName: text(row.sourceFileName || context.sourceFileName),
      importType: text(row.importType || context.importType),
      templateId: text(row.templateId || context.templateId),
      batchId: text(row.batchId || row.sourceBatchId || context.batchId),
      register: text(row.register || context.register),
      city: text(row.city || context.city),
      platform: text(row.platform || context.platform),
      month: text(row.month || row.cycle || context.month),
      validationStatus: VALIDATION_STATUSES.indexOf(row.validationStatus) >= 0 ? row.validationStatus : "needs_review"
    });
  }

  function normalizeBatch(batch) {
    batch = batch || {};
    var validation = batch.validation || {};
    var summary = validation.summary || batch.validationSummary || {};
    return {
      batchId: text(batch.batchId || batch.id), importType: text(batch.importType || batch.fileType || batch.type), templateId: text(batch.templateId),
      sourceModule: text(batch.sourceModule), sourceFileName: text(batch.sourceFileName || batch.fileName), targetEntity: text(batch.targetEntity), status: text(batch.status || "preview"),
      rowCount: number(batch.rowCount), readyCount: number(batch.readyCount || summary.ready), warningCount: number(batch.warningCount || summary.warning),
      invalidCount: number(batch.invalidCount || summary.invalid || summary.blocked), savedCount: number(batch.savedCount || batch.savedRecordCount),
      register: text(batch.register), city: text(batch.city), platform: text(batch.platform), month: text(batch.month || batch.cycle),
      createdAt: text(batch.createdAt), createdBy: text(batch.createdBy || batch.userId), sourceFingerprint: text(batch.sourceFingerprint || batch.checksum), readOnly: true
    };
  }

  function createBatchFocus(batch, options) {
    options = options || {};
    var normalized = normalizeBatch(batch);
    return { batch: normalized, focusedBatchId: normalized.batchId || text(options.batchId), readOnly: true, marker: "import-batch-focus::" + (normalized.batchId || text(options.batchId)) };
  }

  function scopeOf(value) {
    value = value || {};
    return { register: text(value.register), city: text(value.city), platform: text(value.platform), month: text(value.month || value.cycle) };
  }

  function capitalize(value) { value = String(value || ""); return value.charAt(0).toUpperCase() + value.slice(1); }
  function text(value) { return String(value == null ? "" : value).trim(); }
  function number(value) { return Number(value) || 0; }
  function clone(value) { return value == null ? null : JSON.parse(JSON.stringify(value)); }

  return {
    VALIDATION_STATUSES: VALIDATION_STATUSES.slice(), ROUTES: clone(ROUTES), TEMPLATE_DEFINITIONS: clone(TEMPLATE_DEFINITIONS),
    createBatchFocus: createBatchFocus, createPreviewState: createPreviewState, getTemplate: getTemplate,
    listTemplates: function () { return clone(TEMPLATE_DEFINITIONS); }, normalizeBatch: normalizeBatch, normalizePreviewRow: normalizePreviewRow, normalizeRoute: normalizeRoute
  };
});
