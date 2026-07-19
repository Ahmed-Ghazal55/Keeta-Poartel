"use strict";

const http = require("http");
const path = require("path");
const { URL } = require("url");
const { createAuthDev } = require("./authDev.js");
const { createLocalDb } = require("./localDb.js");
const { resetLocalDb } = require("./resetLocalDb.js");
const { handleDataRoute } = require("./routes/data.routes.js");
const { handleAuthRoute } = require("./routes/auth.routes.js");
const { handleAuditRoute } = require("./routes/audit.routes.js");

const DEFAULT_PORT = 4174;

function createDevServer(options) {
  const localDb = createLocalDb({
    backupRoot: options && options.backupRoot,
    dataDir: options && options.dataDir
  });
  const authDev = createAuthDev(localDb);

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const pathName = url.pathname;
      const method = req.method || "GET";
      if (method === "OPTIONS") {
        return sendEmpty(res, 204);
      }
      const query = Object.fromEntries(url.searchParams.entries());
      const body = await readJsonBody(req);

      if (pathName === "/api/health") {
        return sendJson(res, 200, {
          ok: true,
          port: server.address() ? server.address().port : null,
          service: "keeta-local-dev-api"
        });
      }

      if (pathName.indexOf("/api/data/") === 0) {
        const parts = pathName.split("/").filter(Boolean);
        const entityName = parts[2];
        const entityId = parts[3] || null;
        const payload = handleDataRoute({
          body,
          entityName,
          id: entityId,
          localDb,
          method,
          query
        });
        return sendJson(res, 200, payload);
      }

      if (pathName.indexOf("/api/auth/") === 0) {
        return sendJson(res, 200, handleAuthRoute({
          authDev,
          body,
          method,
          pathName,
          query
        }));
      }

      if (pathName === "/api/audit") {
        return sendJson(res, 200, handleAuditRoute({
          body,
          localDb,
          method,
          query
        }));
      }

      if (pathName === "/api/dev/reset" && method === "POST") {
        return sendJson(res, 200, resetLocalDb({
          backupBeforeReset: !body || body.backupBeforeReset !== false,
          dataDir: localDb.dataDir,
          entityNames: body && Array.isArray(body.entityNames) ? body.entityNames : null,
          localDb,
          reseedCoreCollections: !body || body.reseedCoreCollections !== false
        }));
      }

      return sendJson(res, 404, { error: "Not Found", path: pathName });
    } catch (error) {
      return sendJson(res, 500, {
        error: error.message,
        ok: false
      });
    }
  });

  return {
    authDev,
    localDb,
    server
  };
}

function startDevServer(options) {
  const runtime = createDevServer(options);
  const port = options && options.port ? options.port : DEFAULT_PORT;
  return new Promise((resolve) => {
    runtime.server.listen(port, () => {
      resolve(runtime);
    });
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (!chunks.length) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendEmpty(res, statusCode) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Origin": "*"
  });
  res.end("");
}

if (require.main === module) {
  startDevServer({
    dataDir: path.join(__dirname, "..", "data", "local-db"),
    port: DEFAULT_PORT
  }).then((runtime) => {
    const address = runtime.server.address();
    console.log(JSON.stringify({
      ok: true,
      port: address && address.port ? address.port : DEFAULT_PORT,
      service: "keeta-local-dev-api"
    }, null, 2));
  });
}

module.exports = {
  DEFAULT_PORT,
  createDevServer,
  startDevServer
};
