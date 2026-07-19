(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("../auth/rbac.js"),
      require("./monthlyRulesDefaults.js"),
      require("./monthlyRulesValidator.js"),
      require("./monthlyRulesVersioning.js"),
      require("./monthlyRulesPreview.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.MonthlyRulesService = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.RBAC,
    root.KeetaPortal.MonthlyRulesDefaults,
    root.KeetaPortal.MonthlyRulesValidator,
    root.KeetaPortal.MonthlyRulesVersioning,
    root.KeetaPortal.MonthlyRulesPreview
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  ImportTypes,
  RBAC,
  MonthlyRulesDefaults,
  MonthlyRulesValidator,
  MonthlyRulesVersioning,
  MonthlyRulesPreview
) {
  "use strict";

  var createDefaultMonthlyRule = MonthlyRulesDefaults.createDefaultMonthlyRule;
  var deepMerge = MonthlyRulesDefaults.deepMerge;
  var clone = MonthlyRulesDefaults.clone;
  var buildMonthlyRulesPreview = MonthlyRulesPreview.buildMonthlyRulesPreview;
  var compareRuleVersions = MonthlyRulesVersioning.compareRuleVersions;
  var computeNextVersion = MonthlyRulesVersioning.computeNextVersion;
  var normalizeRegisterCode = ImportTypes.normalizeRegisterCode;
  var matchUserRegisterScope = ImportTypes.matchUserRegisterScope;

  function createMonthlyRulesService(options) {
    options = options || {};
    var dataStore = options.dataStore;
    var auditLog = options.auditLog;
    var rbac = options.rbac || RBAC;

    function createMonthlyRules(input, user) {
      requirePermission(user, "monthlyRules.create");
      var candidate = finalizeRule(createDefaultMonthlyRule(input || {}), null, user, {
        status: input && input.status ? input.status : "draft"
      });
      ensureRuleScope(user, candidate);
      validateOrThrow(candidate, {
        existingRules: listRules(),
        mode: "draft",
        user: user
      });
      var saved = saveRule(candidate);
      recordAudit("monthly_rule_created", saved.id, null, saved, user, "Created monthly rule draft.", "monthly_rule_created:" + String(saved.id || ""));
      return saved;
    }

    function updateMonthlyRules(id, patch, user) {
      requirePermission(user, "monthlyRules.edit");
      var existing = findRuleById(id);
      if (!existing) {
        throw new Error("Monthly rule does not exist.");
      }
      ensureRuleScope(user, existing);

      if (String(existing.status || "") === "locked" && !rbac.canPerform(user, "monthlyRules.unlock")) {
        validateOrThrow(existing, {
          allowLockedUpdate: false,
          existingRules: listRules(),
          lockedUpdate: true,
          mode: "draft",
          user: user
        });
      }

      if (String(existing.status || "") === "active" || String(existing.status || "") === "locked") {
        var versionDraft = finalizeRule(deepMerge({}, existing, patch || {}), existing, user, {
          id: generateId(),
          lockedAt: "",
          lockedBy: "",
          lockedFromStatus: "",
          previousVersionId: existing.id,
          status: "draft",
          version: computeNextVersion(existing)
        });
        ensureRuleScope(user, versionDraft);
        validateOrThrow(versionDraft, {
          existingRules: listRules(),
          mode: "draft",
          user: user
        });
        var savedVersion = saveRule(versionDraft);
        recordAudit("monthly_rule_created", savedVersion.id, null, savedVersion, user, "Created new draft version from active or locked rule.", "monthly_rule_created:" + String(savedVersion.id || ""));
        return savedVersion;
      }

      var updated = finalizeRule(deepMerge({}, existing, patch || {}), existing, user, {
        id: existing.id,
        previousVersionId: existing.previousVersionId || ""
      });
      ensureRuleScope(user, updated);
      validateOrThrow(updated, {
        existingRules: listRules(),
        mode: updated.status === "active" ? "activate" : "draft",
        user: user
      });
      var saved = saveRule(updated);
      return saved;
    }

    function cloneMonthlyRules(sourceRuleId, nextMonth, user) {
      requirePermission(user, "monthlyRules.create");
      var sourceRule = findRuleById(sourceRuleId);
      if (!sourceRule) {
        throw new Error("Monthly rule does not exist.");
      }
      ensureRuleScope(user, sourceRule);
      var cloned = finalizeRule(clone(sourceRule), sourceRule, user, {
        id: generateId(),
        month: nextMonth,
        previousVersionId: sourceRule.id,
        status: "draft",
        version: 1
      });
      validateOrThrow(cloned, {
        existingRules: listRules(),
        mode: "draft",
        user: user
      });
      var saved = saveRule(cloned);
      recordAudit("monthly_rule_created", saved.id, null, saved, user, "Cloned monthly rule to next month.", "monthly_rule_created:" + String(saved.id || ""));
      return saved;
    }

    function activateMonthlyRules(id, user) {
      requirePermission(user, "monthlyRules.activate");
      var existing = findRuleById(id);
      if (!existing) {
        throw new Error("Monthly rule does not exist.");
      }
      ensureRuleScope(user, existing);
      var activated = finalizeRule(clone(existing), existing, user, {
        status: "active",
        effectiveFrom: monthStart(existing.month),
        effectiveTo: monthEnd(existing.month)
      });
      validateOrThrow(activated, {
        existingRules: listRules(),
        mode: "activate",
        user: user
      });
      var saved = saveRule(activated);
      recordAudit("monthly_rule_published", saved.id, existing, saved, user, "Published monthly rule.", "monthly_rule_published:" + String(saved.id || "") + ":" + String(saved.version || 1));
      return saved;
    }

    function lockMonthlyRules(id, user) {
      requirePermission(user, "monthlyRules.lock");
      var existing = findRuleById(id);
      if (!existing) {
        throw new Error("Monthly rule does not exist.");
      }
      ensureRuleScope(user, existing);
      var saved = saveRule(finalizeRule(clone(existing), existing, user, {
        lockedAt: new Date().toISOString(),
        lockedBy: user && user.id ? user.id : "",
        lockedFromStatus: existing.status || "draft",
        status: "locked"
      }));
      recordAudit("monthly_rule_locked", saved.id, existing, saved, user, "Locked monthly rule.", "monthly_rule_locked:" + String(saved.id || "") + ":" + String(saved.lockedAt || ""));
      return saved;
    }

    function unlockMonthlyRules(id, user) {
      requirePermission(user, "monthlyRules.unlock");
      var existing = findRuleById(id);
      if (!existing) {
        throw new Error("Monthly rule does not exist.");
      }
      ensureRuleScope(user, existing);
      var saved = saveRule(finalizeRule(clone(existing), existing, user, {
        lockedAt: "",
        lockedBy: "",
        status: existing.lockedFromStatus || "draft"
      }));
      return saved;
    }

    function archiveMonthlyRules(id, user) {
      requirePermission(user, "monthlyRules.archive");
      var existing = findRuleById(id);
      if (!existing) {
        throw new Error("Monthly rule does not exist.");
      }
      ensureRuleScope(user, existing);
      var saved = saveRule(finalizeRule(clone(existing), existing, user, {
        archivedAt: new Date().toISOString(),
        archivedBy: user && user.id ? user.id : "",
        status: "archived"
      }));
      recordAudit("monthly_rule_archived", saved.id, existing, saved, user, "Archived monthly rule.", "monthly_rule_archived:" + String(saved.id || "") + ":" + String(saved.archivedAt || ""));
      return saved;
    }

    function getActiveRules(criteria) {
      var matches = listRules().filter(function (rule) {
        return String(rule.status || "") === "active" && ruleMatchesContext(rule, criteria || {});
      }).sort(compareRuleSpecificity);
      return matches;
    }

    function resolveRulesForContext(globalContext, date) {
      var month = monthKey(date);
      var context = globalContext || {};
      var cities = context.selectedCities || [];
      var registers = context.selectedRegisters || [];
      var platform = context.platform || context.selectedPlatform || "keeta";
      var matches = getActiveRules({
        city: cities.length === 1 ? cities[0] : "",
        month: month,
        platform: platform,
        register: registers.length === 1 ? registers[0] : "",
        selectedCities: cities,
        selectedRegisters: registers
      });
      return {
        activeRule: matches[0] || null,
        matches: matches,
        month: month
      };
    }

    function validateMonthlyRules(rules, options) {
      return MonthlyRulesValidator.validateMonthlyRules(rules, deepMerge({}, options || {}, {
        existingRules: options && options.existingRules ? options.existingRules : listRules()
      }));
    }

    function exportMonthlyRules(id, user) {
      if (user) {
        requirePermission(user, "monthlyRules.export");
      }
      var rule = findRuleById(id);
      if (!rule) {
        throw new Error("Monthly rule does not exist.");
      }
      var payload = {
        exportedAt: new Date().toISOString(),
        exportedBy: user && user.id ? user.id : "",
        rules: clone(rule)
      };
      return payload;
    }

    function importMonthlyRules(json, user) {
      requirePermission(user, "monthlyRules.import");
      var parsed = typeof json === "string" ? JSON.parse(json) : clone(json || {});
      var rawRule = parsed && parsed.rules ? parsed.rules : parsed;
      var imported = finalizeRule(createDefaultMonthlyRule(rawRule || {}), null, user, {
        id: generateId(),
        previousVersionId: rawRule && rawRule.id ? rawRule.id : "",
        source: "monthly_rules_import",
        status: "draft",
        version: Number(rawRule && rawRule.version) || 1
      });
      ensureRuleScope(user, imported);
      validateOrThrow(imported, {
        existingRules: listRules(),
        mode: "draft",
        user: user
      });
      var saved = saveRule(imported);
      recordAudit("monthly_rule_created", saved.id, null, saved, user, "Imported monthly rule JSON as draft.", "monthly_rule_created:" + String(saved.id || ""));
      return saved;
    }

    function compareVersions(oldRuleId, newRuleId) {
      var oldRule = typeof oldRuleId === "string" ? findRuleById(oldRuleId) : oldRuleId;
      var newRule = typeof newRuleId === "string" ? findRuleById(newRuleId) : newRuleId;
      return compareRuleVersions(oldRule || {}, newRule || {});
    }

    function listMonthlyRules(filters) {
      var rules = listRules();
      filters = filters || {};
      if (filters.month) {
        rules = rules.filter(function (item) { return item.month === filters.month; });
      }
      if (filters.status) {
        rules = rules.filter(function (item) { return item.status === filters.status; });
      }
      if (filters.city) {
        rules = rules.filter(function (item) {
          return ruleMatchesCity(item, filters.city);
        });
      }
      if (filters.register) {
        rules = rules.filter(function (item) {
          return ruleMatchesRegister(item, filters.register);
        });
      }
      return rules.sort(function (left, right) {
        return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
      });
    }

    function previewMonthlyRules(rule) {
      return buildMonthlyRulesPreview(rule);
    }

    function buildDraftFromDefaults(overrides) {
      return finalizeRule(createDefaultMonthlyRule(overrides || {}), null, null, {});
    }

    function findRuleById(id) {
      return dataStore.findById("monthlyRules", id);
    }

    function listRules() {
      return dataStore.getAll("monthlyRules");
    }

    function saveRule(rule) {
      return dataStore.upsert("monthlyRules", rule);
    }

    function finalizeRule(source, existing, user, overrides) {
      var now = new Date().toISOString();
      var next = deepMerge({}, createDefaultMonthlyRule(), existing || {}, source || {}, overrides || {});
      next.selectedCities = normalizeArray(next.selectedCities);
      next.selectedRegisters = normalizeRegisters(next.selectedRegisters);
      if (next.cityScope === "single" && next.selectedCities.length > 1) {
        next.selectedCities = next.selectedCities.slice(0, 1);
      }
      if (next.registerScope === "single" && next.selectedRegisters.length > 1) {
        next.selectedRegisters = next.selectedRegisters.slice(0, 1);
      }
      if (next.cityScope === "all") {
        next.selectedCities = [];
      }
      if (next.registerScope === "all") {
        next.selectedRegisters = [];
      }
      next.version = Math.max(1, Number(next.version) || 1);
      next.createdAt = existing && existing.createdAt ? existing.createdAt : now;
      next.createdBy = existing && existing.createdBy ? existing.createdBy : (user && user.id ? user.id : next.createdBy || "");
      next.updatedAt = now;
      next.updatedBy = user && user.id ? user.id : next.updatedBy || "";
      next.source = next.source || "monthly_rules_manager";
      next.city = next.cityScope === "single" ? (next.selectedCities[0] || "") : "";
      next.register = next.registerScope === "single" ? (next.selectedRegisters[0] || "") : "";
      next.effectiveFrom = next.effectiveFrom || (String(next.status || "") === "active" ? monthStart(next.month) : "");
      next.effectiveTo = next.effectiveTo || (String(next.status || "") === "active" ? monthEnd(next.month) : "");
      next.validDayRules = sanitizeNumbers(next.validDayRules, ["minOrdersCar", "minOrdersBike", "minWorkingHoursCar", "minWorkingHoursBike", "minOnlineHours"]);
      next.orderRules = sanitizeNumbers(next.orderRules, ["mandatoryDayMinOrders", "regularDayMinOrders"]);
      next.attendanceRules = sanitizeNumbers(next.attendanceRules, ["minimumValidDays", "allowGraceDays"]);
      next.mandatoryDaysRules = sanitizeMandatoryRules(next.mandatoryDaysRules);
      next.vehicleRules = sanitizeVehicleRules(next.vehicleRules);
      next.incentiveRules = sanitizeIncentiveRules(next.incentiveRules);
      next.faceVerificationRules = sanitizeNumbers(next.faceVerificationRules, ["passRateRequired"]);
      next.cancellationRules = sanitizeNumbers(next.cancellationRules, ["maxRejectsPerDay", "penaltyAfterRejects", "penaltyAmount"]);
      next.salaryEligibilityRules = sanitizeNumbers(next.salaryEligibilityRules, ["minimumValidDays", "minimumOrdersCar", "minimumOrdersBike"]);
      return next;
    }

    function sanitizeMandatoryRules(source) {
      var next = sanitizeNumbers(source || {}, ["minRequiredValidMandatoryDays", "allowMissedMandatoryDays"]);
      next.mandatoryDates = normalizeArray(next.mandatoryDates);
      next.mandatoryWeekdays = normalizeArray(next.mandatoryWeekdays);
      next.missingMandatoryDayPenalty = sanitizeNumbers(next.missingMandatoryDayPenalty || {}, ["amount"]);
      return next;
    }

    function sanitizeVehicleRules(source) {
      var next = clone(source || {});
      next.car = sanitizeNumbers(next.car || {}, ["monthlyTarget", "validDayMinOrders", "validDayMinHours"]);
      next.bike = sanitizeNumbers(next.bike || {}, ["monthlyTarget", "validDayMinOrders", "validDayMinHours"]);
      return next;
    }

    function sanitizeIncentiveRules(source) {
      var next = clone(source || {});
      next.companyCommission = sanitizeNumbers(next.companyCommission || {}, ["value"]);
      next.carTiers = sanitizeTiers(next.carTiers);
      next.bikeTiers = sanitizeTiers(next.bikeTiers);
      return next;
    }

    function sanitizeTiers(tiers) {
      return (tiers || []).map(function (tier) {
        return {
          minOrders: toNullableNumber(tier && tier.minOrders, 0),
          maxOrders: tier && tier.maxOrders !== "" && tier && tier.maxOrders != null ? toNullableNumber(tier.maxOrders, null) : null,
          rate: toNullableNumber(tier && tier.rate, 0)
        };
      });
    }

    function sanitizeNumbers(source, fields) {
      var next = clone(source || {});
      (fields || []).forEach(function (fieldName) {
        if (next[fieldName] === "") {
          next[fieldName] = null;
          return;
        }
        if (next[fieldName] != null) {
          next[fieldName] = toNullableNumber(next[fieldName], next[fieldName]);
        }
      });
      return next;
    }

    function validateOrThrow(rule, options) {
      var validation = MonthlyRulesValidator.validateMonthlyRules(rule, options || {});
      if (!validation.isValid) {
        throw new Error(firstBlockingMessage(validation));
      }
      return validation;
    }

    function firstBlockingMessage(validation) {
      return validation && validation.blockingIssues && validation.blockingIssues[0]
        ? validation.blockingIssues[0].message
        : "Monthly rule validation failed.";
    }

    function recordAudit(action, entityId, before, after, user, note, idempotencyKey) {
      if (!auditLog || typeof auditLog.createAuditEvent !== "function") {
        return;
      }
      auditLog.createAuditEvent({
        actor: user,
        after: after,
        before: before,
        context: {
          city: (after && after.city) || (before && before.city) || firstOf(after && after.selectedCities) || firstOf(before && before.selectedCities) || "",
          month: (after && after.month) || (before && before.month) || "",
          platform: (after && after.platform) || (before && before.platform) || "keeta",
          register: (after && after.register) || (before && before.register) || firstOf(after && after.selectedRegisters) || firstOf(before && before.selectedRegisters) || ""
        },
        entityId: entityId,
        entityType: "monthlyRules",
        eventType: action,
        idempotencyKey: idempotencyKey || "",
        reason: note || "",
        source: "monthly_rules_manager"
      });
    }

    function ruleMatchesContext(rule, criteria) {
      criteria = criteria || {};
      if (criteria.month && String(rule.month || "") !== String(criteria.month || "")) {
        return false;
      }
      if (criteria.platform && String(rule.platform || "all") !== "all" && String(criteria.platform || "") !== String(rule.platform || "")) {
        return false;
      }
      if (criteria.city && !ruleMatchesCity(rule, criteria.city)) {
        return false;
      }
      if (criteria.register && !ruleMatchesRegister(rule, criteria.register)) {
        return false;
      }
      if (!criteria.city && criteria.selectedCities && criteria.selectedCities.length && rule.cityScope !== "all") {
        if (!(criteria.selectedCities || []).some(function (city) { return rule.selectedCities.indexOf(city) >= 0; })) {
          return false;
        }
      }
      if (!criteria.register && criteria.selectedRegisters && criteria.selectedRegisters.length && rule.registerScope !== "all") {
        if (!(criteria.selectedRegisters || []).some(function (registerCode) { return ruleMatchesRegister(rule, registerCode); })) {
          return false;
        }
      }
      return true;
    }

    function ruleMatchesCity(rule, city) {
      if (rule.cityScope === "all") {
        return true;
      }
      return (rule.selectedCities || []).indexOf(city) >= 0;
    }

    function ruleMatchesRegister(rule, registerCode) {
      if (rule.registerScope === "all") {
        return true;
      }
      var normalizedRegister = normalizeRegisterCode(registerCode);
      return (rule.selectedRegisters || []).some(function (item) {
        var normalizedItem = normalizeRegisterCode(item);
        return normalizedItem === normalizedRegister ||
          matchUserRegisterScope(normalizedItem, normalizedRegister) ||
          matchUserRegisterScope(normalizedRegister, normalizedItem);
      });
    }

    function compareRuleSpecificity(left, right) {
      return computeSpecificity(right) - computeSpecificity(left) ||
        String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
    }

    function computeSpecificity(rule) {
      var score = 0;
      score += rule.cityScope === "single" ? 3 : rule.cityScope === "multi" ? 2 : 1;
      score += rule.registerScope === "single" ? 3 : rule.registerScope === "multi" ? 2 : 1;
      score += rule.platform && rule.platform !== "all" ? 2 : 0;
      return score;
    }

    function ensureRuleScope(user, rule) {
      if (!user || !rule) {
        return true;
      }
      if (user.cityScope !== "all") {
        if (rule.cityScope === "all") {
          throw new Error("Rule city scope is outside the current user scope.");
        }
        if ((rule.selectedCities || []).some(function (city) { return !rbac.canAccessCity(user, city); })) {
          throw new Error("Rule city scope is outside the current user scope.");
        }
      }
      if (user.registerScope !== "all") {
        if (rule.registerScope === "all") {
          throw new Error("Rule register scope is outside the current user scope.");
        }
        if ((rule.selectedRegisters || []).some(function (registerCode) { return !canUserAccessRegister(user, registerCode); })) {
          throw new Error("Rule register scope is outside the current user scope.");
        }
      }
      return true;
    }

    function canUserAccessRegister(user, registerCode) {
      if (!user || !registerCode) {
        return false;
      }
      if (user.registerScope === "all") {
        return true;
      }
      return (user.selectedRegisters || []).some(function (item) {
        var normalizedUserRegister = normalizeRegisterCode(item);
        var normalizedTarget = normalizeRegisterCode(registerCode);
        return normalizedUserRegister === normalizedTarget ||
          matchUserRegisterScope(normalizedUserRegister, normalizedTarget) ||
          matchUserRegisterScope(normalizedTarget, normalizedUserRegister);
      });
    }

    function requirePermission(user, permission) {
      if (!rbac || typeof rbac.requirePermission !== "function") {
        return true;
      }
      return rbac.requirePermission(user, permission);
    }

    return {
      activateMonthlyRules: activateMonthlyRules,
      archiveMonthlyRules: archiveMonthlyRules,
      buildDraftFromDefaults: buildDraftFromDefaults,
      cloneMonthlyRules: cloneMonthlyRules,
      compareRuleVersions: compareVersions,
      createMonthlyRules: createMonthlyRules,
      exportMonthlyRules: exportMonthlyRules,
      findRuleById: findRuleById,
      getActiveRules: getActiveRules,
      importMonthlyRules: importMonthlyRules,
      listMonthlyRules: listMonthlyRules,
      lockMonthlyRules: lockMonthlyRules,
      previewMonthlyRules: previewMonthlyRules,
      resolveRulesForContext: resolveRulesForContext,
      unlockMonthlyRules: unlockMonthlyRules,
      updateMonthlyRules: updateMonthlyRules,
      validateMonthlyRules: validateMonthlyRules
    };
  }

  function normalizeArray(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = String(value == null ? "" : value).trim();
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    }).map(function (value) {
      return String(value).trim();
    });
  }

  function normalizeRegisters(values) {
    return normalizeArray(values).map(function (value) {
      return normalizeRegisterCode(value) || value;
    });
  }

  function monthKey(date) {
    if (!date) {
      return new Date().toISOString().slice(0, 7);
    }
    if (typeof date === "string" && /^\d{4}-\d{2}/.test(date)) {
      return date.slice(0, 7);
    }
    return new Date(date).toISOString().slice(0, 7);
  }

  function monthStart(month) {
    return /^\d{4}-\d{2}$/.test(String(month || "")) ? month + "-01" : "";
  }

  function monthEnd(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ""))) {
      return "";
    }
    var parts = String(month).split("-");
    var lastDay = new Date(Date.UTC(Number(parts[0]), Number(parts[1]), 0)).getUTCDate();
    return parts[0] + "-" + parts[1] + "-" + String(lastDay).padStart(2, "0");
  }

  function generateId() {
    return "monthlyRule_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function firstOf(values) {
    return values && values.length ? values[0] : "";
  }

  function toNullableNumber(value, fallback) {
    if (value == null || value === "") {
      return fallback == null ? null : fallback;
    }
    var numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  return {
    createMonthlyRulesService: createMonthlyRulesService
  };
});
