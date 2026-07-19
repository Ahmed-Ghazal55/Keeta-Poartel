const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createLocalDb } = require("../server/localDb.js");

function test(name, handler) {
  try {
    handler();
    return { name, status: "passed" };
  } catch (error) {
    return { error: error.message, name, status: "failed" };
  }
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "keeta-localdb-"));
const dataDir = path.join(tmpRoot, "db");
const backupRoot = path.join(tmpRoot, "backups");
const localDb = createLocalDb({ backupRoot, dataDir });
const results = [];

results.push(test("readCollection returns arrays", () => {
  localDb.writeCollection("dashboardUsers", []);
  assert.ok(Array.isArray(localDb.readCollection("dashboardUsers")));
}));

results.push(test("writeCollection and upsert persist records", () => {
  localDb.writeCollection("dashboardUsers", [{ id: "x1", userId: "1" }]);
  localDb.upsert("dashboardUsers", "x1", { id: "x1", userId: "2" });
  assert.strictEqual(localDb.readCollection("dashboardUsers")[0].userId, "2");
}));

results.push(test("backup creates snapshot folder", () => {
  const backupDir = localDb.backup();
  assert.strictEqual(fs.existsSync(backupDir), true);
}));

results.push(test("invalid entity names are rejected", () => {
  let thrown = false;
  try {
    localDb.readCollection("unknownEntity");
  } catch (_error) {
    thrown = true;
  }
  assert.strictEqual(thrown, true);
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
