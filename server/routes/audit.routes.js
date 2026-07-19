"use strict";

function handleAuditRoute(context) {
  const { localDb, method, body, query } = context;
  if (method === "GET") {
    const limit = Number(query.limit) || 20;
    return localDb.readCollection("auditLogs")
      .sort((left, right) => String(right.timestamp || "").localeCompare(String(left.timestamp || "")))
      .slice(0, limit);
  }
  if (method === "POST") {
    return localDb.insert("auditLogs", body);
  }
  throw new Error("Unsupported audit route method: " + method);
}

module.exports = {
  handleAuditRoute
};
