(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../import/importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.RiderMatching = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;
  var normalizeRegisterCode = ImportTypes.normalizeRegisterCode;
  var normalizeCity = ImportTypes.normalizeCity;
  var matchUserRegisterScope = ImportTypes.matchUserRegisterScope;

  function normalizeNameForMatch(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/[\u0640]/g, "")
      .replace(/[^\w\u0600-\u06ff\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function namesAreSimilar(left, right) {
    var normalizedLeft = normalizeNameForMatch(left);
    var normalizedRight = normalizeNameForMatch(right);
    if (!normalizedLeft || !normalizedRight) {
      return false;
    }
    if (normalizedLeft === normalizedRight) {
      return true;
    }
    if (normalizedLeft.indexOf(normalizedRight) >= 0 || normalizedRight.indexOf(normalizedLeft) >= 0) {
      return true;
    }
    var leftTokens = normalizedLeft.split(" ").filter(Boolean);
    var rightTokens = normalizedRight.split(" ").filter(Boolean);
    if (!leftTokens.length || !rightTokens.length) {
      return false;
    }
    var overlap = leftTokens.filter(function (token) {
      return rightTokens.indexOf(token) >= 0;
    }).length;
    return overlap >= Math.max(2, Math.min(leftTokens.length, rightTokens.length) - 1);
  }

  function buildMatchingContext(options) {
    options = options || {};
    var riders = options.riders || [];
    var identities = options.identities || [];
    var platformAccounts = options.platformAccounts || [];
    var context = {
      riders: riders.slice(),
      riderById: {},
      riderByIqama: {},
      riderByPhone: {},
      riderByPlatformKey: {},
      identities: identities.slice(),
      platformAccounts: platformAccounts.slice()
    };

    context.riders.forEach(function (rider) {
      context.riderById[rider.id] = rider;
      if (rider.primaryIqama) {
        addToMultiMap(context.riderByIqama, normalizeText(rider.primaryIqama), rider.id);
      }
      (rider.phones || []).forEach(function (phone) {
        addToMultiMap(context.riderByPhone, normalizeText(phone), rider.id);
      });
      (rider.platforms || []).forEach(function (platform) {
        addToMultiMap(context.riderByPlatformKey, platformKey(platform, rider.platformUserId || "", "", ""), rider.id);
      });
    });

    identities.forEach(function (identity) {
      if (!identity.riderId || !identity.normalizedValue) {
        return;
      }
      if (identity.identityType === "iqama") {
        addToMultiMap(context.riderByIqama, identity.normalizedValue, identity.riderId);
      }
      if (identity.identityType === "phone") {
        addToMultiMap(context.riderByPhone, identity.normalizedValue, identity.riderId);
      }
      if (identity.identityType === "platform_user_id") {
        addToMultiMap(context.riderByPlatformKey, platformKey(identity.platform, identity.normalizedValue, identity.city, identity.register), identity.riderId);
      }
    });

    platformAccounts.forEach(function (account) {
      if (!account.riderId || !(account.userId || account.dashboardUserId)) {
        return;
      }
      addToMultiMap(
        context.riderByPlatformKey,
        platformKey(account.platform, account.userId || account.dashboardUserId, account.city, account.register),
        account.riderId
      );
    });

    return context;
  }

  function matchRiderCandidate(candidate, context) {
    candidate = candidate || {};
    context = context || buildMatchingContext({});
    var warnings = [];
    var conflicts = [];
    var iqama = normalizeText(candidate.iqama || candidate.primaryIqama);
    var phone = normalizeText(candidate.phone || (candidate.phones && candidate.phones[0]) || "");
    var platform = normalizeText(candidate.platform).toLowerCase();
    var userId = normalizeText(candidate.userId || candidate.dashboardUserId);
    var city = normalizeCity(candidate.city || "");
    var register = normalizeRegisterCode(candidate.register || "");
    var name = candidate.displayName || candidate.fullName || candidate.name || "";

    if (iqama) {
      var matchedByIqama = unique(context.riderByIqama[iqama] || []);
      if (matchedByIqama.length === 1) {
        return {
          matchedRiderId: matchedByIqama[0],
          confidence: 0.99,
          matchReason: "same_iqama",
          warnings: warnings,
          conflicts: conflicts
        };
      }
      if (matchedByIqama.length > 1) {
        conflicts.push("duplicate_iqama_multiple_riders");
        return {
          matchedRiderId: "",
          confidence: 0.2,
          matchReason: "iqama_conflict",
          warnings: warnings,
          conflicts: conflicts
        };
      }
    }

    if (phone) {
      var matchedByPhone = unique(context.riderByPhone[phone] || []);
      if (matchedByPhone.length === 1) {
        var riderFromPhone = context.riderById[matchedByPhone[0]];
        if (riderFromPhone && namesAreSimilar(name, riderFromPhone.displayName || riderFromPhone.normalizedName)) {
          return {
            matchedRiderId: riderFromPhone.id,
            confidence: 0.84,
            matchReason: "same_phone_similar_name",
            warnings: warnings,
            conflicts: conflicts
          };
        }
        warnings.push("same_phone_name_mismatch");
      }
      if (matchedByPhone.length > 1) {
        conflicts.push("same_phone_multiple_iqamas");
      }
    }

    if (platform && userId) {
      var candidatesByPlatform = unique(
        (context.riderByPlatformKey[platformKey(platform, userId, city, register)] || [])
          .concat(context.riderByPlatformKey[platformKey(platform, userId, "", "")] || [])
      );
      if (candidatesByPlatform.length === 1) {
        return {
          matchedRiderId: candidatesByPlatform[0],
          confidence: 0.74,
          matchReason: "same_platform_user_id_same_scope",
          warnings: warnings,
          conflicts: conflicts
        };
      }
      if (candidatesByPlatform.length > 1) {
        conflicts.push("same_user_id_multiple_iqamas");
      }
    }

    if (name) {
      var similarRiders = context.riders.filter(function (rider) {
        return namesAreSimilar(name, rider.displayName || rider.normalizedName);
      });
      if (similarRiders.length) {
        warnings.push("name_only_similarity");
      }
    }

    return {
      matchedRiderId: "",
      confidence: conflicts.length ? 0.15 : 0,
      matchReason: conflicts.length ? "conflict_requires_review" : "new_rider",
      warnings: warnings,
      conflicts: conflicts
    };
  }

  function mergeRiderRecord(rider, candidate) {
    rider = rider || {};
    candidate = candidate || {};
    return {
      id: rider.id || candidate.id || "",
      primaryIqama: rider.primaryIqama || candidate.primaryIqama || "",
      displayName: rider.displayName || candidate.displayName || "",
      normalizedName: rider.normalizedName || candidate.normalizedName || normalizeNameForMatch(candidate.displayName || rider.displayName || ""),
      nationality: rider.nationality || candidate.nationality || "",
      phones: unique([].concat(rider.phones || []).concat(candidate.phones || []).map(normalizeText).filter(Boolean)),
      cities: unique([].concat(rider.cities || []).concat(candidate.cities || []).map(normalizeCity).filter(Boolean)),
      registers: mergeRegisters(rider.registers, candidate.registers),
      platforms: unique([].concat(rider.platforms || []).concat(candidate.platforms || []).map(function (value) {
        return normalizeText(value).toLowerCase();
      }).filter(Boolean)),
      employmentType: rider.employmentType || candidate.employmentType || "unknown",
      currentWorkStatus: preferWorkStatus(rider.currentWorkStatus, candidate.currentWorkStatus),
      hrProfileId: rider.hrProfileId || candidate.hrProfileId || "",
      riskFlags: unique([].concat(rider.riskFlags || []).concat(candidate.riskFlags || [])),
      notes: mergeNotes(rider.notes, candidate.notes),
      firstSeenAt: rider.firstSeenAt || candidate.firstSeenAt || new Date().toISOString(),
      lastSeenAt: candidate.lastSeenAt || rider.lastSeenAt || new Date().toISOString(),
      sourceFile: rider.sourceFile || candidate.sourceFile || "",
      city: (rider.cities && rider.cities[0]) || (candidate.cities && candidate.cities[0]) || rider.city || candidate.city || "",
      register: (rider.registers && rider.registers[0]) || (candidate.registers && candidate.registers[0]) || rider.register || candidate.register || ""
    };
  }

  function registerCandidateInContext(rider, candidate, context) {
    context.riderById[rider.id] = rider;
    if (rider.primaryIqama) {
      addToMultiMap(context.riderByIqama, rider.primaryIqama, rider.id);
    }
    (rider.phones || []).forEach(function (phone) {
      addToMultiMap(context.riderByPhone, phone, rider.id);
    });
    if (candidate.platform && candidate.userId) {
      addToMultiMap(
        context.riderByPlatformKey,
        platformKey(candidate.platform, candidate.userId, candidate.city, candidate.register),
        rider.id
      );
    }
    if (context.riders.filter(function (item) { return item.id === rider.id; }).length === 0) {
      context.riders.push(rider);
    }
    return context;
  }

  function platformKey(platform, userId, city, register) {
    return [
      normalizeText(platform).toLowerCase(),
      normalizeText(userId),
      normalizeCity(city || ""),
      normalizeRegisterCode(register || "")
    ].join("::");
  }

  function addToMultiMap(map, key, value) {
    key = normalizeText(key);
    if (!key) {
      return;
    }
    map[key] = map[key] || [];
    if (map[key].indexOf(value) < 0) {
      map[key].push(value);
    }
  }

  function unique(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = String(value);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function mergeRegisters(left, right) {
    var values = unique([].concat(left || []).concat(right || []).map(function (value) {
      return normalizeRegisterCode(value) || normalizeText(value);
    }).filter(Boolean));
    if (values.length > 1 && values.some(function (value) {
      return value === "PER_ORDER_FR3PL";
    })) {
      return unique(values.filter(function (value) {
        return value !== "PER_ORDER" && value !== "FR_3PL";
      }).concat(["PER_ORDER_FR3PL"]));
    }
    return values;
  }

  function mergeNotes(left, right) {
    return unique([normalizeText(left), normalizeText(right)]).join(" | ");
  }

  function preferWorkStatus(left, right) {
    var order = ["under_review", "working", "not_working", "previously_worked", "never_worked"];
    var normalizedLeft = normalizeText(left).toLowerCase();
    var normalizedRight = normalizeText(right).toLowerCase();
    if (!normalizedLeft) {
      return normalizedRight || "under_review";
    }
    if (!normalizedRight) {
      return normalizedLeft;
    }
    if (normalizedLeft === normalizedRight) {
      return normalizedLeft;
    }
    return order.indexOf(normalizedRight) < order.indexOf(normalizedLeft) ? normalizedRight : normalizedLeft;
  }

  return {
    buildMatchingContext: buildMatchingContext,
    matchRiderCandidate: matchRiderCandidate,
    mergeRiderRecord: mergeRiderRecord,
    namesAreSimilar: namesAreSimilar,
    normalizeNameForMatch: normalizeNameForMatch,
    platformKey: platformKey,
    registerCandidateInContext: registerCandidateInContext
  };
});
