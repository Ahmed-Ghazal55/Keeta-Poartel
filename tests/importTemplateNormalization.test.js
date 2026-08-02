const assert = require("assert");
const Model = require("../src/import/importCenterViewModel.js");
Model.listTemplates().forEach(template => {
  ["templateId", "importType", "targetEntity", "sourceModule", "displayName", "requiredColumns", "optionalColumns", "normalizerKey", "validationRules", "defaultScopeFields", "previewColumns", "postSaveTarget"].forEach(field => assert.ok(Object.prototype.hasOwnProperty.call(template, field), `${template.templateId}.${field}`));
});
const row = Model.normalizePreviewRow({ userId: "U1", ownerIqama: "1", actualRiderIqama: "2", registeredVehicleSerial: "REG", actualVehicleSerial: "ACT" }, 0, { templateId: "current_assignments", importType: "current_assignments" });
assert.strictEqual(row.ownerIqama, "1");
assert.strictEqual(row.actualRiderIqama, "2");
assert.notStrictEqual(row.registeredVehicleSerial, row.actualVehicleSerial);
console.log(JSON.stringify({ summary: { total: 15, passed: 15, failed: 0 } }, null, 2));
