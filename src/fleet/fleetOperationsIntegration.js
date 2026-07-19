(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("../auth/rbac.js"),
      require("./vehicleCapacityEngine.js"),
      require("./vehicleMatchingEngine.js"),
      require("./vehicleValidator.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.FleetOperationsIntegration = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.RBAC,
    root.KeetaPortal.VehicleCapacityEngine,
    root.KeetaPortal.VehicleMatchingEngine,
    root.KeetaPortal.VehicleValidator
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, RBAC, VehicleCapacityEngine, VehicleMatchingEngine, VehicleValidator) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function createFleetOperationsIntegration(options) {
    options = options || {};
    var repositories = options.repositories;
    var auditLog = options.auditLog || null;
    var rbac = options.rbac || RBAC;

    function rebuildDerivedCollections(context) {
      context = context || {};
      var vehicles = repositories.vehicles.all();
      var dashboardUsers = repositories.dashboardUsers.all();
      var movementEvents = repositories.vehicleMovementEvents ? repositories.vehicleMovementEvents.all() : [];
      var previousAssignments = repositories.vehicleAssignments ? repositories.vehicleAssignments.all() : [];
      var previousCapacityReviews = repositories.vehicleCapacityReviews ? repositories.vehicleCapacityReviews.all() : [];
      var previousIssues = repositories.vehicleComplianceIssues ? repositories.vehicleComplianceIssues.all() : [];
      var capacityReviews = VehicleCapacityEngine.buildVehicleCapacityReviews(vehicles, dashboardUsers);
      var assignments = VehicleMatchingEngine.buildVehicleAssignments(dashboardUsers, {
        vehicles: vehicles,
        vehicleMovementEvents: movementEvents
      }, {
        capacityReviews: capacityReviews
      });
      var issues = [];
      assignments.forEach(function (assignment) {
        assignment.warnings.forEach(function (warningCode) {
          issues.push(buildIssue(assignment, warningCode, false));
        });
        assignment.blockingIssues.forEach(function (issueCode) {
          issues.push(buildIssue(assignment, issueCode, true));
        });
      });
      repositories.vehicleAssignments.replaceAll(assignments);
      repositories.vehicleCapacityReviews.replaceAll(capacityReviews);
      repositories.vehicleComplianceIssues.replaceAll(issues);
      return {
        assignments: assignments,
        capacityReviews: capacityReviews,
        complianceIssues: issues
      };
    }

    function validateVehicleBeforeAssignment(dashboardUser, rider, vehicle, context) {
      context = context || {};
      if (context.user && rbac && typeof rbac.requirePermission === "function") {
        rbac.requirePermission(context.user, "operations.assign");
      }
      ensureScopedAccess(context.user, dashboardUser || vehicle || {});
      var warnings = [];
      var blockingIssues = [];
      if (!vehicle) {
        warnings.push("vehicle_not_found");
      } else {
        blockingIssues = blockingIssues.concat(VehicleValidator.buildVehicleBlockingReasons(vehicle));
        if (dashboardUser && dashboardUser.city && normalizeText(vehicle.currentCity || vehicle.city) && normalizeText(vehicle.currentCity || vehicle.city) !== normalizeText(dashboardUser.city)) {
          blockingIssues.push("cross_city_conflict");
        }
        if (dashboardUser && dashboardUser.register && normalizeText(vehicle.register || vehicle.targetedBranch) && normalizeText(vehicle.register || vehicle.targetedBranch) !== normalizeText(dashboardUser.register)) {
          blockingIssues.push("cross_register_conflict");
        }
      }
      var capacityReview = vehicle && repositories.vehicleCapacityReviews
        ? repositories.vehicleCapacityReviews.findById("vehicleCapacityReviews::" + normalizeText(vehicle.vehicleSerial).replace(/\s+/g, "_"))
        : null;
      if (capacityReview && capacityReview.reviewStatus === "full") {
        warnings.push("capacity_full");
      }
      if (capacityReview && capacityReview.reviewStatus === "over_capacity") {
        warnings.push("capacity_over_limit");
      }
      return {
        ok: !blockingIssues.length,
        warnings: warnings,
        blockingIssues: uniqueStrings(blockingIssues)
      };
    }

    function markVehicleUnderReview(payload) {
      payload = payload || {};
      ensurePermission(payload.user, "fleet.reviewIssues");
      var vehicle = repositories.vehicles.findById(payload.vehicleId);
      if (!vehicle) {
        throw new Error("Vehicle not found.");
      }
      ensureScopedAccess(payload.user, vehicle);
      var next = repositories.vehicles.upsert(mergeObjects({}, vehicle, {
        notes: normalizeText(payload.note || vehicle.notes),
        status: "under_review"
      }));
      recordAudit("vehicle_marked_under_review", "vehicles", next.id, vehicle, next, payload.user, payload.note || "", "vehicle_marked_under_review:" + String(next.id || ""));
      return next;
    }

    function excludeVehicle(payload) {
      payload = payload || {};
      ensurePermission(payload.user, "fleet.exclude");
      var vehicle = repositories.vehicles.findById(payload.vehicleId);
      if (!vehicle) {
        throw new Error("Vehicle not found.");
      }
      ensureScopedAccess(payload.user, vehicle);
      var next = repositories.vehicles.upsert(mergeObjects({}, vehicle, {
        exclusionReason: normalizeText(payload.reason || "excluded"),
        movementStatus: normalizeText(payload.reason || vehicle.movementStatus || "excluded"),
        status: "excluded"
      }));
      recordAudit("vehicle_excluded", "vehicles", next.id, vehicle, next, payload.user, payload.reason || "", "vehicle_excluded:" + String(next.id || "") + ":" + String(next.status || ""));
      return next;
    }

    function exportVehicleReport(vehicleId, user) {
      ensurePermission(user, "fleet.export");
      var vehicle = repositories.vehicles.findById(vehicleId);
      if (!vehicle) {
        throw new Error("Vehicle not found.");
      }
      ensureScopedAccess(user, vehicle);
      return vehicle;
    }

    function getVehicleMatchForDashboardUser(dashboardUserId) {
      return firstMatch(repositories.vehicleAssignments.all(), function (item) {
        return normalizeText(item.dashboardUserId) === normalizeText(dashboardUserId);
      });
    }

    function ensurePermission(user, permission) {
      if (rbac && typeof rbac.requirePermission === "function") {
        rbac.requirePermission(user, permission);
      }
    }

    function ensureScopedAccess(user, record) {
      if (!user || !record || !rbac) {
        return true;
      }
      var city = normalizeText(record.currentCity || record.city);
      var register = normalizeText(record.register || record.targetedBranch);
      if (city && typeof rbac.canAccessCity === "function" && !rbac.canAccessCity(user, city)) {
        throw new Error("City scope denied for this fleet action.");
      }
      if (register && typeof rbac.canAccessRegister === "function" && !rbac.canAccessRegister(user, register)) {
        throw new Error("Register scope denied for this fleet action.");
      }
      return true;
    }

    function recordAudit(action, entity, entityId, before, after, user, note, idempotencyKey) {
      if (!auditLog || typeof auditLog.createAuditEvent !== "function") {
        return null;
      }
      return auditLog.createAuditEvent({
        actor: user || null,
        after: after,
        before: before,
        context: {
          city: after && after.city || before && before.city || "",
          platform: after && after.platform || before && before.platform || "",
          register: after && after.register || before && before.register || ""
        },
        entityId: entityId,
        entityType: entity,
        eventType: action,
        idempotencyKey: idempotencyKey || "",
        reason: note || "",
        source: "fleet_module"
      });
    }

    return {
      excludeVehicle: excludeVehicle,
      exportVehicleReport: exportVehicleReport,
      getVehicleMatchForDashboardUser: getVehicleMatchForDashboardUser,
      markVehicleUnderReview: markVehicleUnderReview,
      rebuildDerivedCollections: rebuildDerivedCollections,
      validateVehicleBeforeAssignment: validateVehicleBeforeAssignment
    };
  }

  function buildIssue(assignment, issueCode, blocking) {
    return {
      id: "vehicleComplianceIssues::" + normalizeText(assignment.dashboardUserId).replace(/\s+/g, "_") + "::" + normalizeText(issueCode).replace(/\s+/g, "_"),
      vehicleId: assignment.vehicleId || "",
      vehicleSerial: assignment.vehicleSerial || assignment.registeredVehicleSerial || "",
      dashboardUserId: assignment.dashboardUserId || "",
      city: assignment.city || "",
      register: assignment.register || "",
      issueType: issueCode,
      severity: blocking ? "high" : "medium",
      message: issueCode.replace(/_/g, " "),
      blocking: !!blocking,
      resolved: false,
      status: "open"
    };
  }

  function firstMatch(rows, predicate) {
    for (var index = 0; index < (rows || []).length; index += 1) {
      if (predicate(rows[index])) {
        return rows[index];
      }
    }
    return null;
  }

  function uniqueStrings(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = normalizeText(value);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function diffRecords(previousRows, nextRows) {
    var previousById = indexById(previousRows);
    return (nextRows || []).reduce(function (memo, item) {
      var before = previousById[String(item && item.id || "")] || null;
      if (!before || JSON.stringify(before) !== JSON.stringify(item)) {
        memo.push({ before: before, after: item });
      }
      return memo;
    }, []);
  }

  function indexById(rows) {
    return (rows || []).reduce(function (memo, item) {
      if (item && item.id) {
        memo[String(item.id)] = item;
      }
      return memo;
    }, {});
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  return {
    createFleetOperationsIntegration: createFleetOperationsIntegration
  };
});
