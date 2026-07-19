(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("./hrComputedFieldsService.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.HrComputedFields = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.HrComputedFieldsService
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, HrComputedFieldsService) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function computeDriverCard(iqama, dataSources) {
    return HrComputedFieldsService.computeDriverCardSummary(iqama, buildServiceSources(dataSources));
  }

  function computeWorkApps(iqama, dataSources) {
    var accounts = collectAccounts(iqama, dataSources);
    if (!accounts.length) {
      return "لا يعمل حاليا";
    }
    return uniqueStrings(accounts.map(function (account) {
      return account.summary;
    })).join(" | ");
  }

  function computeKeetaCityRegister(iqama, dataSources) {
    var account = findAccount(iqama, dataSources, "keeta");
    if (!account) {
      return "لا يوجد ايدي";
    }
    return [account.city, account.register].filter(Boolean).join(" - ") || "لا يوجد ايدي";
  }

  function computeKeetaId(iqama, dataSources) {
    var account = findAccount(iqama, dataSources, "keeta");
    return account && account.userId ? account.userId : "لا يوجد ايدي";
  }

  function computeHungerId(iqama, dataSources) {
    var account = findAccount(iqama, dataSources, "hungerstation");
    if (account && account.userId) {
      return account.userId + " - له ايدي هنقر في " + (account.branch || account.city || "الفرع غير محدد");
    }
    var issue = findHungerIssue(iqama, dataSources);
    if (issue) {
      return "لا يوجد ايدي والسبب: " + issue;
    }
    return "لا يوجد";
  }

  function computeAmazonId(iqama, dataSources) {
    var account = findAccount(iqama, dataSources, "amazon");
    if (!account || !account.userId) {
      return "لا يوجد ايدي";
    }
    return account.userId + " له ايدي امازون ب" + (account.city || "المدينة غير محددة");
  }

  function computeNinjaId(iqama, dataSources) {
    var account = findAccount(iqama, dataSources, "ninja");
    return account && account.userId ? account.userId : "لا يوجد";
  }

  function computeJahezId(iqama, dataSources) {
    var account = findAccount(iqama, dataSources, "jahez");
    if (!account || !account.userId) {
      return "لا يوجد ايدي";
    }
    return account.userId + " له ايدي جاهز في " + (account.branch || account.city || "الفرع غير محدد");
  }

  function computeChefzId(iqama, dataSources) {
    var account = findAccount(iqama, dataSources, "chefz");
    if (!account) {
      return "لا يوجد بيانات";
    }
    var status = normalizeText(account.status || account.accountStatus || account.activationStatus).toLowerCase();
    var userId = normalizeText(account.userId);
    if (!status && !userId) {
      return "لا يوجد بيانات";
    }
    if (/block|ban|blocked|حظر|ايقاف/.test(status)) {
      return (userId || "لا يوجد ايدي") + " - إيقاف وحظر";
    }
    if (/review|pending|رفع|مراجعة/.test(status)) {
      return (userId || "لا يوجد ايدي") + " - قيد المراجعة";
    }
    if (/inactive|not_working|غير نشط|stopped/.test(status)) {
      return "لا يوجد ايدي (غير نشط)";
    }
    if (/active|working|نشط/.test(status)) {
      return (userId || "لا يوجد ايدي") + " - له ايدي شيفز (نشط)";
    }
    return status || userId
      ? ((userId || "لا يوجد ايدي") + " - حالة غير معروفة")
      : "لا يوجد بيانات";
  }

  function computeHrDisplayRow(hrProfile, dataSources) {
    var serviceRow = HrComputedFieldsService.computeHrDisplayRow(hrProfile || {}, buildServiceSources(dataSources));
    var iqama = normalizeText(serviceRow.iqama || hrProfile && hrProfile.iqama);
    return mergeObjects({}, serviceRow, {
      driverCardSummary: computeDriverCard(iqama, dataSources),
      workApplicationsSummary: computeWorkApps(iqama, dataSources),
      keetaCityRegister: computeKeetaCityRegister(iqama, dataSources),
      keetaId: computeKeetaId(iqama, dataSources),
      hungerId: computeHungerId(iqama, dataSources),
      amazonId: computeAmazonId(iqama, dataSources),
      ninjaId: computeNinjaId(iqama, dataSources),
      jahezId: computeJahezId(iqama, dataSources),
      chefzId: computeChefzId(iqama, dataSources)
    });
  }

  function buildServiceSources(dataSources) {
    var sources = dataSources || {};
    var platformAccounts = []
      .concat(normalizePlatformRows(sources.keetaJeddahPerformance, "keeta", "جدة"))
      .concat(normalizePlatformRows(sources.keetaRiyadhPerformance, "keeta", "الرياض"))
      .concat(normalizePlatformRows(sources.keetaIds, "keeta"))
      .concat(normalizePlatformRows(sources.hungerData, "hungerstation"))
      .concat(normalizePlatformRows(sources.amazonData, "amazon"))
      .concat(normalizePlatformRows(sources.ninjaData, "ninja"))
      .concat(normalizePlatformRows(sources.jahezAllBranches, "jahez"))
      .concat(normalizePlatformRows(sources.chefzData, "chefz"))
      .concat(sources.riderPlatformAccounts || []);
    return {
      dashboardUsers: sources.dashboardUsers || [],
      driverCards: sources.driverCards || [],
      riderPlatformAccounts: platformAccounts
    };
  }

  function collectAccounts(iqama, dataSources) {
    var serviceSources = buildServiceSources(dataSources);
    var platforms = [
      { key: "keeta", label: "كيتا" },
      { key: "hungerstation", label: "هنقر" },
      { key: "amazon", label: "امازون" },
      { key: "ninja", label: "نينجا" },
      { key: "jahez", label: "جاهز" },
      { key: "chefz", label: "شيفز" }
    ];
    return platforms.map(function (platform) {
      var account = findAccount(iqama, serviceSources, platform.key);
      if (!account || !account.userId) {
        return null;
      }
      var scope = [account.city, account.branch || account.register].filter(Boolean).join(" - ");
      return {
        platform: platform.key,
        summary: [platform.label, scope, account.userId].filter(Boolean).join(" - ")
      };
    }).filter(Boolean);
  }

  function findAccount(iqama, dataSources, platformKey) {
    var serviceSources = dataSources && dataSources.riderPlatformAccounts ? dataSources : buildServiceSources(dataSources);
    var normalizedIqama = normalizeText(iqama);
    var platform = normalizePlatform(platformKey);
    var rows = [].concat(serviceSources.riderPlatformAccounts || [], serviceSources.dashboardUsers || []);
    for (var index = 0; index < rows.length; index += 1) {
      var row = rows[index];
      if (!matchesIqama(row, normalizedIqama)) {
        continue;
      }
      if (normalizePlatform(row.platform || row.applicationName) !== platform) {
        continue;
      }
      return {
        branch: normalizeText(row.branch),
        city: normalizeText(row.city),
        register: normalizeText(row.register),
        status: normalizeText(row.status || row.accountStatus || row.activationStatus),
        userId: normalizeText(row.userId || row.dashboardUserId)
      };
    }
    return null;
  }

  function findHungerIssue(iqama, dataSources) {
    var normalizedIqama = normalizeText(iqama);
    var rows = dataSources && dataSources.hungerIssues || [];
    for (var index = 0; index < rows.length; index += 1) {
      var row = rows[index];
      if (matchesIqama(row, normalizedIqama)) {
        return normalizeText(row.issue || row.reason || row.message || row.status);
      }
    }
    return "";
  }

  function normalizePlatformRows(rows, platform, cityOverride) {
    return (rows || []).map(function (row) {
      return {
        accountStatus: normalizeText(row.status || row.accountStatus || row.activationStatus),
        activationStatus: normalizeText(row.status || row.activationStatus),
        branch: normalizeText(row.branch || row.register || row["اسم الفرع"]),
        city: normalizeText(cityOverride || row.city || row["المدينة"]),
        dashboardUserId: normalizeText(row.dashboardUserId || row.userId || row.id || row["Courier ID"] || row["رقم الأيدي"]),
        iqama: normalizeText(row.iqama || row.ownerIqama || row.primaryIqama || row["رقم الهوية"] || row["رقم الاقامة"] || row["رقم الإقامة"]),
        platform: platform,
        register: normalizeText(row.register || row.branch || row["اسم السجل"]),
        status: normalizeText(row.status || row.accountStatus || row.activationStatus),
        userId: normalizeText(row.userId || row.dashboardUserId || row.id || row["Courier ID"] || row["رقم الأيدي"])
      };
    }).filter(function (row) {
      return row.iqama || row.userId;
    });
  }

  function matchesIqama(row, normalizedIqama) {
    if (!row || !normalizedIqama) {
      return false;
    }
    return [
      row.iqama,
      row.ownerIqama,
      row.primaryIqama,
      row.currentRiderIqama,
      row["رقم الهوية"],
      row["رقم الاقامة"],
      row["رقم الإقامة"]
    ].some(function (value) {
      return normalizeText(value) === normalizedIqama;
    });
  }

  function normalizePlatform(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (/hunger|هنقر/.test(normalized)) {
      return "hungerstation";
    }
    return normalized;
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

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  return {
    computeAmazonId: computeAmazonId,
    computeChefzId: computeChefzId,
    computeDriverCard: computeDriverCard,
    computeHrDisplayRow: computeHrDisplayRow,
    computeHungerId: computeHungerId,
    computeJahezId: computeJahezId,
    computeKeetaCityRegister: computeKeetaCityRegister,
    computeKeetaId: computeKeetaId,
    computeNinjaId: computeNinjaId,
    computeWorkApps: computeWorkApps
  };
});
