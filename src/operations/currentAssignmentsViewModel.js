(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("../import/importTypes.js"),
      require("./assignmentWorkflowSupport.js"),
      require("../notifications/notificationSourceMapping.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.CurrentAssignmentsViewModel = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.AssignmentWorkflowSupport,
    root.KeetaPortal.NotificationSourceMapping
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, AssignmentWorkflowSupport, NotificationSourceMapping) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;
  var normalizeRegisterCode = ImportTypes.normalizeRegisterCode;
  var normalizeAssignmentStatus = AssignmentWorkflowSupport.normalizeAssignmentStatus;
  var normalizeOperationMode = AssignmentWorkflowSupport.normalizeOperationMode;
  var normalizeRiderSource = AssignmentWorkflowSupport.normalizeRiderSource;
  var deriveVehicleSource = AssignmentWorkflowSupport.deriveVehicleSource;

  function buildCurrentAssignmentRows(payload) {
    payload = payload || {};
    var dashboardUsers = payload.dashboardUsers || [];
    var assignments = payload.assignments || [];
    var assignmentHistory = payload.assignmentHistory || [];
    var auditLogs = payload.auditLogs || [];
    var externalRiders = payload.externalRiders || [];
    var hrProfiles = payload.hrProfiles || [];
    var riderOperationalProfiles = payload.riderOperationalProfiles || [];
    var riderVehicleUsageHistory = payload.riderVehicleUsageHistory || [];
    var riders = payload.riders || [];
    var terminations = payload.terminations || [];

    var activeAssignmentsByUser = {};
    var latestAssignmentsByUser = {};
    var latestTerminationsByUser = {};
    var ridersById = indexBy(riders, "id");
    var hrProfilesByIqama = indexByNormalized(hrProfiles, "iqama");
    var externalRidersByIqama = indexByNormalized(externalRiders, "iqama");
    var profilesByIqama = indexByNormalized(riderOperationalProfiles, "iqama");
    var activeVehicleByIqama = indexActiveVehicleUsage(riderVehicleUsageHistory);
    var existingUserIds = {};

    assignments.forEach(function (assignment) {
      var userId = resolveUserId(assignment);
      if (!userId) {
        return;
      }
      if (normalizeAssignmentStatus(assignment.assignmentStatus || assignment.status) === "active") {
        activeAssignmentsByUser[userId] = assignment;
      }
      if (!latestAssignmentsByUser[userId] || compareDateLike(assignment.updatedAt || assignment.assignmentStartDate || assignment.startDate, latestAssignmentsByUser[userId].updatedAt || latestAssignmentsByUser[userId].assignmentStartDate || latestAssignmentsByUser[userId].startDate) > 0) {
        latestAssignmentsByUser[userId] = assignment;
      }
    });

    terminations.forEach(function (termination) {
      var userId = resolveUserId(termination);
      if (!userId) {
        return;
      }
      if (!latestTerminationsByUser[userId] || compareDateLike(termination.terminationDate || termination.createdAt, latestTerminationsByUser[userId].terminationDate || latestTerminationsByUser[userId].createdAt) > 0) {
        latestTerminationsByUser[userId] = termination;
      }
    });

    var rows = dashboardUsers.map(function (dashboardUser) {
      var row = buildRowFromDashboardUser(dashboardUser, {
        activeAssignmentsByUser: activeAssignmentsByUser,
        latestAssignmentsByUser: latestAssignmentsByUser,
        latestTerminationsByUser: latestTerminationsByUser,
        ridersById: ridersById,
        hrProfilesByIqama: hrProfilesByIqama,
        externalRidersByIqama: externalRidersByIqama,
        profilesByIqama: profilesByIqama,
        activeVehicleByIqama: activeVehicleByIqama,
        assignmentHistory: assignmentHistory,
        auditLogs: auditLogs
      });
      existingUserIds[row.dashboardUserId] = true;
      return row;
    });

    assignments.forEach(function (assignment) {
      var userId = resolveUserId(assignment);
      if (!userId || existingUserIds[userId]) {
        return;
      }
      rows.push(buildRowFromAssignmentOnly(assignment, {
        ridersById: ridersById,
        hrProfilesByIqama: hrProfilesByIqama,
        externalRidersByIqama: externalRidersByIqama,
        profilesByIqama: profilesByIqama,
        activeVehicleByIqama: activeVehicleByIqama,
        assignmentHistory: assignmentHistory,
        auditLogs: auditLogs,
        latestTermination: latestTerminationsByUser[userId] || null
      }));
    });

    var activeRiderCounts = countActiveRows(rows, function (row) {
      return normalizeText(row.actualRiderIqama || row.currentRiderIqama || row.currentRiderId);
    });
    var activeCourierCounts = countActiveRows(rows, function (row) {
      return normalizeText(row.dashboardUserId || row.courierId);
    });

    return rows.map(function (row) {
      var nextRow = mergeObjects({}, row, {
        actualRiderCount: activeRiderCounts[normalizeText(row.actualRiderIqama || row.currentRiderIqama || row.currentRiderId)] || 0,
        activeCourierCount: activeCourierCounts[normalizeText(row.dashboardUserId || row.courierId)] || 0
      });
      nextRow.issues = deriveAssignmentIssues(nextRow);
      nextRow.issueCount = nextRow.issues.length;
      nextRow.statusBucket = statusBucket(nextRow);
      return nextRow;
    }).sort(function (left, right) {
      return compareDateLike(right.lastActivityAt, left.lastActivityAt) || String(left.dashboardUserId || "").localeCompare(String(right.dashboardUserId || ""));
    });
  }

  function filterCurrentAssignmentRows(rows, filters, activeTab) {
    filters = filters || {};
    return (rows || []).filter(function (row) {
      var searchable = [
        row.assignmentId,
        row.currentAssignmentId,
        row.dashboardUserId,
        row.courierId,
        row.ownerName,
        row.ownerIqama,
        row.actualRiderName,
        row.actualRiderIqama,
        row.actualRiderPhone,
        row.riderSource,
        row.city,
        row.register,
        row.platform,
        row.operationMode,
        row.assignmentStatus,
        row.vehicleType,
        row.dashboardVehicle,
        row.actualVehicle,
        row.vehicleSerial,
        row.plateNumber,
        row.supervisor,
        row.notes
      ].join(" ");
      if (!matchesSearch(searchable, filters.query)) {
        return false;
      }
      if (!matchesNormalizedFilter(row.register, filters.register, normalizeRegisterCode)) {
        return false;
      }
      if (!matchesNormalizedFilter(row.city, filters.city)) {
        return false;
      }
      if (!matchesNormalizedFilter(row.platform, filters.platform)) {
        return false;
      }
      if (!matchesNormalizedFilter(normalizeOperationMode(row.operationMode), filters.operationMode, normalizeOperationMode)) {
        return false;
      }
      if (!matchesNormalizedFilter(normalizeAssignmentStatus(row.assignmentStatus), filters.assignmentStatus, normalizeAssignmentStatus)) {
        return false;
      }
      if (!matchesNormalizedFilter(normalizeRiderSource(row.riderSource), filters.riderSource, normalizeRiderSource)) {
        return false;
      }
      if (!matchesNormalizedFilter(row.vehicleType, filters.vehicleType)) {
        return false;
      }
      if (!matchesNormalizedFilter(row.supervisor, filters.supervisor)) {
        return false;
      }
      return matchesTab(row, activeTab);
    });
  }

  function buildCurrentAssignmentKpis(rows, payload, options) {
    payload = payload || {};
    options = options || {};
    var now = normalizeText(options.now || new Date().toISOString());
    var currentMonth = now.slice(0, 7);
    var activeRows = (rows || []).filter(function (row) {
      return row.isActive;
    });
    return {
      active: activeRows.length,
      companyVehicles: activeRows.filter(function (row) { return row.vehicleCompanyStatus === "company"; }).length,
      externalMode: activeRows.filter(function (row) { return normalizeOperationMode(row.operationMode) === "external" || normalizeRiderSource(row.riderSource) === "External"; }).length,
      needsAssignment: (rows || []).filter(function (row) { return row.needsAssignment; }).length,
      perOrder: activeRows.filter(function (row) { return normalizeOperationMode(row.operationMode) === "per_order"; }).length,
      privateVehicles: activeRows.filter(function (row) { return row.vehicleCompanyStatus === "private"; }).length,
      replacement: activeRows.filter(function (row) { return normalizeOperationMode(row.operationMode) === "replacement"; }).length,
      salary: activeRows.filter(function (row) { return normalizeOperationMode(row.operationMode) === "salary_tiers"; }).length,
      stopped: (rows || []).filter(function (row) { return row.statusBucket === "stopped"; }).length,
      swapsThisMonth: (payload.assignmentHistory || []).filter(function (item) {
        return normalizeText(item.action) === "swap" && String(item.actionDate || item.createdAt || "").slice(0, 7) === currentMonth;
      }).length,
      terminationsThisMonth: (payload.terminations || []).filter(function (item) {
        return String(item.terminationDate || item.createdAt || "").slice(0, 7) === currentMonth;
      }).length,
      totalCurrentAssignments: activeRows.length
    };
  }

  function buildAssignmentTimeline(row, payload, options) {
    payload = payload || {};
    options = options || {};
    var limit = Number(options.limit) || 12;
    var dashboardUserId = normalizeText(row && row.dashboardUserId);
    var riderIqama = normalizeText(row && row.actualRiderIqama);
    var assignmentId = normalizeText(row && row.assignmentId);
    var timeline = [];

    (payload.assignmentHistory || []).forEach(function (item) {
      if (normalizeText(item.dashboardUserId) !== dashboardUserId &&
        normalizeText(item.previousRiderIqama) !== riderIqama &&
        normalizeText(item.newRiderIqama) !== riderIqama) {
        return;
      }
      timeline.push({
        eventTime: item.actionDate || item.createdAt || "",
        eventType: normalizeText(item.action || "history"),
        courierId: dashboardUserId,
        ownerIqama: row && row.ownerIqama || "",
        oldActualRiderIqama: item.previousRiderIqama || "",
        newActualRiderIqama: item.newRiderIqama || "",
        operationMode: item.after && item.after.operationMode || row && row.operationMode || "",
        assignmentStatus: item.after && item.after.assignmentStatus || item.status || "",
        vehicleSerial: item.after && item.after.vehicleSerial || row && row.vehicleSerial || "",
        plateNumber: item.after && item.after.plateNumber || row && row.plateNumber || "",
        reason: item.reason || "",
        performedBy: item.createdBy || "",
        sourceBatchId: item.after && (item.after.sourceBatchId || item.after.sourceImportBatchId) || "",
        auditEventId: ""
      });
    });

    (payload.terminations || []).forEach(function (item) {
      if (normalizeText(item.dashboardUserId) !== dashboardUserId && normalizeText(item.riderIqama) !== riderIqama) {
        return;
      }
      timeline.push({
        eventTime: item.terminationDate || item.createdAt || "",
        eventType: normalizeText(item.terminationType || item.statusAfter || "termination"),
        courierId: dashboardUserId,
        ownerIqama: row && row.ownerIqama || "",
        oldActualRiderIqama: item.riderIqama || row && row.actualRiderIqama || "",
        newActualRiderIqama: "",
        operationMode: row && row.operationMode || "",
        assignmentStatus: item.statusAfter || item.status || "",
        vehicleSerial: row && row.vehicleSerial || "",
        plateNumber: row && row.plateNumber || "",
        reason: item.reason || "",
        performedBy: item.createdBy || "",
        sourceBatchId: item.sourceImportBatchId || "",
        auditEventId: ""
      });
    });

    (payload.auditLogs || []).forEach(function (item) {
      var sameAssignment = assignmentId && normalizeText(item.entityId) === assignmentId;
      var sameDashboardUser = dashboardUserId && (
        normalizeText(item.entityId) === dashboardUserId ||
        normalizeText(item.after && (item.after.dashboardUserId || item.after.userId || item.after.courierId)) === dashboardUserId ||
        normalizeText(item.before && (item.before.dashboardUserId || item.before.userId || item.before.courierId)) === dashboardUserId
      );
      if (!sameAssignment && !sameDashboardUser) {
        return;
      }
      timeline.push({
        eventTime: item.timestamp || "",
        eventType: normalizeText(item.action || item.eventType || "audit"),
        courierId: dashboardUserId,
        ownerIqama: row && row.ownerIqama || "",
        oldActualRiderIqama: item.before && (item.before.actualRiderIqama || item.before.riderIqama) || "",
        newActualRiderIqama: item.after && (item.after.actualRiderIqama || item.after.riderIqama) || "",
        operationMode: item.after && item.after.operationMode || item.before && item.before.operationMode || row && row.operationMode || "",
        assignmentStatus: item.after && item.after.assignmentStatus || item.before && item.before.assignmentStatus || "",
        vehicleSerial: item.after && item.after.vehicleSerial || item.before && item.before.vehicleSerial || row && row.vehicleSerial || "",
        plateNumber: item.after && item.after.plateNumber || item.before && item.before.plateNumber || row && row.plateNumber || "",
        reason: item.reason || item.note || "",
        performedBy: item.userId || item.actorUserId || "",
        sourceBatchId: item.importBatchId || "",
        auditEventId: item.id || ""
      });
    });

    return dedupeTimeline(timeline).sort(function (left, right) {
      return compareDateLike(right.eventTime, left.eventTime);
    }).slice(0, limit);
  }

  function deriveAssignmentNotifications(payload) {
    return buildCurrentAssignmentRows(payload).reduce(function (memo, row) {
      (row.issues || []).forEach(function (issueCode) {
        if (NotificationSourceMapping && typeof NotificationSourceMapping.mapCurrentAssignmentIssue === "function") {
          memo.push(NotificationSourceMapping.mapCurrentAssignmentIssue(issueCode, row));
          return;
        }
        memo.push({
          actionLabel: "Review assignment",
          actionPage: "operations-shell",
          actionTarget: row.dashboardUserId || row.assignmentId || "",
          actualRiderIqama: row.actualRiderIqama || "",
          assignmentId: row.assignmentId || "",
          courierId: row.dashboardUserId || row.courierId || "",
          entityId: row.assignmentId || row.dashboardUserId || "",
          entityType: "assignments",
          id: "assignment_issue_" + String(row.dashboardUserId || row.assignmentId || "row") + "_" + issueCode,
          issueId: issueCode,
          linkedDrawer: "details",
          linkedFilters: {
            city: row.city || "",
            query: [row.dashboardUserId, row.ownerIqama, row.actualRiderIqama, row.vehicleSerial].filter(Boolean).join(" "),
            register: row.register || ""
          },
          linkedPage: "operations-shell",
          linkedSubPage: "current_assignments",
          message: assignmentIssueMessage(issueCode, row),
          ownerIqama: row.ownerIqama || "",
          platform: row.platform || "",
          register: row.register || "",
          relatedCity: row.city || "",
          relatedRegister: row.register || "",
          severity: assignmentIssueSeverity(issueCode),
          source: "operations",
          sourceEntity: "assignments",
          sourceEntityId: row.assignmentId || row.dashboardUserId || "",
          sourceModule: "current_assignments",
          sourceType: "issue",
          status: "unread",
          suggestedAction: "review_assignment",
          title: "Current assignment issue"
        });
      });
      return memo;
    }, []);
  }

  function findCurrentAssignmentRow(rows, dashboardUserId) {
    var normalizedUserId = normalizeText(dashboardUserId);
    return (rows || []).filter(function (item) {
      return normalizeText(item && item.dashboardUserId) === normalizedUserId;
    })[0] || null;
  }

  function buildRowFromDashboardUser(dashboardUser, refs) {
    var userId = resolveUserId(dashboardUser);
    var activeAssignment = refs.activeAssignmentsByUser[userId] || null;
    var latestAssignment = refs.latestAssignmentsByUser[userId] || null;
    var latestTermination = refs.latestTerminationsByUser[userId] || null;
    var sourceAssignment = activeAssignment || latestAssignment || null;
    return buildCanonicalRow(dashboardUser, sourceAssignment, latestTermination, refs, {
      dashboardUserExists: true
    });
  }

  function buildRowFromAssignmentOnly(assignment, refs) {
    return buildCanonicalRow(null, assignment, refs.latestTermination || null, refs, {
      dashboardUserExists: false
    });
  }

  function buildCanonicalRow(dashboardUser, sourceAssignment, latestTermination, refs, options) {
    options = options || {};
    dashboardUser = dashboardUser || {};
    sourceAssignment = sourceAssignment || {};
    latestTermination = latestTermination || null;
    var userId = resolveUserId(dashboardUser) || resolveUserId(sourceAssignment);
    var actualRiderIqama = normalizeText(sourceAssignment.actualRiderIqama || sourceAssignment.riderIqama || dashboardUser.currentRiderIqama);
    var rider = sourceAssignment.riderId ? refs.ridersById[normalizeText(sourceAssignment.riderId)] : null;
    if (!rider && actualRiderIqama) {
      rider = findRiderByIqama(refs.ridersById, actualRiderIqama);
    }
    var ownerIqama = normalizeText(sourceAssignment.ownerIqama || dashboardUser.ownerIqama || dashboardUser.idNumber);
    var ownerProfile = refs.hrProfilesByIqama[ownerIqama] || null;
    var actualRiderHrProfile = refs.hrProfilesByIqama[actualRiderIqama] || null;
    var externalRider = refs.externalRidersByIqama[actualRiderIqama] || null;
    var operationalProfile = refs.profilesByIqama[actualRiderIqama] || null;
    var activeVehicleUsage = refs.activeVehicleByIqama[actualRiderIqama] || null;
    var activeStatus = normalizeAssignmentStatus(sourceAssignment.assignmentStatus || sourceAssignment.status);
    var currentStatus = activeStatus || deriveStatusFromDashboard(dashboardUser, latestTermination);
    var riderSourceHint = sourceAssignment.riderSource ||
      (operationalProfile && operationalProfile.riderSource) ||
      (externalRider && externalRider.riderType) ||
      (actualRiderHrProfile ? "HR" : "") ||
      (rider && rider.hrProfileId ? "HR" : "");
    var riderSource = normalizeRiderSource(riderSourceHint);
    var operationMode = normalizeOperationMode(sourceAssignment.operationMode || dashboardUser.operationMode || dashboardUser.settlementMode);
    var vehicleCompanyStatus = normalizeText(activeVehicleUsage && activeVehicleUsage.vehicleSource || deriveVehicleSource(sourceAssignment || dashboardUser));
    if (vehicleCompanyStatus !== "company" && vehicleCompanyStatus !== "private") {
      vehicleCompanyStatus = sourceAssignment.vehicleSerial || sourceAssignment.plateNumber ? "company" : "unknown";
    }
    var isActive = currentStatus === "active";
    var needsAssignment = currentStatus === "needs_assignment" ||
      (!isActive && !actualRiderIqama && normalizeText(dashboardUser.assignmentReadiness) === "ready_for_assignment");
    var historySummary = summarizeHistory(refs.assignmentHistory, userId);
    return {
      assignmentId: normalizeText(sourceAssignment.assignmentId || sourceAssignment.id),
      assignmentStartDate: normalizeText(sourceAssignment.assignmentStartDate || sourceAssignment.startDate || dashboardUser.handoverDate),
      assignmentStatus: currentStatus || "needs_assignment",
      assignmentStatusRaw: normalizeText(sourceAssignment.assignmentStatus || sourceAssignment.status || dashboardUser.assignmentStatus || dashboardUser.status),
      assignmentType: normalizeText(sourceAssignment.assignmentType || ""),
      actualRiderFound: !!(actualRiderIqama && (rider || externalRider || operationalProfile || actualRiderHrProfile)),
      actualRiderId: normalizeText(sourceAssignment.riderId || dashboardUser.currentRiderId || rider && rider.id),
      actualRiderIqama: actualRiderIqama,
      actualRiderName: normalizeText(sourceAssignment.actualRiderName || dashboardUser.currentRiderName || rider && rider.displayName || externalRider && externalRider.fullName || actualRiderHrProfile && (actualRiderHrProfile.fullNameArabic || actualRiderHrProfile.fullNameEnglish || actualRiderHrProfile.fullName)),
      actualRiderPhone: normalizeText(sourceAssignment.actualRiderPhone || operationalProfile && operationalProfile.contactPhone || externalRider && externalRider.contactPhone || rider && rider.phones && rider.phones[0]),
      actualRiderPreferredCity: normalizeText(operationalProfile && operationalProfile.preferredCity || externalRider && externalRider.city),
      actualRiderPreferredRegister: normalizeRegisterCode(operationalProfile && operationalProfile.preferredRegister || externalRider && externalRider.register),
      activeVehicleUsage: activeVehicleUsage || null,
      canAssign: dashboardUser.canAssign !== false && !isActive,
      canDismiss: dashboardUser.canDismiss !== false,
      canStop: dashboardUser.canStop !== false && isActive,
      canSwap: dashboardUser.canSwap !== false && isActive,
      city: normalizeText(sourceAssignment.city || dashboardUser.city || dashboardUser.operationsCity),
      courierId: userId,
      currentAssignmentId: normalizeText(sourceAssignment.assignmentId || sourceAssignment.id || dashboardUser.currentAssignmentId),
      currentRiderId: normalizeText(dashboardUser.currentRiderId || sourceAssignment.riderId || rider && rider.id),
      currentRiderIqama: normalizeText(dashboardUser.currentRiderIqama || actualRiderIqama),
      currentRiderName: normalizeText(dashboardUser.currentRiderName || sourceAssignment.actualRiderName || rider && rider.displayName),
      dashboardLifecycleStatus: normalizeText(dashboardUser.lifecycleStatus),
      dashboardReviewStatus: normalizeText(dashboardUser.reviewStatus),
      dashboardUserExists: options.dashboardUserExists !== false,
      dashboardUserId: userId,
      dashboardVehicle: normalizeText(sourceAssignment.dashboardVehicle || dashboardUser.vehicleType || dashboardUser.dashboardVehicle),
      endDate: normalizeText(sourceAssignment.endDate || latestTermination && latestTermination.terminationDate || dashboardUser.returnDate),
      firstOnlineDate: normalizeText(sourceAssignment.firstOnlineDate || ""),
      historySummary: historySummary,
      isActive: isActive,
      issues: [],
      lastActivityAt: normalizeText(
        sourceAssignment.updatedAt ||
        sourceAssignment.assignmentStartDate ||
        latestTermination && (latestTermination.terminationDate || latestTermination.createdAt) ||
        dashboardUser.updatedAt ||
        dashboardUser.lastSeenAt ||
        ""
      ),
      latestTermination: latestTermination || null,
      notes: normalizeText(sourceAssignment.notes || sourceAssignment.note || dashboardUser.notes || ""),
      operationMode: operationMode,
      operationalProfile: operationalProfile || null,
      ownerExistsInHr: !!ownerProfile,
      ownerIqama: ownerIqama,
      ownerName: normalizeText(sourceAssignment.ownerName || dashboardUser.ownerName || dashboardUser.fullName),
      ownerProfile: ownerProfile || null,
      platform: normalizeText(sourceAssignment.platform || dashboardUser.platform).toLowerCase(),
      plateNumber: normalizeText(sourceAssignment.plateNumber || dashboardUser.plateNumber),
      register: normalizeRegisterCode(sourceAssignment.register || dashboardUser.register),
      riderReceiveDate: normalizeText(sourceAssignment.riderReceiveDate || dashboardUser.handoverDate),
      riderSource: riderSource,
      sourceBatchId: normalizeText(sourceAssignment.sourceBatchId || sourceAssignment.sourceImportBatchId || dashboardUser.sourceBatchId || dashboardUser.lastSeenImportBatchId),
      sourceFile: normalizeText(sourceAssignment.sourceFile || dashboardUser.sourceFile),
      sourceImportBatchId: normalizeText(sourceAssignment.sourceImportBatchId || sourceAssignment.sourceBatchId || dashboardUser.sourceBatchId || dashboardUser.lastSeenImportBatchId),
      supervisor: normalizeText(sourceAssignment.supervisor || dashboardUser.supervisor),
      vehicleCompanyStatus: vehicleCompanyStatus,
      vehicleSerial: normalizeText(sourceAssignment.vehicleSerial || dashboardUser.vehicleSerial),
      vehicleType: normalizeText(sourceAssignment.vehicleType || dashboardUser.vehicleType),
      actualVehicle: normalizeText(sourceAssignment.actualVehicle || activeVehicleUsage && activeVehicleUsage.notes || ""),
      statusBucket: "",
      dashboardStatus: normalizeText(dashboardUser.status || dashboardUser.jobStatus),
      needsAssignment: needsAssignment,
      actualVehicleSummary: buildVehicleSummary(
        normalizeText(sourceAssignment.actualVehicle || activeVehicleUsage && activeVehicleUsage.notes),
        normalizeText(sourceAssignment.vehicleSerial || activeVehicleUsage && activeVehicleUsage.vehicleSerial || dashboardUser.vehicleSerial),
        normalizeText(sourceAssignment.plateNumber || activeVehicleUsage && activeVehicleUsage.plateNumber || dashboardUser.plateNumber)
      ),
      dashboardVehicleSummary: buildVehicleSummary(
        normalizeText(sourceAssignment.dashboardVehicle || dashboardUser.vehicleType || dashboardUser.dashboardVehicle),
        normalizeText(dashboardUser.vehicleSerial || sourceAssignment.vehicleSerial),
        normalizeText(dashboardUser.plateNumber || sourceAssignment.plateNumber)
      ),
      vehicleUsageSummary: buildVehicleUsageSummary(activeVehicleUsage)
    };
  }

  function deriveAssignmentIssues(row) {
    var issues = [];
    if (row.isActive && !row.actualRiderIqama) {
      issues.push("assignment_missing_actual_rider");
    }
    if (row.actualRiderIqama && !row.actualRiderFound) {
      issues.push("assignment_actual_rider_not_found");
    }
    if (row.ownerIqama && !row.ownerExistsInHr) {
      issues.push("assignment_owner_missing_hr");
    }
    if (row.actualVehicle && row.dashboardVehicle && normalizeText(row.actualVehicle) !== normalizeText(row.dashboardVehicle) && row.vehicleSerial && row.vehicleCompanyStatus === "company") {
      issues.push("assignment_vehicle_mismatch");
    }
    if (row.actualRiderPreferredCity && normalizeText(row.actualRiderPreferredCity) !== normalizeText(row.city)) {
      issues.push("assignment_register_city_scope_mismatch");
    } else if (row.actualRiderPreferredRegister && normalizeRegisterCode(row.actualRiderPreferredRegister) !== normalizeRegisterCode(row.register)) {
      issues.push("assignment_register_city_scope_mismatch");
    }
    if (row.isActive && row.actualRiderCount > 1) {
      issues.push("assignment_duplicate_active_rider");
    }
    if (row.isActive && row.activeCourierCount > 1) {
      issues.push("assignment_duplicate_active_courier");
    }
    if (row.isActive && !row.assignmentStartDate) {
      issues.push("assignment_without_start_date");
    }
    if (row.dashboardReviewStatus === "needs_review" || row.dashboardReviewStatus === "pending_review" || row.dashboardLifecycleStatus === "pending_review") {
      issues.push("assignment_pending_review_user");
    }
    if (row.dashboardLifecycleStatus === "dismissed") {
      issues.push("assignment_for_dismissed_user");
    }
    return dedupeList(issues);
  }

  function statusBucket(row) {
    if (row.needsAssignment) {
      return "needs_assignment";
    }
    if (row.isActive) {
      return "active";
    }
    if (row.assignmentStatus === "replacement") {
      return "replacement";
    }
    if (row.assignmentStatus === "stopped" || row.dashboardStatus === "not_working" || row.assignmentStatus === "ended" || row.assignmentStatus === "terminated" || row.assignmentStatus === "cancelled") {
      return "stopped";
    }
    return "inactive";
  }

  function matchesTab(row, activeTab) {
    switch (activeTab) {
      case "current_assignments":
        return true;
      case "needs_assignment":
        return row.needsAssignment;
      case "working":
        return row.isActive;
      case "per_order":
        return row.isActive && normalizeOperationMode(row.operationMode) === "per_order";
      case "salary":
        return row.isActive && normalizeOperationMode(row.operationMode) === "salary_tiers";
      case "external_mode":
        return row.isActive && (normalizeOperationMode(row.operationMode) === "external" || normalizeRiderSource(row.riderSource) === "External");
      case "replacement":
        return row.isActive && (normalizeOperationMode(row.operationMode) === "replacement" || normalizeText(row.assignmentType) === "swap");
      case "stopped":
        return row.statusBucket === "stopped";
      default:
        return true;
    }
  }

  function countActiveRows(rows, keyBuilder) {
    return (rows || []).reduce(function (memo, row) {
      if (!row || !row.isActive) {
        return memo;
      }
      var key = normalizeText(keyBuilder(row));
      if (!key) {
        return memo;
      }
      memo[key] = (memo[key] || 0) + 1;
      return memo;
    }, {});
  }

  function compareDateLike(left, right) {
    return String(left || "").localeCompare(String(right || ""));
  }

  function dedupeList(values) {
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

  function dedupeTimeline(rows) {
    var seen = {};
    return (rows || []).filter(function (row) {
      var key = [
        normalizeText(row.eventTime),
        normalizeText(row.eventType),
        normalizeText(row.courierId),
        normalizeText(row.oldActualRiderIqama),
        normalizeText(row.newActualRiderIqama),
        normalizeText(row.auditEventId)
      ].join("::");
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function indexActiveVehicleUsage(records) {
    return (records || []).reduce(function (memo, item) {
      if (!item || item.active !== true) {
        return memo;
      }
      var key = normalizeText(item.riderIqama);
      if (key) {
        memo[key] = item;
      }
      return memo;
    }, {});
  }

  function indexBy(rows, fieldName) {
    return (rows || []).reduce(function (memo, row) {
      var key = normalizeText(row && row[fieldName]);
      if (key) {
        memo[key] = row;
      }
      return memo;
    }, {});
  }

  function indexByNormalized(rows, fieldName) {
    return (rows || []).reduce(function (memo, row) {
      var key = normalizeText(row && row[fieldName]);
      if (key) {
        memo[key] = row;
      }
      return memo;
    }, {});
  }

  function findRiderByIqama(ridersById, iqama) {
    var normalizedIqama = normalizeText(iqama);
    var riderIds = Object.keys(ridersById || {});
    for (var index = 0; index < riderIds.length; index += 1) {
      var rider = ridersById[riderIds[index]];
      if (normalizeText(rider && rider.primaryIqama) === normalizedIqama) {
        return rider;
      }
    }
    return null;
  }

  function summarizeHistory(historyRows, dashboardUserId) {
    return (historyRows || []).filter(function (item) {
      return normalizeText(item.dashboardUserId) === normalizeText(dashboardUserId);
    }).slice(-3);
  }

  function deriveStatusFromDashboard(dashboardUser, latestTermination) {
    var lifecycle = normalizeText(dashboardUser.lifecycleStatus).toLowerCase();
    if (lifecycle === "ready_for_assignment" || normalizeText(dashboardUser.assignmentReadiness) === "ready_for_assignment") {
      return "needs_assignment";
    }
    if (normalizeText(dashboardUser.currentAssignmentId) && normalizeText(dashboardUser.currentRiderId || dashboardUser.currentRiderIqama)) {
      return "active";
    }
    if (latestTermination && latestTermination.statusAfter === "not_working") {
      return "stopped";
    }
    if (lifecycle === "dismissed" || normalizeText(dashboardUser.status).indexOf("terminated") >= 0) {
      return "terminated";
    }
    return normalizeAssignmentStatus(dashboardUser.assignmentStatus || dashboardUser.status || dashboardUser.jobStatus || "needs_assignment", "needs_assignment") || "needs_assignment";
  }

  function resolveUserId(record) {
    return normalizeText(record && (record.dashboardUserId || record.userId || record.courierId));
  }

  function buildVehicleSummary(label, serial, plate) {
    return [label, serial, plate].filter(Boolean).join(" / ") || "-";
  }

  function buildVehicleUsageSummary(activeVehicleUsage) {
    if (!activeVehicleUsage) {
      return "-";
    }
    return [
      activeVehicleUsage.vehicleType,
      activeVehicleUsage.vehicleSerial,
      activeVehicleUsage.plateNumber,
      activeVehicleUsage.active ? "active" : "inactive"
    ].filter(Boolean).join(" / ");
  }

  function matchesSearch(searchable, query) {
    var normalizedQuery = normalizeText(query).toLowerCase();
    if (!normalizedQuery) {
      return true;
    }
    var normalizedSearchable = normalizeText(searchable).toLowerCase();
    if (normalizedSearchable.indexOf(normalizedQuery) >= 0) {
      return true;
    }
    return normalizedQuery.split(/\s+/).filter(Boolean).every(function (token) {
      return normalizedSearchable.indexOf(token) >= 0;
    });
  }

  function matchesNormalizedFilter(value, selectedValue, normalizer) {
    var selected = normalizeText(selectedValue);
    if (!selected || selected === "all") {
      return true;
    }
    var normalizeValue = typeof normalizer === "function" ? normalizer : normalizeText;
    return normalizeValue(value) === normalizeValue(selectedValue);
  }

  function assignmentIssueMessage(issueCode, row) {
    var messages = {
      assignment_actual_rider_not_found: "Actual rider identity could not be resolved for this assignment.",
      assignment_duplicate_active_courier: "More than one active assignment was detected for this dashboard user.",
      assignment_duplicate_active_rider: "The same rider appears active on more than one dashboard user.",
      assignment_for_dismissed_user: "This dashboard user is dismissed but still appears in assignment views.",
      assignment_missing_actual_rider: "Active assignment is missing the actual rider identity.",
      assignment_owner_missing_hr: "Dashboard owner iqama was not matched to HR Master.",
      assignment_pending_review_user: "Dashboard user is still pending review.",
      assignment_register_city_scope_mismatch: "Rider scope does not match the selected city/register.",
      assignment_vehicle_mismatch: "Actual vehicle usage does not match the registered vehicle data.",
      assignment_without_start_date: "Assignment start date is missing."
    };
    return messages[issueCode] || ("Assignment issue: " + issueCode + " for " + (row.dashboardUserId || row.assignmentId || "record"));
  }

  function assignmentIssueSeverity(issueCode) {
    if (issueCode === "assignment_duplicate_active_rider" || issueCode === "assignment_duplicate_active_courier" || issueCode === "assignment_for_dismissed_user") {
      return "critical";
    }
    if (issueCode === "assignment_vehicle_mismatch" || issueCode === "assignment_register_city_scope_mismatch") {
      return "warning";
    }
    return "task";
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
    buildAssignmentTimeline: buildAssignmentTimeline,
    buildCurrentAssignmentKpis: buildCurrentAssignmentKpis,
    buildCurrentAssignmentRows: buildCurrentAssignmentRows,
    deriveAssignmentNotifications: deriveAssignmentNotifications,
    filterCurrentAssignmentRows: filterCurrentAssignmentRows,
    findCurrentAssignmentRow: findCurrentAssignmentRow
  };
});
