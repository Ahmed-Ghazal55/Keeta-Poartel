(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./rbac.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DevSession = factory(root.KeetaPortal.RBAC);
})(typeof globalThis !== "undefined" ? globalThis : this, function (RBAC) {
  "use strict";

  var SESSION_KEY = "keeta.prompt2.dev.session";

  var DEFAULT_USERS = [
    {
      id: "user_super_admin_demo",
      username: "super.admin",
      displayName: "Super Admin Demo",
      role: "super_admin",
      cityScope: "all",
      selectedCities: ["جدة", "الرياض"],
      registerScope: "all",
      selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
      permissions: []
    },
    {
      id: "user_ops_jeddah",
      username: "ops.jeddah",
      displayName: "مشرف عمليات جدة",
      role: "city_supervisor",
      cityScope: "single",
      selectedCities: ["جدة"],
      registerScope: "multi",
      selectedRegisters: ["EXPRESS", "ALBAWABA"],
      permissions: []
    },
    {
      id: "user_ops_riyadh",
      username: "ops.riyadh",
      displayName: "مشرف عمليات الرياض",
      role: "city_supervisor",
      cityScope: "single",
      selectedCities: ["الرياض"],
      registerScope: "multi",
      selectedRegisters: ["EXPRESS", "TOGARY"],
      permissions: []
    },
    {
      id: "user_finance_demo",
      username: "finance.demo",
      displayName: "مسؤول المالية",
      role: "finance_officer",
      cityScope: "all",
      selectedCities: ["جدة", "الرياض"],
      registerScope: "all",
      selectedRegisters: ["EXPRESS", "ALBAWABA", "TOGARY", "PER_ORDER_FR3PL"],
      permissions: []
    },
    {
      id: "user_viewer_demo",
      username: "viewer.demo",
      displayName: "مستخدم عرض فقط",
      role: "viewer",
      cityScope: "single",
      selectedCities: ["جدة"],
      registerScope: "single",
      selectedRegisters: ["EXPRESS"],
      permissions: []
    }
  ];

  function createDevSessionManager(options) {
    var dataStore = options.dataStore;
    var defaultUsers = options.defaultUsers || DEFAULT_USERS;
    var defaultRoles = options.defaultRoles || RBAC.DEFAULT_ROLES;
    var storage = resolveStorage();
    var listeners = [];
    var currentUser = null;

    function notify() {
      listeners.slice().forEach(function (listener) {
        try {
          listener(currentUser);
        } catch (_error) {
          // Ignore subscriber errors.
        }
      });
    }

    function readSessionId() {
      try {
        return storage ? storage.getItem(SESSION_KEY) : null;
      } catch (_error) {
        return null;
      }
    }

    function writeSessionId(sessionId) {
      try {
        if (storage) {
          if (sessionId) {
            storage.setItem(SESSION_KEY, sessionId);
          } else {
            storage.removeItem(SESSION_KEY);
          }
        }
      } catch (_error) {
        // Ignore local storage write failures.
      }
    }

    function ensureSeedData() {
      if (!dataStore.getAll("roles").length) {
        dataStore.save("roles", defaultRoles.map(function (role) {
          return {
            id: role.id,
            name: role.name,
            permissionCount: role.permissions.length,
            status: "active"
          };
        }));
      }
      if (!dataStore.getAll("permissions").length) {
        dataStore.save("permissions", RBAC.DEFAULT_PERMISSIONS.map(function (permission) {
          return {
            id: permission,
            name: permission,
            category: permission.split(".")[0],
            status: "active"
          };
        }));
      }
      if (!dataStore.getAll("users").length) {
        dataStore.save("users", defaultUsers);
      }
      if (!dataStore.getAll("sessions").length) {
        dataStore.save("sessions", []);
      }
    }

    function findUser(userId) {
      return dataStore.findById("users", userId);
    }

    function getUsers() {
      return dataStore.getAll("users");
    }

    function getCurrentUser() {
      return currentUser;
    }

    function getScopeSummary(user) {
      if (!user) {
        return {
          cities: "بدون جلسة",
          registers: "بدون جلسة",
          roleLabel: "Guest"
        };
      }
      return {
        cities: user.cityScope === "all" ? "كل المدن" : (user.selectedCities || []).join("، "),
        registers: user.registerScope === "all" ? "كل السجلات" : (user.selectedRegisters || []).join("، "),
        roleLabel: (RBAC.getRoleDefinition(user.role) || { name: user.role }).name
      };
    }

    function loginAs(userId, options) {
      options = options || {};
      var user = findUser(userId);
      if (!user) {
        throw new Error("Unknown dev user: " + userId);
      }
      var session = dataStore.upsert("sessions", {
        id: "session_" + Date.now().toString(36),
        sessionType: "dev",
        status: "active",
        userId: user.id
      });
      currentUser = user;
      writeSessionId(session.id);
      notify();
      return user;
    }

    function logout(options) {
      options = options || {};
      var sessionId = readSessionId();
      var previousUser = currentUser;
      if (sessionId) {
        var session = dataStore.findById("sessions", sessionId);
        if (session) {
          dataStore.upsert("sessions", mergeObjects({}, session, { status: "logged_out" }));
        }
      }
      writeSessionId(null);
      currentUser = null;
      notify();
      return null;
    }

    function restoreSession() {
      ensureSeedData();
      var sessionId = readSessionId();
      if (!sessionId) {
        return loginAs(defaultUsers[0].id, { silent: true });
      }
      var session = dataStore.findById("sessions", sessionId);
      if (!session || session.status !== "active") {
        return loginAs(defaultUsers[0].id, { silent: true });
      }
      currentUser = findUser(session.userId) || null;
      if (!currentUser) {
        return loginAs(defaultUsers[0].id, { silent: true });
      }
      notify();
      return currentUser;
    }

    function subscribe(listener) {
      if (typeof listener === "function") {
        listeners.push(listener);
      }
      return function () {
        listeners = listeners.filter(function (item) {
          return item !== listener;
        });
      };
    }

    return {
      ensureSeedData: ensureSeedData,
      getCurrentUser: getCurrentUser,
      getScopeSummary: getScopeSummary,
      getUsers: getUsers,
      loginAs: loginAs,
      logout: logout,
      restoreSession: restoreSession,
      storageKey: SESSION_KEY,
      subscribe: subscribe
    };
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  function resolveStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage;
      }
    } catch (_error) {
      return null;
    }
    return null;
  }

  return {
    DEFAULT_USERS: DEFAULT_USERS,
    SESSION_KEY: SESSION_KEY,
    createDevSessionManager: createDevSessionManager
  };
});
