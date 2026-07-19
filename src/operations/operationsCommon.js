(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("../auth/rbac.js"),
      require("../hr/riderIdentityResolver.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.OperationsCommon = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.RBAC,
    root.KeetaPortal.RiderIdentityResolver
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, RBAC, RiderIdentityResolver) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;
  var normalizeRegisterCode = ImportTypes.normalizeRegisterCode;
  var matchUserRegisterScope = ImportTypes.matchUserRegisterScope;
  var resolveRiderIdentity = RiderIdentityResolver && typeof RiderIdentityResolver.resolveRiderIdentity === "function"
    ? RiderIdentityResolver.resolveRiderIdentity
    : null;

  function cloneRecord(record) {
    return mergeObjects({}, record || {});
  }

  function stableOperationalId(prefix, values) {
    return [prefix].concat((values || []).map(function (value) {
      return normalizeText(value).replace(/[^\w\u0600-\u06ff-]+/g, "_");
    })).join("::");
  }

  function getCollectionRecords(dataStore, entityName) {
    return dataStore && typeof dataStore.getAll === "function"
      ? dataStore.getAll(entityName)
      : [];
  }

  function createPlaceholderRider(dataStore, payload) {
    payload = payload || {};
    var iqama = normalizeText(payload.iqama);
    var riderId = payload.riderId || ("rider::placeholder::" + (iqama || Date.now().toString(36)));
    var now = new Date().toISOString();
    var rider = {
      id: riderId,
      primaryIqama: iqama,
      displayName: normalizeText(payload.displayName),
      normalizedName: normalizeText(payload.displayName).toLowerCase(),
      nationality: "",
      phones: normalizeList([payload.phone]),
      cities: normalizeList([payload.city]),
      registers: normalizeList([normalizeRegisterCode(payload.register)]),
      platforms: normalizeList([payload.platform]),
      employmentType: "unknown",
      currentWorkStatus: "under_review",
      hrProfileId: "",
      riskFlags: ["placeholder_rider"],
      notes: normalizeText(payload.note) || "Created from operations assignment flow.",
      firstSeenAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
      city: normalizeText(payload.city),
      register: normalizeRegisterCode(payload.register),
      status: "under_review",
      sourceFile: payload.sourceFile || "operations_assignment"
    };
    return dataStore && typeof dataStore.upsert === "function"
      ? dataStore.upsert("riders", rider)
      : rider;
  }

  function ensurePermission(user, permission) {
    if (!RBAC || typeof RBAC.requirePermission !== "function") {
      return true;
    }
    return RBAC.requirePermission(user, permission);
  }

  function ensureScope(user, city, register) {
    if (!RBAC) {
      return true;
    }
    if (city && typeof RBAC.canAccessCity === "function" && !RBAC.canAccessCity(user, city)) {
      throw new Error("Operation city is outside the current user scope.");
    }
    if (register && typeof RBAC.canAccessRegister === "function" && !canUserAccessRegister(user, register)) {
      throw new Error("Operation register is outside the current user scope.");
    }
    return true;
  }

  function ensureOrganizationContextScope(organizationContext, city, register) {
    var context = organizationContext || {};
    if (city && Array.isArray(context.selectedCities) && context.selectedCities.length && context.selectedCities.indexOf(city) < 0) {
      throw new Error("Operation city is outside the current organization selector.");
    }
    if (register && Array.isArray(context.selectedRegisters) && context.selectedRegisters.length) {
      var matched = context.selectedRegisters.some(function (code) {
        return matchUserRegisterScope(code, register);
      });
      if (!matched) {
        throw new Error("Operation register is outside the current organization selector.");
      }
    }
    return true;
  }

  function findActiveAssignment(assignments, dashboardUserId) {
    return (assignments || []).filter(function (item) {
      return String(getDashboardUserId(item)) === String(dashboardUserId) && String(item.status || "") === "active";
    })[0] || null;
  }

  function findActiveAssignmentsByRider(assignments, riderId) {
    return (assignments || []).filter(function (item) {
      return String(item.riderId || "") === String(riderId || "") && String(item.status || "") === "active";
    });
  }

  function findDashboardUserById(users, dashboardUserId) {
    return (users || []).filter(function (item) {
      return String(getDashboardUserId(item)) === String(dashboardUserId);
    })[0] || null;
  }

  function findRiderByIdentifier(riders, riderId, iqama) {
    var normalizedIqama = normalizeText(iqama);
    var byId = (riders || []).filter(function (item) {
      return riderId && String(item.id || "") === String(riderId);
    })[0];
    if (byId) {
      return byId;
    }
    return (riders || []).filter(function (item) {
      return normalizedIqama && String(item.primaryIqama || "") === normalizedIqama;
    })[0] || null;
  }

  function resolveOrCreateOperationalRider(dataStore, payload, options) {
    options = options || {};
    payload = payload || {};

    var collections = {
      externalRiders: getCollectionRecords(dataStore, "externalRiders"),
      hrProfiles: getCollectionRecords(dataStore, "hrProfiles"),
      riderOperationalProfiles: getCollectionRecords(dataStore, "riderOperationalProfiles"),
      riders: getCollectionRecords(dataStore, "riders")
    };
    var resolution = resolveRiderIdentity
      ? resolveRiderIdentity({
          fullName: payload.displayName || payload.fullName || payload.riderName || "",
          iqama: payload.iqama || "",
          riderId: payload.riderId || "",
          riderSource: payload.riderSource || ""
        }, collections)
      : {
          allowCreateExternal: true,
          externalRider: null,
          hrProfile: null,
          iqama: normalizeText(payload.iqama),
          rider: findRiderByIdentifier(collections.riders, payload.riderId, payload.iqama),
          riderId: normalizeText(payload.riderId),
          riderSource: normalizeText(payload.riderSource) || "External"
        };

    if (!resolution.rider && !resolution.iqama && !normalizeText(payload.riderId)) {
      return null;
    }

    var riderSource = resolution.hrProfile
      ? "HR"
      : resolution.externalRider
        ? "External"
        : (normalizeText(payload.riderSource) || "External");
    var rider = resolution.rider || null;
    var now = new Date().toISOString();

    if (!rider) {
      rider = {
        id: buildOperationalRiderId(payload, resolution),
        primaryIqama: resolution.iqama || normalizeText(payload.iqama),
        displayName: pickDisplayName(payload, resolution),
        normalizedName: pickDisplayName(payload, resolution).toLowerCase(),
        nationality: pickNationality(payload, resolution),
        phones: normalizeList([
          payload.phone,
          payload.riderPhone,
          resolution.externalRider && resolution.externalRider.contactPhone,
          resolution.externalRider && resolution.externalRider.appPhone,
          resolution.hrProfile && resolution.hrProfile.phone
        ]),
        cities: normalizeList([payload.city]),
        registers: normalizeList([normalizeRegisterCode(payload.register)]),
        platforms: normalizeList([payload.platform]),
        employmentType: resolution.hrProfile
          ? normalizeText(resolution.hrProfile.employmentType || "employee")
          : "external",
        currentWorkStatus: normalizeText(payload.currentWorkStatus || payload.assignmentStatus || "working"),
        hrProfileId: resolution.hrProfile && resolution.hrProfile.id ? resolution.hrProfile.id : "",
        riskFlags: uniqueList(
          []
            .concat(resolution.hrProfile ? [] : ["external_rider"])
            .concat(resolution.externalRider || resolution.hrProfile ? [] : ["placeholder_rider"])
        ),
        notes: normalizeText(payload.note) || "Created from operations flow.",
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
        city: normalizeText(payload.city),
        register: normalizeRegisterCode(payload.register),
        status: "active",
        sourceFile: payload.sourceFile || "operations_flow"
      };
      if (dataStore && typeof dataStore.upsert === "function") {
        rider = dataStore.upsert("riders", rider);
      }
    }

    if (dataStore && typeof dataStore.upsert === "function") {
      upsertOperationalProfile(dataStore, payload, resolution, rider, riderSource, now);
      if (!resolution.hrProfile && !resolution.externalRider && options.allowCreateExternal && resolution.iqama) {
        upsertExternalOperationalIdentity(dataStore, payload, riderSource, now);
      }
    }

    return {
      resolution: resolution,
      rider: rider,
      riderSource: riderSource
    };
  }

  function getDashboardUserId(record) {
    return normalizeText(record && (record.dashboardUserId || record.userId));
  }

  function getEffectiveCity(record) {
    return normalizeText(record && record.city);
  }

  function getEffectiveRegister(record) {
    return normalizeRegisterCode(record && record.register);
  }

  function getEffectivePlatform(record) {
    return normalizeText(record && record.platform).toLowerCase();
  }

  function hasCityMatch(rider, city) {
    if (!city) {
      return true;
    }
    var riderCities = normalizeList((rider && rider.cities) || [rider && rider.city]);
    return !riderCities.length || riderCities.indexOf(city) >= 0;
  }

  function hasRegisterMatch(rider, register) {
    if (!register) {
      return true;
    }
    var riderRegisters = normalizeList((rider && rider.registers) || [rider && rider.register]).map(normalizeRegisterCode);
    return !riderRegisters.length || riderRegisters.some(function (code) {
      return matchUserRegisterScope(code, register);
    });
  }

  function normalizeDate(value, fallback) {
    var text = normalizeText(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      return text.slice(0, 10);
    }
    return fallback || new Date().toISOString().slice(0, 10);
  }

  function normalizeList(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = normalizeText(value);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    }).map(function (value) {
      return normalizeText(value);
    });
  }

  function toDashboardUserStatusLabel(status) {
    var normalized = normalizeText(status).toLowerCase();
    if (!normalized) {
      return "under_review";
    }
    if (/working|في الخدمة|شغال|يعمل/.test(normalized)) {
      return "working";
    }
    if (/new|جديد/.test(normalized)) {
      return "needs_assignment";
    }
    if (/resign|terminated|مقال|لا يعمل/.test(normalized)) {
      return "terminated";
    }
    if (/restricted|مقيد/.test(normalized)) {
      return "restricted";
    }
    if (/accepted|approved|مقبول/.test(normalized)) {
      return "accepted";
    }
    return "under_review";
  }

  function toActivationStatus(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (!normalized) {
      return "unknown";
    }
    if (/accepted|approved|مقبول/.test(normalized)) {
      return "accepted";
    }
    if (/pending|under review|تحت التقديم|تحت المراجعة/.test(normalized)) {
      return "pending";
    }
    if (/reject|مرفوض/.test(normalized)) {
      return "rejected";
    }
    return "unknown";
  }

  function buildAssignmentId(dashboardUserId, riderId, assignmentType, startDate) {
    return [
      "assignment",
      normalizeText(dashboardUserId),
      normalizeText(riderId),
      normalizeText(assignmentType || "assignment"),
      normalizeDate(startDate)
    ].join("::");
  }

  function buildHistoryId(dashboardUserId, action, actionDate, newRiderId) {
    return [
      "assignmentHistory",
      normalizeText(dashboardUserId),
      normalizeText(action || "action"),
      normalizeDate(actionDate),
      normalizeText(newRiderId)
    ].join("::");
  }

  function buildStatusReviewId(dashboardUserId, sourceImportBatchId, reviewStatus) {
    return [
      "operationalStatusReview",
      normalizeText(dashboardUserId),
      normalizeText(sourceImportBatchId),
      normalizeText(reviewStatus || "review")
    ].join("::");
  }

  function buildTerminationId(dashboardUserId, terminationType, terminationDate) {
    return [
      "termination",
      normalizeText(dashboardUserId),
      normalizeText(terminationType || "termination"),
      normalizeDate(terminationDate)
    ].join("::");
  }

  function canUserAccessRegister(user, register) {
    if (!user || !register) {
      return false;
    }
    if (user.registerScope === "all") {
      return true;
    }
    return (user.selectedRegisters || []).some(function (code) {
      return matchUserRegisterScope(code, register);
    });
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  function buildOperationalRiderId(payload, resolution) {
    var explicitId = normalizeText(payload && payload.riderId) || normalizeText(resolution && resolution.riderId);
    if (explicitId) {
      return explicitId;
    }
    return stableOperationalId("rider", [
      resolution && resolution.iqama,
      payload && (payload.displayName || payload.fullName || payload.riderName),
      payload && payload.platform
    ]);
  }

  function pickDisplayName(payload, resolution) {
    var hrProfile = resolution && resolution.hrProfile ? resolution.hrProfile : null;
    var externalRider = resolution && resolution.externalRider ? resolution.externalRider : null;
    return normalizeText(
      payload && (payload.displayName || payload.fullName || payload.riderName) ||
      (hrProfile && (hrProfile.fullNameArabic || hrProfile.fullNameEnglish || hrProfile.fullName)) ||
      (externalRider && externalRider.fullName) ||
      ""
    );
  }

  function pickNationality(payload, resolution) {
    return normalizeText(
      payload && payload.nationality ||
      (resolution && resolution.hrProfile && resolution.hrProfile.nationality) ||
      (resolution && resolution.externalRider && resolution.externalRider.nationality) ||
      ""
    );
  }

  function upsertOperationalProfile(dataStore, payload, resolution, rider, riderSource, now) {
    var existing = getCollectionRecords(dataStore, "riderOperationalProfiles").filter(function (item) {
      return normalizeText(item && item.iqama) === normalizeText(rider && rider.primaryIqama);
    })[0] || null;
    return dataStore.upsert("riderOperationalProfiles", mergeObjects({}, existing || {}, {
      id: existing && existing.id
        ? existing.id
        : stableOperationalId("riderOperationalProfiles", [rider && rider.primaryIqama, rider && rider.id]),
      iqama: rider && rider.primaryIqama ? rider.primaryIqama : "",
      riderId: rider && rider.id ? rider.id : "",
      riderSource: riderSource,
      contactPhone: normalizeText(payload && (payload.phone || payload.riderPhone)) ||
        (existing && existing.contactPhone) ||
        (resolution && resolution.externalRider && resolution.externalRider.contactPhone) ||
        (resolution && resolution.hrProfile && resolution.hrProfile.phone) ||
        "",
      appPhone: normalizeText(payload && payload.appPhone) ||
        (existing && existing.appPhone) ||
        (resolution && resolution.externalRider && resolution.externalRider.appPhone) ||
        "",
      iban: normalizeText(payload && payload.iban) ||
        (existing && existing.iban) ||
        (resolution && resolution.externalRider && resolution.externalRider.iban) ||
        "",
      gasCard: normalizeText(payload && payload.gasCard) ||
        (existing && existing.gasCard) ||
        (resolution && resolution.externalRider && resolution.externalRider.gasCard) ||
        "",
      tools: normalizeText(payload && payload.tools) ||
        (existing && existing.tools) ||
        (resolution && resolution.externalRider && resolution.externalRider.tools) ||
        "",
      currentUserSummary: normalizeText(payload && (payload.ownerName || payload.dashboardUserId || payload.userId)) ||
        (existing && existing.currentUserSummary) ||
        "",
      preferredPlatform: normalizeText(payload && payload.platform).toLowerCase(),
      preferredCity: normalizeText(payload && payload.city),
      preferredRegister: normalizeRegisterCode(payload && payload.register),
      lastUpdatedBy: normalizeText(payload && payload.updatedBy) || normalizeText(payload && payload.createdBy) || "operations",
      lastUpdatedAt: now,
      sourceBatchId: normalizeText(payload && payload.sourceBatchId),
      notes: normalizeText(payload && (payload.note || payload.reason)),
      sourceFile: normalizeText(payload && payload.sourceFile) || "operations_flow",
      city: normalizeText(payload && payload.city),
      register: normalizeRegisterCode(payload && payload.register),
      status: "active"
    }));
  }

  function upsertExternalOperationalIdentity(dataStore, payload, riderSource, now) {
    var iqama = normalizeText(payload && payload.iqama);
    if (!iqama) {
      return null;
    }
    var existing = getCollectionRecords(dataStore, "externalRiders").filter(function (item) {
      return normalizeText(item && item.iqama) === iqama;
    })[0] || null;
    return dataStore.upsert("externalRiders", mergeObjects({}, existing || {}, {
      id: existing && existing.id
        ? existing.id
        : stableOperationalId("externalRiders", [iqama, payload && (payload.displayName || payload.fullName || payload.riderName)]),
      sourceTimestamp: now,
      iqama: iqama,
      fullName: pickDisplayName(payload, { externalRider: existing }),
      contactPhone: normalizeText(payload && (payload.phone || payload.riderPhone)),
      riderType: riderSource,
      vehicleDisplay: normalizeText(payload && payload.vehicleType),
      gasCard: normalizeText(payload && payload.gasCard),
      tools: normalizeText(payload && payload.tools),
      nationality: normalizeText(payload && payload.nationality),
      appPhone: normalizeText(payload && payload.appPhone),
      iban: normalizeText(payload && payload.iban),
      currentUserDisplay: normalizeText(payload && (payload.dashboardUserId || payload.userId)),
      createdByEmail: existing && existing.createdByEmail ? existing.createdByEmail : normalizeText(payload && payload.createdBy),
      updatedByEmail: normalizeText(payload && payload.updatedBy) || normalizeText(payload && payload.createdBy),
      notes: normalizeText(payload && (payload.note || payload.reason)),
      sourceBatchId: normalizeText(payload && payload.sourceBatchId),
      sourceFile: normalizeText(payload && payload.sourceFile) || "operations_flow",
      city: normalizeText(payload && payload.city),
      register: normalizeRegisterCode(payload && payload.register),
      status: "active"
    }));
  }

  function uniqueList(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = normalizeText(value);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    }).map(function (value) {
      return normalizeText(value);
    });
  }

  return {
    buildAssignmentId: buildAssignmentId,
    buildHistoryId: buildHistoryId,
    buildStatusReviewId: buildStatusReviewId,
    buildTerminationId: buildTerminationId,
    cloneRecord: cloneRecord,
    createPlaceholderRider: createPlaceholderRider,
    ensureOrganizationContextScope: ensureOrganizationContextScope,
    ensurePermission: ensurePermission,
    ensureScope: ensureScope,
    findActiveAssignment: findActiveAssignment,
    findActiveAssignmentsByRider: findActiveAssignmentsByRider,
    findDashboardUserById: findDashboardUserById,
    findRiderByIdentifier: findRiderByIdentifier,
    getCollectionRecords: getCollectionRecords,
    getDashboardUserId: getDashboardUserId,
    getEffectiveCity: getEffectiveCity,
    getEffectivePlatform: getEffectivePlatform,
    getEffectiveRegister: getEffectiveRegister,
    hasCityMatch: hasCityMatch,
    hasRegisterMatch: hasRegisterMatch,
    mergeObjects: mergeObjects,
    normalizeDate: normalizeDate,
    normalizeList: normalizeList,
    resolveOrCreateOperationalRider: resolveOrCreateOperationalRider,
    toActivationStatus: toActivationStatus,
    toDashboardUserStatusLabel: toDashboardUserStatusLabel
  };
});
