const assert = require("assert");
const fs = require("fs");
const ui = fs.readFileSync(require.resolve("../keeta_operations_portal_performance_extension.js"), "utf8");
const viewModel = fs.readFileSync(require.resolve("../src/performance/performanceViewModel.js"), "utf8");
assert.ok(!/createAuditEvent|auditLog\.save|dataStore\.save\s*\(/.test(ui));
assert.ok(!/createAuditEvent|auditLog|dataStore\.save\s*\(/.test(viewModel));
assert.ok(/openRouteImport\("performance_pipeline_import"/.test(ui));
console.log(JSON.stringify({ summary: { total: 3, passed: 3, failed: 0 } }, null, 2));
