const assert = require("assert");
const Model = require("../src/import/importCenterViewModel.js");
const Validation = require("../src/import/importValidationModel.js");
const template = Model.getTemplate("daily_performance");
const validation = Validation.validateBatch({ template, city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", rows: [
  { sourceRowNumber: 2, date: "bad", userId: "", city: "Riyadh", register: "EXPRESS", platform: "keeta", month: "2026-13" },
  { sourceRowNumber: 3, date: "2026-07-10", userId: "U1", city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", actualRiderIqama: "2999000011" },
  { sourceRowNumber: 4, date: "2026-07-10", userId: "U1", city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", actualRiderIqama: "2999000011" }
]});
["missing_dashboard_user_id", "missing_assignment_for_performance", "report_scope_mismatch", "malformed_month", "malformed_date", "duplicate_row_inside_file"].forEach(code => assert.ok(validation.issues.some(issue => issue.issueCode === code), code));
assert.strictEqual(validation.canSave, false);
assert.ok(validation.issues.every(issue => Object.prototype.hasOwnProperty.call(issue, "suggestedAction") && issue.scope));
assert.strictEqual(Validation.validateBatch({ template: null, rows: [] }).issues[0].issueCode, "unsupported_template");
console.log(JSON.stringify({ summary: { total: 9, passed: 9, failed: 0 } }, null, 2));
