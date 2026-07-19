"use strict";

function handleAuthRoute(context) {
  const { authDev, method, pathName, body, query } = context;
  if (pathName === "/api/auth/login" && method === "POST") {
    return authDev.login(body || {});
  }
  if (pathName === "/api/auth/logout" && method === "POST") {
    return authDev.logout((body && body.sessionId) || query.sessionId || "");
  }
  if (pathName === "/api/auth/me" && method === "GET") {
    return authDev.me(query.sessionId || "");
  }
  throw new Error("Unsupported auth route: " + method + " " + pathName);
}

module.exports = {
  handleAuthRoute
};
