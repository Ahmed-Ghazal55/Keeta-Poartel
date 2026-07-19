const assert = require("assert");
const SchemaRegistry = require("../src/data/entitySchemas.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function fieldsFor(entityName) {
  const schema = SchemaRegistry.getEntitySchema(entityName);
  return schema.baseFields.concat(schema.customFields);
}

const results = [];

results.push(test("lifecycle schema registry stays upgraded for Prompt 8.9", () => {
  assert.strictEqual(SchemaRegistry.CURRENT_SCHEMA_VERSION, "2026.07.prompt8_9");
  assert.ok(SchemaRegistry.hasEntitySchema("externalRiders"));
  assert.ok(SchemaRegistry.hasEntitySchema("riderOperationalProfiles"));
  assert.ok(SchemaRegistry.hasEntitySchema("riderVehicleUsageHistory"));
  assert.ok(SchemaRegistry.hasEntitySchema("monthlyArchiveSnapshots"));
  assert.ok(SchemaRegistry.hasEntitySchema("notifications"));
}));

results.push(test("dashboardUsers schema includes lifecycle and operational fields", () => {
  const fields = fieldsFor("dashboardUsers");
  [
    "courierId",
    "courierQualificationType",
    "firstName",
    "lastName",
    "idNumber",
    "phoneNumber",
    "vehicle",
    "employmentStatus",
    "pleaseNote",
    "operationsCity",
    "ownerName",
    "ownerSource",
    "ownerProfileId",
    "ownerExistsInHr",
    "actualRiderId",
    "actualRiderIqama",
    "actualRiderName",
    "actualRiderSource",
    "hasActiveAssignment",
    "assignmentReadiness",
    "assignmentReadinessReason",
    "assignmentReadinessIssues",
    "canAssign",
    "canSwap",
    "canStop",
    "canDismiss",
    "operationMode",
    "lifecycleStatus",
    "latestImportPresence",
    "needsReview",
    "firstSeenAt",
    "lastSeenAt",
    "sourceBatchId"
  ].forEach((fieldName) => assert.ok(fields.includes(fieldName), fieldName));
}));

results.push(test("assignments schema includes owner vs actual rider attribution fields", () => {
  const fields = fieldsFor("assignments");
  [
    "assignmentId",
    "courierId",
    "userId",
    "ownerIqama",
    "ownerName",
    "actualRiderIqama",
    "actualRiderName",
    "riderSource",
    "actualRiderPhone",
    "operationMode",
    "assignmentStatus",
    "assignmentStartDate",
    "riderReceiveDate",
    "firstOnlineDate",
    "dashboardVehicle",
    "actualVehicle",
    "plateNumber",
    "vehicleSerial",
    "supervisor",
    "sourceBatchId",
    "sourceImportBatchId",
    "updatedBy"
  ].forEach((fieldName) => assert.ok(fields.includes(fieldName), fieldName));
}));

results.push(test("monthlyArchiveSnapshots schema includes frozen lifecycle snapshots", () => {
  const fields = fieldsFor("monthlyArchiveSnapshots");
  [
    "cycleId",
    "snapshotStatus",
    "frozenAt",
    "sourceEntityCounts",
    "dashboardUsersSnapshot",
    "assignmentsSnapshot",
    "riderProfilesSnapshot",
    "vehicleUsageSnapshot",
    "performanceSnapshot",
    "validitySnapshot"
  ].forEach((fieldName) => assert.ok(fields.includes(fieldName), fieldName));
}));

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
