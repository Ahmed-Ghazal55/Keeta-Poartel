(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); return; }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportValidationModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var STATUSES = ["ready", "warning", "invalid", "blocked", "duplicate", "needs_review"];
  var VALID_CITIES = ["jeddah", "riyadh", "جدة", "الرياض"];
  var VALID_PLATFORMS = ["keeta", "ninja", "jahez", "chefz", "hungerstation", "amazon"];

  function validateBatch(options) {
    options = options || {};
    var template = options.template || null;
    var rows = options.rows || [];
    var issues = [];
    if (!template) {
      issues.push(issue(null, "template", "unsupported_template", "blocked", "Unsupported import template.", "Select a canonical template.", options));
      return result(rows, issues);
    }
    var seen = {};
    rows.forEach(function (row, index) {
      var rowNumber = Number(row.sourceRowNumber || row.rowNumber) || index + 2;
      (template.requiredColumns || []).forEach(function (field) {
        if (!text(row[field])) {
          var code = field === "userId" ? "missing_dashboard_user_id" : field === "ownerIqama" ? "missing_owner_iqama" : field === "actualRiderIqama" ? "missing_actual_rider" : "missing_required_field";
          issues.push(issue(rowNumber, field, code, "invalid", "Required value is missing: " + field + ".", "Complete the source value before save.", row));
        }
      });
      checkScope(row, rowNumber, options, issues);
      checkDate(row, rowNumber, issues);
      checkVehicle(row, rowNumber, issues);
      if (template.importType === "daily_performance" && !text(row.actualRiderIqama || row.assignmentId)) {
        issues.push(issue(rowNumber, "actualRiderIqama", "missing_assignment_for_performance", "blocked", "Performance row has no date-scoped assignment.", "Import current assignments or resolve the assignment period.", row));
      }
      var key = duplicateKey(row, template);
      if (key && seen[key]) {
        issues.push(issue(rowNumber, "", "duplicate_row_inside_file", "duplicate", "Duplicate row detected inside the source file.", "Keep one canonical source row.", row));
      }
      seen[key] = key ? true : seen[key];
      if (key && options.existingKeys && options.existingKeys.indexOf(key) >= 0) {
        issues.push(issue(rowNumber, "", "duplicate_existing_entity", "duplicate", "A matching canonical entity already exists.", "Review whether the explicit save should update it.", row));
      }
    });
    return result(rows, issues);
  }

  function checkScope(row, rowNumber, expected, issues) {
    var city = text(row.city || expected.city).toLowerCase();
    var platform = text(row.platform || expected.platform).toLowerCase();
    var register = text(row.register || expected.register);
    if (city && VALID_CITIES.indexOf(city) < 0) issues.push(issue(rowNumber, "city", "invalid_city", "invalid", "City is not supported.", "Choose a registered city.", row));
    if (platform && VALID_PLATFORMS.indexOf(platform) < 0) issues.push(issue(rowNumber, "platform", "invalid_platform", "invalid", "Platform is not supported.", "Choose a registered platform.", row));
    if (register && !/^[\p{L}\p{N} _-]+$/u.test(register)) issues.push(issue(rowNumber, "register", "invalid_register", "invalid", "Register contains unsupported characters.", "Choose a canonical register.", row));
    ["city", "register", "platform", "month"].forEach(function (field) {
      var actual = text(row[field]); var wanted = text(expected[field]);
      if (actual && wanted && actual.toLowerCase() !== wanted.toLowerCase()) {
        issues.push(issue(rowNumber, field, "report_scope_mismatch", "blocked", "Row " + field + " does not match the import scope.", "Split the source or select its exact scope.", row));
      }
    });
  }

  function checkDate(row, rowNumber, issues) {
    var month = text(row.month || row.cycle);
    var date = text(row.date || row.assignmentStartDate);
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) issues.push(issue(rowNumber, "month", "malformed_month", "invalid", "Month must use YYYY-MM.", "Normalize the report cycle.", row));
    if (date && !/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(date)) issues.push(issue(rowNumber, "date", "malformed_date", "invalid", "Date must use YYYY-MM-DD.", "Normalize the source date.", row));
  }

  function checkVehicle(row, rowNumber, issues) {
    var serial = text(row.vehicleSerial || row.registeredVehicleSerial);
    var plate = text(row.plateNumber || row.registeredVehiclePlate);
    if ((serial && !plate) || (!serial && plate)) issues.push(issue(rowNumber, serial ? "plateNumber" : "vehicleSerial", "vehicle_serial_plate_mismatch", "warning", "Vehicle serial and plate are incomplete as a pair.", "Confirm the registered and actual vehicle fields separately.", row));
  }

  function duplicateKey(row, template) {
    return (template.requiredColumns || []).map(function (field) { return text(row[field]).toLowerCase(); }).filter(Boolean).join("|");
  }
  function issue(rowNumber, field, issueCode, severity, message, suggestedAction, context) {
    return { rowNumber: rowNumber, sourceRowNumber: rowNumber, field: field || "", issueCode: issueCode, severity: severity, message: message, suggestedAction: suggestedAction, linkedEntityType: text(context && (context.linkedEntityType || context.targetEntity)), linkedEntityId: text(context && (context.linkedEntityId || context.userId || context.iqama || context.vehicleSerial)), scope: { register: text(context && context.register), city: text(context && context.city), platform: text(context && context.platform), month: text(context && (context.month || context.cycle)) } };
  }
  function result(rows, issues) {
    var counts = { ready: 0, warning: 0, invalid: 0, blocked: 0, duplicate: 0, needs_review: 0 };
    issues.forEach(function (item) { counts[item.severity] = (counts[item.severity] || 0) + 1; });
    counts.ready = Math.max(0, rows.length - uniqueIssueRows(issues));
    return { statuses: STATUSES.slice(), rowCount: rows.length, issues: issues, summary: counts, canSave: counts.invalid === 0 && counts.blocked === 0 && counts.duplicate === 0 };
  }
  function uniqueIssueRows(issues) { var seen = {}; issues.forEach(function (item) { if (item.rowNumber != null) seen[item.rowNumber] = true; }); return Object.keys(seen).length; }
  function text(value) { return String(value == null ? "" : value).trim(); }
  return { STATUSES: STATUSES.slice(), validateBatch: validateBatch };
});
