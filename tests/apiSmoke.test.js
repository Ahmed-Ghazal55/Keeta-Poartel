const assert = require("assert");
const { createDevServer } = require("../server/devServer.js");

async function main() {
  const runtime = createDevServer({});
  const server = runtime.server;

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = "http://127.0.0.1:" + port;

  const health = await fetch(baseUrl + "/api/health").then((response) => response.json());
  assert.strictEqual(health.ok, true);

  const users = await fetch(baseUrl + "/api/data/users").then((response) => response.json());
  assert.ok(Array.isArray(users));
  assert.ok(users.length >= 1);

  const login = await fetch(baseUrl + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user_ops_jeddah" })
  }).then((response) => response.json());
  assert.strictEqual(login.user.id, "user_ops_jeddah");

  const auditEvent = await fetch(baseUrl + "/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "audit_manual_test",
      timestamp: new Date().toISOString(),
      userId: "user_ops_jeddah",
      action: "export_report",
      entity: "reports",
      entityId: "export_1",
      city: "جدة",
      register: "EXPRESS",
      before: null,
      after: { exported: true },
      source: "apiSmoke",
      note: "API smoke verification"
    })
  }).then((response) => response.json());
  assert.strictEqual(auditEvent.id, "audit_manual_test");

  server.close();
  console.log(JSON.stringify({
    summary: { total: 4, passed: 4, failed: 0 },
    results: [
      { name: "health endpoint", status: "passed" },
      { name: "get data", status: "passed" },
      { name: "dev login", status: "passed" },
      { name: "audit post", status: "passed" }
    ]
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    summary: { total: 4, passed: 0, failed: 1 },
    results: [{ name: "api smoke", status: "failed", error: error.message }]
  }, null, 2));
  process.exitCode = 1;
});
