const assert = require("assert");
const Model = require("../src/import/importCenterViewModel.js");
const batch = Model.normalizeBatch({ id: "batch-1", importType: "daily_performance", templateId: "daily_performance", sourceModule: "performance", sourceFileName: "daily.csv", targetEntity: "performanceDaily", status: "saved", rowCount: 4, savedRecordCount: 3, city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", createdAt: "2026-08-02T00:00:00Z", createdBy: "tester", checksum: "abc" });
["batchId", "importType", "templateId", "sourceModule", "sourceFileName", "targetEntity", "status", "rowCount", "readyCount", "warningCount", "invalidCount", "savedCount", "register", "city", "platform", "month", "createdAt", "createdBy", "sourceFingerprint"].forEach(field => assert.ok(Object.prototype.hasOwnProperty.call(batch, field), field));
assert.strictEqual(batch.savedCount, 3);
assert.strictEqual(batch.readOnly, true);
console.log(JSON.stringify({ summary: { total: 21, passed: 21, failed: 0 } }, null, 2));
