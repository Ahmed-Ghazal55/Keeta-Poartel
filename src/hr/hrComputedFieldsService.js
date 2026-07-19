(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../import/importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.HrComputedFieldsService = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function computeDriverCardSummary(iqama, dataSources) {
    var record = findDriverCardRecord(iqama, dataSources);
    if (!record) {
      return "لم يتم اصدار بطاقة سائق بعد";
    }
    if (record.driverCardSummary) {
      return normalizeText(record.driverCardSummary);
    }
    var parts = [
      firstValue(record, ["kValue", "driverCard", "cardNumber", "رقم البطاقة"]),
      firstValue(record, ["qValue", "cardStatus", "status", "تصنيف البطاقة"]),
      firstValue(record, ["rValue", "cardExpiry", "expiry", "تاريخ انتهاء البطاقة"])
    ].filter(Boolean);
    return parts.length ? parts.join(" - ") : "لم يتم اصدار بطاقة سائق بعد";
  }

  function computeWorkApplicationsSummary(iqama, dataSources) {
    var matches = collectAccountMatches(iqama, dataSources);
    if (!matches.length) {
      return "لا توجد بيانات تطبيقات";
    }
    return uniqueStrings(matches.map(function (item) {
      var label = platformLabel(item.platform);
      var scope = [normalizeText(item.city), normalizeText(item.register)].filter(Boolean).join(" / ");
      var identifier = normalizeText(item.userId || item.dashboardUserId);
      return [label, scope ? scope : "", identifier ? "- " + identifier : ""].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    })).join(" | ");
  }

  function computeKeetaCityRegister(iqama, dataSources) {
    var record = findPlatformAccount(iqama, dataSources, "keeta");
    if (!record) {
      return "لا يوجد ايدي";
    }
    var city = normalizeText(record.city);
    var register = normalizeText(record.register);
    return [city, register].filter(Boolean).join(" - ") || "لا يوجد ايدي";
  }

  function computeKeetaId(iqama, dataSources) {
    return computePlatformUserId(iqama, dataSources, "keeta");
  }

  function computeHungerId(iqama, dataSources) {
    return computePlatformUserId(iqama, dataSources, "hungerstation");
  }

  function computeAmazonId(iqama, dataSources) {
    return computePlatformUserId(iqama, dataSources, "amazon");
  }

  function computeNinjaId(iqama, dataSources) {
    return computePlatformUserId(iqama, dataSources, "ninja");
  }

  function computeJahezId(iqama, dataSources) {
    return computePlatformUserId(iqama, dataSources, "jahez");
  }

  function computeChefzId(iqama, dataSources) {
    return computePlatformUserId(iqama, dataSources, "chefz");
  }

  function computeHrDisplayRow(hrProfile, dataSources) {
    hrProfile = hrProfile || {};
    var iqama = normalizeText(hrProfile.iqama);
    return {
      sequence: normalizeText(hrProfile.sequence || hrProfile.rowNumber),
      employeeNumber: normalizeText(hrProfile.employeeId),
      iqama: iqama,
      fullName: normalizeText(hrProfile.fullNameArabic || hrProfile.fullNameEnglish),
      startDate: normalizeText(hrProfile.startDate),
      nationality: normalizeText(hrProfile.nationality),
      professionAtIqama: normalizeText(hrProfile.professionAtIqama),
      jobTitle: normalizeText(hrProfile.jobTitle),
      branch: normalizeText(hrProfile.branch || hrProfile.city),
      residencyExpiry: normalizeText(hrProfile.residencyExpiry || hrProfile.licenseExpiry),
      residencyStatus: normalizeText(hrProfile.residencyStatus),
      sponsorId: normalizeText(hrProfile.sponsorId),
      registerName: normalizeText(hrProfile.registerName || hrProfile.register || hrProfile.sponsorCompany),
      licenseType: normalizeText(hrProfile.licenseType),
      licenseTypeSecondary: normalizeText(hrProfile.licenseTypeSecondary || hrProfile.licenseType),
      kafalaStatus: normalizeText(hrProfile.kafalaStatus || hrProfile.employmentType),
      riderStatus: normalizeText(hrProfile.hrStatus),
      notes: normalizeText(hrProfile.notes),
      licenseState: normalizeText(hrProfile.licenseState),
      driverCardSummary: normalizeText(hrProfile.driverCardSummary) || computeDriverCardSummary(iqama, dataSources),
      workApplicationsSummary: normalizeText(hrProfile.workApplication) || computeWorkApplicationsSummary(iqama, dataSources),
      keetaCityRegister: normalizeText(hrProfile.keetaCityRegister) || computeKeetaCityRegister(iqama, dataSources),
      keetaId: normalizeText(hrProfile.keetaId) || computeKeetaId(iqama, dataSources),
      hungerId: normalizeText(hrProfile.hungerId) || computeHungerId(iqama, dataSources),
      amazonId: normalizeText(hrProfile.amazonId) || computeAmazonId(iqama, dataSources),
      ninjaId: normalizeText(hrProfile.ninjaId) || computeNinjaId(iqama, dataSources),
      jahezId: normalizeText(hrProfile.jahezId) || computeJahezId(iqama, dataSources),
      chefzId: normalizeText(hrProfile.chefzId) || computeChefzId(iqama, dataSources)
    };
  }

  function collectAccountMatches(iqama, dataSources) {
    var normalizedIqama = normalizeText(iqama);
    return [].concat(dataSources && dataSources.riderPlatformAccounts || [], dataSources && dataSources.dashboardUsers || [])
      .filter(function (item) {
        return matchesIqama(item, normalizedIqama);
      })
      .map(function (item) {
        return {
          city: normalizeText(item.city),
          dashboardUserId: normalizeText(item.dashboardUserId || item.userId),
          platform: normalizePlatform(item.platform || item.applicationName),
          register: normalizeText(item.register),
          userId: normalizeText(item.userId || item.dashboardUserId)
        };
      });
  }

  function computePlatformUserId(iqama, dataSources, platform) {
    var record = findPlatformAccount(iqama, dataSources, platform);
    if (!record) {
      return "لا يوجد ايدي";
    }
    return normalizeText(record.userId || record.dashboardUserId) || "لا يوجد ايدي";
  }

  function findDriverCardRecord(iqama, dataSources) {
    var normalizedIqama = normalizeText(iqama);
    return firstMatch([].concat(dataSources && dataSources.driverCards || []), function (item) {
      return matchesIqama(item, normalizedIqama);
    });
  }

  function findPlatformAccount(iqama, dataSources, platform) {
    var normalizedPlatform = normalizePlatform(platform);
    return firstMatch(collectAccountMatches(iqama, dataSources), function (item) {
      return normalizePlatform(item.platform) === normalizedPlatform;
    }) || firstMatch([].concat(dataSources && dataSources.riderPlatformAccounts || [], dataSources && dataSources.dashboardUsers || []), function (item) {
      return matchesIqama(item, normalizeText(iqama)) && normalizePlatform(item.platform || item.applicationName) === normalizedPlatform;
    });
  }

  function matchesIqama(item, normalizedIqama) {
    if (!normalizedIqama || !item) {
      return false;
    }
    return [
      item.iqama,
      item.ownerIqama,
      item.currentRiderIqama,
      item.primaryIqama,
      item.delegatedIqama,
      item.currentUserIqama,
      item["رقم الهوية"],
      item["رقم الإقامة"],
      item["رقم الاقامة"]
    ].some(function (value) {
      return normalizeText(value) === normalizedIqama;
    });
  }

  function platformLabel(platform) {
    var normalized = normalizePlatform(platform);
    var labels = {
      amazon: "امازون",
      chefz: "شفز",
      hungerstation: "هنقر",
      jahez: "جاهز",
      keeta: "كيتا",
      ninja: "نينجا"
    };
    return labels[normalized] || normalizeText(platform) || "غير محدد";
  }

  function normalizePlatform(value) {
    var text = normalizeText(value).toLowerCase();
    if (/hunger|هنقر/.test(text)) {
      return "hungerstation";
    }
    return text;
  }

  function firstMatch(rows, predicate) {
    for (var index = 0; index < (rows || []).length; index += 1) {
      if (predicate(rows[index])) {
        return rows[index];
      }
    }
    return null;
  }

  function firstValue(record, fields) {
    for (var index = 0; index < (fields || []).length; index += 1) {
      var value = normalizeText(record && record[fields[index]]);
      if (value) {
        return value;
      }
    }
    return "";
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

  return {
    computeAmazonId: computeAmazonId,
    computeChefzId: computeChefzId,
    computeDriverCardSummary: computeDriverCardSummary,
    computeHungerId: computeHungerId,
    computeHrDisplayRow: computeHrDisplayRow,
    computeJahezId: computeJahezId,
    computeKeetaCityRegister: computeKeetaCityRegister,
    computeKeetaId: computeKeetaId,
    computeNinjaId: computeNinjaId,
    computeWorkApplicationsSummary: computeWorkApplicationsSummary
  };
});
