const assert = require("assert");
const fs = require("fs");
const model = fs.readFileSync(require.resolve("../src/import/importCenterViewModel.js"), "utf8");
const validation = fs.readFileSync(require.resolve("../src/import/importValidationModel.js"), "utf8");
const pipeline = fs.readFileSync(require.resolve("../src/import/reportPipeline.js"), "utf8");
[model, validation, pipeline].forEach(source => assert.ok(!/auditLog|createAuditEvent|dataStore\.save|\.save\s*\(/.test(source)));
assert.ok(model.includes("readOnly: true"));
assert.ok(pipeline.includes("readOnly: true"));
console.log(JSON.stringify({ summary: { total: 5, passed: 5, failed: 0 } }, null, 2));
