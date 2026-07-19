(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./importTypes.js"),
      require("./headerMapper.js"),
      require("../lib/monthlyClosingEngine.js"),
      require("../hr/riderNormalizer.js"),
      require("../hr/riderIdentityResolver.js"),
      require("../operations/operationsCommon.js"),
      require("../operations/dashboardImportSnapshot.js"),
      require("../operations/dashboardUserLifecycle.js"),
      require("../operations/assignmentReadinessService.js"),
      require("../fleet/fleetImportService.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportNormalizerLib = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.HeaderMapper,
    root.KeetaV6 || {},
    root.KeetaPortal.HrRiderNormalizer,
    root.KeetaPortal.RiderIdentityResolver,
    root.KeetaPortal.OperationsCommon,
    root.KeetaPortal.DashboardImportSnapshot,
    root.KeetaPortal.DashboardUserLifecycle,
    root.KeetaPortal.AssignmentReadinessService,
    root.KeetaPortal.FleetImportService
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, HeaderMapper, monthlyClosingExports, HrRiderNormalizer, RiderIdentityResolver, OperationsCommon, DashboardImportSnapshot, DashboardUserLifecycle, AssignmentReadinessService, FleetImportService) {
  "use strict";

  var normalizeCity = ImportTypes.normalizeCity;
  var normalizeRegisterCode = ImportTypes.normalizeRegisterCode;
  var normalizeText = ImportTypes.normalizeText;
  var MonthlyClosingEngine = monthlyClosingExports && monthlyClosingExports.MonthlyClosingEngine;
  var registerLabel = ImportTypes.registerLabel;
  var DashboardCommon = OperationsCommon || {};
  var DashboardLifecycleLib = DashboardUserLifecycle || {};
  var AssignmentReadinessLib = AssignmentReadinessService || {};
  var toActivationStatus = DashboardCommon.toActivationStatus || function (value) { return normalizeText(value) || "unknown"; };
  var toDashboardUserStatusLabel = DashboardCommon.toDashboardUserStatusLabel || function (value) { return normalizeText(value) || "under_review"; };
  var mergeDashboardObjects = DashboardCommon.mergeObjects || mergeObjects;
  var resolveRiderIdentity = RiderIdentityResolver && typeof RiderIdentityResolver.resolveRiderIdentity === "function"
    ? RiderIdentityResolver.resolveRiderIdentity
    : null;
  var buildExternalRiderId = RiderIdentityResolver && typeof RiderIdentityResolver.buildExternalRiderId === "function"
    ? RiderIdentityResolver.buildExternalRiderId
    : stableId;
  var buildOperationalProfileId = RiderIdentityResolver && typeof RiderIdentityResolver.buildOperationalProfileId === "function"
    ? RiderIdentityResolver.buildOperationalProfileId
    : stableId;

  function normalizeImportRecord(importRecord, options) {
    var typeId = importRecord.type || "unknown";
    if (typeId === "dashboard_users_workbook" || typeId === "dashboard_users_csv") {
      return normalizeDashboardUsers(importRecord, options);
    }
    if (typeId === "hr_master_workbook" || typeId === "rider_master_workbook") {
      return normalizeHrWorkbookImport(importRecord, options);
    }
    if (typeId === "external_riders_workbook" || typeId === "external_riders_csv") {
      return normalizeExternalRidersImport(importRecord, options);
    }
    if (typeId === "opr_workbook" || typeId === "opr_csv") {
      return [normalizeRidersBasic(importRecord)];
    }
    if (typeId === "current_assignments_workbook" || typeId === "current_assignments_csv") {
      return normalizeCurrentAssignmentsImport(importRecord, options);
    }
    if (typeId === "vehicle_workbook") {
      if (FleetImportService && typeof FleetImportService.normalizeFleetImport === "function") {
        return FleetImportService.normalizeFleetImport(importRecord, options);
      }
      return [normalizeVehiclesBasic(importRecord)];
    }
    if (typeId === "performance_daily_csv" || typeId === "performance_daily_workbook") {
      return [normalizePerformanceDailyBasic(importRecord)];
    }
    if (typeId === "performance_overall_csv" || typeId === "performance_overall_workbook") {
      return [normalizePerformanceOverallBasic(importRecord)];
    }
    if (typeId === "vda_csv" || typeId === "vda_workbook" || typeId === "vda_keeta_csv" || typeId === "vda_keeta_workbook") {
      return [normalizeVdaBasic(importRecord, options)];
    }
    if (typeId === "face_verification_csv" || typeId === "face_verification_workbook") {
      return [normalizeFaceVerificationBasic(importRecord, options)];
    }
    if (typeId === "delivery_experience_csv" || typeId === "delivery_experience_workbook") {
      return [normalizeDeliveryExperienceBasic(importRecord)];
    }
    if (typeId === "company_invoice_workbook") {
      return normalizeCompanyInvoiceBasic(importRecord, options);
    }
    if (typeId === "internal_settlement_workbook") {
      return normalizeInternalSettlementBasic(importRecord, options);
    }
    if (typeId === "shift_schedule_workbook" || typeId === "shift_schedule_xlsm") {
      return [normalizeShiftScheduleBasic(importRecord)];
    }
    if (typeId === "settings_workbook" || typeId === "monthly_closing_bundle") {
      return [normalizeMonthlyRulesBasic(importRecord)];
    }
    return [{
      entityName: importRecord.targetEntity || "",
      records: [],
      warnings: ["No normalizer is available for this import type yet."],
      errors: ["unsupported_import_type"],
      stats: { inputRows: 0, outputRows: 0 }
    }];
  }

  function normalizeDashboardUsers(importRecord, options) {
    options = options || {};
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["userId"]);
    var batchId = importRecord.id || "";
    var importedAt = new Date().toISOString();
    var platform = detectDashboardPlatform(importRecord);
    var existingDashboardUsers = getCollectionRecords(options, "dashboardUsers");
    var assignments = getCollectionRecords(options, "assignments");
    var externalRiders = getCollectionRecords(options, "externalRiders");
    var hrProfiles = getCollectionRecords(options, "hrProfiles");
    var riderOperationalProfiles = getCollectionRecords(options, "riderOperationalProfiles");
    var riders = getCollectionRecords(options, "riders");
    var previousUsersByDashboardId = indexDashboardUsers(existingDashboardUsers);
    var currentUsers = rows.map(function (row, index) {
      var values = readDashboardUserValues(row, mapping, importRecord, platform, index);
      var existing = values.dashboardUserId ? previousUsersByDashboardId[values.dashboardUserId] : null;
      if (!values.dashboardUserId) {
        return null;
      }
      return mergeDashboardObjects({}, existing || {}, {
        id: existing && existing.id ? existing.id : stableId("dashboardUsers", [values.platform || "unknown", values.dashboardUserId]),
        dashboardUserId: values.dashboardUserId,
        userId: values.dashboardUserId,
        courierId: values.dashboardUserId,
        platform: values.platform,
        dashboardName: values.dashboardName,
        qualificationType: values.qualificationType,
        courierQualificationType: values.qualificationType,
        personalName: values.personalName,
        firstName: values.personalName,
        familyName: values.familyName,
        lastName: values.familyName,
        fullName: values.fullName,
        ownerIqama: values.ownerIqama,
        ownerName: values.fullName,
        idNumber: values.ownerIqama,
        ownerPhone: values.ownerPhone,
        phoneNumber: values.ownerPhone,
        email: values.email,
        vehicleType: values.vehicleType,
        vehicle: values.vehicleType,
        vehicleSerial: values.vehicleSerial,
        plateNumber: values.plateNumber,
        jobStatus: values.jobStatus,
        employmentStatus: values.jobStatus,
        activationStatus: values.activationStatus,
        matchStatus: existing && existing.matchStatus ? existing.matchStatus : "unassigned",
        currentRiderId: existing && existing.currentRiderId ? existing.currentRiderId : "",
        currentRiderIqama: existing && existing.currentRiderIqama ? existing.currentRiderIqama : "",
        currentRiderName: existing && existing.currentRiderName ? existing.currentRiderName : "",
        currentAssignmentId: existing && existing.currentAssignmentId ? existing.currentAssignmentId : "",
        assignmentStatus: existing && existing.assignmentStatus ? existing.assignmentStatus : "",
        reviewStatus: existing && existing.reviewStatus ? existing.reviewStatus : "",
        recommendedAction: existing && existing.recommendedAction ? existing.recommendedAction : "",
        handoverDate: existing && existing.handoverDate ? existing.handoverDate : "",
        returnDate: existing && existing.returnDate ? existing.returnDate : "",
        importedAt: existing && existing.importedAt ? existing.importedAt : importedAt,
        lastSeenImportBatchId: batchId,
        sourceImportBatchId: batchId,
        sourceFile: importRecord.sourceFileName || importRecord.fileName || "",
        sourceSheet: values.sourceSheet,
        sourceRow: values.sourceRow,
        city: values.city,
        register: values.register,
        documentChangeStatus: values.documentChangeStatus,
        settlementMode: values.settlementMode,
        operationMode: normalizeWorkMode(values.settlementMode, values.register),
        pleaseNote: values.notes,
        driverCard: values.driverCard,
        driverCardType: values.driverCardType,
        licenseType: values.licenseType,
        notes: values.notes,
        operationsCity: values.city,
        lifecycleStatus: existing && existing.lifecycleStatus ? existing.lifecycleStatus : "pending_review",
        firstSeenAt: existing && existing.firstSeenAt ? existing.firstSeenAt : importedAt,
        lastSeenAt: importedAt,
        sourceBatchId: batchId,
        missingFromLatestImport: false,
        duplicateDashboardUserId: false,
        latestImportPresence: "present",
        status: values.status
      });
    }).filter(Boolean);

    if (!DashboardImportSnapshot || typeof DashboardImportSnapshot.compareWithPreviousDashboardSnapshot !== "function") {
      return [entityOutput("dashboardUsers", rows, currentUsers)];
    }

    var scope = {
      city: currentUsers[0] ? currentUsers[0].city : normalizeCity(importRecord.city || ""),
      platform: platform,
      register: currentUsers[0] ? currentUsers[0].register : normalizeRegisterCode(importRecord.register || "")
    };
    var diff = DashboardImportSnapshot.compareWithPreviousDashboardSnapshot(existingDashboardUsers, currentUsers, scope);
    var operationalState = DashboardImportSnapshot.updateOperationalState(currentUsers, diff, {
      now: importedAt,
      sourceImportBatchId: batchId
    });
    var mergedUsers = operationalState.currentUsers.concat(operationalState.missingUsers || []);
    var reviews = DashboardImportSnapshot.createStatusReviews(mergedUsers, diff, {
      assignments: assignments,
      riders: riders,
      reviewedAt: importedAt,
      reviewedBy: options.user && options.user.id ? options.user.id : "",
      sourceImportBatchId: batchId
    });
    var reviewsByDashboardId = reviews.reduce(function (memo, review) {
      memo[String(review.dashboardUserId || "")] = review;
      return memo;
    }, {});
    var dashboardUsers = mergedUsers.map(function (user) {
      var review = reviewsByDashboardId[String(user.dashboardUserId || user.userId || "")];
      var next = mergeDashboardObjects({}, user);
      next.matchStatus = computeDashboardMatchStatus(next);
      next.assignmentStatus = next.currentAssignmentId ? (next.assignmentStatus || "active") : "";
      if (review) {
        next.reviewStatus = review.reviewStatus;
        next.recommendedAction = review.recommendedAction;
        if (review.reviewStatus === "missing_from_latest_import") {
          next.status = "under_review";
        } else if (review.reviewStatus === "needs_assignment") {
          next.status = next.currentRiderId ? next.status : "needs_assignment";
        } else if (review.reviewStatus === "needs_swap") {
          next.status = "assigned";
        } else if (review.reviewStatus === "ok" && next.currentRiderId) {
          next.status = "assigned";
        }
      }
      next.lifecycleStatus = computeDashboardLifecycleStatus(next, review);
      next.operationsCity = next.city;
      next.courierId = next.courierId || next.dashboardUserId || next.userId;
      next.courierQualificationType = next.courierQualificationType || next.qualificationType || "";
      next.firstName = next.firstName || next.personalName || "";
      next.lastName = next.lastName || next.familyName || "";
      next.idNumber = next.idNumber || next.ownerIqama || "";
      next.phoneNumber = next.phoneNumber || next.ownerPhone || "";
      next.vehicle = next.vehicle || next.vehicleType || "";
      next.employmentStatus = next.employmentStatus || next.jobStatus || "";
      next.pleaseNote = next.pleaseNote || next.notes || "";
      next.lastSeenAt = importedAt;
      next.sourceBatchId = batchId;
      next.lifecycleStatus = computeDashboardLifecycleStatus(next, {
        hasActiveAssignment: !!next.currentAssignmentId,
        isNewRecord: !!(next.__snapshotMeta && next.__snapshotMeta.isNew),
        missingMeansDismissed: false,
        presentInLatestImport: !next.missingFromLatestImport,
        reviewStatus: review && review.reviewStatus ? review.reviewStatus : next.reviewStatus
      });
      return decorateDashboardUserRecord(next, {
        assignments: assignments,
        externalRiders: externalRiders,
        hrProfiles: hrProfiles,
        riderOperationalProfiles: riderOperationalProfiles,
        riders: riders
      });
    });

    var warnings = [];
    if ((diff.newUsers || []).length) {
      warnings.push("Detected " + diff.newUsers.length + " new dashboard user(s) in the latest import.");
    }
    if ((diff.missingUsers || []).length) {
      warnings.push("Detected " + diff.missingUsers.length + " dashboard user(s) missing from the latest scoped import.");
    }
    if ((diff.changedUsers || []).length) {
      warnings.push("Detected " + diff.changedUsers.length + " dashboard user(s) with tracked field changes.");
    }
    if ((diff.duplicateIds || []).length) {
      warnings.push("Detected duplicate dashboard user IDs in the latest import snapshot.");
    }

    return [
      entityOutput("dashboardUsers", rows, dashboardUsers, {
        warnings: uniqueList(warnings),
        diff: diff
      }),
      entityOutput("operationalStatusReviews", rows, reviews, {
        warnings: uniqueList(warnings)
      })
    ];
  }

  function normalizeRidersBasic(importRecord) {
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["userId"]);
    var records = rows.map(function (row) {
      var values = readCommonValues(row, mapping, importRecord);
      if (!values.userId && !values.iqama) {
        return null;
      }
      var riderId = values.userId || values.iqama;
      return {
        id: stableId("riders", [values.register || "unknown", riderId]),
        riderId: riderId,
        fullName: values.fullName,
        phone: values.phone,
        iqama: values.iqama,
        city: values.city,
        register: values.register,
        status: values.status || "active",
        sourceFile: importRecord.sourceFileName || ""
      };
    }).filter(Boolean);
    return output("riders", rows, records);
  }

  function normalizeHrProfilesBasic(importRecord) {
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, []);
    var records = rows.map(function (row) {
      var values = readCommonValues(row, mapping, importRecord);
      var riderId = values.userId || values.iqama;
      if (!riderId) {
        return null;
      }
      return {
        id: stableId("hrProfiles", [values.register || "unknown", riderId]),
        riderId: riderId,
        fullName: values.fullName,
        iqama: values.iqama,
        city: values.city,
        register: values.register,
        status: values.status || "active",
        workType: normalizeText(HeaderMapper.getValue(row, mapping, "notes")) || "manual_import",
        sourceFile: importRecord.sourceFileName || ""
      };
    }).filter(Boolean);
    return output("hrProfiles", rows, records);
  }

  function normalizeHrWorkbookImport(importRecord, options) {
    options = options || {};
    var workbook = importRecord.analysis && importRecord.analysis.workbook;
    if (!workbook || !HrRiderNormalizer || typeof HrRiderNormalizer.normalizeHrWorkbook !== "function") {
      return importRecord.type === "rider_master_workbook"
        ? [normalizeRidersBasic(importRecord)]
        : [normalizeHrProfilesBasic(importRecord)];
    }

    var bundle = HrRiderNormalizer.normalizeHrWorkbook({ workbook: workbook }, {
      fileName: importRecord.sourceFileName || importRecord.fileName || ""
    });
    var hrProfiles = HrRiderNormalizer.buildHrProfiles(bundle, {});
    var riderBuild = HrRiderNormalizer.buildRiders({
      hrProfiles: hrProfiles,
      platformAccountsRaw: bundle.platformAccountsRaw || []
    }, {
      existingRiders: getCollectionRecords(options, "riders"),
      existingIdentities: getCollectionRecords(options, "riderIdentities"),
      existingPlatformAccounts: getCollectionRecords(options, "riderPlatformAccounts")
    });
    var normalizedBundle = mergeObjects({}, bundle, {
      hrProfiles: hrProfiles
    });
    var riderIdentities = HrRiderNormalizer.buildRiderIdentities(normalizedBundle, riderBuild);
    var riderPlatformAccounts = HrRiderNormalizer.buildRiderPlatformAccounts(normalizedBundle, riderBuild);
    var riderArchiveEvents = HrRiderNormalizer.buildArchiveEvents(normalizedBundle, riderBuild, {
      createdBy: options.user && options.user.id ? options.user.id : ""
    });
    var warnings = uniqueList([].concat(bundle.warnings || []).concat(riderBuild.warnings || []));
    var conflicts = [].concat(bundle.conflicts || []).concat(riderBuild.conflicts || []);
    var meta = {
      warnings: warnings,
      conflicts: conflicts,
      sheetSummaries: bundle.sheetSummaries || []
    };

    return [
      entityOutput("hrProfiles", bundle.rawProfiles || [], hrProfiles, meta),
      entityOutput("riders", hrProfiles, riderBuild.riders || [], {
        warnings: riderBuild.warnings || [],
        conflicts: riderBuild.conflicts || []
      }),
      entityOutput("riderIdentities", riderIdentities, riderIdentities, {
        warnings: riderBuild.warnings || [],
        conflicts: riderBuild.conflicts || []
      }),
      entityOutput("riderPlatformAccounts", bundle.platformAccountsRaw || [], riderPlatformAccounts, {
        warnings: warnings,
        conflicts: conflicts
      }),
      entityOutput("riderArchiveEvents", bundle.statusEvents || [], riderArchiveEvents, {
        warnings: warnings,
        conflicts: conflicts
      })
    ];
  }

  function normalizeExternalRidersImport(importRecord, options) {
    options = options || {};
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["iqama"]);
    var batchId = importRecord.id || "";
    var warnings = [];
    var conflicts = [];
    var externalRecords = [];
    var profileRecords = [];
    var collections = {
      externalRiders: getCollectionRecords(options, "externalRiders"),
      hrProfiles: getCollectionRecords(options, "hrProfiles"),
      riderOperationalProfiles: getCollectionRecords(options, "riderOperationalProfiles"),
      riders: getCollectionRecords(options, "riders")
    };

    rows.forEach(function (row, index) {
      var values = readExternalRiderValues(row, mapping, importRecord, options, index);
      if (!values.iqama) {
        conflicts.push("external_rider_missing_iqama@" + values.sourceRow);
        return;
      }
      if (!hasValidIqamaLength(values.iqama)) {
        conflicts.push("external_rider_invalid_iqama_length@" + values.iqama);
        return;
      }
      var resolution = resolveIdentityBundle({
        fullName: values.fullName,
        iqama: values.iqama,
        riderSource: "External"
      }, collections);
      if (!resolution.hrProfile && !values.fullName) {
        conflicts.push("external_rider_missing_full_name@" + values.iqama);
        return;
      }

      var riderId = deriveOperationalRiderId(values, resolution);
      var profileRecord = createOperationalProfileRecord(values, resolution, riderId, batchId, {
        existingProfile: findProfileByIqama(collections.riderOperationalProfiles, values.iqama),
        riderSource: resolution.hrProfile ? "HR" : "External"
      });
      profileRecords.push(profileRecord);

      if (resolution.hrProfile) {
        warnings.push("hr_rider_not_saved_as_external:" + values.iqama);
        return;
      }
      externalRecords.push(createExternalIdentityRecord(values, resolution, batchId));
    });

    return [
      entityOutput("externalRiders", rows, dedupeRecords(externalRecords), {
        warnings: uniqueList(warnings),
        conflicts: uniqueList(conflicts)
      }),
      entityOutput("riderOperationalProfiles", rows, dedupeRecords(profileRecords), {
        warnings: uniqueList(warnings),
        conflicts: uniqueList(conflicts)
      })
    ];
  }

  function normalizeCurrentAssignmentsImport(importRecord, options) {
    options = options || {};
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["register", "city", "platform", "userId", "actualRiderIqama", "assignmentStartDate"]);
    var batchId = importRecord.id || "";
    var warnings = [];
    var conflicts = [];
    var profileRecords = [];
    var assignmentRecords = [];
    var vehicleHistoryRecords = [];
    var collections = {
      assignments: getCollectionRecords(options, "assignments"),
      dashboardUsers: getCollectionRecords(options, "dashboardUsers"),
      externalRiders: getCollectionRecords(options, "externalRiders"),
      hrProfiles: getCollectionRecords(options, "hrProfiles"),
      riderOperationalProfiles: getCollectionRecords(options, "riderOperationalProfiles"),
      riderVehicleUsageHistory: getCollectionRecords(options, "riderVehicleUsageHistory"),
      riders: getCollectionRecords(options, "riders")
    };
    var activeAssignmentsByCourier = indexActiveAssignmentsByCourier(collections.assignments);

    rows.forEach(function (row, index) {
      var values = readCurrentAssignmentValues(row, mapping, importRecord, options, index);
      if (!values.userId || !values.actualRiderIqama || !values.assignmentStartDate) {
        conflicts.push("current_assignment_missing_required_fields@" + values.sourceRow);
        return;
      }
      if (!hasValidIqamaLength(values.actualRiderIqama)) {
        conflicts.push("current_assignment_invalid_iqama_length@" + values.actualRiderIqama);
        return;
      }

      var resolution = resolveIdentityBundle({
        fullName: values.actualRiderName,
        iqama: values.actualRiderIqama,
        riderSource: values.riderSource,
        riderId: ""
      }, collections);
      var riderRecord = createCanonicalRiderRecord(values, resolution, {
        sourceFile: importRecord.sourceFileName || importRecord.fileName || ""
      });
      var riderId = riderRecord.id;
      var riderSource = resolution.hrProfile ? "HR" : (resolution.externalRider ? "External" : normalizeRiderSourceValue(values.riderType));
      var profileRecord = createOperationalProfileRecord(values, resolution, riderId, batchId, {
        existingProfile: findProfileByIqama(collections.riderOperationalProfiles, values.actualRiderIqama),
        riderSource: riderSource
      });
      var assignmentRecord = createAssignmentImportRecord(values, riderRecord, riderSource, batchId);
      var activeAssignment = activeAssignmentsByCourier[assignmentCourierKey(values)];

      profileRecords.push(profileRecord);
      assignmentRecords.push(assignmentRecord);

      if (activeAssignment && String(activeAssignment.id || "") !== String(assignmentRecord.id || "")) {
        assignmentRecords.push(mergeObjects({}, activeAssignment, {
          assignmentStatus: activeAssignment.assignmentStatus && activeAssignment.assignmentStatus !== "active" ? activeAssignment.assignmentStatus : "ended",
          endDate: values.assignmentStartDate,
          status: "ended",
          updatedBy: options.user && options.user.id ? options.user.id : "",
          sourceBatchId: batchId
        }));
      }

      if (!resolution.hrProfile && !resolution.externalRider) {
        warnings.push("assignment_rider_profile_created_without_master_identity:" + values.actualRiderIqama);
      }

      buildVehicleUsageChanges(values, riderSource, batchId, collections.riderVehicleUsageHistory).forEach(function (record) {
        vehicleHistoryRecords.push(record);
      });
    });

    return [
      entityOutput("riderOperationalProfiles", rows, dedupeRecords(profileRecords), {
        warnings: uniqueList(warnings),
        conflicts: uniqueList(conflicts)
      }),
      entityOutput("assignments", rows, dedupeRecords(assignmentRecords), {
        warnings: uniqueList(warnings),
        conflicts: uniqueList(conflicts)
      }),
      entityOutput("riderVehicleUsageHistory", rows, dedupeRecords(vehicleHistoryRecords), {
        warnings: uniqueList(warnings),
        conflicts: uniqueList(conflicts)
      })
    ];
  }

  function normalizeVehiclesBasic(importRecord) {
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["vehicleSerial"]);
    var records = rows.map(function (row) {
      var values = readCommonValues(row, mapping, importRecord);
      var vehicleSerial = normalizeText(HeaderMapper.getValue(row, mapping, "vehicleSerial")) || normalizeText(HeaderMapper.getValue(row, mapping, "vehicleType"));
      if (!vehicleSerial) {
        return null;
      }
      return {
        id: stableId("vehicles", [vehicleSerial]),
        vehicleSerial: vehicleSerial,
        plate: normalizeText(HeaderMapper.getValue(row, mapping, "vehicleSerial")),
        city: values.city,
        register: values.register,
        status: values.status || "active",
        vehicleType: values.vehicleType,
        sourceFile: importRecord.sourceFileName || ""
      };
    }).filter(Boolean);
    return output("vehicles", rows, records);
  }

  function normalizePerformanceDailyBasic(importRecord) {
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["userId", "date"]);
    var platform = detectDashboardPlatform(importRecord) === "unknown" ? "keeta" : detectDashboardPlatform(importRecord);
    var sourceSheet = inferSourceSheetName(importRecord);
    var records = rows.map(function (row, index) {
      var values = readPerformanceValues(row, mapping, importRecord);
      if (!values.userId && !values.iqama) {
        return null;
      }
      var dateValue = normalizeIsoDate(HeaderMapper.getValue(row, mapping, "date"));
      var month = values.month || monthFromIsoDate(dateValue);
      var userId = values.userId || values.iqama;
      return {
        id: stableId("performanceDaily", [values.register || "unknown", userId, dateValue || importRecord.month || "unknown"]),
        riderId: "",
        dashboardUserId: userId,
        userId: userId,
        iqama: values.iqama,
        platform: platform,
        city: values.city,
        register: values.register,
        vehicleType: values.vehicleType,
        workMode: values.workMode,
        status: values.status || "active",
        date: dateValue,
        dateKey: normalizeDateKey(dateValue),
        month: month,
        orders: values.completedOrders || values.deliveredTasks,
        completedOrders: values.completedOrders || values.deliveredTasks,
        deliveredTasks: values.deliveredTasks,
        cancelledOrders: values.cancelledOrders,
        rejectedOrders: values.rejectedOrders,
        workingHours: values.workingHours || values.onlineHours,
        onlineHours: values.onlineHours,
        attendanceStatus: values.attendanceStatus,
        ataScore: values.ataScore,
        lateCount: values.lateCount,
        cancellationRate: values.cancellationRate,
        validDayStatus: "under_review",
        validDayReasons: [],
        mandatoryDayStatus: "not_mandatory",
        sourceFile: importRecord.sourceFileName || "",
        sourceSheet: sourceSheet,
        sourceRow: index + 2,
        importBatchId: importRecord.id || ""
      };
    }).filter(Boolean);
    return output("performanceDaily", rows, records);
  }

  function normalizePerformanceOverallBasic(importRecord) {
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["userId"]);
    var platform = detectDashboardPlatform(importRecord) === "unknown" ? "keeta" : detectDashboardPlatform(importRecord);
    var sourceSheet = inferSourceSheetName(importRecord);
    var records = rows.map(function (row, index) {
      var values = readPerformanceValues(row, mapping, importRecord);
      if (!values.userId && !values.iqama) {
        return null;
      }
      var userId = values.userId || values.iqama;
      return {
        id: stableId("performanceMonthly", [values.register || "unknown", userId, importRecord.month || values.month || "unknown"]),
        riderId: "",
        dashboardUserId: userId,
        userId: userId,
        iqama: values.iqama,
        platform: platform,
        city: values.city,
        register: values.register,
        vehicleType: values.vehicleType,
        workMode: values.workMode,
        status: values.status || "active",
        month: importRecord.month || values.month || "",
        totalOrders: values.completedOrders || values.deliveredTasks,
        totalCompletedOrders: values.completedOrders || values.deliveredTasks,
        totalCancelledOrders: values.cancelledOrders,
        totalRejectedOrders: values.rejectedOrders,
        totalWorkingHours: values.workingHours || values.onlineHours,
        totalOnlineHours: values.onlineHours,
        deliveredTasks: values.deliveredTasks,
        sourceFile: importRecord.sourceFileName || "",
        sourceSheet: sourceSheet,
        sourceRow: index + 2,
        importBatchId: importRecord.id || ""
      };
    }).filter(Boolean);
    return output("performanceMonthly", rows, records);
  }

  function normalizeVdaBasic(importRecord, options) {
    if (MonthlyClosingEngine && importRecord.analysis && importRecord.analysis.workbook && (importRecord.type === "vda_workbook" || importRecord.type === "vda_keeta_workbook")) {
      var xlsxLib = getXlsxLib(options);
      if (xlsxLib) {
        var sheetName = importRecord.analysis.workbook.SheetNames[0];
        var rows = xlsxLib.utils.sheet_to_json(importRecord.analysis.workbook.Sheets[sheetName], { defval: "", raw: true });
        var normalized = MonthlyClosingEngine.normalizeCompanyDailyVdaRows(rows).map(function (item) {
          return {
            id: stableId("vdaResults", [item.register || importRecord.register || "unknown", item.riderId || "unknown", item.dateKey || importRecord.month || "unknown"]),
            riderId: item.riderId || "",
            userId: item.riderId || "",
            dashboardUserId: item.riderId || "",
            iqama: item.iqama || "",
            platform: "keeta",
            city: normalizeCity(item.city || importRecord.city || ""),
            register: normalizeRegisterCode(item.register || importRecord.register || ""),
            status: item.finalStatus || "review",
            month: importRecord.month || "",
            deliveredTasks: item.deliveredTasks || 0,
            vehicleType: item.vehicleType || "",
            dateKey: item.dateKey || "",
            sourceSheet: sheetName,
            sourceFile: importRecord.sourceFileName || ""
          };
        });
        return output("vdaResults", rows, normalized);
      }
    }

    var genericRows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["userId"]);
    var records = genericRows.map(function (row) {
      var values = readCommonValues(row, mapping, importRecord);
      if (!values.userId) {
        return null;
      }
      return {
        id: stableId("vdaResults", [values.register || "unknown", values.userId, importRecord.month || "unknown"]),
        riderId: values.userId,
        userId: values.userId,
        dashboardUserId: values.userId,
        iqama: values.iqama,
        platform: "keeta",
        city: values.city,
        register: values.register,
        vehicleType: values.vehicleType,
        status: values.status || "review",
        month: importRecord.month || "",
        deliveredTasks: parseNumber(HeaderMapper.getValue(row, mapping, "deliveredTasks")),
        vda: normalizeText(HeaderMapper.getValue(row, mapping, "vda")),
        sourceFile: importRecord.sourceFileName || ""
      };
    }).filter(Boolean);
    return output("vdaResults", genericRows, records);
  }

  function normalizeFaceVerificationBasic(importRecord, options) {
    if (MonthlyClosingEngine && importRecord.analysis && importRecord.analysis.workbook) {
      var xlsxLib = getXlsxLib(options);
      if (xlsxLib && typeof MonthlyClosingEngine.normalizeFaceRecognitionWorkbook === "function") {
        var normalizedFace = MonthlyClosingEngine.normalizeFaceRecognitionWorkbook(importRecord.analysis.workbook, xlsxLib);
        var records = (normalizedFace.dailyRows || []).map(function (row) {
          return {
            id: stableId("faceVerification", [row.register || importRecord.register || "unknown", row.riderId || "unknown", row.dateKey || importRecord.month || "unknown"]),
            riderId: row.riderId || "",
            userId: row.riderId || "",
            dashboardUserId: row.riderId || "",
            iqama: row.iqama || "",
            platform: "keeta",
            city: normalizeCity(row.city || importRecord.city || ""),
            register: normalizeRegisterCode(row.register || importRecord.register || ""),
            status: row.finalStatus || "review",
            result: row.finalStatus || row.result || "",
            dateKey: row.dateKey || "",
            date: isoDateFromDateKey(row.dateKey || ""),
            month: importRecord.month || "",
            sourceFile: importRecord.sourceFileName || ""
          };
        });
        return output("faceVerification", normalizedFace.dailyRows || [], records);
      }
    }

    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["userId"]);
    var records = rows.map(function (row) {
      var values = readCommonValues(row, mapping, importRecord);
      if (!values.userId) {
        return null;
      }
      return {
        id: stableId("faceVerification", [values.register || "unknown", values.userId, importRecord.month || "unknown"]),
        riderId: values.userId,
        userId: values.userId,
        dashboardUserId: values.userId,
        iqama: values.iqama,
        platform: "keeta",
        city: values.city,
        register: values.register,
        status: values.status || "review",
        result: values.status || normalizeText(HeaderMapper.getValue(row, mapping, "notes")),
        dateKey: normalizeDateKey(HeaderMapper.getValue(row, mapping, "date")),
        date: normalizeIsoDate(HeaderMapper.getValue(row, mapping, "date")),
        month: importRecord.month || "",
        sourceFile: importRecord.sourceFileName || ""
      };
    }).filter(Boolean);
    return output("faceVerification", rows, records);
  }

  function normalizeDeliveryExperienceBasic(importRecord) {
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, ["userId"]);
    var records = rows.map(function (row) {
      var values = readCommonValues(row, mapping, importRecord);
      if (!values.userId) {
        return null;
      }
      return {
        id: stableId("deliveryExperience", [values.register || "unknown", values.userId, importRecord.month || "unknown"]),
        riderId: values.userId,
        userId: values.userId,
        dashboardUserId: values.userId,
        iqama: values.iqama,
        platform: "keeta",
        city: values.city,
        register: values.register,
        vehicleType: values.vehicleType,
        status: values.status || "review",
        month: importRecord.month || "",
        level: normalizeText(HeaderMapper.getValue(row, mapping, "notes")) || normalizeText(HeaderMapper.getValue(row, mapping, "status")),
        experienceLevel: normalizeText(HeaderMapper.getValue(row, mapping, "notes")) || normalizeText(HeaderMapper.getValue(row, mapping, "status")),
        estimatedBonusAmount: parseNumber(HeaderMapper.getValue(row, mapping, "deliveredTasks")),
        sourceFile: importRecord.sourceFileName || ""
      };
    }).filter(Boolean);
    return output("deliveryExperience", rows, records);
  }

  function normalizeCompanyInvoiceBasic(importRecord, options) {
    if (!MonthlyClosingEngine || !importRecord.analysis || !importRecord.analysis.workbook) {
      return [output("invoiceCourierDetail", [], [])];
    }
    var xlsxLib = getXlsxLib(options);
    if (!xlsxLib) {
      return [output("invoiceCourierDetail", [], [])];
    }
    var workbook = importRecord.analysis.workbook;
    var partnerSheet = findSheetName(workbook, ["تفاصيل الشركاء", "partner details"]);
    var courierSheet = findSheetName(workbook, ["تفاصيل سائق التوصيل", "courier details"]);
    var partnerRows = partnerSheet ? xlsxLib.utils.sheet_to_json(workbook.Sheets[partnerSheet], { defval: "", raw: true }) : [];
    var courierRows = courierSheet ? xlsxLib.utils.sheet_to_json(workbook.Sheets[courierSheet], { defval: "", raw: true }) : [];
    var partners = MonthlyClosingEngine.normalizeCompanyPartnerInvoice(partnerRows).map(function (item) {
      return {
        id: stableId("invoicePartnerSummary", [importRecord.month || "unknown", normalizeRegisterCode(item.register || importRecord.register || ""), item.partnerId || "unknown"]),
        month: importRecord.month || "",
        city: normalizeCity(item.city || importRecord.city || ""),
        register: normalizeRegisterCode(item.register || importRecord.register || ""),
        status: "imported",
        partnerId: item.partnerId || "",
        partnerName: item.partnerName || "",
        totalDue: item.totalDue || 0,
        sourceFile: importRecord.sourceFileName || ""
      };
    });
    var couriers = MonthlyClosingEngine.normalizeCompanyCourierInvoice(courierRows).map(function (item) {
      return {
        id: stableId("invoiceCourierDetail", [importRecord.month || "unknown", normalizeRegisterCode(item.register || importRecord.register || ""), item.riderId || "unknown"]),
        month: importRecord.month || "",
        city: normalizeCity(item.city || importRecord.city || ""),
        register: normalizeRegisterCode(item.register || importRecord.register || ""),
        status: item.isValid ? "valid" : "invalid",
        riderId: item.riderId || "",
        fullName: item.fullName || "",
        partnerId: item.partnerId || "",
        deliveredOrders: item.deliveredOrders || 0,
        grossCompanyAmount: item.grossCompanyAmount || 0,
        sourceFile: importRecord.sourceFileName || ""
      };
    });
    return [
      output("invoicePartnerSummary", partnerRows, partners),
      output("invoiceCourierDetail", courierRows, couriers)
    ];
  }

  function normalizeInternalSettlementBasic(importRecord, options) {
    if (!MonthlyClosingEngine || !importRecord.analysis || !importRecord.analysis.workbook) {
      return [output("internalSettlement", [], [])];
    }
    var xlsxLib = getXlsxLib(options);
    if (!xlsxLib || typeof MonthlyClosingEngine.normalizeInternalSettlementWorkbook !== "function") {
      return [output("internalSettlement", [], [])];
    }
    var normalized = MonthlyClosingEngine.normalizeInternalSettlementWorkbook(importRecord.analysis.workbook, xlsxLib);
    var rows = []
      .concat(normalized.express || [])
      .concat(normalized.albwaba || [])
      .concat(normalized.fr3pl || []);
    var records = rows.map(function (item) {
      var riderId = item.riderId || item["المعرف"] || "";
      return {
        id: stableId("internalSettlement", [importRecord.month || "unknown", normalizeRegisterCode(item.register || importRecord.register || ""), riderId || "unknown"]),
        month: importRecord.month || "",
        city: normalizeCity(item.city || importRecord.city || ""),
        register: normalizeRegisterCode(item.register || importRecord.register || ""),
        status: item.isValid ? "valid" : "review",
        riderId: riderId,
        fullName: item.fullName || "",
        iqama: item.iqama || "",
        deliveredOrders: item.deliveredOrders || 0,
        grossAmount: item.grossAmount || 0,
        sourceFile: importRecord.sourceFileName || ""
      };
    });
    return [output("internalSettlement", rows, records)];
  }

  function normalizeShiftScheduleBasic(importRecord) {
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, []);
    var records = rows.map(function (row, index) {
      var values = readCommonValues(row, mapping, importRecord);
      var shiftDate = normalizeDateKey(HeaderMapper.getValue(row, mapping, "date")) || (importRecord.month || "").replace("-", "") + "01";
      return {
        id: stableId("shiftSchedules", [values.register || "unknown", shiftDate || "unknown", String(index)]),
        city: values.city,
        register: values.register,
        status: "draft",
        shiftDate: shiftDate,
        riderId: values.userId,
        sourceFile: importRecord.sourceFileName || ""
      };
    }).filter(function (item) {
      return item.shiftDate || item.riderId;
    });
    return output("shiftSchedules", rows, records);
  }

  function normalizeMonthlyRulesBasic(importRecord) {
    var rows = getRows(importRecord);
    var mapping = getMapping(importRecord, []);
    var records = rows.map(function (row, index) {
      var values = readCommonValues(row, mapping, importRecord);
      return {
        id: stableId("monthlyRules", [importRecord.month || values.month || "unknown", values.register || "unknown", String(index)]),
        month: importRecord.month || values.month || "",
        city: values.city,
        register: values.register,
        status: "draft",
        ruleType: normalizeText(HeaderMapper.getValue(row, mapping, "notes")) || "imported",
        sourceFile: importRecord.sourceFileName || ""
      };
    }).filter(Boolean);
    return output("monthlyRules", rows, records);
  }

  function readExternalRiderValues(row, mapping, importRecord, options, index) {
    var common = readCommonValues(row, mapping, importRecord);
    var actorEmail = normalizeText(HeaderMapper.getValue(row, mapping, "email")) ||
      normalizeText(options && options.user && options.user.email) ||
      normalizeText(options && options.user && options.user.username);
    return {
      appPhone: normalizePhoneValue(HeaderMapper.getValue(row, mapping, "appPhone")),
      city: common.city,
      contactPhone: normalizePhoneValue(common.phone),
      createdByEmail: actorEmail,
      currentUserDisplay: normalizeText(HeaderMapper.getValue(row, mapping, "userId")),
      fullName: common.fullName,
      gasCard: normalizeText(HeaderMapper.getValue(row, mapping, "gasCard")),
      iban: normalizeIbanValue(HeaderMapper.getValue(row, mapping, "iban")),
      iqama: normalizeIqamaValue(common.iqama),
      nationality: normalizeText(HeaderMapper.getValue(row, mapping, "nationality")),
      notes: normalizeText(HeaderMapper.getValue(row, mapping, "notes")),
      platform: detectDashboardPlatform(importRecord) === "unknown" ? "keeta" : detectDashboardPlatform(importRecord),
      register: common.register,
      riderType: normalizeText(HeaderMapper.getValue(row, mapping, "riderType")),
      sourceFile: importRecord.sourceFileName || importRecord.fileName || "",
      sourceRow: index + 2,
      sourceTimestamp: normalizeIsoDateTime(HeaderMapper.getValue(row, mapping, "sourceTimestamp") || HeaderMapper.getValue(row, mapping, "date")),
      tools: normalizeText(HeaderMapper.getValue(row, mapping, "tools")),
      updatedByEmail: actorEmail,
      vehicleDisplay: normalizeText(HeaderMapper.getValue(row, mapping, "vehicleType"))
    };
  }

  function readCurrentAssignmentValues(row, mapping, importRecord, options, index) {
    return {
      actualRiderIqama: normalizeIqamaValue(HeaderMapper.getValue(row, mapping, "actualRiderIqama")),
      actualRiderName: normalizeText(HeaderMapper.getValue(row, mapping, "actualRiderName")),
      actualRiderPhone: normalizePhoneValue(HeaderMapper.getValue(row, mapping, "actualRiderPhone")),
      actualVehicle: normalizeText(HeaderMapper.getValue(row, mapping, "actualVehicle")),
      assignmentStartDate: normalizeIsoDate(HeaderMapper.getValue(row, mapping, "assignmentStartDate")),
      assignmentStatus: normalizeAssignmentStatusValue(HeaderMapper.getValue(row, mapping, "assignmentStatus")),
      city: normalizeCity(HeaderMapper.getValue(row, mapping, "city") || importRecord.city || ""),
      dashboardVehicle: normalizeText(HeaderMapper.getValue(row, mapping, "dashboardVehicle")),
      firstOnlineDate: normalizeIsoDate(HeaderMapper.getValue(row, mapping, "firstOnlineDate")),
      notes: normalizeText(HeaderMapper.getValue(row, mapping, "notes")),
      operationMode: normalizeOperationModeValue(HeaderMapper.getValue(row, mapping, "operationMode")),
      ownerIqama: normalizeIqamaValue(HeaderMapper.getValue(row, mapping, "ownerIqama")),
      ownerName: normalizeText(HeaderMapper.getValue(row, mapping, "ownerName")),
      platform: normalizeText(HeaderMapper.getValue(row, mapping, "platform") || detectDashboardPlatform(importRecord) || "keeta").toLowerCase(),
      plateNumber: normalizeText(HeaderMapper.getValue(row, mapping, "plateNumber")),
      register: normalizeRegisterCode(HeaderMapper.getValue(row, mapping, "register") || importRecord.register || ""),
      riderReceiveDate: normalizeIsoDate(HeaderMapper.getValue(row, mapping, "riderReceiveDate")),
      riderSource: normalizeRiderSourceValue(HeaderMapper.getValue(row, mapping, "riderType")),
      riderType: normalizeText(HeaderMapper.getValue(row, mapping, "riderType")),
      sourceFile: importRecord.sourceFileName || importRecord.fileName || "",
      sourceRow: index + 2,
      supervisor: normalizeText(HeaderMapper.getValue(row, mapping, "supervisor")),
      userId: normalizeText(HeaderMapper.getValue(row, mapping, "userId")),
      vehicleSerial: normalizeText(HeaderMapper.getValue(row, mapping, "vehicleSerial")),
      vehicleType: normalizeVehicleType(HeaderMapper.getValue(row, mapping, "vehicleType"))
    };
  }

  function resolveIdentityBundle(payload, collections) {
    if (resolveRiderIdentity) {
      return resolveRiderIdentity(payload, collections || {});
    }
    return {
      allowCreateExternal: true,
      externalRider: findExternalRiderByIqama(collections && collections.externalRiders, payload && payload.iqama),
      hrProfile: findHrProfileByIqama(collections && collections.hrProfiles, payload && payload.iqama),
      iqama: normalizeIqamaValue(payload && payload.iqama),
      rider: findCanonicalRider(collections && collections.riders, payload && payload.iqama, payload && payload.riderId),
      riderId: "",
      riderSource: normalizeRiderSourceValue(payload && payload.riderSource)
    };
  }

  function createExternalIdentityRecord(values, resolution, batchId) {
    var existing = resolution && resolution.externalRider ? resolution.externalRider : null;
    var id = existing && existing.id
      ? existing.id
      : (RiderIdentityResolver && RiderIdentityResolver.buildExternalRiderId
        ? RiderIdentityResolver.buildExternalRiderId(values.iqama, values.fullName, values.contactPhone)
        : stableId("externalRiders", [values.iqama, values.fullName, values.contactPhone]));
    return mergeObjects({}, existing || {}, {
      id: id,
      sourceTimestamp: values.sourceTimestamp,
      iqama: values.iqama,
      fullName: values.fullName || existing && existing.fullName || "",
      contactPhone: values.contactPhone,
      riderType: values.riderType,
      vehicleDisplay: values.vehicleDisplay,
      gasCard: values.gasCard,
      tools: values.tools,
      nationality: values.nationality,
      appPhone: values.appPhone,
      iban: values.iban,
      currentUserDisplay: values.currentUserDisplay || values.userId || "",
      createdByEmail: existing && existing.createdByEmail ? existing.createdByEmail : values.createdByEmail,
      updatedByEmail: values.updatedByEmail || values.createdByEmail,
      notes: values.notes,
      sourceBatchId: batchId,
      sourceFile: values.sourceFile,
      city: values.city,
      register: values.register,
      status: existing && existing.status ? existing.status : "active"
    });
  }

  function createOperationalProfileRecord(values, resolution, riderId, batchId, options) {
    options = options || {};
    var existing = options.existingProfile || null;
    var source = options.riderSource || normalizeRiderSourceValue(values.riderType || values.riderSource);
    var id = existing && existing.id
      ? existing.id
      : (RiderIdentityResolver && RiderIdentityResolver.buildOperationalProfileId
        ? RiderIdentityResolver.buildOperationalProfileId(values.iqama || values.actualRiderIqama, riderId)
        : stableId("riderOperationalProfiles", [values.iqama || values.actualRiderIqama, riderId]));
    return mergeObjects({}, existing || {}, {
      id: id,
      iqama: values.iqama || values.actualRiderIqama,
      riderId: riderId,
      riderSource: source,
      contactPhone: values.contactPhone || values.actualRiderPhone || existing && existing.contactPhone || "",
      appPhone: values.appPhone || existing && existing.appPhone || "",
      iban: values.iban || existing && existing.iban || "",
      gasCard: values.gasCard || existing && existing.gasCard || "",
      tools: values.tools || existing && existing.tools || "",
      currentUserSummary: values.currentUserDisplay || values.ownerName || values.userId || existing && existing.currentUserSummary || "",
      preferredPlatform: normalizeText(values.platform || existing && existing.preferredPlatform || "keeta").toLowerCase(),
      preferredCity: values.city || existing && existing.preferredCity || "",
      preferredRegister: values.register || existing && existing.preferredRegister || "",
      lastUpdatedBy: values.updatedByEmail || values.createdByEmail || "",
      lastUpdatedAt: new Date().toISOString(),
      sourceBatchId: batchId,
      notes: values.notes || existing && existing.notes || "",
      sourceFile: values.sourceFile || existing && existing.sourceFile || "",
      city: values.city || existing && existing.city || "",
      register: values.register || existing && existing.register || "",
      status: existing && existing.status ? existing.status : "active"
    });
  }

  function createCanonicalRiderRecord(values, resolution, options) {
    options = options || {};
    var existing = resolution && resolution.rider ? resolution.rider : null;
    var hrProfile = resolution && resolution.hrProfile ? resolution.hrProfile : null;
    var displayName = normalizeText(values.actualRiderName || values.fullName || existing && existing.displayName || hrProfile && (hrProfile.fullNameArabic || hrProfile.fullNameEnglish || hrProfile.fullName) || "");
    var riderId = existing && existing.id
      ? existing.id
      : stableId("riders", [values.actualRiderIqama || values.iqama || displayName || values.userId || "unknown"]);
    var normalizedSource = hrProfile ? "HR" : normalizeRiderSourceValue(values.riderType || values.riderSource);
    return mergeObjects({}, existing || {}, {
      id: riderId,
      primaryIqama: values.actualRiderIqama || values.iqama,
      displayName: displayName,
      normalizedName: displayName.toLowerCase(),
      nationality: normalizeText(values.nationality || existing && existing.nationality || hrProfile && hrProfile.nationality || ""),
      phones: uniqueList([values.contactPhone, values.actualRiderPhone, values.appPhone].concat(existing && existing.phones || [])),
      cities: uniqueList([values.city].concat(existing && existing.cities || [])),
      registers: uniqueList([values.register].concat(existing && existing.registers || [])),
      platforms: uniqueList([values.platform].concat(existing && existing.platforms || [])),
      employmentType: hrProfile ? normalizeText(hrProfile.employmentType || existing && existing.employmentType || "employee") : normalizeText(existing && existing.employmentType || "external"),
      currentWorkStatus: normalizeText(existing && existing.currentWorkStatus || (values.assignmentStatus === "dismissed" ? "not_working" : "working")),
      hrProfileId: hrProfile && hrProfile.id ? hrProfile.id : existing && existing.hrProfileId || "",
      riskFlags: uniqueList((existing && existing.riskFlags || []).concat(hrProfile ? [] : ["external_rider"])),
      notes: normalizeText(values.notes || existing && existing.notes || ""),
      firstSeenAt: existing && existing.firstSeenAt ? existing.firstSeenAt : new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      city: values.city || existing && existing.city || "",
      register: values.register || existing && existing.register || "",
      status: existing && existing.status ? existing.status : "active",
      sourceFile: options.sourceFile || existing && existing.sourceFile || ""
    });
  }

  function deriveOperationalRiderId(values, resolution) {
    return createCanonicalRiderRecord(values, resolution, {
      sourceFile: values && values.sourceFile ? values.sourceFile : ""
    }).id;
  }

  function createAssignmentImportRecord(values, riderRecord, riderSource, batchId) {
    var assignmentId = stableId("assignments", [
      values.platform || "keeta",
      values.register || "unknown",
      values.city || "unknown",
      values.userId || "unknown",
      values.actualRiderIqama || "unknown",
      values.assignmentStartDate || "unknown"
    ]);
    return {
      id: assignmentId,
      assignmentId: assignmentId,
      dashboardUserId: values.userId,
      courierId: values.userId,
      userId: values.userId,
      riderId: riderRecord && riderRecord.id ? riderRecord.id : "",
      riderIqama: values.actualRiderIqama,
      ownerIqama: values.ownerIqama,
      ownerName: values.ownerName,
      actualRiderIqama: values.actualRiderIqama,
      actualRiderName: values.actualRiderName,
      riderSource: riderSource,
      actualRiderPhone: values.actualRiderPhone,
      city: values.city,
      register: values.register,
      platform: values.platform || "keeta",
      assignmentType: "import_sync",
      operationMode: values.operationMode,
      assignmentStatus: values.assignmentStatus,
      assignmentStartDate: values.assignmentStartDate,
      riderReceiveDate: values.riderReceiveDate,
      firstOnlineDate: values.firstOnlineDate,
      dashboardVehicle: values.dashboardVehicle,
      actualVehicle: values.actualVehicle,
      vehicleType: values.vehicleType,
      plateNumber: values.plateNumber,
      vehicleSerial: values.vehicleSerial,
      supervisor: values.supervisor,
      startDate: values.assignmentStartDate,
      endDate: values.assignmentStatus === "active" ? "" : values.assignmentStartDate,
      reason: "import_sync",
      note: values.notes,
      notes: values.notes,
      sourceBatchId: batchId,
      sourceImportBatchId: batchId,
      createdBy: "import_center",
      updatedBy: "import_center",
      status: values.assignmentStatus === "active" ? "active" : values.assignmentStatus,
      sourceFile: values.sourceFile
    };
  }

  function createMinimalDashboardUserRecord(values, riderRecord, assignmentRecord, existing) {
    return mergeDashboardObjects({}, existing || {}, {
      id: existing && existing.id ? existing.id : stableId("dashboardUsers", [values.platform || "keeta", values.userId]),
      dashboardUserId: values.userId,
      userId: values.userId,
      courierId: values.userId,
      platform: values.platform || "keeta",
      city: values.city,
      operationsCity: values.city,
      register: values.register,
      ownerIqama: values.ownerIqama,
      idNumber: values.ownerIqama,
      fullName: values.ownerName || values.actualRiderName || existing && existing.fullName || "",
      phoneNumber: values.actualRiderPhone || existing && existing.phoneNumber || "",
      vehicleType: values.vehicleType,
      vehicle: values.vehicleType,
      vehicleSerial: values.vehicleSerial,
      plateNumber: values.plateNumber,
      currentRiderId: riderRecord && riderRecord.id ? riderRecord.id : "",
      currentRiderIqama: values.actualRiderIqama,
      currentRiderName: values.actualRiderName,
      currentAssignmentId: assignmentRecord.id,
      assignmentStatus: assignmentRecord.assignmentStatus,
      reviewStatus: assignmentRecord.assignmentStatus === "active" ? "ok" : "needs_review",
      recommendedAction: assignmentRecord.assignmentStatus === "active" ? "none" : "review_assignment",
      matchStatus: riderRecord && riderRecord.id ? "matched" : "needs_review",
      handoverDate: values.assignmentStartDate,
      returnDate: assignmentRecord.assignmentStatus === "active" ? "" : values.assignmentStartDate,
      jobStatus: assignmentRecord.assignmentStatus,
      employmentStatus: assignmentRecord.assignmentStatus,
      lifecycleStatus: mapLifecycleStatusFromAssignment(assignmentRecord.assignmentStatus),
      sourceBatchId: assignmentRecord.sourceBatchId,
      lastSeenAt: new Date().toISOString(),
      firstSeenAt: existing && existing.firstSeenAt ? existing.firstSeenAt : new Date().toISOString(),
      status: assignmentRecord.assignmentStatus === "active" ? "working" : assignmentRecord.assignmentStatus,
      sourceFile: values.sourceFile
    });
  }

  function createAssignmentHistorySyncRecord(previousAssignment, nextAssignment, values, batchId, user) {
    return {
      id: stableId("assignmentHistory", [values.userId, values.actualRiderIqama, values.assignmentStartDate, batchId || "import"]),
      dashboardUserId: values.userId,
      previousRiderId: previousAssignment && previousAssignment.riderId ? previousAssignment.riderId : "",
      previousRiderIqama: previousAssignment && (previousAssignment.actualRiderIqama || previousAssignment.riderIqama) ? (previousAssignment.actualRiderIqama || previousAssignment.riderIqama) : "",
      newRiderId: nextAssignment && nextAssignment.riderId ? nextAssignment.riderId : "",
      newRiderIqama: values.actualRiderIqama,
      city: values.city,
      register: values.register,
      platform: values.platform,
      action: "import_assignment_sync",
      actionDate: values.assignmentStartDate,
      reason: "Imported current assignments sync",
      before: previousAssignment || null,
      after: nextAssignment || null,
      createdBy: user && user.id ? user.id : "import_center",
      sourceFile: values.sourceFile,
      status: "active"
    };
  }

  function buildVehicleUsageChanges(values, riderSource, batchId, existingRecords) {
    var vehicleKey = normalizeText(values.vehicleSerial || values.plateNumber || values.actualVehicle || values.dashboardVehicle);
    if (!vehicleKey) {
      return [];
    }
    var activeRecord = findActiveVehicleUsage(existingRecords, values.actualRiderIqama, values.platform, values.city, values.register);
    var nextRecords = [];
    if (activeRecord && normalizeText(activeRecord.vehicleSerial || activeRecord.plateNumber || activeRecord.notes) !== vehicleKey) {
      nextRecords.push(mergeObjects({}, activeRecord, {
        active: false,
        endDate: values.assignmentStartDate,
        status: "inactive"
      }));
    }
    var usageId = stableId("riderVehicleUsageHistory", [values.actualRiderIqama, values.vehicleSerial || values.plateNumber || values.actualVehicle || "private", values.assignmentStartDate || "unknown"]);
    nextRecords.push({
      id: usageId,
      riderIqama: values.actualRiderIqama,
      riderName: values.actualRiderName,
      riderSource: riderSource || "Unknown",
      vehicleSource: deriveVehicleSource(values),
      vehicleType: deriveVehicleUsageType(values),
      vehicleSerial: values.vehicleSerial,
      plateNumber: values.plateNumber,
      vehicleRegister: values.register,
      city: values.city,
      platform: values.platform,
      startDate: values.assignmentStartDate || values.riderReceiveDate || values.firstOnlineDate || "",
      endDate: values.assignmentStatus === "active" ? "" : (values.assignmentStartDate || ""),
      active: values.assignmentStatus === "active",
      sourceBatchId: batchId,
      sourceOperation: "current_assignments_import",
      createdBy: "import_center",
      notes: normalizeText(values.notes || values.actualVehicle || values.dashboardVehicle || ""),
      sourceFile: values.sourceFile,
      register: values.register,
      status: values.assignmentStatus === "active" ? "active" : "inactive"
    });
    return nextRecords;
  }

  function findActiveVehicleUsage(records, riderIqama, platform, city, register) {
    return (records || []).filter(function (item) {
      return normalizeText(item && item.riderIqama) === normalizeText(riderIqama) &&
        normalizeText(item && item.platform) === normalizeText(platform) &&
        normalizeText(item && item.city) === normalizeText(city) &&
        normalizeRegisterCode(item && item.register) === normalizeRegisterCode(register) &&
        item && item.active;
    })[0] || null;
  }

  function findProfileByIqama(records, iqama) {
    var normalized = normalizeIqamaValue(iqama);
    return (records || []).filter(function (item) {
      return normalizeIqamaValue(item && item.iqama) === normalized;
    })[0] || null;
  }

  function findExternalRiderByIqama(records, iqama) {
    var normalized = normalizeIqamaValue(iqama);
    return (records || []).filter(function (item) {
      return normalizeIqamaValue(item && item.iqama) === normalized;
    })[0] || null;
  }

  function findHrProfileByIqama(records, iqama) {
    var normalized = normalizeIqamaValue(iqama);
    return (records || []).filter(function (item) {
      return normalizeIqamaValue(item && item.iqama) === normalized;
    })[0] || null;
  }

  function findCanonicalRider(records, iqama, riderId) {
    var normalizedIqama = normalizeIqamaValue(iqama);
    var normalizedRiderId = normalizeText(riderId);
    return (records || []).filter(function (item) {
      if (normalizedRiderId && normalizeText(item && item.id) === normalizedRiderId) {
        return true;
      }
      return normalizedIqama && normalizeIqamaValue(item && item.primaryIqama) === normalizedIqama;
    })[0] || null;
  }

  function findDashboardUserByKey(records, userId, platform, register, city) {
    return (records || []).filter(function (item) {
      return normalizeText(item && (item.dashboardUserId || item.userId)) === normalizeText(userId) &&
        normalizeText(item && item.platform) === normalizeText(platform) &&
        normalizeRegisterCode(item && item.register) === normalizeRegisterCode(register) &&
        normalizeText(item && item.city) === normalizeText(city);
    })[0] || null;
  }

  function indexActiveAssignmentsByCourier(records) {
    return (records || []).reduce(function (memo, item) {
      if (normalizeText(item && item.status) !== "active" && normalizeText(item && item.assignmentStatus) !== "active") {
        return memo;
      }
      memo[assignmentCourierKey(item)] = item;
      return memo;
    }, {});
  }

  function assignmentCourierKey(record) {
    return [
      normalizeText(record && (record.userId || record.courierId || record.dashboardUserId)),
      normalizeText(record && record.platform),
      normalizeRegisterCode(record && record.register),
      normalizeText(record && record.city)
    ].join("::");
  }

  function normalizeIqamaValue(value) {
    return normalizeText(value).replace(/[^\d]/g, "");
  }

  function normalizePhoneValue(value) {
    return normalizeText(value).replace(/[^\d+]/g, "");
  }

  function normalizeIbanValue(value) {
    return normalizeText(value).replace(/\s+/g, "").toUpperCase();
  }

  function hasValidIqamaLength(value) {
    var digits = normalizeIqamaValue(value);
    return digits.length >= 10 && digits.length <= 12;
  }

  function normalizeOperationModeValue(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text) {
      return "salary";
    }
    if (text.indexOf("per order") >= 0 || text.indexOf("Ø¨Ø§Ù„Ø·Ù„Ø¨") >= 0 || text.indexOf("بالطلب") >= 0) {
      return "per_order";
    }
    if (text.indexOf("external") >= 0 || text.indexOf("Ø®Ø§Ø±Ø¬ÙŠ") >= 0 || text.indexOf("خارجي") >= 0) {
      return "external";
    }
    if (text.indexOf("replacement") >= 0 || text.indexOf("Ø¨Ø¯ÙŠÙ„") >= 0 || text.indexOf("بديل") >= 0) {
      return "replacement";
    }
    if (text.indexOf("salary") >= 0 || text.indexOf("Ø±Ø§ØªØ¨") >= 0 || text.indexOf("راتب") >= 0) {
      return "salary";
    }
    return "salary";
  }

  function normalizeAssignmentStatusValue(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text) {
      return "active";
    }
    if (text.indexOf("swap") >= 0 || text.indexOf("ØªØ¨Ø¯ÙŠÙ„") >= 0 || text.indexOf("تبديل") >= 0) {
      return "swapped";
    }
    if (text.indexOf("dismiss") >= 0 || text.indexOf("terminate") >= 0 || text.indexOf("Ø¥Ù‚Ø§Ù„Ø©") >= 0 || text.indexOf("إقالة") >= 0 || text.indexOf("اقالة") >= 0) {
      return "dismissed";
    }
    if (text.indexOf("stop") >= 0 || text.indexOf("Ù…ÙˆÙ‚ÙˆÙ") >= 0 || text.indexOf("موقوف") >= 0) {
      return "stopped";
    }
    if (text.indexOf("active") >= 0 || text.indexOf("نشط") >= 0) {
      return "active";
    }
    return "active";
  }

  function normalizeRiderSourceValue(value) {
    var text = normalizeText(value).toLowerCase();
    if (text.indexOf("hr") >= 0 || text.indexOf("sponsor") >= 0 || text.indexOf("ÙƒÙØ§Ù„Ø©") >= 0 || text.indexOf("كفالة") >= 0) {
      return "HR";
    }
    if (text.indexOf("external") >= 0 || text.indexOf("Ø®Ø§Ø±Ø¬ÙŠ") >= 0 || text.indexOf("خارجي") >= 0) {
      return "External";
    }
    if (text.indexOf("replacement") >= 0 || text.indexOf("Ø¨Ø¯ÙŠÙ„") >= 0 || text.indexOf("بديل") >= 0) {
      return "External";
    }
    return "Unknown";
  }

  function deriveVehicleSource(values) {
    if (normalizeText(values.vehicleSerial || values.dashboardVehicle)) {
      return "company";
    }
    return "private";
  }

  function deriveVehicleUsageType(values) {
    var source = deriveVehicleSource(values);
    if (values.vehicleType === "bike") {
      return source + "_bike";
    }
    if (values.vehicleType === "car") {
      return source + "_car";
    }
    return source + "_unknown";
  }

  function mapLifecycleStatusFromAssignment(status) {
    if (status === "dismissed") {
      return "dismissed";
    }
    if (status === "stopped") {
      return "pending_review";
    }
    if (status === "swapped") {
      return "ready_for_assignment";
    }
    return "active";
  }

  function computeDashboardLifecycleStatus(record, review) {
    if (DashboardLifecycleLib && typeof DashboardLifecycleLib.computeDashboardLifecycleStatus === "function") {
      return DashboardLifecycleLib.computeDashboardLifecycleStatus(record, {
        hasActiveAssignment: !!(record && (record.currentAssignmentId || record.assignmentStatus === "active")),
        isNewRecord: !!(record && record.__snapshotMeta && record.__snapshotMeta.isNew),
        missingMeansDismissed: false,
        presentInLatestImport: !(record && record.missingFromLatestImport),
        reviewStatus: review && review.reviewStatus ? review.reviewStatus : record && record.reviewStatus
      });
    }
    return "pending_review";
  }

  function decorateDashboardUserRecord(record, dataSources) {
    if (AssignmentReadinessLib && typeof AssignmentReadinessLib.decorateDashboardUser === "function") {
      return AssignmentReadinessLib.decorateDashboardUser(record, dataSources, {
        lifecycleStatus: record && record.lifecycleStatus ? record.lifecycleStatus : ""
      });
    }
    return record;
  }

  function dedupeRecords(records) {
    return Object.keys((records || []).reduce(function (memo, record) {
      if (record && record.id) {
        memo[String(record.id)] = record;
      }
      return memo;
    }, {})).map(function (key) {
      return (records || []).reduce(function (latest, record) {
        return record && String(record.id) === key ? record : latest;
      }, null);
    }).filter(Boolean);
  }

  function getRows(importRecord) {
    var analysis = importRecord.analysis || {};
    if (analysis.tableSummary && Array.isArray(analysis.tableSummary.rows)) {
      return analysis.tableSummary.rows;
    }
    if (analysis.workbookSummary && Array.isArray(analysis.workbookSummary.bestRows)) {
      return analysis.workbookSummary.bestRows;
    }
    return analysis.rows || [];
  }

  function getMapping(importRecord, requiredFields) {
    var analysis = importRecord.analysis || {};
    if (importRecord.mapping && importRecord.mapping.byField && Object.keys(importRecord.mapping.byField).length) {
      return importRecord.mapping;
    }
    if (analysis.tableSummary && analysis.tableSummary.mapping) {
      return analysis.tableSummary.mapping;
    }
    if (analysis.workbookSummary && analysis.workbookSummary.bestMapping) {
      return analysis.workbookSummary.bestMapping;
    }
    return HeaderMapper.mapHeaders(importRecord.headers || [], requiredFields || []);
  }

  function readCommonValues(row, mapping, importRecord) {
    return {
      userId: normalizeText(HeaderMapper.getValue(row, mapping, "userId")),
      iqama: normalizeText(HeaderMapper.getValue(row, mapping, "iqama")),
      fullName: normalizeText(HeaderMapper.getValue(row, mapping, "fullName")),
      phone: normalizeText(HeaderMapper.getValue(row, mapping, "phone")),
      city: normalizeCity(HeaderMapper.getValue(row, mapping, "city") || importRecord.city || ""),
      register: normalizeRegisterCode(HeaderMapper.getValue(row, mapping, "register") || importRecord.register || ""),
      status: normalizeText(HeaderMapper.getValue(row, mapping, "status")) || "active",
      vehicleType: normalizeVehicleType(HeaderMapper.getValue(row, mapping, "vehicleType")),
      workMode: normalizeWorkMode(HeaderMapper.getValue(row, mapping, "workMode"), HeaderMapper.getValue(row, mapping, "register") || importRecord.register || ""),
      month: normalizeText(HeaderMapper.getValue(row, mapping, "month")) || importRecord.month || ""
    };
  }

  function readPerformanceValues(row, mapping, importRecord) {
    var values = readCommonValues(row, mapping, importRecord);
    return mergeObjects({}, values, {
      ataScore: HeaderMapper.getValue(row, mapping, "ataScore") === "" ? null : parseNumber(HeaderMapper.getValue(row, mapping, "ataScore")),
      attendanceStatus: normalizeText(HeaderMapper.getValue(row, mapping, "attendanceStatus")),
      cancellationRate: HeaderMapper.getValue(row, mapping, "cancellationRate") === "" ? null : parseNumber(HeaderMapper.getValue(row, mapping, "cancellationRate")),
      cancelledOrders: parseNumber(HeaderMapper.getValue(row, mapping, "cancelledOrders")),
      completedOrders: parseNumber(HeaderMapper.getValue(row, mapping, "completedOrders") || HeaderMapper.getValue(row, mapping, "deliveredTasks")),
      date: normalizeIsoDate(HeaderMapper.getValue(row, mapping, "date")),
      deliveredTasks: parseNumber(HeaderMapper.getValue(row, mapping, "deliveredTasks")),
      lateCount: parseNumber(HeaderMapper.getValue(row, mapping, "lateCount")),
      onlineHours: parseNumber(HeaderMapper.getValue(row, mapping, "onlineHours")),
      rejectedOrders: parseNumber(HeaderMapper.getValue(row, mapping, "rejectedOrders")),
      workingHours: parseNumber(HeaderMapper.getValue(row, mapping, "workingHours") || HeaderMapper.getValue(row, mapping, "onlineHours"))
    });
  }

  function readDashboardUserValues(row, mapping, importRecord, platform, index) {
    var values = readCommonValues(row, mapping, importRecord);
    var personalName = normalizeText(HeaderMapper.getValue(row, mapping, "personalName"));
    var familyName = normalizeText(HeaderMapper.getValue(row, mapping, "familyName"));
    var reviewStatusText = normalizeText(HeaderMapper.getValue(row, mapping, "reviewStatus"));
    var sourceSheet = inferSourceSheetName(importRecord);
    var vehicleSerial = normalizeText(HeaderMapper.getValue(row, mapping, "vehicleSerial"));
    var fullName = values.fullName || [personalName, familyName].filter(Boolean).join(" ").trim();
    var dashboardName = registerLabel(values.register) || normalizeText(importRecord.register || "");
    var rawStatus = values.status || reviewStatusText;

    return {
      dashboardUserId: values.userId,
      platform: platform,
      dashboardName: dashboardName,
      qualificationType: normalizeText(HeaderMapper.getValue(row, mapping, "qualificationType")),
      personalName: personalName,
      familyName: familyName,
      fullName: fullName,
      ownerIqama: values.iqama,
      ownerPhone: values.phone,
      email: normalizeText(HeaderMapper.getValue(row, mapping, "email")),
      vehicleType: values.vehicleType,
      vehicleSerial: vehicleSerial,
      plateNumber: vehicleSerial,
      jobStatus: normalizeText(HeaderMapper.getValue(row, mapping, "status")),
      activationStatus: toActivationStatus(reviewStatusText || values.status),
      city: values.city,
      register: values.register,
      documentChangeStatus: normalizeText(HeaderMapper.getValue(row, mapping, "documentChangeStatus")),
      settlementMode: normalizeText(HeaderMapper.getValue(row, mapping, "settlementMode")),
      driverCard: normalizeText(HeaderMapper.getValue(row, mapping, "driverCard")),
      driverCardType: normalizeText(HeaderMapper.getValue(row, mapping, "licenseType")),
      licenseType: normalizeText(HeaderMapper.getValue(row, mapping, "licenseType")),
      notes: normalizeText(HeaderMapper.getValue(row, mapping, "notes")),
      sourceSheet: sourceSheet,
      sourceRow: index + 2,
      status: toDashboardUserStatusLabel(rawStatus)
    };
  }

  function normalizeVehicleType(value) {
    var text = normalizeText(value).toLowerCase();
    if (text.indexOf("bike") >= 0 || text.indexOf("دباب") >= 0 || text.indexOf("دراجة") >= 0) {
      return "bike";
    }
    if (text.indexOf("car") >= 0 || text.indexOf("سيارة") >= 0) {
      return "car";
    }
    return text || "unknown";
  }

  function normalizeDateKey(value) {
    var text = normalizeText(value).replace(/[^\d]/g, "");
    if (text.length === 8) {
      return text;
    }
    return "";
  }

  function normalizeIsoDate(value) {
    var text = normalizeText(value);
    if (!text) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    if (/^\d{8}$/.test(text)) {
      return text.slice(0, 4) + "-" + text.slice(4, 6) + "-" + text.slice(6, 8);
    }
    var digits = text.replace(/[^\d]/g, "");
    if (digits.length === 8) {
      return digits.slice(0, 4) + "-" + digits.slice(4, 6) + "-" + digits.slice(6, 8);
    }
    return "";
  }

  function normalizeIsoDateTime(value) {
    var text = normalizeText(value);
    if (!text) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
      return text;
    }
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text)) {
      return text.replace(/\s+/, "T");
    }
    var isoDate = normalizeIsoDate(text);
    return isoDate ? (isoDate + "T00:00:00") : text;
  }

  function isoDateFromDateKey(value) {
    return normalizeIsoDate(value);
  }

  function monthFromIsoDate(value) {
    var iso = normalizeIsoDate(value);
    return iso ? iso.slice(0, 7) : "";
  }

  function normalizeWorkMode(value, registerCode) {
    var text = normalizeText(value).toLowerCase();
    var register = normalizeRegisterCode(registerCode);
    if (text.indexOf("per order") >= 0 || text.indexOf("fr 3pl") >= 0 || text.indexOf("بالطلب") >= 0) {
      return "per_order";
    }
    if (register === "PER_ORDER" || register === "FR_3PL" || register === "PER_ORDER_FR3PL") {
      return "per_order";
    }
    return "salary_tiers";
  }

  function stableId(entityName, parts) {
    return entityName + "::" + (parts || []).map(function (value) {
      return normalizeText(value).replace(/[^\w\u0600-\u06ff-]+/g, "_");
    }).join("::");
  }

  function computeDashboardMatchStatus(record) {
    if (!record) {
      return "unassigned";
    }
    if (record.missingFromLatestImport) {
      return "needs_review";
    }
    if (record.currentRiderId || record.currentRiderIqama) {
      return record.reviewStatus === "ok" ? "matched" : "matched_needs_review";
    }
    return record.reviewStatus === "needs_assignment" ? "unassigned" : "needs_review";
  }

  function detectDashboardPlatform(importRecord) {
    var text = [
      importRecord && importRecord.type,
      importRecord && importRecord.sourceFileName,
      importRecord && importRecord.fileName,
      importRecord && importRecord.register
    ].join(" ").toLowerCase();
    if (text.indexOf("ninja") >= 0) {
      return "ninja";
    }
    if (text.indexOf("jahez") >= 0) {
      return "jahez";
    }
    if (text.indexOf("chefz") >= 0 || text.indexOf("chefs") >= 0) {
      return "chefz";
    }
    if (text.indexOf("hunger") >= 0) {
      return "hungerstation";
    }
    if (text.indexOf("amazon") >= 0) {
      return "amazon";
    }
    if (text.indexOf("dashboard") >= 0 || text.indexOf("dash") >= 0 || text.indexOf("keeta") >= 0 || text.indexOf("تشغيل") >= 0) {
      return "keeta";
    }
    return "unknown";
  }

  function indexDashboardUsers(rows) {
    return (rows || []).reduce(function (memo, item) {
      var dashboardUserId = normalizeText(item && (item.dashboardUserId || item.userId));
      if (dashboardUserId && !memo[dashboardUserId]) {
        memo[dashboardUserId] = item;
      }
      return memo;
    }, {});
  }

  function inferSourceSheetName(importRecord) {
    if (importRecord && importRecord.analysis && importRecord.analysis.workbookSummary) {
      return importRecord.analysis.workbookSummary.bestSheetName ||
        importRecord.analysis.workbookSummary.sheetName ||
        (importRecord.analysis.workbookSummary.sheetNames || [])[0] ||
        "";
    }
    return "";
  }

  function output(entityName, inputRows, records) {
    return {
      entityName: entityName,
      records: records,
      warnings: [],
      errors: [],
      stats: {
        inputRows: (inputRows || []).length,
        outputRows: (records || []).length
      }
    };
  }

  function entityOutput(entityName, inputRows, records, meta) {
    return {
      entityName: entityName,
      records: records || [],
      warnings: meta && meta.warnings ? meta.warnings.slice() : [],
      errors: [],
      meta: meta || {},
      stats: {
        inputRows: (inputRows || []).length,
        outputRows: (records || []).length
      }
    };
  }

  function getCollectionRecords(options, entityName) {
    return options && options.dataStore && typeof options.dataStore.getAll === "function"
      ? options.dataStore.getAll(entityName)
      : [];
  }

  function uniqueList(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = typeof value === "string" ? value : JSON.stringify(value || {});
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function parseNumber(value) {
    var numeric = Number(String(value == null ? "" : value).replace(/,/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function getXlsxLib(options) {
    if (options && options.xlsxLib) {
      return options.xlsxLib;
    }
    if (typeof globalThis !== "undefined" && globalThis.XLSX) {
      return globalThis.XLSX;
    }
    return null;
  }

  function findSheetName(workbook, wantedNames) {
    var normalizedWanted = (wantedNames || []).map(function (value) {
      return normalizeText(value).toLowerCase();
    });
    return (workbook.SheetNames || []).filter(function (sheetName) {
      var normalized = normalizeText(sheetName).toLowerCase();
      return normalizedWanted.some(function (value) {
        return normalized.indexOf(value) >= 0;
      });
    })[0] || "";
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
    normalizeCompanyInvoiceBasic: normalizeCompanyInvoiceBasic,
    normalizeDashboardUsers: normalizeDashboardUsers,
    normalizeDeliveryExperienceBasic: normalizeDeliveryExperienceBasic,
    normalizeFaceVerificationBasic: normalizeFaceVerificationBasic,
    normalizeHrProfilesBasic: normalizeHrProfilesBasic,
    normalizeHrWorkbookImport: normalizeHrWorkbookImport,
    normalizeImportRecord: normalizeImportRecord,
    normalizeInternalSettlementBasic: normalizeInternalSettlementBasic,
    normalizeRidersBasic: normalizeRidersBasic,
    normalizeVdaBasic: normalizeVdaBasic,
    normalizeVehiclesBasic: normalizeVehiclesBasic
  };
});
