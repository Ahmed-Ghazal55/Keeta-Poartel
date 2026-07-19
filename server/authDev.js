"use strict";

const fs = require("fs");
const path = require("path");
const { createAuditEvent } = require("../src/auth/rbac.js");

const seedUsersPath = path.join(__dirname, "..", "data", "seed", "sampleUsers.json");
const seedRolesPath = path.join(__dirname, "..", "data", "seed", "sampleRoles.json");

function createAuthDev(localDb) {
  seedCoreCollections(localDb);

  function getUserByIdOrUsername(payload) {
    const users = localDb.readCollection("users");
    return users.find((user) => user.id === payload.userId || user.username === payload.username) || null;
  }

  function login(payload) {
    const user = getUserByIdOrUsername(payload || {});
    if (!user) {
      throw new Error("Invalid dev login user");
    }
    const session = {
      id: "session_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceFile: "devServer",
      city: "",
      register: "",
      status: "active",
      sessionType: "dev",
      userId: user.id
    };
    localDb.insert("sessions", session);
    localDb.insert("auditLogs", createAuditEvent("dev_login", "sessions", session.id, null, session, user, {
      source: "devServer",
      note: "Local dev API login"
    }));
    return {
      session,
      user
    };
  }

  function logout(sessionId) {
    const sessions = localDb.readCollection("sessions");
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) {
      return null;
    }
    const updated = Object.assign({}, session, {
      status: "logged_out",
      updatedAt: new Date().toISOString()
    });
    localDb.upsert("sessions", sessionId, updated);
    return updated;
  }

  function me(sessionId) {
    if (!sessionId) {
      return null;
    }
    const session = localDb.readCollection("sessions").find((item) => item.id === sessionId && item.status === "active");
    if (!session) {
      return null;
    }
    return {
      session,
      user: localDb.readCollection("users").find((item) => item.id === session.userId) || null
    };
  }

  return {
    login,
    logout,
    me,
    seedCoreCollections
  };
}

function readSeedFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

function seedCoreCollections(localDb) {
  if (!localDb.readCollection("roles").length) {
    localDb.writeCollection("roles", readSeedFile(seedRolesPath, []));
  }
  if (!localDb.readCollection("users").length) {
    localDb.writeCollection("users", readSeedFile(seedUsersPath, []));
  }
  if (!localDb.readCollection("auditLogs").length) {
    localDb.writeCollection("auditLogs", []);
  }
  if (!localDb.readCollection("sessions").length) {
    localDb.writeCollection("sessions", []);
  }
}

module.exports = {
  createAuthDev,
  seedCoreCollections
};
