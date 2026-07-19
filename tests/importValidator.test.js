const assert = require("assert");
const HeaderMapper = require("../src/import/headerMapper.js");
const { validateImportRecord } = require("../src/import/importValidator.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { name, status: "failed", error: error.message };
  }
}

function recordFromRows(type, rows, headers, extra) {
  return Object.assign({
    analysis: {
      tableSummary: {
        headers,
        mapping: HeaderMapper.mapHeaders(headers, ["userId"]),
        rows,
      },
    },
    city: "جدة",
    confidence: 0.9,
    confidenceState: "auto_detected",
    headers,
    month: "2026-07",
    rowCount: rows.length,
    targetEntity: "dashboardUsers",
    type,
  }, extra || {});
}

const results = [];

results.push(test("flags missing required headers", () => {
  const record = recordFromRows("dashboard_users_csv", [{ Name: "Ahmed" }], ["Name"]);
  const validation = validateImportRecord(record, { mode: "preview" });
  assert.ok(validation.issues.some((item) => item.code === "required_header_missing"));
}));

results.push(test("flags duplicate user ids", () => {
  const headers = ["User ID", "City"];
  const record = recordFromRows("dashboard_users_csv", [
    { "User ID": "1001", City: "Jeddah" },
    { "User ID": "1001", City: "Jeddah" },
  ], headers);
  record.analysis.tableSummary.mapping = HeaderMapper.mapHeaders(headers, ["userId"]);
  const validation = validateImportRecord(record, { mode: "preview" });
  assert.ok(validation.issues.some((item) => item.code === "duplicate_user_id"));
}));

results.push(test("flags empty files as blocking", () => {
  const record = recordFromRows("dashboard_users_csv", [], ["User ID", "City"]);
  const validation = validateImportRecord(record, { mode: "save" });
  assert.ok(validation.blockingIssues.some((item) => item.code === "empty_file"));
}));

results.push(test("warns about mixed cities", () => {
  const headers = ["User ID", "City"];
  const record = recordFromRows("dashboard_users_csv", [
    { "User ID": "1001", City: "Jeddah" },
    { "User ID": "1002", City: "Riyadh" },
  ], headers);
  record.analysis.tableSummary.mapping = HeaderMapper.mapHeaders(headers, ["userId", "city"]);
  const validation = validateImportRecord(record, { mode: "preview" });
  assert.ok(validation.issues.some((item) => item.code === "mixed_cities"));
}));

results.push(test("blocks unknown save without manual mapping", () => {
  const record = recordFromRows("unknown", [{ A: "1" }], ["A"], {
    confidence: 0.2,
    confidenceState: "manual_mapping_required",
    targetEntity: "",
  });
  const validation = validateImportRecord(record, { mode: "save" });
  assert.ok(validation.blockingIssues.some((item) => item.code === "unknown_save_without_mapping"));
}));

results.push(test("blocks lifecycle imports with invalid rider iqama values", () => {
  const headers = ["Timestamp", "رقم اقامة المندوب", "اسم المندوب"];
  const record = recordFromRows("external_riders_csv", [
    { Timestamp: "2026-07-15 09:15:00", "رقم اقامة المندوب": "12345", "اسم المندوب": "Ahmed" }
  ], headers, {
    targetEntity: "externalRiders",
  });
  record.analysis.tableSummary.mapping = HeaderMapper.mapHeaders(headers, ["iqama"]);
  const validation = validateImportRecord(record, { mode: "save" });
  assert.ok(validation.blockingIssues.some((item) => item.code === "invalid_lifecycle_iqama"));
}));

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length,
};

console.log(JSON.stringify({ summary, results }, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
