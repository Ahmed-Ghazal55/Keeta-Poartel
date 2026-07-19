(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("./riderMatching.js"),
      require("./riderArchive.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.HrRiderNormalizer = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.RiderMatching,
    root.KeetaPortal.RiderArchive
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, RiderMatching, RiderArchive) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;
  var normalizeCityBase = ImportTypes.normalizeCity;
  var normalizeRegisterCodeBase = ImportTypes.normalizeRegisterCode;

  function normalizeIqama(value) {
    return normalizeText(value).replace(/[^\d]/g, "");
  }

  function normalizePhone(value) {
    var digits = normalizeText(value).replace(/[^\d]/g, "");
    if (!digits) {
      return "";
    }
    if (digits.indexOf("00966") === 0) {
      digits = digits.slice(2);
    }
    if (digits.indexOf("9660") === 0) {
      digits = "966" + digits.slice(4);
    }
    if (digits.indexOf("05") === 0) {
      digits = "966" + digits.slice(1);
    } else if (digits.indexOf("5") === 0 && digits.length === 9) {
      digits = "966" + digits;
    }
    return digits;
  }

  function normalizeName(value) {
    return normalizeText(value)
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeCity(value) {
    var text = normalizeText(value);
    if (/riyad|الرياض|riyadh/i.test(text)) {
      return "الرياض";
    }
    if (/jedd|جدة|جده/i.test(text)) {
      return "جدة";
    }
    return normalizeCityBase(text);
  }

  function normalizeRegister(value) {
    var text = normalizeText(value);
    var direct = normalizeRegisterCodeBase(text);
    if (direct) {
      return direct;
    }
    if (/اكسبرس|اكسبريس|express/i.test(text)) {
      return "EXPRESS";
    }
    if (/البوابة|albaw|albw/i.test(text)) {
      return "ALBAWABA";
    }
    if (/تجار|togary/i.test(text)) {
      return "TOGARY";
    }
    if (/per.?order|بالطلب/i.test(text)) {
      return "PER_ORDER";
    }
    if (/fr.?3pl|3pl/i.test(text)) {
      return "FR_3PL";
    }
    return "";
  }

  function normalizeEmploymentType(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text) {
      return "unknown";
    }
    if (/كفال|sponsor/i.test(text)) {
      return "sponsorship";
    }
    if (/خارجي|freelanc|external/i.test(text)) {
      return "freelancer";
    }
    return "unknown";
  }

  function normalizeHrStatus(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text) {
      return "under_review";
    }
    if (/ساري|active|يعمل|valid/.test(text)) {
      return "active";
    }
    if (/انتهت|expired|inactive|لا يعمل/.test(text)) {
      return "inactive";
    }
    if (/خروج|exit|terminated|منتهي/.test(text)) {
      return "exited";
    }
    if (/استقدام|not started|لم يبدأ/.test(text)) {
      return "not_started";
    }
    return "under_review";
  }

  function normalizeLicenseType(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text || /لا يوجد|none/.test(text)) {
      return "none";
    }
    if (/دباب|دراجة|bike|motor/i.test(text)) {
      return "bike";
    }
    if (/سيارة|خفيف|car/i.test(text)) {
      return "car";
    }
    if (/كلاهما|both/.test(text)) {
      return "both";
    }
    return text;
  }

  function detectPlatformFromSheet(sheetName, headers) {
    var text = [sheetName].concat(headers || []).map(normalizeText).join(" ").toLowerCase();
    if (/كيتا|keeta/.test(text)) {
      return "keeta";
    }
    if (/هانجر|hunger/.test(text)) {
      return "hungerstation";
    }
    if (/نينجا|ninja/.test(text)) {
      return "ninja";
    }
    if (/جاهز|jahez/.test(text)) {
      return "jahez";
    }
    if (/شفز|chefz/.test(text)) {
      return "chefz";
    }
    if (/امازون|amazon/.test(text)) {
      return "amazon";
    }
    return "unknown";
  }

  function normalizeHrWorkbook(workbookContext, options) {
    options = options || {};
    var workbook = workbookContext && workbookContext.workbook ? workbookContext.workbook : workbookContext;
    if (!workbook || !workbook.SheetNames) {
      return emptyBundle(options.fileName || "");
    }

    var bundle = emptyBundle(options.fileName || "");
    bundle.fileName = options.fileName || bundle.fileName;

    workbook.SheetNames.forEach(function (sheetName) {
      var matrix = readSheetMatrix(workbook.Sheets[sheetName]);
      if (!matrix.length) {
        bundle.sheetSummaries.push({
          sheetName: sheetName,
          role: "empty",
          rowCount: 0,
          importantColumns: [],
          warnings: ["empty_sheet"]
        });
        return;
      }
      var role = classifySheetRole(sheetName);
      if (role === "platform") {
        parsePlatformSheet(sheetName, matrix, bundle);
        return;
      }
      if (role === "health_cards") {
        parseHealthCardsSheet(sheetName, matrix, bundle);
        return;
      }
      if (role === "licenses") {
        parseParallelTableSheet(sheetName, matrix, bundle, {
          columns: [
            { start: 0, end: 8, role: "licenses" },
            { start: 9, end: 16, role: "licenses" }
          ]
        });
        return;
      }
      if (role === "never_worked") {
        parseParallelTableSheet(sheetName, matrix, bundle, {
          columns: [
            { start: 0, end: 4, role: "never_worked" },
            { start: 5, end: 8, role: "never_worked" }
          ]
        });
        return;
      }
      if (role === "hr_master" || role === "archive") {
        parseHrMasterSheet(sheetName, matrix, bundle, role);
        return;
      }
      bundle.sheetSummaries.push({
        sheetName: sheetName,
        role: role,
        rowCount: matrix.length,
        importantColumns: [],
        warnings: role === "misc" ? ["sheet_not_used_for_prompt4_import"] : []
      });
    });

    return bundle;
  }

  function buildHrProfiles(bundle, options) {
    options = options || {};
    var now = new Date().toISOString();
    var byKey = {};
    (bundle.rawProfiles || []).forEach(function (profile) {
      var key = profile.iqama || profile.employeeId || [profile.normalizedName, profile.register, profile.city].filter(Boolean).join("::");
      if (!key) {
        key = profile.rawId;
      }
      if (!byKey[key]) {
        byKey[key] = mergeObjects({}, profile);
        return;
      }
      byKey[key] = mergeProfile(byKey[key], profile);
    });

    return Object.keys(byKey).map(function (key) {
      var profile = byKey[key];
      var healthCard = profile.iqama && bundle.healthCardsByIqama
        ? bundle.healthCardsByIqama[profile.iqama]
        : null;
      var licenseRecord = profile.iqama && bundle.licensesByIqama
        ? bundle.licensesByIqama[profile.iqama]
        : null;
      var riskFlags = unique(profile.riskFlags || []);
      if (healthCard && healthCard.healthCardExpiry && looksExpiredDate(healthCard.healthCardExpiry)) {
        riskFlags.push("expired_health_card");
      }
      return {
        id: "hrProfile::" + key,
        iqama: profile.iqama || "",
        fullNameArabic: profile.fullNameArabic || "",
        fullNameEnglish: profile.fullNameEnglish || "",
        nationality: profile.nationality || "",
        phone: profile.phone || "",
        alternatePhone: profile.alternatePhone || "",
        email: profile.email || "",
        sponsorCompany: profile.sponsorCompany || "",
        register: profile.register || "",
        city: profile.city || "",
        jobTitle: profile.jobTitle || "",
        employmentType: profile.employmentType || "unknown",
        hrStatus: profile.hrStatus || "under_review",
        startDate: profile.startDate || "",
        exitDate: profile.exitDate || "",
        iban: profile.iban || "",
        bankName: profile.bankName || "",
        licenseType: profile.licenseType || (licenseRecord ? licenseRecord.licenseType : "") || "",
        licenseExpiry: profile.licenseExpiry || "",
        healthCardNumber: profile.healthCardNumber || (healthCard ? healthCard.healthCardNumber : "") || "",
        healthCardExpiry: profile.healthCardExpiry || (healthCard ? healthCard.healthCardExpiry : "") || "",
        riskFlags: riskFlags,
        notes: unique([profile.notes || "", licenseRecord ? licenseRecord.note : ""]).join(" | "),
        sourceFile: profile.sourceFile || bundle.fileName || "",
        sourceSheet: profile.sourceSheet || "",
        sourceRow: profile.sourceRow || 0,
        createdAt: profile.createdAt || now,
        updatedAt: now,
        cityScope: profile.city || "",
        status: profile.hrStatus || "under_review"
      };
    });
  }

  function buildRiders(input, options) {
    options = options || {};
    var hrProfiles = input.hrProfiles || [];
    var platformAccountsRaw = input.platformAccountsRaw || [];
    var existingRiders = options.existingRiders || [];
    var existingIdentities = options.existingIdentities || [];
    var existingPlatformAccounts = options.existingPlatformAccounts || [];
    var context = RiderMatching.buildMatchingContext({
      riders: existingRiders,
      identities: existingIdentities,
      platformAccounts: existingPlatformAccounts
    });
    var ridersById = {};
    existingRiders.forEach(function (rider) {
      ridersById[rider.id] = mergeObjects({}, rider);
    });
    var profileAssignments = {};
    var accountAssignments = {};
    var conflicts = [];
    var warnings = [];

    hrProfiles.forEach(function (profile) {
      var candidate = {
        iqama: profile.iqama,
        phone: profile.phone,
        displayName: profile.fullNameArabic || profile.fullNameEnglish || "",
        nationality: profile.nationality,
        primaryIqama: profile.iqama,
        phones: unique([profile.phone, profile.alternatePhone].map(normalizePhone).filter(Boolean)),
        cities: [profile.city].filter(Boolean),
        registers: [profile.register].filter(Boolean),
        platforms: [],
        employmentType: profile.employmentType,
        currentWorkStatus: mapHrStatusToWorkStatus(profile.hrStatus),
        hrProfileId: profile.id,
        riskFlags: profile.riskFlags || [],
        notes: profile.notes || "",
        sourceFile: profile.sourceFile || "",
        city: profile.city || "",
        register: profile.register || ""
      };
      var matched = RiderMatching.matchRiderCandidate(candidate, context);
      var riderId = matched.matchedRiderId || buildRiderId(candidate);
      if (matched.conflicts.length) {
        conflicts = conflicts.concat(matched.conflicts.map(function (item) {
          return {
            code: item,
            riderId: riderId,
            profileId: profile.id,
            sheet: profile.sourceSheet || ""
          };
        }));
      }
      warnings = warnings.concat(matched.warnings || []);
      ridersById[riderId] = RiderMatching.mergeRiderRecord(ridersById[riderId] || { id: riderId }, candidate);
      RiderMatching.registerCandidateInContext(ridersById[riderId], {
        platform: "",
        userId: "",
        city: profile.city,
        register: profile.register
      }, context);
      profileAssignments[profile.id] = riderId;
    });

    platformAccountsRaw.forEach(function (account) {
      var candidate = {
        iqama: account.iqama,
        phone: account.phone,
        displayName: account.displayName,
        nationality: account.nationality,
        platform: account.platform,
        userId: account.userId || account.dashboardUserId,
        city: account.city,
        register: account.register,
        phones: [account.phone].filter(Boolean),
        cities: [account.city].filter(Boolean),
        registers: [account.register].filter(Boolean),
        platforms: [account.platform],
        employmentType: account.employmentType || "unknown",
        currentWorkStatus: account.accountStatus === "working" ? "working" : "under_review",
        riskFlags: account.riskFlags || [],
        notes: account.note || "",
        sourceFile: account.sourceFile || ""
      };
      var matched = RiderMatching.matchRiderCandidate(candidate, context);
      var riderId = matched.matchedRiderId || buildRiderId(candidate);
      if (matched.conflicts.length) {
        conflicts = conflicts.concat(matched.conflicts.map(function (item) {
          return {
            code: item,
            riderId: riderId,
            platform: account.platform,
            accountId: account.id
          };
        }));
      }
      warnings = warnings.concat(matched.warnings || []);
      ridersById[riderId] = RiderMatching.mergeRiderRecord(ridersById[riderId] || { id: riderId }, {
        id: riderId,
        primaryIqama: ridersById[riderId] && ridersById[riderId].primaryIqama ? ridersById[riderId].primaryIqama : (account.iqama || ""),
        displayName: account.displayName || (ridersById[riderId] && ridersById[riderId].displayName) || "",
        normalizedName: RiderMatching.normalizeNameForMatch(account.displayName || ""),
        nationality: account.nationality || "",
        phones: [account.phone].filter(Boolean),
        cities: [account.city].filter(Boolean),
        registers: [account.register].filter(Boolean),
        platforms: [account.platform].filter(Boolean),
        employmentType: account.employmentType || "unknown",
        currentWorkStatus: account.accountStatus === "working" ? "working" : "under_review",
        riskFlags: account.riskFlags || [],
        notes: account.note || "",
        sourceFile: account.sourceFile || "",
        city: account.city || "",
        register: account.register || ""
      });
      RiderMatching.registerCandidateInContext(ridersById[riderId], candidate, context);
      accountAssignments[account.id] = riderId;
    });

    return {
      riders: Object.keys(ridersById).map(function (riderId) {
        var rider = ridersById[riderId];
        return {
          id: rider.id,
          primaryIqama: rider.primaryIqama || "",
          displayName: rider.displayName || "",
          normalizedName: rider.normalizedName || RiderMatching.normalizeNameForMatch(rider.displayName || ""),
          nationality: rider.nationality || "",
          phones: unique((rider.phones || []).map(normalizePhone).filter(Boolean)),
          cities: unique((rider.cities || []).map(normalizeCity).filter(Boolean)),
          registers: unique((rider.registers || []).map(normalizeRegister).filter(Boolean)),
          platforms: unique((rider.platforms || []).map(function (value) {
            return normalizeText(value).toLowerCase();
          }).filter(Boolean)),
          employmentType: rider.employmentType || "unknown",
          currentWorkStatus: rider.currentWorkStatus || "under_review",
          hrProfileId: rider.hrProfileId || "",
          riskFlags: unique(rider.riskFlags || []),
          notes: rider.notes || "",
          firstSeenAt: rider.firstSeenAt || new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          createdAt: rider.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sourceFile: rider.sourceFile || "",
          city: (rider.cities && rider.cities[0]) || "",
          register: (rider.registers && rider.registers[0]) || "",
          status: mapWorkStatusToRecordStatus(rider.currentWorkStatus)
        };
      }),
      profileAssignments: profileAssignments,
      accountAssignments: accountAssignments,
      conflicts: conflicts,
      warnings: warnings
    };
  }

  function buildRiderIdentities(bundle, buildContext) {
    buildContext = buildContext || {};
    var identities = [];
    var seen = {};
    (bundle.hrProfiles || []).forEach(function (profile) {
      var riderId = buildContext.profileAssignments ? buildContext.profileAssignments[profile.id] : "";
      if (!riderId) {
        return;
      }
      pushIdentity(identities, seen, {
        riderId: riderId,
        identityType: "iqama",
        value: profile.iqama,
        normalizedValue: normalizeIqama(profile.iqama),
        platform: "",
        city: profile.city,
        register: profile.register,
        confidence: 1,
        sourceFile: profile.sourceFile,
        sourceSheet: profile.sourceSheet,
        sourceRow: profile.sourceRow
      });
      [profile.phone, profile.alternatePhone].forEach(function (phone) {
        pushIdentity(identities, seen, {
          riderId: riderId,
          identityType: "phone",
          value: phone,
          normalizedValue: normalizePhone(phone),
          platform: "",
          city: profile.city,
          register: profile.register,
          confidence: 0.92,
          sourceFile: profile.sourceFile,
          sourceSheet: profile.sourceSheet,
          sourceRow: profile.sourceRow
        });
      });
    });

    (bundle.platformAccountsRaw || []).forEach(function (account) {
      var riderId = buildContext.accountAssignments ? buildContext.accountAssignments[account.id] : "";
      if (!riderId) {
        return;
      }
      pushIdentity(identities, seen, {
        riderId: riderId,
        identityType: "platform_user_id",
        value: account.userId || account.dashboardUserId,
        normalizedValue: normalizeText(account.userId || account.dashboardUserId),
        platform: account.platform,
        city: account.city,
        register: account.register,
        confidence: 0.88,
        sourceFile: account.sourceFile,
        sourceSheet: account.sourceSheet,
        sourceRow: account.sourceRow
      });
      pushIdentity(identities, seen, {
        riderId: riderId,
        identityType: "iqama",
        value: account.iqama,
        normalizedValue: normalizeIqama(account.iqama),
        platform: account.platform,
        city: account.city,
        register: account.register,
        confidence: 0.96,
        sourceFile: account.sourceFile,
        sourceSheet: account.sourceSheet,
        sourceRow: account.sourceRow
      });
      pushIdentity(identities, seen, {
        riderId: riderId,
        identityType: "phone",
        value: account.phone,
        normalizedValue: normalizePhone(account.phone),
        platform: account.platform,
        city: account.city,
        register: account.register,
        confidence: 0.82,
        sourceFile: account.sourceFile,
        sourceSheet: account.sourceSheet,
        sourceRow: account.sourceRow
      });
    });

    return identities;
  }

  function buildRiderPlatformAccounts(bundle, buildContext) {
    buildContext = buildContext || {};
    return (bundle.platformAccountsRaw || []).map(function (account) {
      var riderId = buildContext.accountAssignments ? buildContext.accountAssignments[account.id] : "";
      return {
        id: account.id,
        riderId: riderId,
        platform: account.platform || "unknown",
        userId: account.userId || "",
        dashboardUserId: account.dashboardUserId || account.userId || "",
        city: account.city || "",
        register: account.register || "",
        vehicleType: account.vehicleType || "",
        workMode: account.workMode || "unknown",
        accountStatus: account.accountStatus || "under_review",
        activationStatus: account.activationStatus || "pending",
        firstActiveDate: account.firstActiveDate || "",
        lastActiveDate: account.lastActiveDate || "",
        sourceFile: account.sourceFile || "",
        sourceSheet: account.sourceSheet || "",
        sourceRow: account.sourceRow || 0,
        createdAt: account.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: account.accountStatus || "under_review"
      };
    });
  }

  function buildArchiveEvents(bundle, buildContext, options) {
    buildContext = buildContext || {};
    options = options || {};
    var events = [];
    (bundle.hrProfiles || []).forEach(function (profile) {
      var riderId = buildContext.profileAssignments ? buildContext.profileAssignments[profile.id] : "";
      if (!riderId) {
        return;
      }
      events.push(RiderArchive.buildImportedEvent(riderId, profile, {
        eventType: "imported",
        source: "hr_import",
        note: "Imported HR profile from " + profile.sourceSheet,
        createdBy: options.createdBy || "",
        eventDate: profile.startDate || today()
      }));
      if (profile.licenseType && profile.licenseType !== "none") {
        events.push(RiderArchive.createArchiveEvent({
          riderId: riderId,
          eventType: "license_updated",
          eventDate: today(),
          city: profile.city,
          register: profile.register,
          after: {
            licenseType: profile.licenseType,
            licenseExpiry: profile.licenseExpiry || ""
          },
          source: "hr_import",
          sourceFile: profile.sourceFile,
          note: "License status refreshed from HR workbook",
          createdBy: options.createdBy || ""
        }));
      }
      if (profile.healthCardNumber || profile.healthCardExpiry) {
        events.push(RiderArchive.createArchiveEvent({
          riderId: riderId,
          eventType: "health_card_updated",
          eventDate: today(),
          city: profile.city,
          register: profile.register,
          after: {
            healthCardNumber: profile.healthCardNumber || "",
            healthCardExpiry: profile.healthCardExpiry || ""
          },
          source: "hr_import",
          sourceFile: profile.sourceFile,
          note: "Health card status refreshed from workbook",
          createdBy: options.createdBy || ""
        }));
      }
    });

    (bundle.statusEvents || []).forEach(function (statusEvent) {
      var riderId = resolveRiderIdForStatusEvent(statusEvent, buildContext, bundle.hrProfiles || [], bundle.platformAccountsRaw || []);
      if (!riderId) {
        return;
      }
      events.push(RiderArchive.createArchiveEvent({
        riderId: riderId,
        eventType: statusEvent.eventType || "status_changed",
        eventDate: statusEvent.eventDate || today(),
        city: statusEvent.city || "",
        register: statusEvent.register || "",
        platform: statusEvent.platform || "",
        after: statusEvent.after || {},
        source: "hr_import",
        sourceFile: bundle.fileName || "",
        note: statusEvent.note || "",
        createdBy: options.createdBy || ""
      }));
    });

    return RiderArchive.sortTimeline(events);
  }

  function classifySheetRole(sheetName) {
    var normalized = normalizeText(sheetName).toLowerCase();
    if (/hr|ارشيف/.test(normalized)) {
      return /ارشيف/.test(normalized) ? "archive" : "hr_master";
    }
    if (/كروت|health/.test(normalized)) {
      return "health_cards";
    }
    if (/رخص|license/.test(normalized)) {
      return "licenses";
    }
    if (/لم تعمل|never/.test(normalized)) {
      return "never_worked";
    }
    if (/امازون|amazon|ninja|جاهز|jahez|هانجر|hunger|كيتا|keeta|شفز|chefz/.test(normalized)) {
      return "platform";
    }
    return "misc";
  }

  function parseHrMasterSheet(sheetName, matrix, bundle, role) {
    var headerRowIndex = findHeaderRowIndex(matrix, ["رقم الاقامة", "رقم الهوية", "الاسم", "اسم السجل"]);
    var headers = normalizeHeaders(matrix[headerRowIndex] || []);
    var columnMap = buildColumnMap(headers);
    var rows = matrix.slice(headerRowIndex + 1).filter(hasAnyValue);
    rows.forEach(function (row, index) {
      var record = buildRawProfileFromRow(row, columnMap, {
        sourceSheet: sheetName,
        sourceRow: headerRowIndex + index + 2,
        sourceFile: bundle.fileName || "",
        role: role
      });
      if (record) {
        bundle.rawProfiles.push(record);
        extractPlatformAccountsFromHrRow(record, row, columnMap, {
          sourceSheet: sheetName,
          sourceFile: bundle.fileName || ""
        }).forEach(function (account) {
          bundle.platformAccountsRaw.push(account);
        });
      }
    });

    bundle.sheetSummaries.push({
      sheetName: sheetName,
      role: role,
      rowCount: rows.length,
      importantColumns: Object.keys(columnMap).filter(function (key) {
        return columnMap[key] >= 0;
      }),
      warnings: []
    });
  }

  function parsePlatformSheet(sheetName, matrix, bundle) {
    var headerRowIndex = findHeaderRowIndex(matrix, ["رقم الاقامة", "رقم الهوية", "رقم الايدي", "ID", "الايدي"]);
    var headers = normalizeHeaders(matrix[headerRowIndex] || []);
    var platform = detectPlatformFromSheet(sheetName, headers);
    var columnMap = buildPlatformColumnMap(headers, platform);
    var rows = matrix.slice(headerRowIndex + 1).filter(hasAnyValue);
    rows.forEach(function (row, index) {
      var account = buildPlatformAccountFromRow(platform, row, columnMap, {
        sourceSheet: sheetName,
        sourceRow: headerRowIndex + index + 2,
        sourceFile: bundle.fileName || ""
      });
      if (account) {
        bundle.platformAccountsRaw.push(account);
      }
    });
    bundle.sheetSummaries.push({
      sheetName: sheetName,
      role: "platform",
      rowCount: rows.length,
      importantColumns: Object.keys(columnMap).filter(function (key) {
        return columnMap[key] >= 0;
      }),
      warnings: platform === "unknown" ? ["unknown_platform_sheet"] : []
    });
  }

  function parseHealthCardsSheet(sheetName, matrix, bundle) {
    var headerRowIndex = findHeaderRowIndex(matrix, ["رقم الهوية", "رقم الشهادة الصحية", "تاريخ نهاية الشهادة الصحية"]);
    var headers = normalizeHeaders(matrix[headerRowIndex] || []);
    var columnMap = {
      iqama: findColumn(headers, ["رقم الهوية", "رقم الاقامة"]),
      register: findColumn(headers, ["السجل"]),
      healthCardNumber: findColumn(headers, ["رقم الشهادة الصحية"]),
      healthCardIssue: findColumn(headers, ["تاريخ إصدار الشهادة الصحية"]),
      healthCardExpiry: findColumn(headers, ["تاريخ نهاية الشهادة الصحية"])
    };
    var rows = matrix.slice(headerRowIndex + 1).filter(hasAnyValue);
    rows.forEach(function (row) {
      var iqama = normalizeIqama(readCell(row, columnMap.iqama));
      if (!iqama) {
        return;
      }
      bundle.healthCardsByIqama[iqama] = {
        healthCardNumber: normalizeText(readCell(row, columnMap.healthCardNumber)),
        healthCardExpiry: normalizeDateText(readCell(row, columnMap.healthCardExpiry)),
        register: normalizeRegister(readCell(row, columnMap.register))
      };
    });
    bundle.sheetSummaries.push({
      sheetName: sheetName,
      role: "health_cards",
      rowCount: rows.length,
      importantColumns: ["iqama", "healthCardNumber", "healthCardExpiry"],
      warnings: []
    });
  }

  function parseParallelTableSheet(sheetName, matrix, bundle, options) {
    options = options || {};
    (options.columns || []).forEach(function (range) {
      var headerRowIndex = 1;
      var headers = normalizeHeaders(sliceRow(matrix[headerRowIndex] || [], range.start, range.end));
      var rows = matrix.slice(headerRowIndex + 1).map(function (row) {
        return sliceRow(row || [], range.start, range.end);
      }).filter(hasAnyValue);
      rows.forEach(function (row, index) {
        if (range.role === "licenses") {
          var iqama = normalizeIqama(readCell(row, findColumn(headers, ["رقم الهوية", "رقم الاقامة"])));
          if (!iqama) {
            return;
          }
          bundle.licensesByIqama[iqama] = {
            licenseType: normalizeLicenseType(readCell(row, findColumn(headers, ["نوع الرخصة"]))),
            note: normalizeText(readCell(row, findColumn(headers, ["الإجراء", "ملاحظات مدير التشغيل"])))
          };
          return;
        }
        if (range.role === "never_worked") {
          var statusIqama = normalizeIqama(readCell(row, findColumn(headers, ["رقم الهوية", "رقم الاقامة"])));
          if (!statusIqama) {
            return;
          }
          bundle.statusEvents.push({
            eventType: "status_changed",
            eventDate: today(),
            city: normalizeCity(readCell(row, findColumn(headers, ["الفرع", "المدينة"]))),
            register: "",
            note: normalizeText(readCell(row, findColumn(headers, ["السبب"]))),
            after: {
              currentWorkStatus: "never_worked"
            },
            iqama: statusIqama
          });
        }
      });
      bundle.sheetSummaries.push({
        sheetName: sheetName + " [" + range.role + "]",
        role: range.role,
        rowCount: rows.length,
        importantColumns: headers.filter(Boolean),
        warnings: []
      });
    });
  }

  function buildRawProfileFromRow(row, columnMap, meta) {
    var iqama = normalizeIqama(readCell(row, columnMap.iqama));
    var employeeId = normalizeText(readCell(row, columnMap.employeeId));
    var fullName = normalizeName(readCell(row, columnMap.fullName));
    if (!iqama && !employeeId && !fullName) {
      return null;
    }
    var city = normalizeCity(readCell(row, columnMap.city));
    var register = normalizeRegister(readCell(row, columnMap.register)) || normalizeRegister(readCell(row, columnMap.registerAlt));
    var sponsorCompany = normalizeText(readCell(row, columnMap.sponsorCompany)) || register;
    var phone = normalizePhone(extractPhoneFromMixedValue(readCell(row, columnMap.phone)));
    var healthCardState = normalizeText(readCell(row, columnMap.healthCardState));
    var healthCard = meta && meta.bundleHealthCards && meta.bundleHealthCards[iqama] ? meta.bundleHealthCards[iqama] : null;
    var notes = unique([
      normalizeText(readCell(row, columnMap.notes)),
      normalizeText(readCell(row, columnMap.workApp)),
      normalizeText(readCell(row, columnMap.licenseState))
    ]).join(" | ");

    var profile = {
      rawId: [meta.sourceSheet, meta.sourceRow, iqama || employeeId || fullName].join("::"),
      employeeId: employeeId,
      iqama: iqama,
      fullNameArabic: /[\u0600-\u06ff]/.test(fullName) ? fullName : "",
      fullNameEnglish: /[A-Za-z]/.test(fullName) ? fullName : "",
      normalizedName: RiderMatching.normalizeNameForMatch(fullName),
      nationality: normalizeText(readCell(row, columnMap.nationality)),
      phone: phone,
      alternatePhone: "",
      email: normalizeText(readCell(row, columnMap.email)),
      sponsorCompany: sponsorCompany,
      register: register,
      city: city,
      jobTitle: normalizeText(readCell(row, columnMap.jobTitle)),
      employmentType: normalizeEmploymentType(readCell(row, columnMap.employmentType) || normalizeText(readCell(row, columnMap.notes))),
      hrStatus: normalizeHrStatus(readCell(row, columnMap.hrStatus) || readCell(row, columnMap.residencyStatus)),
      startDate: normalizeDateText(readCell(row, columnMap.startDate)),
      exitDate: normalizeDateText(readCell(row, columnMap.exitDate)),
      iban: normalizeText(readCell(row, columnMap.iban)),
      bankName: normalizeText(readCell(row, columnMap.bankName)),
      licenseType: normalizeLicenseType(readCell(row, columnMap.licenseType)),
      licenseExpiry: normalizeDateText(readCell(row, columnMap.licenseExpiry)),
      healthCardNumber: healthCard ? healthCard.healthCardNumber : "",
      healthCardExpiry: healthCard ? healthCard.healthCardExpiry : healthCardState,
      riskFlags: buildRiskFlags({
        iqama: iqama,
        phone: phone,
        hrStatus: normalizeHrStatus(readCell(row, columnMap.hrStatus) || readCell(row, columnMap.residencyStatus)),
        healthCardState: healthCardState,
        notes: notes
      }),
      notes: notes,
      sourceFile: meta.sourceFile || "",
      sourceSheet: meta.sourceSheet || "",
      sourceRow: meta.sourceRow || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!profile.licenseType && meta.sourceSheet && /مؤسسة|شركة|اكبريس|ارشيف|hr/i.test(meta.sourceSheet)) {
      profile.licenseType = normalizeLicenseType(readCell(row, columnMap.vehicleType));
    }

    return profile;
  }

  function extractPlatformAccountsFromHrRow(profile, row, columnMap, meta) {
    meta = meta || {};
    var accounts = [];
    [
      { field: "keetaId", platform: "keeta", registerField: "keetaRegister" },
      { field: "hungerId", platform: "hungerstation" },
      { field: "amazonId", platform: "amazon" },
      { field: "jahezId", platform: "jahez" },
      { field: "ninjaId", platform: "ninja" },
      { field: "chefzId", platform: "chefz" }
    ].forEach(function (item) {
      if (columnMap[item.field] < 0) {
        return;
      }
      var rawValue = normalizeText(readCell(row, columnMap[item.field]));
      if (!rawValue || /لا يوجد|#ref|❌/i.test(rawValue)) {
        return;
      }
      var userId = extractAccountId(rawValue);
      if (!userId) {
        return;
      }
      accounts.push({
        id: buildPlatformAccountId(item.platform, userId, profile.iqama || profile.employeeId || profile.normalizedName),
        platform: item.platform,
        userId: userId,
        dashboardUserId: userId,
        iqama: profile.iqama,
        phone: profile.phone,
        displayName: profile.fullNameArabic || profile.fullNameEnglish || "",
        nationality: profile.nationality,
        city: profile.city || extractCityFromText(readCell(row, columnMap[item.registerField])),
        register: extractRegisterFromText(readCell(row, columnMap[item.registerField])) || profile.register,
        vehicleType: profile.licenseType,
        workMode: detectWorkMode(rawValue),
        accountStatus: /يعمل|approved|valid/i.test(rawValue) ? "working" : "under_review",
        activationStatus: /approved|يوجد|valid/i.test(rawValue) ? "active" : "pending",
        firstActiveDate: profile.startDate || "",
        lastActiveDate: "",
        sourceFile: meta.sourceFile || "",
        sourceSheet: meta.sourceSheet || "",
        sourceRow: profile.sourceRow || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        note: rawValue,
        riskFlags: []
      });
    });
    return accounts;
  }

  function buildPlatformAccountFromRow(platform, row, columnMap, meta) {
    var userId = extractAccountId(readCell(row, columnMap.userId));
    var iqama = normalizeIqama(readCell(row, columnMap.iqama));
    var displayName = normalizeName(readCell(row, columnMap.displayName));
    if (!userId && !iqama && !displayName) {
      return null;
    }
    return {
      id: buildPlatformAccountId(platform, userId || iqama || displayName, iqama || displayName),
      platform: platform,
      userId: userId,
      dashboardUserId: userId,
      iqama: iqama,
      phone: normalizePhone(extractPhoneFromMixedValue(readCell(row, columnMap.phone))),
      displayName: displayName || normalizeName(readCell(row, columnMap.altName)),
      nationality: normalizeText(readCell(row, columnMap.nationality)),
      city: normalizeCity(readCell(row, columnMap.city)),
      register: normalizeRegister(readCell(row, columnMap.register)),
      vehicleType: normalizeLicenseType(readCell(row, columnMap.vehicleType)),
      workMode: detectWorkMode(readCell(row, columnMap.vehicleType)),
      accountStatus: /يعمل|active|يوجد/i.test(normalizeText(readCell(row, columnMap.accountStatus))) ? "working" : "under_review",
      activationStatus: /يعمل|active|يوجد/i.test(normalizeText(readCell(row, columnMap.activationStatus) || readCell(row, columnMap.accountStatus))) ? "active" : "pending",
      firstActiveDate: normalizeDateText(readCell(row, columnMap.firstActiveDate)),
      lastActiveDate: normalizeDateText(readCell(row, columnMap.lastActiveDate)),
      sourceFile: meta.sourceFile || "",
      sourceSheet: meta.sourceSheet || "",
      sourceRow: meta.sourceRow || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: normalizeText(readCell(row, columnMap.note)),
      employmentType: normalizeEmploymentType(readCell(row, columnMap.employmentType)),
      riskFlags: []
    };
  }

  function buildColumnMap(headers) {
    return {
      employeeId: findColumn(headers, ["الرقم الوظيفي", "الرقم الوظيفى"]),
      iqama: findColumn(headers, ["رقم الاقامة", "رقم الهوية", "هوية"]),
      fullName: findColumn(headers, ["الاسم", "إسم المندوب", "اسم المندوب"]),
      startDate: findColumn(headers, ["تاريخ التعين", "تاريخ التعيين"]),
      nationality: findColumn(headers, ["الجنسية"]),
      jobTitle: findColumn(headers, ["المسمي الوظيفي"]),
      city: findColumn(headers, ["الفرع", "المدينة", "مدينة العمل"]),
      residencyStatus: findColumn(headers, ["صلاحية الاقامة", "الصلاحية"]),
      sponsorCompany: findColumn(headers, ["اسم السجل", "السجل"]),
      register: findColumn(headers, ["اسم السجل", "السجل", "المؤسسة"]),
      registerAlt: findColumn(headers, ["مدينة و سجل ايدي كيتا", "السجل hr", "السجل"]),
      licenseType: findColumn(headers, ["نوع الرخصة", "رخصة القيادة", "رخصة السائق"]),
      licenseState: findColumn(headers, ["حالات اصدار الرخص", "حاله الرخصه"]),
      licenseExpiry: findColumn(headers, ["تاريخ انتهاء الاقامة"]),
      employmentType: findColumn(headers, ["الكفالة", "نوع البديل", "حالة الكفالة"]),
      hrStatus: findColumn(headers, ["حالة المندوب", "حالة الحساب", "الحالة"]),
      exitDate: findColumn(headers, ["انتهاء التاشيرة", "تاريخ التسليم"]),
      healthCardState: findColumn(headers, ["بطاقة السائق", "الكارت الصحي", "كرت صحي"]),
      workApp: findColumn(headers, ["تطبيق العمل", "ما هي التطبيقات التي تعمل معها حالياً؟  what applications are currently working with it?"]),
      keetaRegister: findColumn(headers, ["مدينة و سجل ايدي كيتا"]),
      keetaId: findColumn(headers, ["ايدي كيتا", "ايديهات كيتا"]),
      hungerId: findColumn(headers, ["ايدي هنقر", "ايدي هانجر"]),
      amazonId: findColumn(headers, ["ايدي امازون"]),
      jahezId: findColumn(headers, ["ايدي جاهز"]),
      ninjaId: findColumn(headers, ["ايدي نينجا"]),
      chefzId: findColumn(headers, ["ايدي شفز"]),
      notes: findColumn(headers, ["الملاحظات", "ملاحظات"]),
      phone: findColumn(headers, ["رقم الهاتف", "رقم الجوال", "رقم جوال الحساب"]),
      email: findColumn(headers, ["البريد الإلكتروني", "الايميل", "email"]),
      iban: findColumn(headers, ["الايبان", "iban"]),
      bankName: findColumn(headers, ["bank"])
    };
  }

  function buildPlatformColumnMap(headers, platform) {
    return {
      userId: findColumn(headers, ["ID", "رقم الايدي", "الايدي", "ايدي", "ايدي كيتا"]),
      iqama: findColumn(headers, ["رقم الاقامة", "رقم هوية", "رقم الهوية", "رقم هوية المندوب"]),
      displayName: findColumn(headers, ["اسم المندوب", "المندوب", "إسم المندوب", "الاسم"]),
      altName: findColumn(headers, ["الإسم", "اسم البديل", "الاسم"]),
      phone: findColumn(headers, ["رقم الجوال", "رقم الهاتف", "رقم جوال الحساب"]),
      city: findColumn(headers, ["المدينة", "مدينة العمل", "مدينة العمل hr"]),
      register: findColumn(headers, ["السجل", "اسم السجل", "المؤسسة", "الداش"]),
      vehicleType: findColumn(headers, ["نوع المركبة", "المركبة"]),
      accountStatus: findColumn(headers, ["حالة الحساب", "الحالة", "حالة المندوب hr"]),
      activationStatus: findColumn(headers, ["حالة الايدي", "الإداء"]),
      employmentType: findColumn(headers, ["نوع البديل", "حالة المندوب hr"]),
      nationality: findColumn(headers, ["الجنسية", "الجنسية1"]),
      firstActiveDate: findColumn(headers, ["تاريخ الاستلام", "تاريخ الأستلام", "تاريخ الاستلام  1"]),
      lastActiveDate: findColumn(headers, ["تاريخ التسليم", "تاريخ التسليم 2"]),
      note: findColumn(headers, ["الملاحظات", "ملاحظات", "ملاحظات الأداء"])
    };
  }

  function buildRiskFlags(input) {
    var flags = [];
    if (!input.iqama) {
      flags.push("missing_iqama");
    }
    if (!input.phone) {
      flags.push("missing_phone");
    }
    if (input.hrStatus === "under_review") {
      flags.push("status_under_review");
    }
    if (/expired|انته/.test(normalizeText(input.healthCardState).toLowerCase())) {
      flags.push("expired_health_card");
    }
    if (/#ref/i.test(normalizeText(input.notes))) {
      flags.push("formula_reference_error");
    }
    return flags;
  }

  function emptyBundle(fileName) {
    return {
      fileName: fileName || "",
      rawProfiles: [],
      platformAccountsRaw: [],
      statusEvents: [],
      healthCardsByIqama: {},
      licensesByIqama: {},
      sheetSummaries: [],
      warnings: [],
      conflicts: []
    };
  }

  function mergeProfile(baseProfile, nextProfile) {
    var merged = mergeObjects({}, baseProfile);
    Object.keys(nextProfile || {}).forEach(function (key) {
      if (merged[key] == null || merged[key] === "" || (Array.isArray(merged[key]) && !merged[key].length)) {
        merged[key] = nextProfile[key];
        return;
      }
      if (key === "riskFlags") {
        merged[key] = unique([].concat(merged[key] || []).concat(nextProfile[key] || []));
        return;
      }
      if (key === "notes" && nextProfile[key]) {
        merged[key] = unique([merged[key], nextProfile[key]]).join(" | ");
      }
    });
    if (nextProfile.hrStatus === "active") {
      merged.hrStatus = "active";
    }
    return merged;
  }

  function resolveRiderIdForStatusEvent(statusEvent, buildContext, hrProfiles, platformAccounts) {
    statusEvent = statusEvent || {};
    if (!statusEvent.iqama) {
      return "";
    }
    var matchedProfile = (hrProfiles || []).filter(function (profile) {
      return profile.iqama === statusEvent.iqama;
    })[0];
    if (matchedProfile && buildContext.profileAssignments) {
      return buildContext.profileAssignments[matchedProfile.id] || "";
    }
    var matchedAccount = (platformAccounts || []).filter(function (account) {
      return account.iqama === statusEvent.iqama;
    })[0];
    if (matchedAccount && buildContext.accountAssignments) {
      return buildContext.accountAssignments[matchedAccount.id] || "";
    }
    return "";
  }

  function mapHrStatusToWorkStatus(hrStatus) {
    var normalized = normalizeText(hrStatus).toLowerCase();
    if (normalized === "active") {
      return "working";
    }
    if (normalized === "inactive") {
      return "not_working";
    }
    if (normalized === "exited") {
      return "previously_worked";
    }
    if (normalized === "not_started") {
      return "never_worked";
    }
    return "under_review";
  }

  function mapWorkStatusToRecordStatus(workStatus) {
    if (workStatus === "working") {
      return "active";
    }
    if (workStatus === "not_working" || workStatus === "previously_worked") {
      return "inactive";
    }
    return "under_review";
  }

  function buildRiderId(candidate) {
    return [
      "rider",
      normalizeIqama(candidate.primaryIqama || candidate.iqama) || normalizePhone(candidate.phone || (candidate.phones && candidate.phones[0]) || "") || RiderMatching.normalizeNameForMatch(candidate.displayName || "")
    ].join("::");
  }

  function buildPlatformAccountId(platform, userId, fallback) {
    return [
      "platformAccount",
      normalizeText(platform).toLowerCase(),
      normalizeText(userId || fallback)
    ].join("::");
  }

  function pushIdentity(target, seen, identity) {
    identity = identity || {};
    if (!identity.riderId || !identity.normalizedValue) {
      return;
    }
    var id = [
      "identity",
      identity.riderId,
      identity.identityType,
      identity.platform || "",
      identity.normalizedValue
    ].join("::");
    if (seen[id]) {
      return;
    }
    seen[id] = true;
    target.push({
      id: id,
      riderId: identity.riderId,
      identityType: identity.identityType,
      value: identity.value || "",
      normalizedValue: identity.normalizedValue,
      platform: identity.platform || "",
      city: identity.city || "",
      register: identity.register || "",
      confidence: Number(identity.confidence) || 0,
      sourceFile: identity.sourceFile || "",
      sourceSheet: identity.sourceSheet || "",
      sourceRow: identity.sourceRow || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active"
    });
  }

  function readSheetMatrix(sheet) {
    if (!sheet || !sheet["!ref"]) {
      return [];
    }
    var XLSX = resolveXlsxLib();
    return XLSX ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) : [];
  }

  function resolveXlsxLib() {
    if (typeof globalThis !== "undefined" && globalThis.XLSX) {
      return globalThis.XLSX;
    }
    try {
      return require("../../vendor/xlsx.full.min.js");
    } catch (_error) {
      return null;
    }
  }

  function findHeaderRowIndex(matrix, expectedTerms) {
    var bestIndex = 0;
    var bestScore = -1;
    (matrix || []).slice(0, 8).forEach(function (row, index) {
      var headers = normalizeHeaders(row || []);
      var score = expectedTerms.filter(function (term) {
        return findColumn(headers, [term]) >= 0;
      }).length;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function normalizeHeaders(headers) {
    return (headers || []).map(function (header) {
      return normalizeText(header)
        .toLowerCase()
        .replace(/\s+/g, " ");
    });
  }

  function findColumn(headers, aliases) {
    var normalizedAliases = (aliases || []).map(function (value) {
      return normalizeText(value).toLowerCase().replace(/\s+/g, " ");
    });
    return (headers || []).findIndex(function (header) {
      return normalizedAliases.some(function (alias) {
        return header === alias || header.indexOf(alias) >= 0;
      });
    });
  }

  function readCell(row, index) {
    if (index == null || index < 0) {
      return "";
    }
    return row && row[index] != null ? row[index] : "";
  }

  function sliceRow(row, start, end) {
    return (row || []).slice(start, end + 1);
  }

  function hasAnyValue(row) {
    return (row || []).some(function (value) {
      return normalizeText(value) !== "";
    });
  }

  function extractAccountId(value) {
    var text = normalizeText(value);
    if (!text || /لا يوجد|#ref|❌/.test(text.toLowerCase())) {
      return "";
    }
    var alphanumeric = text.match(/[A-Z0-9]{8,}/i);
    if (alphanumeric) {
      return alphanumeric[0];
    }
    var digits = text.match(/\d{6,}/);
    return digits ? digits[0] : "";
  }

  function extractPhoneFromMixedValue(value) {
    var digits = normalizeText(value).match(/(?:\+?966|0)?5\d{8}/);
    return digits ? digits[0] : normalizeText(value);
  }

  function extractCityFromText(value) {
    return normalizeCity(value);
  }

  function extractRegisterFromText(value) {
    return normalizeRegister(value);
  }

  function detectWorkMode(value) {
    var text = normalizeText(value).toLowerCase();
    if (/راتب|salary/.test(text)) {
      return "salary_tiers";
    }
    if (/per order|بالطلب/.test(text)) {
      return "per_order";
    }
    return "all";
  }

  function normalizeDateText(value) {
    var text = normalizeText(value);
    if (!text) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
      var parts = text.split("/");
      return [
        parts[2],
        String(parts[1]).padStart(2, "0"),
        String(parts[0]).padStart(2, "0")
      ].join("-");
    }
    return text;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function looksExpiredDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(normalizeText(value)) && normalizeText(value) < today();
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

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  return {
    buildArchiveEvents: buildArchiveEvents,
    buildHrProfiles: buildHrProfiles,
    buildRiderIdentities: buildRiderIdentities,
    buildRiderPlatformAccounts: buildRiderPlatformAccounts,
    buildRiders: buildRiders,
    detectPlatformFromSheet: detectPlatformFromSheet,
    normalizeCity: normalizeCity,
    normalizeEmploymentType: normalizeEmploymentType,
    normalizeHrStatus: normalizeHrStatus,
    normalizeHrWorkbook: normalizeHrWorkbook,
    normalizeIqama: normalizeIqama,
    normalizeLicenseType: normalizeLicenseType,
    normalizeName: normalizeName,
    normalizePhone: normalizePhone,
    normalizeRegister: normalizeRegister
  };
});
