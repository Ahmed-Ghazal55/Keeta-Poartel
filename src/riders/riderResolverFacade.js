(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("../hr/riderIdentityResolver.js"),
      require("./riderOperationalProfileService.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.RiderResolverFacade = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.RiderIdentityResolver,
    root.KeetaPortal.RiderOperationalProfileService
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, RiderIdentityResolver, RiderOperationalProfileService) {
  "use strict";

  var normalizeText = ImportTypes && typeof ImportTypes.normalizeText === "function"
    ? ImportTypes.normalizeText
    : function (value) { return String(value == null ? "" : value).trim(); };
  var normalizeRegister = ImportTypes && typeof ImportTypes.normalizeRegisterCode === "function"
    ? ImportTypes.normalizeRegisterCode
    : function (value) { return normalizeText(value); };
  var resolveRiderIdentity = RiderIdentityResolver && typeof RiderIdentityResolver.resolveRiderIdentity === "function"
    ? RiderIdentityResolver.resolveRiderIdentity
    : null;

  function createRiderResolverFacade(options) {
    options = options || {};
    var dataStore = options.dataStore;
    var profileService = options.profileService ||
      (RiderOperationalProfileService && typeof RiderOperationalProfileService.createRiderOperationalProfileService === "function"
        ? RiderOperationalProfileService.createRiderOperationalProfileService(options)
        : null);

    function resolveRiderByIqama(iqama, extraOptions) {
      extraOptions = extraOptions || {};

      var normalizedIqama = normalizeText(iqama);
      if (!normalizedIqama) {
        return createEmptyViewModel("");
      }

      var collections = loadCollections(dataStore);
      var resolution = resolveRiderIdentity
        ? resolveRiderIdentity({ iqama: normalizedIqama }, collections)
        : {
            allowCreateExternal: true,
            externalRider: null,
            hrProfile: null,
            iqama: normalizedIqama,
            rider: findRider(collections.riders, normalizedIqama),
            riderId: "",
            riderSource: "Unknown"
          };
      var profile = findProfile(collections.riderOperationalProfiles, normalizedIqama);
      var rider = resolution.rider || (profile && profile.riderId ? findRiderById(collections.riders, profile.riderId) : null);
      var source = resolution.hrProfile
        ? "HR"
        : resolution.externalRider
          ? "External"
          : profile && normalizeText(profile.riderSource)
            ? normalizeText(profile.riderSource)
            : "Unknown";
      var activeAssignment = findLatestActiveAssignment(collections.assignments, normalizedIqama, rider && rider.id);
      var currentDashboardUser = activeAssignment
        ? findDashboardUser(collections.dashboardUsers, activeAssignment.dashboardUserId || activeAssignment.userId)
        : null;
      var currentVehicleUsage = findCurrentVehicleUsage(collections.riderVehicleUsageHistory, normalizedIqama);
      var warnings = [];
      var issues = [];

      if (resolution.hrProfile && resolution.externalRider) {
        warnings.push("hr_identity_overrides_external_identity");
      }
      if (!profile && (resolution.hrProfile || resolution.externalRider)) {
        warnings.push("missing_operational_profile");
      }
      if (currentDashboardUser && currentVehicleUsage && normalizeText(currentVehicleUsage.vehicleRegister) && normalizeRegister(currentVehicleUsage.vehicleRegister) !== normalizeRegister(currentDashboardUser.register)) {
        warnings.push("vehicle_register_mismatch");
      }
      if (!activeAssignment && currentDashboardUser) {
        warnings.push("dashboard_user_without_active_assignment");
      }
      if (!resolution.hrProfile && !resolution.externalRider && !rider && !profile) {
        issues.push("rider_not_found");
      }

      return mergeObjects(createEmptyViewModel(normalizedIqama), {
        found: !!(resolution.hrProfile || resolution.externalRider || rider || profile),
        riderSource: source,
        fullName: resolveDisplayName(resolution.hrProfile, resolution.externalRider, rider),
        contactPhone: chooseValue(
          profile && profile.contactPhone,
          resolution.externalRider && resolution.externalRider.contactPhone,
          resolution.hrProfile && (resolution.hrProfile.phone || resolution.hrProfile.alternatePhone),
          rider && Array.isArray(rider.phones) ? rider.phones[0] : ""
        ),
        appPhone: chooseValue(
          profile && profile.appPhone,
          resolution.externalRider && resolution.externalRider.appPhone
        ),
        iban: chooseValue(
          profile && profile.iban,
          resolution.externalRider && resolution.externalRider.iban,
          resolution.hrProfile && resolution.hrProfile.iban
        ),
        gasCard: chooseValue(
          profile && profile.gasCard,
          resolution.externalRider && resolution.externalRider.gasCard
        ),
        tools: chooseValue(
          profile && profile.tools,
          resolution.externalRider && resolution.externalRider.tools
        ),
        nationality: chooseValue(
          resolution.externalRider && resolution.externalRider.nationality,
          resolution.hrProfile && resolution.hrProfile.nationality,
          rider && rider.nationality
        ),
        currentUserSummary: chooseValue(
          profile && profile.currentUserSummary,
          resolution.externalRider && resolution.externalRider.currentUserDisplay,
          buildCurrentUserSummary(currentDashboardUser, activeAssignment)
        ),
        currentVehicleSummary: buildVehicleSummary(currentVehicleUsage, currentDashboardUser),
        canCreateExternal: !resolution.hrProfile && !resolution.externalRider && !!normalizedIqama,
        canEditIdentity: !resolution.hrProfile,
        canEditOperationalProfile: !!(resolution.hrProfile || resolution.externalRider || rider || profile),
        warnings: warnings,
        issues: issues,
        hrProfile: resolution.hrProfile || null,
        externalRider: resolution.externalRider || null,
        rider: rider || null,
        operationalProfile: profile || null,
        currentAssignment: activeAssignment || null,
        currentDashboardUser: currentDashboardUser || null,
        currentVehicleUsage: currentVehicleUsage || null,
        preferredCity: chooseValue(profile && profile.preferredCity, resolution.hrProfile && resolution.hrProfile.city, resolution.externalRider && resolution.externalRider.city),
        preferredRegister: chooseValue(profile && profile.preferredRegister, resolution.hrProfile && resolution.hrProfile.register, resolution.externalRider && resolution.externalRider.register),
        sponsorRegister: chooseValue(resolution.hrProfile && (resolution.hrProfile.registerName || resolution.hrProfile.register), resolution.hrProfile && resolution.hrProfile.sponsorCompany),
        hrStatus: chooseValue(resolution.hrProfile && (resolution.hrProfile.hrStatus || resolution.hrProfile.status), ""),
        externalStatus: chooseValue(resolution.externalRider && resolution.externalRider.status, "")
      });
    }

    function getRiderOperationalProfile(iqama) {
      return findProfile(getCollection(dataStore, "riderOperationalProfiles"), normalizeText(iqama));
    }

    function upsertRiderOperationalProfile(payload, context) {
      if (!profileService || typeof profileService.upsertRiderOperationalProfile !== "function") {
        throw new Error("Rider operational profile service is not available.");
      }
      profileService.upsertRiderOperationalProfile(payload, context);
      return resolveRiderByIqama(payload && payload.iqama, { allowCreateExternal: false });
    }

    function createExternalRider(payload, context) {
      if (!profileService || typeof profileService.createExternalRider !== "function") {
        throw new Error("Rider operational profile service is not available.");
      }
      profileService.createExternalRider(payload, context);
      return resolveRiderByIqama(payload && payload.iqama, { allowCreateExternal: false });
    }

    function updateExternalRider(iqama, payload, context) {
      if (!profileService || typeof profileService.updateExternalRider !== "function") {
        throw new Error("Rider operational profile service is not available.");
      }
      profileService.updateExternalRider(iqama, payload, context);
      return resolveRiderByIqama(iqama || payload && payload.iqama, { allowCreateExternal: false });
    }

    function prepareRiderForAssignment(iqama, extraOptions) {
      extraOptions = extraOptions || {};
      var resolved = resolveRiderByIqama(iqama, extraOptions);
      return mergeObjects({}, resolved, {
        allowInlineExternalCreation: !!(resolved.canCreateExternal && extraOptions.allowCreateExternal),
        assignmentReady: !!(resolved.found || (resolved.canCreateExternal && extraOptions.allowCreateExternal))
      });
    }

    return {
      createExternalRider: createExternalRider,
      getRiderOperationalProfile: getRiderOperationalProfile,
      prepareRiderForAssignment: prepareRiderForAssignment,
      resolveRiderByIqama: resolveRiderByIqama,
      updateExternalRider: updateExternalRider,
      upsertRiderOperationalProfile: upsertRiderOperationalProfile
    };
  }

  function loadCollections(dataStore) {
    return {
      assignments: getCollection(dataStore, "assignments"),
      dashboardUsers: getCollection(dataStore, "dashboardUsers"),
      externalRiders: getCollection(dataStore, "externalRiders"),
      hrProfiles: getCollection(dataStore, "hrProfiles"),
      riderOperationalProfiles: getCollection(dataStore, "riderOperationalProfiles"),
      riderVehicleUsageHistory: getCollection(dataStore, "riderVehicleUsageHistory"),
      riders: getCollection(dataStore, "riders")
    };
  }

  function getCollection(dataStore, entityName) {
    return dataStore && typeof dataStore.getAll === "function"
      ? dataStore.getAll(entityName)
      : [];
  }

  function createEmptyViewModel(iqama) {
    return {
      found: false,
      riderSource: "Unknown",
      iqama: normalizeText(iqama),
      fullName: "",
      contactPhone: "",
      appPhone: "",
      iban: "",
      gasCard: "",
      tools: "",
      nationality: "",
      currentUserSummary: "",
      currentVehicleSummary: "",
      canCreateExternal: false,
      canEditIdentity: true,
      canEditOperationalProfile: false,
      warnings: [],
      issues: [],
      hrProfile: null,
      externalRider: null,
      rider: null,
      operationalProfile: null,
      currentAssignment: null,
      currentDashboardUser: null,
      currentVehicleUsage: null,
      preferredCity: "",
      preferredRegister: "",
      sponsorRegister: "",
      hrStatus: "",
      externalStatus: ""
    };
  }

  function findProfile(rows, iqama) {
    var normalizedIqama = normalizeText(iqama);
    return (rows || []).filter(function (item) {
      return normalizeText(item && item.iqama) === normalizedIqama;
    })[0] || null;
  }

  function findRider(rows, iqama) {
    var normalizedIqama = normalizeText(iqama);
    return (rows || []).filter(function (item) {
      return normalizeText(item && item.primaryIqama) === normalizedIqama;
    })[0] || null;
  }

  function findRiderById(rows, riderId) {
    var normalizedId = normalizeText(riderId);
    return (rows || []).filter(function (item) {
      return normalizeText(item && item.id) === normalizedId;
    })[0] || null;
  }

  function findDashboardUser(rows, dashboardUserId) {
    var normalizedId = normalizeText(dashboardUserId);
    return (rows || []).filter(function (item) {
      return normalizeText(item && (item.dashboardUserId || item.userId)) === normalizedId;
    })[0] || null;
  }

  function findLatestActiveAssignment(rows, iqama, riderId) {
    var normalizedIqama = normalizeText(iqama);
    var normalizedRiderId = normalizeText(riderId);
    return (rows || []).filter(function (item) {
      if (normalizeText(item && item.status) !== "active") {
        return false;
      }
      return (normalizedIqama && (
        normalizeText(item.actualRiderIqama) === normalizedIqama ||
        normalizeText(item.riderIqama) === normalizedIqama
      )) || (normalizedRiderId && normalizeText(item.riderId) === normalizedRiderId);
    }).sort(function (left, right) {
      return String(right.updatedAt || right.startDate || "").localeCompare(String(left.updatedAt || left.startDate || ""));
    })[0] || null;
  }

  function findCurrentVehicleUsage(rows, iqama) {
    var normalizedIqama = normalizeText(iqama);
    return (rows || []).filter(function (item) {
      return normalizeText(item && item.riderIqama) === normalizedIqama &&
        (item.active === true || normalizeText(item.status) === "active");
    }).sort(function (left, right) {
      return String(right.startDate || "").localeCompare(String(left.startDate || ""));
    })[0] || null;
  }

  function buildCurrentUserSummary(dashboardUser, assignment) {
    if (!dashboardUser && !assignment) {
      return "";
    }
    var userId = chooseValue(
      dashboardUser && (dashboardUser.dashboardUserId || dashboardUser.userId),
      assignment && (assignment.dashboardUserId || assignment.userId)
    );
    var city = chooseValue(dashboardUser && dashboardUser.city, assignment && assignment.city);
    var register = chooseValue(dashboardUser && dashboardUser.register, assignment && assignment.register);
    return [userId, city, register].filter(Boolean).join(" / ");
  }

  function buildVehicleSummary(vehicleUsage, dashboardUser) {
    var usage = vehicleUsage || {};
    var plateNumber = chooseValue(usage.plateNumber, dashboardUser && dashboardUser.actualUsedVehiclePlateNumber, dashboardUser && dashboardUser.plateNumber);
    var vehicleSerial = chooseValue(usage.vehicleSerial, dashboardUser && dashboardUser.actualUsedVehicleSerial, dashboardUser && dashboardUser.vehicleSerial);
    var vehicleRegister = chooseValue(usage.vehicleRegister, dashboardUser && dashboardUser.register);
    var city = chooseValue(usage.city, dashboardUser && dashboardUser.city);
    var vehicleSource = chooseValue(usage.vehicleSource, usage.vehicleType);
    return [vehicleSource, plateNumber, vehicleSerial, vehicleRegister, city].filter(Boolean).join(" / ");
  }

  function resolveDisplayName(hrProfile, externalRider, rider) {
    return chooseValue(
      hrProfile && (hrProfile.fullNameArabic || hrProfile.fullNameEnglish || hrProfile.fullName),
      externalRider && externalRider.fullName,
      rider && rider.displayName
    );
  }

  function chooseValue() {
    for (var index = 0; index < arguments.length; index += 1) {
      var value = normalizeText(arguments[index]);
      if (value) {
        return value;
      }
    }
    return "";
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
    createRiderResolverFacade: createRiderResolverFacade
  };
});
