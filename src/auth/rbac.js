(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.RBAC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DEFAULT_PERMISSIONS = [
    "dashboard.view",
    "imports.create",
    "imports.review",
    "imports.save",
    "imports.reject",
    "operations.view",
    "operations.assign",
    "operations.swap",
    "operations.terminate",
    "operations.editStatus",
    "performance.view",
    "performance.recalculate",
    "performance.export",
    "performance.reviewIssues",
    "hr.view",
    "hr.edit",
    "hr.import",
    "hr.reviewConflicts",
    "fleet.view",
    "fleet.import",
    "fleet.assign",
    "fleet.edit",
    "fleet.exclude",
    "fleet.reviewIssues",
    "fleet.export",
    "fleetMovement.view",
    "fleetMovement.edit",
    "shifts.view",
    "shifts.generate",
    "shifts.export",
    "monthlyClosing.view",
    "monthlyClosing.analyze",
    "monthlyClosing.buildSettlement",
    "monthlyClosing.closeMonth",
    "monthlyClosing.reopenMonth",
    "monthlyRules.view",
    "monthlyRules.create",
    "monthlyRules.edit",
    "monthlyRules.activate",
    "monthlyRules.lock",
    "monthlyRules.unlock",
    "monthlyRules.archive",
    "monthlyRules.export",
    "monthlyRules.import",
    "reports.export",
    "settings.manage",
    "archive.view",
    "audit.view"
  ];

  var DEFAULT_ROLES = [
    { id: "super_admin", name: "Super Admin", permissions: ["*"] },
    { id: "operations_admin", name: "Operations Admin", permissions: ["dashboard.view", "imports.create", "imports.review", "imports.save", "imports.reject", "operations.view", "operations.assign", "operations.swap", "operations.terminate", "operations.editStatus", "performance.view", "performance.recalculate", "performance.export", "performance.reviewIssues", "hr.view", "fleet.view", "fleet.assign", "fleet.export", "fleetMovement.view", "archive.view", "monthlyRules.view", "monthlyRules.create", "monthlyRules.edit", "monthlyRules.export", "monthlyRules.import", "reports.export", "audit.view"] },
    { id: "city_supervisor", name: "City Supervisor", permissions: ["dashboard.view", "imports.create", "imports.review", "imports.save", "imports.reject", "operations.view", "operations.assign", "operations.swap", "operations.terminate", "operations.editStatus", "performance.view", "performance.recalculate", "performance.export", "performance.reviewIssues", "hr.view", "fleet.view", "fleet.assign", "fleetMovement.view", "archive.view", "shifts.view", "monthlyRules.view", "monthlyRules.create", "monthlyRules.edit", "monthlyRules.activate", "monthlyRules.export", "audit.view"] },
    { id: "hr_officer", name: "HR Officer", permissions: ["dashboard.view", "imports.create", "imports.review", "imports.save", "imports.reject", "hr.view", "hr.edit", "hr.import", "hr.reviewConflicts", "archive.view", "operations.view", "audit.view"] },
    { id: "fleet_officer", name: "Fleet Officer", permissions: ["dashboard.view", "imports.create", "imports.review", "imports.save", "imports.reject", "fleet.view", "fleet.import", "fleet.assign", "fleet.edit", "fleet.exclude", "fleet.reviewIssues", "fleet.export", "fleetMovement.view", "fleetMovement.edit", "operations.view", "audit.view"] },
    { id: "finance_officer", name: "Finance Officer", permissions: ["dashboard.view", "imports.create", "imports.review", "imports.save", "imports.reject", "performance.view", "performance.export", "monthlyClosing.view", "monthlyClosing.analyze", "monthlyClosing.buildSettlement", "monthlyClosing.closeMonth", "monthlyClosing.reopenMonth", "monthlyRules.view", "monthlyRules.export", "reports.export", "archive.view", "audit.view"] },
    { id: "viewer", name: "Viewer", permissions: ["dashboard.view", "operations.view", "performance.view", "fleet.view", "fleetMovement.view", "hr.view", "monthlyRules.view", "archive.view"] }
  ];

  function canAccessCity(user, city) {
    if (!user || !city) {
      return false;
    }
    if (user.cityScope === "all") {
      return true;
    }
    return normalizeList(user.selectedCities).indexOf(city) >= 0;
  }

  function canAccessRegister(user, registerCode) {
    if (!user || !registerCode) {
      return false;
    }
    if (user.registerScope === "all") {
      return true;
    }
    return normalizeList(user.selectedRegisters).indexOf(registerCode) >= 0;
  }

  function canPerform(user, permission) {
    if (!user || !permission) {
      return false;
    }
    var effectivePermissions = resolveUserPermissions(user);
    return effectivePermissions.indexOf("*") >= 0 || effectivePermissions.indexOf(permission) >= 0;
  }

  function clampOrganizationContextForUser(user, organizationContext, registerMapper) {
    var context = shallowCopy(organizationContext || {});
    if (!user) {
      return context;
    }
    var allowedCities = user.cityScope === "all" ? (context.selectedCities || []) : normalizeList(user.selectedCities);
    var allowedRegisters = user.registerScope === "all" ? (context.selectedRegisters || []) : normalizeList(user.selectedRegisters);

    context.selectedCities = user.cityScope === "all"
      ? normalizeList(context.selectedCities)
      : normalizeList(context.selectedCities).filter(function (city) { return allowedCities.indexOf(city) >= 0; });
    context.selectedRegisters = user.registerScope === "all"
      ? normalizeList(context.selectedRegisters)
      : normalizeList(context.selectedRegisters).filter(function (registerCode) { return allowedRegisters.indexOf(registerCode) >= 0; });
    context.selectedDashboards = normalizeList(context.selectedDashboards).filter(function (registerCode) {
      return !context.selectedRegisters.length || context.selectedRegisters.indexOf(registerCode) >= 0;
    });

    if (!context.selectedCities.length && allowedCities.length) {
      context.selectedCities = allowedCities.slice();
    }
    if (!context.selectedRegisters.length && allowedRegisters.length) {
      context.selectedRegisters = allowedRegisters.slice();
    }
    if (!context.selectedDashboards.length) {
      context.selectedDashboards = context.selectedRegisters.slice();
    }
    context.cityScope = deriveScope(context.selectedCities.length, allowedCities.length || context.selectedCities.length);
    context.registerScope = deriveScope(context.selectedRegisters.length, allowedRegisters.length || context.selectedRegisters.length);
    if (registerMapper && typeof registerMapper === "function" && normalizeList(user.selectedRegisters).length) {
      context.selectedRegisters = context.selectedRegisters.filter(function (registerCode) {
        return registerMapper(registerCode);
      });
    }
    return context;
  }

  function createAuditEvent(action, entity, entityId, before, after, user, extra) {
    extra = extra || {};
    return {
      id: "audit_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      userId: user && user.id ? user.id : "",
      action: action,
      entity: entity,
      entityId: entityId,
      city: extra.city || (after && after.city) || (before && before.city) || "",
      register: extra.register || (after && after.register) || (before && before.register) || "",
      before: before == null ? null : before,
      after: after == null ? null : after,
      source: extra.source || "rbac",
      note: extra.note || ""
    };
  }

  function deriveScope(selectedCount, totalCount) {
    if (!selectedCount || selectedCount >= totalCount) {
      return "all";
    }
    return selectedCount === 1 ? "single" : "multi";
  }

  function filterRowsByUserScope(user, rows, options) {
    options = options || {};
    var cityField = options.cityField || "city";
    var registerField = options.registerField || "register";
    var registerMatcher = typeof options.registerMatcher === "function" ? options.registerMatcher : null;
    return (rows || []).filter(function (row) {
      var cityAllowed = !row || !row[cityField] || canAccessCity(user, row[cityField]);
      var registerAllowed = !row || !row[registerField] || (
        registerMatcher
          ? registerMatcher(user, row[registerField], row)
          : canAccessRegister(user, row[registerField])
      );
      return cityAllowed && registerAllowed;
    });
  }

  function getRoleDefinition(roleId) {
    return DEFAULT_ROLES.filter(function (item) {
      return item.id === roleId;
    })[0] || null;
  }

  function normalizeList(values) {
    var seen = {};
    return (values || []).filter(function (item) {
      var key = String(item == null ? "" : item).trim();
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function requirePermission(user, permission) {
    if (!canPerform(user, permission)) {
      throw new Error("Permission denied: " + permission);
    }
    return true;
  }

  function resolveUserPermissions(user) {
    var roleDefinition = getRoleDefinition(user && user.role);
    var rolePermissions = roleDefinition ? roleDefinition.permissions : [];
    return normalizeList(rolePermissions.concat(user && user.permissions ? user.permissions : []));
  }

  function shallowCopy(source) {
    var target = {};
    Object.keys(source || {}).forEach(function (key) {
      target[key] = source[key];
    });
    return target;
  }

  return {
    DEFAULT_PERMISSIONS: DEFAULT_PERMISSIONS,
    DEFAULT_ROLES: DEFAULT_ROLES,
    canAccessCity: canAccessCity,
    canAccessRegister: canAccessRegister,
    canPerform: canPerform,
    clampOrganizationContextForUser: clampOrganizationContextForUser,
    createAuditEvent: createAuditEvent,
    filterRowsByUserScope: filterRowsByUserScope,
    getRoleDefinition: getRoleDefinition,
    requirePermission: requirePermission,
    resolveUserPermissions: resolveUserPermissions
  };
});
