"use strict";

function handleDataRoute(context) {
  const { entityName, id, localDb, method, query, body } = context;
  if (method === "GET") {
    if (id) {
      return localDb.query(entityName, { id })[0] || null;
    }
    return Object.keys(query || {}).length ? localDb.query(entityName, query) : localDb.readCollection(entityName);
  }
  if (method === "POST") {
    const record = body && body.record ? body.record : body;
    return localDb.insert(entityName, record);
  }
  if (method === "PUT") {
    if (!id && body && Array.isArray(body.records)) {
      return localDb.writeCollection(entityName, body.records);
    }
    return localDb.upsert(entityName, id, body && body.record ? body.record : body);
  }
  if (method === "DELETE") {
    return localDb.remove(entityName, id);
  }
  throw new Error("Unsupported data method: " + method);
}

module.exports = {
  handleDataRoute
};
