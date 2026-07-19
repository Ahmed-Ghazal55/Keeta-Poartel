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
  root.KeetaPortal.RiderOperationalProfileService = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.RBAC,
    root.KeetaPortal.RiderIdentityResolver
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, RBAC, RiderIdentityResolver) {
  "use strict";

  var normalizeText = ImportTypes && typeof ImportTypes.normalizeText === "function"
    ? ImportTypes.normalizeText
    : function (value) { return String(value == null ? "" : value).trim(); };
  var normalizeRegister = ImportTypes && typeof ImportTypes.normalizeRegisterCode === "function"
    ? ImportTypes.normalizeRegisterCode
    : function (value) { return normalizeText(value); };
  var matchRegisterScope = ImportTypes && typeof ImportTypes.matchUserRegisterScope === "function"
    ? ImportTypes.matchUserRegisterScope
    : function (left, right) { return normalizeRegister(left) === normalizeRegister(right); };
  var resolveRiderIdentity = RiderIdentityResolver && typeof RiderIdentityResolver.resolveRiderIdentity === "function"
    ? RiderIdentityResolver.resolveRiderIdentity
    : null;
  var buildExternalRiderId = RiderIdentityResolver && typeof RiderIdentityResolver.buildExternalRiderId === "function"
    ? RiderIdentityResolver.buildExternalRiderId
    : function (iqama, fullName, phone) { return stableId("externalRiders", [iqama, fullName, phone]); };
  var buildOperationalProfileId = RiderIdentityResolver && typeof RiderIdentityResolver.buildOperationalProfileId === "function"
    ? RiderIdentityResolver.buildOperationalProfileId
    : function (iqama, riderId) { return stableId("riderOperationalProfiles", [iqama, riderId]); };

  function createRiderOperationalProfileService(options) {
    options = options || {};
    var dataStore = options.dataStore;
    var auditLog = options.auditLog || null;
    var nowProvider = typeof options.nowProvider === "function"
      ? options.nowProvider
      : function () { return new Date().toISOString(); };

    function createExternalRider(payload, context) {
      payload = payload || {};
      context = context || {};

      var normalizedIqama = normalizeText(payload.iqama);
      if (!normalizedIqama) {
        throw new Error("Rider iqama is required.");
      }

      var collections = loadCollections(dataStore);
      var resolution = resolveIdentity(normalizedIqama, collections);
      if (resolution.hrProfile) {
        throw new Error("HR riders cannot be created as external riders.");
      }
      if (resolution.externalRider) {
        throw new Error("External rider already exists.");
      }

      var resolvedCity = normalizeText(payload.city) ||
        normalizeText(context.city) ||
        normalizeText(payload.preferredCity) ||
        normalizeText(context.preferredCity);
      var resolvedRegister = normalizeRegister(payload.register) ||
        normalizeRegister(context.register) ||
        normalizeRegister(payload.preferredRegister) ||
        normalizeRegister(context.preferredRegister);

      ensureMutationAccess(context.user, resolvedCity, resolvedRegister, context.organizationContext);

      var now = nowProvider();
      var actorId = resolveActorId(context.user, payload.updatedByEmail || payload.createdByEmail || "");
      var existingProfile = findOperationalProfile(collections.riderOperationalProfiles, normalizedIqama);
      var externalRider = dataStore.upsert("externalRiders", mergeObjects({}, {
        id: buildExternalRiderId(
          normalizedIqama,
          payload.fullName || payload.displayName || "",
          payload.contactPhone || payload.phone || ""
        ),
        sourceTimestamp: payload.sourceTimestamp || now,
        iqama: normalizedIqama,
        fullName: normalizeText(payload.fullName || payload.displayName),
        contactPhone: normalizeText(payload.contactPhone || payload.phone),
        riderType: normalizeText(payload.riderType || payload.employmentType || "external"),
        vehicleDisplay: normalizeText(payload.vehicleDisplay || payload.vehicleType),
        gasCard: normalizeText(payload.gasCard),
        tools: normalizeText(payload.tools),
        nationality: normalizeText(payload.nationality),
        appPhone: normalizeText(payload.appPhone),
        iban: normalizeText(payload.iban),
        currentUserDisplay: normalizeText(payload.currentUserDisplay || payload.currentUserSummary),
        createdByEmail: normalizeText(payload.createdByEmail || actorId),
        updatedByEmail: normalizeText(payload.updatedByEmail || actorId),
        city: resolvedCity,
        register: resolvedRegister,
        platform: normalizeText(payload.platform || context.platform),
        notes: normalizeText(payload.notes || payload.note),
        sourceBatchId: normalizeText(payload.sourceBatchId || context.sourceBatchId),
        createdAt: now,
        updatedAt: now,
        status: "active"
      }));

      var operationalProfile = upsertProfileRecord(dataStore, existingProfile, {
        appPhone: payload.appPhone,
        contactPhone: payload.contactPhone || payload.phone,
        currentUserSummary: payload.currentUserSummary || payload.currentUserDisplay,
        gasCard: payload.gasCard,
        iban: payload.iban,
        iqama: normalizedIqama,
        lastUpdatedBy: actorId,
        lastUpdatedAt: now,
        notes: payload.notes || payload.note,
        platform: payload.platform || context.platform,
        preferredCity: payload.preferredCity || resolvedCity,
        preferredRegister: payload.preferredRegister || resolvedRegister,
        riderId: payload.riderId || "",
        riderSource: "External",
        sourceBatchId: payload.sourceBatchId || context.sourceBatchId,
        tools: payload.tools
      });

      createAuditEvent(auditLog, {
        actor: context.user,
        after: externalRider,
        before: null,
        entityId: externalRider.id,
        entityType: "externalRiders",
        eventType: "external_rider_created",
        idempotencyKey: context.idempotencyKey || ("external_rider_created:" + externalRider.id + ":" + now),
        reason: normalizeText(context.reason || payload.notes || payload.note || "External rider created from rider resolver."),
        source: normalizeText(context.source || "rider_resolver_service")
      });

      return {
        externalRider: externalRider,
        operationalProfile: operationalProfile
      };
    }

    function updateExternalRider(iqama, payload, context) {
      payload = payload || {};
      context = context || {};

      var normalizedIqama = normalizeText(iqama || payload.iqama);
      if (!normalizedIqama) {
        throw new Error("Rider iqama is required.");
      }

      var collections = loadCollections(dataStore);
      var resolution = resolveIdentity(normalizedIqama, collections);
      if (resolution.hrProfile && !resolution.externalRider) {
        throw new Error("HR riders cannot be edited as external rider identities.");
      }
      if (!resolution.externalRider) {
        throw new Error("External rider does not exist.");
      }

      var existingExternal = resolution.externalRider;
      var resolvedCity = normalizeText(payload.city) ||
        normalizeText(existingExternal.city) ||
        normalizeText(context.city);
      var resolvedRegister = normalizeRegister(payload.register) ||
        normalizeRegister(existingExternal.register) ||
        normalizeRegister(context.register);

      ensureMutationAccess(context.user, resolvedCity, resolvedRegister, context.organizationContext);

      var now = nowProvider();
      var actorId = resolveActorId(context.user, payload.updatedByEmail || existingExternal.updatedByEmail || "");
      var operationalProfile = findOperationalProfile(collections.riderOperationalProfiles, normalizedIqama);
      var updatedExternal = dataStore.upsert("externalRiders", mergeObjects({}, existingExternal, {
        fullName: chooseValue(payload.fullName || payload.displayName, existingExternal.fullName),
        contactPhone: chooseValue(payload.contactPhone || payload.phone, existingExternal.contactPhone),
        riderType: chooseValue(payload.riderType || payload.employmentType, existingExternal.riderType),
        vehicleDisplay: chooseValue(payload.vehicleDisplay || payload.vehicleType, existingExternal.vehicleDisplay),
        gasCard: chooseValue(payload.gasCard, existingExternal.gasCard),
        tools: chooseValue(payload.tools, existingExternal.tools),
        nationality: chooseValue(payload.nationality, existingExternal.nationality),
        appPhone: chooseValue(payload.appPhone, existingExternal.appPhone),
        iban: chooseValue(payload.iban, existingExternal.iban),
        currentUserDisplay: chooseValue(payload.currentUserDisplay || payload.currentUserSummary, existingExternal.currentUserDisplay),
        updatedByEmail: normalizeText(payload.updatedByEmail || actorId),
        city: resolvedCity,
        register: resolvedRegister,
        platform: chooseValue(payload.platform || context.platform, existingExternal.platform),
        notes: chooseValue(payload.notes || payload.note, existingExternal.notes),
        sourceBatchId: chooseValue(payload.sourceBatchId || context.sourceBatchId, existingExternal.sourceBatchId),
        updatedAt: now
      }));

      var updatedProfile = upsertProfileRecord(dataStore, operationalProfile, {
        appPhone: chooseValue(payload.appPhone, operationalProfile && operationalProfile.appPhone),
        contactPhone: chooseValue(payload.contactPhone || payload.phone, operationalProfile && operationalProfile.contactPhone),
        currentUserSummary: chooseValue(payload.currentUserSummary || payload.currentUserDisplay, operationalProfile && operationalProfile.currentUserSummary),
        gasCard: chooseValue(payload.gasCard, operationalProfile && operationalProfile.gasCard),
        iban: chooseValue(payload.iban, operationalProfile && operationalProfile.iban),
        iqama: normalizedIqama,
        lastUpdatedBy: actorId,
        lastUpdatedAt: now,
        notes: chooseValue(payload.notes || payload.note, operationalProfile && operationalProfile.notes),
        platform: chooseValue(payload.platform || context.platform, operationalProfile && operationalProfile.preferredPlatform),
        preferredCity: chooseValue(payload.preferredCity || resolvedCity, operationalProfile && operationalProfile.preferredCity),
        preferredRegister: chooseValue(payload.preferredRegister || resolvedRegister, operationalProfile && operationalProfile.preferredRegister),
        riderId: chooseValue(payload.riderId, operationalProfile && operationalProfile.riderId),
        riderSource: "External",
        sourceBatchId: chooseValue(payload.sourceBatchId || context.sourceBatchId, operationalProfile && operationalProfile.sourceBatchId),
        tools: chooseValue(payload.tools, operationalProfile && operationalProfile.tools)
      });

      createAuditEvent(auditLog, {
        actor: context.user,
        after: updatedExternal,
        before: existingExternal,
        entityId: updatedExternal.id,
        entityType: "externalRiders",
        eventType: "external_rider_updated",
        idempotencyKey: context.idempotencyKey || ("external_rider_updated:" + updatedExternal.id + ":" + now),
        reason: normalizeText(context.reason || payload.notes || payload.note || "External rider identity updated."),
        source: normalizeText(context.source || "rider_resolver_service")
      });

      return {
        externalRider: updatedExternal,
        operationalProfile: updatedProfile
      };
    }

    function upsertRiderOperationalProfile(payload, context) {
      payload = payload || {};
      context = context || {};

      var normalizedIqama = normalizeText(payload.iqama);
      if (!normalizedIqama) {
        throw new Error("Rider iqama is required.");
      }

      var collections = loadCollections(dataStore);
      var resolution = resolveIdentity(normalizedIqama, collections);
      var source = resolution.hrProfile
        ? "HR"
        : resolution.externalRider
          ? "External"
          : normalizeText(payload.riderSource || "Unknown");
      if (source === "Unknown" && !findOperationalProfile(collections.riderOperationalProfiles, normalizedIqama)) {
        throw new Error("Create or resolve the rider identity before saving the operational profile.");
      }

      var existingProfile = findOperationalProfile(collections.riderOperationalProfiles, normalizedIqama);
      var resolvedCity = normalizeText(payload.preferredCity) ||
        normalizeText(existingProfile && existingProfile.preferredCity) ||
        normalizeText(resolution.hrProfile && resolution.hrProfile.city) ||
        normalizeText(resolution.externalRider && resolution.externalRider.city) ||
        normalizeText(context.city);
      var resolvedRegister = normalizeRegister(payload.preferredRegister) ||
        normalizeRegister(existingProfile && existingProfile.preferredRegister) ||
        normalizeRegister(resolution.hrProfile && (resolution.hrProfile.register || resolution.hrProfile.registerName)) ||
        normalizeRegister(resolution.externalRider && resolution.externalRider.register) ||
        normalizeRegister(context.register);

      ensureMutationAccess(context.user, resolvedCity, resolvedRegister, context.organizationContext);

      var now = nowProvider();
      var actorId = resolveActorId(context.user, payload.lastUpdatedBy || payload.updatedByEmail || "");
      var profile = upsertProfileRecord(dataStore, existingProfile, {
        appPhone: payload.appPhone,
        contactPhone: payload.contactPhone || payload.phone,
        currentUserSummary: payload.currentUserSummary || payload.currentUserDisplay,
        gasCard: payload.gasCard,
        iban: payload.iban,
        iqama: normalizedIqama,
        lastUpdatedBy: actorId,
        lastUpdatedAt: now,
        notes: payload.notes || payload.note,
        platform: payload.preferredPlatform || payload.platform || context.platform,
        preferredCity: resolvedCity,
        preferredRegister: resolvedRegister,
        riderId: payload.riderId || resolution.riderId || existingProfile && existingProfile.riderId || "",
        riderSource: source,
        sourceBatchId: payload.sourceBatchId || context.sourceBatchId,
        tools: payload.tools
      });

      createAuditEvent(auditLog, {
        actor: context.user,
        after: profile,
        before: existingProfile || null,
        entityId: profile.id,
        entityType: "riderOperationalProfiles",
        eventType: "rider_profile_updated",
        idempotencyKey: context.idempotencyKey || ("rider_profile_updated:" + profile.id + ":" + now),
        reason: normalizeText(context.reason || payload.notes || payload.note || "Rider operational profile updated."),
        source: normalizeText(context.source || "rider_resolver_service")
      });

      return profile;
    }

    return {
      createExternalRider: createExternalRider,
      updateExternalRider: updateExternalRider,
      upsertRiderOperationalProfile: upsertRiderOperationalProfile
    };
  }

  function loadCollections(dataStore) {
    return {
      externalRiders: getCollection(dataStore, "externalRiders"),
      hrProfiles: getCollection(dataStore, "hrProfiles"),
      riderOperationalProfiles: getCollection(dataStore, "riderOperationalProfiles"),
      riders: getCollection(dataStore, "riders")
    };
  }

  function getCollection(dataStore, entityName) {
    return dataStore && typeof dataStore.getAll === "function"
      ? dataStore.getAll(entityName)
      : [];
  }

  function resolveIdentity(iqama, collections) {
    if (resolveRiderIdentity) {
      return resolveRiderIdentity({ iqama: iqama }, collections);
    }
    return {
      allowCreateExternal: true,
      externalRider: null,
      hrProfile: null,
      iqama: iqama,
      rider: null,
      riderId: "",
      riderSource: "Unknown"
    };
  }

  function ensureMutationAccess(user, city, register, organizationContext) {
    if (!user) {
      throw new Error("Authenticated user is required.");
    }
    if (!hasAnyPermission(user, ["hr.edit", "operations.editStatus", "operations.assign", "operations.swap"])) {
      throw new Error("Permission denied: rider resolver mutation.");
    }
    if (city && RBAC && typeof RBAC.canAccessCity === "function" && user.cityScope !== "all" && !RBAC.canAccessCity(user, city)) {
      throw new Error("Operation city is outside the current user scope.");
    }
    if (register && RBAC && user.registerScope !== "all") {
      var allowed = normalizeList(user.selectedRegisters).some(function (code) {
        return matchRegisterScope(code, register);
      });
      if (!allowed) {
        throw new Error("Operation register is outside the current user scope.");
      }
    }
    if (organizationContext && city && Array.isArray(organizationContext.selectedCities) && organizationContext.cityScope !== "all" && organizationContext.selectedCities.length && organizationContext.selectedCities.indexOf(city) < 0) {
      throw new Error("Operation city is outside the current organization selector.");
    }
    if (organizationContext && register && Array.isArray(organizationContext.selectedRegisters) && organizationContext.registerScope !== "all" && organizationContext.selectedRegisters.length) {
      var matched = organizationContext.selectedRegisters.some(function (code) {
        return matchRegisterScope(code, register);
      });
      if (!matched) {
        throw new Error("Operation register is outside the current organization selector.");
      }
    }
  }

  function hasAnyPermission(user, permissions) {
    if (!RBAC || typeof RBAC.canPerform !== "function") {
      return true;
    }
    return (permissions || []).some(function (permission) {
      return RBAC.canPerform(user, permission);
    });
  }

  function findOperationalProfile(rows, iqama) {
    var normalizedIqama = normalizeText(iqama);
    return (rows || []).filter(function (item) {
      return normalizeText(item && item.iqama) === normalizedIqama;
    })[0] || null;
  }

  function upsertProfileRecord(dataStore, existingProfile, payload) {
    var normalizedIqama = normalizeText(payload.iqama);
    return dataStore.upsert("riderOperationalProfiles", mergeObjects({}, existingProfile || {}, {
      id: existingProfile && existingProfile.id
        ? existingProfile.id
        : buildOperationalProfileId(normalizedIqama, payload.riderId || ""),
      iqama: normalizedIqama,
      riderId: normalizeText(payload.riderId),
      riderSource: normalizeText(payload.riderSource || "Unknown"),
      contactPhone: normalizeText(payload.contactPhone),
      appPhone: normalizeText(payload.appPhone),
      iban: normalizeText(payload.iban),
      gasCard: normalizeText(payload.gasCard),
      tools: normalizeText(payload.tools),
      currentUserSummary: normalizeText(payload.currentUserSummary),
      preferredPlatform: normalizeText(payload.platform),
      preferredCity: normalizeText(payload.preferredCity),
      preferredRegister: normalizeRegister(payload.preferredRegister),
      lastUpdatedBy: normalizeText(payload.lastUpdatedBy),
      lastUpdatedAt: normalizeText(payload.lastUpdatedAt),
      sourceBatchId: normalizeText(payload.sourceBatchId),
      notes: normalizeText(payload.notes),
      status: "active"
    }));
  }

  function createAuditEvent(auditLog, payload) {
    if (!auditLog || typeof auditLog.createAuditEvent !== "function") {
      return null;
    }
    return auditLog.createAuditEvent(payload);
  }

  function resolveActorId(user, fallbackEmail) {
    return normalizeText(user && (user.email || user.username || user.id)) || normalizeText(fallbackEmail);
  }

  function chooseValue(nextValue, fallbackValue) {
    return normalizeText(nextValue) ? normalizeText(nextValue) : normalizeText(fallbackValue);
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

  function stableId(prefix, values) {
    return [prefix].concat((values || []).map(function (value) {
      return normalizeText(value).replace(/[^\w\u0600-\u06ff-]+/g, "_");
    })).join("::");
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
    createRiderOperationalProfileService: createRiderOperationalProfileService
  };
});
