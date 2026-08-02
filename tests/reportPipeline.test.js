const assert = require("assert");
const Pipeline = require("../src/import/reportPipeline.js");
const validity = Pipeline.evaluate({ dashboard_users: true, hr_external_riders: true, current_assignments: true, overall_performance: true, daily_performance: true, vda: true, face_verification: false, delivery_experience: true }).find(stage => stage.id === "validity_results");
assert.strictEqual(validity.ready, false);
assert.deepStrictEqual(validity.missingPrerequisites, ["face_verification"]);
assert.strictEqual(validity.readOnly, true);
assert.strictEqual(Pipeline.getStage("overall_performance").consumer, "daily_extraction");
assert.strictEqual(Pipeline.getStage("validity_results").consumer, "monthly_archive_later");
console.log(JSON.stringify({ summary: { total: 5, passed: 5, failed: 0 } }, null, 2));
