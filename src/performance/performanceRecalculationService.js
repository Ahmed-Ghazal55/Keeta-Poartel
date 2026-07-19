(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../auth/rbac.js"),
      require("../import/importTypes.js"),
      require("./performanceCommon.js"),
      require("./performanceRuleResolver.js"),
      require("./dailyPerformanceEngine.js"),
      require("./faceVerificationAdapter.js"),
      require("./vdaAdapter.js"),
      require("./deliveryExperienceAdapter.js"),
      require("./monthlyValidityEngine.js"),
      require("../operations/assignmentPeriodResolver.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.PerformanceRecalculationService = factory(
    root.KeetaPortal.RBAC,
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.PerformanceCommon,
    root.KeetaPortal.PerformanceRuleResolver,
    root.KeetaPortal.DailyPerformanceEngine,
    root.KeetaPortal.FaceVerificationAdapter,
    root.KeetaPortal.VdaAdapter,
    root.KeetaPortal.DeliveryExperienceAdapter,
    root.KeetaPortal.MonthlyValidityEngine,
    root.KeetaPortal.AssignmentPeriodResolver
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  RBAC,
  ImportTypes,
  Common,
  RuleResolver,
  DailyPerformanceEngine,
  FaceVerificationAdapter,
  VdaAdapter,
  DeliveryExperienceAdapter,
  MonthlyValidityEngine,
  AssignmentPeriodResolver
) {
  "use strict";

  function createPerformanceRecalculationService(options) {
    options = options || {};
    var dataStore = options.dataStore;
    var auditLog = options.auditLog || null;
    var monthlyRulesService = options.monthlyRulesService || null;
    var rbac = options.rbac || RBAC;

    function normalizeScope(scope) {
      scope = scope || {};
      return {
        city: Common.normalizeText(scope.city),
        month: Common.monthKey(scope.month || scope.date || ""),
        platform: Common.normalizePlatform(scope.platform || "keeta"),
        register: Common.normalizeRegisterCode(scope.register)
      };
    }

    function matchesScope(row, scope) {
      if (!row) {
        return false;
      }
      if (scope.month && Common.monthKey(row.month || row.date || row.dateKey) !== scope.month) {
        return false;
      }
      if (scope.city && Common.normalizeText(row.city) !== scope.city) {
        return false;
      }
      if (scope.register) {
        var left = Common.normalizeRegisterCode(row.register);
        var right = Common.normalizeRegisterCode(scope.register);
        if (left !== right && !(ImportTypes && ImportTypes.matchUserRegisterScope && (ImportTypes.matchUserRegisterScope(left, right) || ImportTypes.matchUserRegisterScope(right, left)))) {
          return false;
        }
      }
      if (scope.platform && Common.normalizePlatform(row.platform || "keeta") !== scope.platform) {
        return false;
      }
      return true;
    }

    function buildMonthlyKey(row) {
      return Common.stableId("monthlyScope", [
        Common.firstNonEmpty(row && row.register, "unknown"),
        Common.firstNonEmpty(row && row.riderId, row && row.userId, row && row.dashboardUserId, row && row.iqama, "unknown"),
        Common.firstNonEmpty(row && row.month, Common.monthKey(row && (row.date || row && row.dateKey)), "unknown")
      ]);
    }

    function buildMonthlyMatcher(target) {
      var riderId = Common.normalizeText(target.riderId);
      var userId = Common.normalizeText(target.userId || target.dashboardUserId);
      var iqama = Common.normalizeText(target.iqama);
      return function (row) {
        if (!matchesScope(row, target)) {
          return false;
        }
        return Common.normalizeText(row.riderId) === riderId ||
          Common.normalizeText(row.userId || row.dashboardUserId) === userId ||
          (iqama && Common.normalizeText(row.iqama) === iqama);
      };
    }

    function buildLinkedCollections() {
      var dashboardUsers = dataStore.getAll("dashboardUsers");
      var riders = dataStore.getAll("riders");
      var assignments = dataStore.getAll("assignments");
      return {
        activeAssignmentsByDashboardUserId: assignments.reduce(function (memo, item) {
          if (Common.normalizeText(item.status) === "active") {
            memo[Common.normalizeText(item.dashboardUserId)] = item;
          }
          return memo;
        }, {}),
        assignments: assignments.slice(),
        dashboardUsersById: dashboardUsers.reduce(function (memo, item) {
          memo[Common.normalizeText(item.dashboardUserId || item.userId)] = item;
          return memo;
        }, {}),
        deliveryExperience: dataStore.getAll("deliveryExperience"),
        faceVerification: dataStore.getAll("faceVerification"),
        monthlyRulesService: monthlyRulesService,
        ridersById: riders.reduce(function (memo, item) {
          memo[Common.normalizeText(item.id)] = item;
          return memo;
        }, {}),
        ridersByIqama: riders.reduce(function (memo, item) {
          memo[Common.normalizeText(item.primaryIqama)] = item;
          return memo;
        }, {}),
        vdaResults: dataStore.getAll("vdaResults")
      };
    }

    function enrichDailyRow(row, scope, linkedCollections) {
      var dashboardUserKey = Common.normalizeText(Common.firstNonEmpty(row.dashboardUserId, row.userId));
      var dashboardUser = linkedCollections.dashboardUsersById[dashboardUserKey] || null;
      var assignment = AssignmentPeriodResolver && typeof AssignmentPeriodResolver.resolveAssignmentForRow === "function"
        ? AssignmentPeriodResolver.resolveAssignmentForRow(linkedCollections.assignments, row, {
            city: Common.firstNonEmpty(row.city, dashboardUser && dashboardUser.city, scope.city),
            dashboardUserId: dashboardUserKey,
            date: row.date || row.dateKey || "",
            platform: Common.firstNonEmpty(row.platform, dashboardUser && dashboardUser.platform, scope.platform),
            register: Common.firstNonEmpty(row.register, dashboardUser && dashboardUser.register, scope.register)
          })
        : null;
      var assignmentFallbackUsed = false;
      if (!assignment) {
        assignment = linkedCollections.activeAssignmentsByDashboardUserId[dashboardUserKey] || null;
        assignmentFallbackUsed = !!assignment;
      }
      var rider = row.riderId
        ? linkedCollections.ridersById[Common.normalizeText(row.riderId)] || null
        : null;
      if (!rider && row.iqama) {
        rider = linkedCollections.ridersByIqama[Common.normalizeText(row.iqama)] || null;
      }
      if (!rider && assignment && assignment.riderId) {
        rider = linkedCollections.ridersById[Common.normalizeText(assignment.riderId)] || null;
      }
      if (!rider && assignment && assignment.actualRiderIqama) {
        rider = linkedCollections.ridersByIqama[Common.normalizeText(assignment.actualRiderIqama)] || null;
      }
      if (!rider && dashboardUser && dashboardUser.currentRiderId) {
        rider = linkedCollections.ridersById[Common.normalizeText(dashboardUser.currentRiderId)] || null;
      }
      var resolvedIqama = Common.normalizeText(Common.firstNonEmpty(
        assignment && assignment.actualRiderIqama,
        assignment && assignment.riderIqama,
        row.iqama,
        rider && rider.primaryIqama,
        dashboardUser && dashboardUser.currentRiderIqama,
        dashboardUser && dashboardUser.ownerIqama
      ));
      var resolvedRiderId = Common.normalizeText(Common.firstNonEmpty(
        row.riderId,
        rider && rider.id,
        assignment && assignment.riderId,
        dashboardUser && dashboardUser.currentRiderId,
        resolvedIqama ? "rider::" + resolvedIqama : ""
      ));
      return Common.mergeObjects({}, row, {
        assignmentFallbackUsed: assignmentFallbackUsed,
        assignmentLinkStatus: assignment
          ? (assignmentFallbackUsed ? "fallback_active_assignment" : "assignment_period_match")
          : "unresolved",
        actualRiderIqama: resolvedIqama,
        city: Common.normalizeText(Common.firstNonEmpty(row.city, dashboardUser && dashboardUser.city, rider && rider.city, scope.city)),
        dashboardUserId: Common.normalizeText(Common.firstNonEmpty(row.dashboardUserId, dashboardUser && dashboardUser.dashboardUserId, row.userId)),
        iqama: resolvedIqama,
        platform: Common.normalizePlatform(Common.firstNonEmpty(row.platform, dashboardUser && dashboardUser.platform, scope.platform, "keeta")),
        register: Common.normalizeRegisterCode(Common.firstNonEmpty(row.register, dashboardUser && dashboardUser.register, rider && rider.register, scope.register)),
        riderId: resolvedRiderId,
        riderSource: Common.normalizeText(Common.firstNonEmpty(
          row.riderSource,
          assignment && assignment.riderSource,
          rider && rider.employmentType === "external" ? "External" : "",
          resolvedIqama ? "Unknown" : ""
        )),
        userId: Common.normalizeText(Common.firstNonEmpty(row.userId, dashboardUser && dashboardUser.userId, row.dashboardUserId, row.riderId)),
        vehicleType: Common.normalizeVehicleType(Common.firstNonEmpty(row.vehicleType, dashboardUser && dashboardUser.vehicleType)),
        workMode: Common.normalizeWorkMode(Common.firstNonEmpty(row.workMode, dashboardUser && dashboardUser.workMode), Common.firstNonEmpty(row.register, dashboardUser && dashboardUser.register, scope.register))
      });
    }

    function canAccessRegister(user, register) {
      if (!register) {
        return true;
      }
      if (user.registerScope === "all") {
        return true;
      }
      return (user.selectedRegisters || []).some(function (code) {
        return ImportTypes.matchUserRegisterScope(code, register) || ImportTypes.matchUserRegisterScope(register, code);
      });
    }

    function canViewRow(user, row) {
      if (!user) {
        return true;
      }
      if (row.city && typeof rbac.canAccessCity === "function" && !rbac.canAccessCity(user, row.city)) {
        return false;
      }
      if (row.register && !canAccessRegister(user, row.register)) {
        return false;
      }
      return true;
    }

    function ensureRecalculatePermission(user, scope) {
      if (!user) {
        return true;
      }
      if (!rbac.canPerform(user, "performance.recalculate")) {
        throw new Error("Permission denied: performance.recalculate");
      }
      if (scope.city && typeof rbac.canAccessCity === "function" && !rbac.canAccessCity(user, scope.city)) {
        throw new Error("Performance scope city is outside the current user scope.");
      }
      if (scope.register && !canAccessRegister(user, scope.register)) {
        throw new Error("Performance scope register is outside the current user scope.");
      }
      return true;
    }

    function recordFinalizationAudit(summary, user, scope, options) {
      options = options || {};
      if (!options.auditFinalization || !auditLog || typeof auditLog.createAuditEvent !== "function") {
        return;
      }
      var calculationRunId = options.calculationRunId || buildCalculationRunId(scope);
      auditLog.createAuditEvent({
        actor: user || null,
        after: summary,
        before: null,
        context: {
          city: scope && scope.city ? scope.city : "",
          month: scope && scope.month ? scope.month : "",
          page: options.page || "",
          platform: scope && scope.platform ? scope.platform : "",
          register: scope && scope.register ? scope.register : "",
          subPage: options.subPage || ""
        },
        entityId: calculationRunId,
        entityType: "validityResults",
        eventType: "performance_calculation_finalized",
        idempotencyKey: "performance_calculation_finalized:" + calculationRunId,
        operationId: calculationRunId,
        reason: options.reason || "Performance recalculation finalized.",
        source: options.source || "performance_validity_engine"
      });
    }

    function mergeCollectionRows(collection, rows) {
      var changed = 0;
      (rows || []).forEach(function (row) {
        var index = collection.findIndex(function (item) {
          return String(item.id) === String(row.id);
        });
        if (index >= 0) {
          if (JSON.stringify(collection[index]) !== JSON.stringify(row)) {
            collection[index] = Common.mergeObjects({}, collection[index], row);
            changed += 1;
          }
          return;
        }
        collection.push(row);
        changed += 1;
      });
      return changed;
    }

    function applyMonthlySave(collection, record, summary, user, scope) {
      var index = collection.findIndex(function (item) {
        return String(item.id) === String(record.id);
      });
      var before = index >= 0 ? Common.clone(collection[index]) : null;
      if (index >= 0) {
        collection[index] = Common.mergeObjects({}, collection[index], record);
      } else {
        collection.push(record);
      }
      summary.monthlyRowsCalculated += 1;
    }

    function applyValiditySave(collection, record, summary, user, scope) {
      var index = collection.findIndex(function (item) {
        return String(item.id) === String(record.id);
      });
      var before = index >= 0 ? Common.clone(collection[index]) : null;
      if (index >= 0) {
        collection[index] = Common.mergeObjects({}, collection[index], record);
        summary.resultsUpdated += 1;
      } else {
        collection.push(record);
        summary.resultsCreated += 1;
      }
    }

    function applyIssueSave(collection, issues, summary, user, scope, activeIssueIds) {
      (issues || []).forEach(function (issue) {
        activeIssueIds[issue.id] = true;
        var index = collection.findIndex(function (item) {
          return String(item.id) === String(issue.id);
        });
        var before = index >= 0 ? Common.clone(collection[index]) : null;
        if (index >= 0) {
          collection[index] = Common.mergeObjects({}, collection[index], issue, {
            resolved: false,
            resolvedAt: "",
            resolvedBy: ""
          });
        } else {
          collection.push(issue);
          summary.issuesCreated += 1;
        }
      });
    }

    function resolveStaleIssues(collection, scope, activeIssueIds, user) {
      var resolvedCount = 0;
      (collection || []).forEach(function (issue) {
        if (!matchesScope(issue, scope) || issue.resolved || activeIssueIds[issue.id]) {
          return;
        }
        issue.resolved = true;
        issue.resolvedAt = new Date().toISOString();
        issue.resolvedBy = user && user.id ? user.id : "system";
        resolvedCount += 1;
      });
      return resolvedCount;
    }

    function buildDependencies(monthlyPerformance, linkedCollections, rules) {
      var matcher = buildMonthlyMatcher(monthlyPerformance);
      return {
        complianceResult: null,
        deliveryExperienceResult: DeliveryExperienceAdapter.evaluateDeliveryExperience(
          linkedCollections.deliveryExperience.filter(matcher),
          rules,
          {
            riderId: monthlyPerformance.riderId,
            userId: monthlyPerformance.userId,
            vehicleType: monthlyPerformance.vehicleType
          }
        ),
        faceVerificationResult: FaceVerificationAdapter.evaluateFaceVerification(
          linkedCollections.faceVerification.filter(matcher),
          rules,
          {
            expectedTriggeredDays: (monthlyPerformance.validDaysCount || 0) + (monthlyPerformance.invalidDaysCount || 0) + (monthlyPerformance.noDataDaysCount || 0)
          }
        ),
        missingRiderLink: Common.normalizeText(monthlyPerformance.riderId) === "" &&
          Common.normalizeText(monthlyPerformance.iqama) === "" &&
          Common.normalizeText(monthlyPerformance.dashboardUserId) !== "",
        riderProfile: linkedCollections.ridersById[monthlyPerformance.riderId] || linkedCollections.ridersByIqama[monthlyPerformance.iqama] || null,
        vdaResult: VdaAdapter.evaluateVdaResult(linkedCollections.vdaResults.filter(matcher), rules, {
          reportDate: monthlyPerformance.month ? monthlyPerformance.month + "-28" : new Date()
        })
      };
    }

    function resolveRulesForRow(row) {
      return RuleResolver.resolvePerformanceRules({
        city: row.city,
        date: row.date || (row.month ? row.month + "-01" : ""),
        globalContext: {
          cityScope: row.city ? "single" : "all",
          platform: row.platform,
          registerScope: row.register ? "single" : "all",
          selectedCities: row.city ? [row.city] : [],
          selectedRegisters: row.register ? [row.register] : []
        },
        month: row.month,
        monthlyRulesService: monthlyRulesService,
        platform: row.platform,
        register: row.register,
        vehicleType: row.vehicleType
      });
    }

    function processMonthlyGroup(rows, scope, linkedCollections, monthlyCollection, validityCollection, issuesCollection, activeIssueIds, summary, user) {
      var firstRow = rows[0] || {};
      var rules = resolveRulesForRow(firstRow);
      var calculatedRows = rows.map(function (row) {
        return DailyPerformanceEngine.calculateDailyPerformance(row, rules);
      });
      var monthlyPerformance = MonthlyValidityEngine.calculateMonthlyPerformance(calculatedRows, firstRow, rules);
      var dependencies = buildDependencies(monthlyPerformance, linkedCollections, rules);
      monthlyPerformance.faceStatus = dependencies.faceVerificationResult ? dependencies.faceVerificationResult.status : "no_data";
      monthlyPerformance.vdaStatus = dependencies.vdaResult ? dependencies.vdaResult.status : "no_data";
      monthlyPerformance.deliveryExperienceStatus = dependencies.deliveryExperienceResult ? dependencies.deliveryExperienceResult.status : "no_data";
      monthlyPerformance.complianceStatus = dependencies.complianceResult ? dependencies.complianceResult.status : "";
      var validityResult = MonthlyValidityEngine.calculateValidityResult(monthlyPerformance, dependencies, rules);
      monthlyPerformance.validityStatus = validityResult.status;
      monthlyPerformance.salaryEligibilityStatus = validityResult.salaryEligibilityStatus;
      monthlyPerformance.incentiveEligibilityStatus = validityResult.incentiveEligibilityStatus;
      monthlyPerformance.reasons = validityResult.reasons.slice();
      monthlyPerformance.warnings = validityResult.nonBlockingWarnings.slice();
      applyMonthlySave(monthlyCollection, monthlyPerformance, summary, user, scope);
      applyValiditySave(validityCollection, validityResult, summary, user, scope);
      applyIssueSave(issuesCollection, MonthlyValidityEngine.buildPerformanceIssues(monthlyPerformance, validityResult, dependencies), summary, user, scope, activeIssueIds);
      if (rules.fallbackUsed) {
        summary.fallbackUsedCount += 1;
      }
    }

    function processMonthlyBaseline(row, scope, linkedCollections, monthlyCollection, validityCollection, issuesCollection, activeIssueIds, summary, user) {
      var rules = resolveRulesForRow(row);
      var monthlyPerformance = Common.mergeObjects({}, row, {
        totalCompletedOrders: Common.parseNumber(Common.firstNonEmpty(row.totalCompletedOrders, row.totalOrders, row.deliveredTasks), 0),
        totalOrders: Common.parseNumber(Common.firstNonEmpty(row.totalOrders, row.totalCompletedOrders, row.deliveredTasks), 0),
        validDaysCount: Common.parseNumber(row.validDaysCount, 0),
        invalidDaysCount: Common.parseNumber(row.invalidDaysCount, 0),
        noDataDaysCount: Common.parseNumber(row.noDataDaysCount, 0),
        fallbackUsed: !!rules.fallbackUsed,
        appliedRuleId: rules.appliedRuleId,
        appliedRuleVersion: rules.appliedRuleVersion,
        calculatedAt: new Date().toISOString(),
        dailyRows: [],
        mandatorySummary: { allowedMissed: 0, met: true, missed: 0, noData: 0, required: 0, total: 0, valid: 0, warnings: [] },
        projectionSummary: MonthlyValidityEngine.buildProjection(row, rules, new Date().toISOString().slice(0, 10))
      });
      var dependencies = buildDependencies(monthlyPerformance, linkedCollections, rules);
      monthlyPerformance.faceStatus = dependencies.faceVerificationResult ? dependencies.faceVerificationResult.status : "no_data";
      monthlyPerformance.vdaStatus = dependencies.vdaResult ? dependencies.vdaResult.status : "no_data";
      monthlyPerformance.deliveryExperienceStatus = dependencies.deliveryExperienceResult ? dependencies.deliveryExperienceResult.status : "no_data";
      monthlyPerformance.complianceStatus = dependencies.complianceResult ? dependencies.complianceResult.status : "";
      var validityResult = MonthlyValidityEngine.calculateValidityResult(monthlyPerformance, dependencies, rules);
      monthlyPerformance.validityStatus = validityResult.status;
      monthlyPerformance.salaryEligibilityStatus = validityResult.salaryEligibilityStatus;
      monthlyPerformance.incentiveEligibilityStatus = validityResult.incentiveEligibilityStatus;
      monthlyPerformance.reasons = validityResult.reasons.slice();
      monthlyPerformance.warnings = validityResult.nonBlockingWarnings.slice();
      applyMonthlySave(monthlyCollection, monthlyPerformance, summary, user, scope);
      applyValiditySave(validityCollection, validityResult, summary, user, scope);
      applyIssueSave(issuesCollection, MonthlyValidityEngine.buildPerformanceIssues(monthlyPerformance, validityResult, dependencies), summary, user, scope, activeIssueIds);
      if (rules.fallbackUsed) {
        summary.fallbackUsedCount += 1;
      }
    }

    function runPerformanceRecalculationForScope(scope, user, options) {
      options = options || {};
      var normalizedScope = normalizeScope(scope);
      ensureRecalculatePermission(user, normalizedScope);

      var dailyCollection = dataStore.getAll("performanceDaily");
      var monthlyCollection = dataStore.getAll("performanceMonthly");
      var validityCollection = dataStore.getAll("validityResults");
      var issuesCollection = dataStore.getAll("performanceIssues");
      var linkedCollections = buildLinkedCollections();
      var targetDailyRows = dailyCollection.filter(function (row) {
        return matchesScope(row, normalizedScope);
      });

      var enrichedDaily = targetDailyRows.map(function (row) {
        return enrichDailyRow(row, normalizedScope, linkedCollections);
      });
      var changedDailyCount = mergeCollectionRows(dailyCollection, enrichedDaily);
      if (changedDailyCount > 0) {
        dataStore.save("performanceDaily", dailyCollection);
      }

      var groupedDaily = Common.groupBy(enrichedDaily, function (row) {
        return buildMonthlyKey(row);
      });
      var processedKeys = {};
      var activeIssueIds = {};
      var summary = {
        dailyRowsProcessed: enrichedDaily.length,
        fallbackUsedCount: 0,
        issuesCreated: 0,
        issuesResolved: 0,
        monthlyRowsCalculated: 0,
        resultsCreated: 0,
        resultsUpdated: 0,
        scope: normalizedScope
      };

      Object.keys(groupedDaily).filter(Boolean).forEach(function (groupKey) {
        processedKeys[groupKey] = true;
        processMonthlyGroup(groupedDaily[groupKey], normalizedScope, linkedCollections, monthlyCollection, validityCollection, issuesCollection, activeIssueIds, summary, user);
      });

      monthlyCollection.filter(function (row) {
        return matchesScope(row, normalizedScope);
      }).filter(function (row) {
        return !processedKeys[buildMonthlyKey(row)];
      }).forEach(function (row) {
        processMonthlyBaseline(row, normalizedScope, linkedCollections, monthlyCollection, validityCollection, issuesCollection, activeIssueIds, summary, user);
      });

      summary.issuesResolved = resolveStaleIssues(issuesCollection, normalizedScope, activeIssueIds, user);
      dataStore.save("performanceMonthly", monthlyCollection);
      dataStore.save("validityResults", validityCollection);
      dataStore.save("performanceIssues", issuesCollection);
      recordFinalizationAudit(summary, user, normalizedScope, options);
      return summary;
    }

    function filterScopedRows(rows, filters, user, organizationContext) {
      filters = filters || {};
      if (user && !rbac.canPerform(user, "performance.view")) {
        throw new Error("Permission denied: performance.view");
      }
      var context = organizationContext || {};
      return (rows || []).filter(function (row) {
        if (user && !canViewRow(user, row)) {
          return false;
        }
        if (context.cityScope && context.cityScope !== "all" && context.selectedCities && context.selectedCities.length && context.selectedCities.indexOf(row.city) < 0) {
          return false;
        }
        if (context.registerScope && context.registerScope !== "all" && context.selectedRegisters && context.selectedRegisters.length) {
          var matchesRegister = context.selectedRegisters.some(function (code) {
            return ImportTypes.matchUserRegisterScope(code, row.register) || ImportTypes.matchUserRegisterScope(row.register, code);
          });
          if (!matchesRegister) {
            return false;
          }
        }
        if (filters.month && Common.monthKey(row.month || row.date || row.dateKey) !== Common.monthKey(filters.month)) {
          return false;
        }
        if (filters.city && Common.normalizeText(row.city) !== Common.normalizeText(filters.city)) {
          return false;
        }
        if (filters.register && Common.normalizeRegisterCode(row.register) !== Common.normalizeRegisterCode(filters.register)) {
          return false;
        }
        if (filters.platform && Common.normalizePlatform(row.platform || "keeta") !== Common.normalizePlatform(filters.platform)) {
          return false;
        }
        if (filters.vehicleType && filters.vehicleType !== "all" && Common.normalizeVehicleType(row.vehicleType) !== Common.normalizeVehicleType(filters.vehicleType)) {
          return false;
        }
        if (filters.validityStatus && filters.validityStatus !== "all" && Common.normalizeText(row.status || row.validityStatus) !== Common.normalizeText(filters.validityStatus)) {
          return false;
        }
        if (filters.issueSeverity && filters.issueSeverity !== "all" && Common.normalizeText(row.severity) !== Common.normalizeText(filters.issueSeverity)) {
          return false;
        }
        if (filters.mandatoryStatus && filters.mandatoryStatus !== "all") {
          var mandatorySummary = row.mandatorySummary || {};
          var mandatoryState = mandatorySummary.met === true ? "met" : mandatorySummary.met === false ? "missed" : "unknown";
          if (mandatoryState !== filters.mandatoryStatus) {
            return false;
          }
        }
        if (filters.query) {
          var haystack = [
            row.userId,
            row.dashboardUserId,
            row.riderId,
            row.iqama,
            row.city,
            row.register
          ].join(" ").toLowerCase();
          if (haystack.indexOf(Common.normalizeText(filters.query).toLowerCase()) < 0) {
            return false;
          }
        }
        return true;
      });
    }

    function listValidityResults(filters, user, organizationContext) {
      return filterScopedRows(dataStore.getAll("validityResults"), filters, user, organizationContext).sort(function (left, right) {
        return String(right.updatedAt || right.calculatedAt || "").localeCompare(String(left.updatedAt || left.calculatedAt || ""));
      });
    }

    function listPerformanceIssues(filters, user, organizationContext) {
      return filterScopedRows(dataStore.getAll("performanceIssues"), filters, user, organizationContext).sort(function (left, right) {
        return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
      });
    }

    function getResultDetails(id, user) {
      if (user && !rbac.canPerform(user, "performance.view")) {
        throw new Error("Permission denied: performance.view");
      }
      var result = dataStore.findById("validityResults", id);
      if (!result || (user && !canViewRow(user, result))) {
        return null;
      }
      var matcher = buildMonthlyMatcher(result);
      return {
        auditEvents: dataStore.getAll("auditLogs").filter(function (item) {
          return matchesScope(item, result);
        }).slice(0, 50),
        dailyRows: dataStore.getAll("performanceDaily").filter(matcher),
        deliveryExperience: dataStore.getAll("deliveryExperience").filter(matcher),
        faceVerification: dataStore.getAll("faceVerification").filter(matcher),
        issues: dataStore.getAll("performanceIssues").filter(matcher),
        monthlyPerformance: dataStore.getAll("performanceMonthly").filter(function (row) {
          return buildMonthlyKey(row) === buildMonthlyKey(result);
        })[0] || null,
        result: result,
        vdaResults: dataStore.getAll("vdaResults").filter(matcher)
      };
    }

    return {
      getResultDetails: getResultDetails,
      listPerformanceIssues: listPerformanceIssues,
      listValidityResults: listValidityResults,
      runPerformanceRecalculationForScope: runPerformanceRecalculationForScope
    };
  }

  return {
    createPerformanceRecalculationService: createPerformanceRecalculationService
  };

  function buildCalculationRunId(scope) {
    return [
      "calc",
      Common.normalizeText(scope && scope.month),
      Common.normalizeText(scope && scope.city),
      Common.normalizeRegisterCode(scope && scope.register),
      Common.normalizePlatform(scope && scope.platform)
    ].join(":");
  }
});
