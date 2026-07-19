(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../import/importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.RiderIdentityResolver = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  var normalizeText = ImportTypes && typeof ImportTypes.normalizeText === "function"
    ? ImportTypes.normalizeText
    : function (value) { return String(value == null ? "" : value).trim(); };

  function resolveRiderIdentity(payload, collections) {
    payload = payload || {};
    collections = collections || {};

    var normalizedIqama = normalizeText(payload.iqama);
    var hrProfile = findByIqama(collections.hrProfiles, normalizedIqama, "iqama");
    var externalRider = findByIqama(collections.externalRiders, normalizedIqama, "iqama");
    var rider = findRider(collections.riders, normalizedIqama, payload.riderId);
    var riderSource = hrProfile ? "HR" : (externalRider ? "External" : (normalizeText(payload.riderSource) || "External"));

    if (!rider && hrProfile) {
      rider = findRiderByIqamaOrName(collections.riders, normalizedIqama, hrProfile.fullNameArabic || hrProfile.fullNameEnglish || hrProfile.fullName);
    }
    if (!rider && externalRider) {
      rider = findRiderByIqamaOrName(collections.riders, normalizedIqama, externalRider.fullName);
    }

    return {
      allowCreateExternal: !hrProfile && !externalRider,
      externalRider: externalRider || null,
      hrProfile: hrProfile || null,
      iqama: normalizedIqama,
      rider: rider || null,
      riderId: rider && rider.id ? rider.id : "",
      riderSource: riderSource
    };
  }

  function buildExternalRiderId(iqama, fullName, phone) {
    return stableId("externalRiders", [iqama || "", fullName || "", phone || ""]);
  }

  function buildOperationalProfileId(iqama, riderId) {
    return stableId("riderOperationalProfiles", [iqama || "", riderId || ""]);
  }

  function findByIqama(rows, iqama, fieldName) {
    var target = normalizeText(iqama);
    if (!target) {
      return null;
    }
    return (rows || []).filter(function (item) {
      return normalizeText(item && item[fieldName || "iqama"]) === target;
    })[0] || null;
  }

  function findRider(rows, iqama, riderId) {
    var targetId = normalizeText(riderId);
    if (targetId) {
      var byId = (rows || []).filter(function (item) {
        return normalizeText(item && item.id) === targetId;
      })[0];
      if (byId) {
        return byId;
      }
    }
    return findRiderByIqamaOrName(rows, iqama, "");
  }

  function findRiderByIqamaOrName(rows, iqama, fullName) {
    var normalizedIqama = normalizeText(iqama);
    var normalizedName = normalizeText(fullName).toLowerCase();
    return (rows || []).filter(function (item) {
      if (normalizedIqama && normalizeText(item && item.primaryIqama) === normalizedIqama) {
        return true;
      }
      if (!normalizedName) {
        return false;
      }
      return normalizeText(item && item.displayName).toLowerCase() === normalizedName ||
        normalizeText(item && item.normalizedName).toLowerCase() === normalizedName;
    })[0] || null;
  }

  function stableId(entityName, parts) {
    return entityName + "::" + (parts || []).map(function (value) {
      return normalizeText(value).replace(/[^\w\u0600-\u06ff-]+/g, "_");
    }).join("::");
  }

  return {
    buildExternalRiderId: buildExternalRiderId,
    buildOperationalProfileId: buildOperationalProfileId,
    resolveRiderIdentity: resolveRiderIdentity
  };
});
