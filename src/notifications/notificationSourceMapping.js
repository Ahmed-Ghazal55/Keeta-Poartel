(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.NotificationSourceMapping = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DASHBOARD_USER_ISSUE_MAP = {
    accepted_user_without_assignment: {
      actionLabel: "فتح التسكين",
      linkedDrawer: "assign",
      linkedSubPage: "needs_assignment",
      severity: "warning",
      suggestedAction: "open_first_assignment",
      title: "مستخدم مقبول بدون تسكين"
    },
    actual_rider_missing_profile: {
      actionLabel: "عرض المندوب الفعلي",
      linkedDrawer: "actual-rider-details",
      linkedSubPage: "dashboard_users",
      severity: "warning",
      suggestedAction: "review_actual_rider_profile",
      title: "ملف المندوب الفعلي غير مكتمل"
    },
    assignment_exists_for_dismissed_user: {
      actionLabel: "مراجعة التسكين",
      linkedDrawer: "details",
      linkedSubPage: "dashboard_users",
      severity: "critical",
      suggestedAction: "review_dismissed_assignment",
      title: "يوزر مقال ما زال مرتبطا بتسكين"
    },
    blocked_missing_owner_iqama: {
      actionLabel: "مراجعة بيانات اليوزر",
      linkedDrawer: "details",
      linkedSubPage: "dashboard_users",
      severity: "warning",
      suggestedAction: "review_owner_identity",
      title: "رقم اقامة صاحب اليوزر مفقود"
    },
    new_user_needs_assignment: {
      actionLabel: "فتح التسكين",
      linkedDrawer: "assign",
      linkedSubPage: "needs_assignment",
      severity: "warning",
      suggestedAction: "open_first_assignment",
      title: "يوزر جديد جاهز للتسكين"
    },
    owner_not_found_in_hr: {
      actionLabel: "عرض صاحب اليوزر",
      linkedDrawer: "owner-details",
      linkedSubPage: "dashboard_users",
      severity: "warning",
      suggestedAction: "review_owner_hr_link",
      title: "صاحب اليوزر غير موجود في HR"
    },
    register_city_scope_mismatch: {
      actionLabel: "مراجعة النطاق",
      linkedDrawer: "details",
      linkedSubPage: "dashboard_users",
      severity: "critical",
      suggestedAction: "review_scope_mismatch",
      title: "تعارض مدينة أو سجل"
    },
    user_missing_from_latest_snapshot: {
      actionLabel: "مراجعة اليوزر",
      linkedDrawer: "details",
      linkedSubPage: "dashboard_users",
      severity: "warning",
      suggestedAction: "review_missing_snapshot",
      title: "يوزر مفقود من آخر تحديث"
    },
    user_pending_review: {
      actionLabel: "عرض التفاصيل",
      linkedDrawer: "details",
      linkedSubPage: "needs_review",
      severity: "info",
      suggestedAction: "review_pending_user",
      title: "يوزر تحت المراجعة"
    },
    user_rejected_documents: {
      actionLabel: "عرض التفاصيل",
      linkedDrawer: "details",
      linkedSubPage: "needs_review",
      severity: "warning",
      suggestedAction: "review_rejected_documents",
      title: "مستندات مرفوضة"
    }
  };

  var CURRENT_ASSIGNMENT_ISSUE_MAP = {
    assignment_actual_rider_not_found: {
      actionLabel: "فتح Resolver",
      linkedDrawer: "resolver",
      linkedSubPage: "current_assignments",
      severity: "warning",
      suggestedAction: "review_actual_rider_resolution",
      title: "تعذر ربط المندوب الفعلي"
    },
    assignment_duplicate_active_courier: {
      actionLabel: "مراجعة التسكين",
      linkedDrawer: "details",
      linkedSubPage: "current_assignments",
      severity: "critical",
      suggestedAction: "review_assignment_state",
      title: "تكرار تسكين لنفس اليوزر"
    },
    assignment_duplicate_active_rider: {
      actionLabel: "مراجعة التسكين الحالي",
      linkedDrawer: "details",
      linkedSubPage: "current_assignments",
      severity: "critical",
      suggestedAction: "review_duplicate_rider",
      title: "المندوب الفعلي مكرر"
    },
    assignment_for_dismissed_user: {
      actionLabel: "عرض التفاصيل",
      linkedDrawer: "details",
      linkedSubPage: "current_assignments",
      severity: "critical",
      suggestedAction: "review_dismissed_assignment",
      title: "تسكين على يوزر مقال"
    },
    assignment_missing_actual_rider: {
      actionLabel: "عرض التفاصيل",
      linkedDrawer: "details",
      linkedSubPage: "current_assignments",
      severity: "warning",
      suggestedAction: "review_missing_actual_rider",
      title: "المندوب الفعلي غير محدد"
    },
    assignment_owner_missing_hr: {
      actionLabel: "عرض صاحب اليوزر",
      linkedDrawer: "owner-details",
      linkedSubPage: "current_assignments",
      severity: "warning",
      suggestedAction: "review_owner_hr_link",
      title: "صاحب اليوزر غير مربوط بـ HR"
    },
    assignment_pending_review_user: {
      actionLabel: "عرض التفاصيل",
      linkedDrawer: "details",
      linkedSubPage: "current_assignments",
      severity: "warning",
      suggestedAction: "review_assignment_needs_review",
      title: "التسكين يحتاج مراجعة"
    },
    assignment_register_city_scope_mismatch: {
      actionLabel: "مراجعة النطاق",
      linkedDrawer: "details",
      linkedSubPage: "current_assignments",
      severity: "warning",
      suggestedAction: "review_scope_mismatch",
      title: "تعارض مدينة أو سجل"
    },
    assignment_vehicle_mismatch: {
      actionLabel: "مراجعة المركبة",
      linkedDrawer: "details",
      linkedSubPage: "current_assignments",
      severity: "warning",
      suggestedAction: "review_vehicle_linkage",
      title: "تعارض ربط المركبة"
    },
    assignment_without_start_date: {
      actionLabel: "عرض التفاصيل",
      linkedDrawer: "details",
      linkedSubPage: "current_assignments",
      severity: "warning",
      suggestedAction: "review_assignment_state",
      title: "تاريخ بداية التسكين مفقود"
    }
  };

  var SOURCE_LABELS = {
    current_assignments: "التسكين الحالي",
    dashboard_users: "يوزرات الداشبورد",
    fleet: "المركبات",
    import: "الاستيراد",
    monthly_rules: "الشروط الشهرية",
    operations: "العمليات",
    performance: "الأداء",
    settings: "الإعدادات",
    storage: "التخزين"
  };

  var DASHBOARD_USER_ISSUE_ALIASES = {
    owner_missing_hr_profile: "owner_not_found_in_hr",
    pending_review_user: "user_pending_review",
    rejected_documents: "user_rejected_documents"
  };

  var CURRENT_ASSIGNMENT_ISSUE_ALIASES = {
    assignment_needs_review: "assignment_pending_review_user",
    assignment_state_mismatch: "assignment_duplicate_active_courier",
    duplicate_active_courier: "assignment_duplicate_active_courier",
    duplicate_active_rider: "assignment_duplicate_active_rider",
    missing_actual_rider: "assignment_missing_actual_rider",
    owner_missing_hr_profile: "assignment_owner_missing_hr",
    vehicle_linkage_mismatch: "assignment_vehicle_mismatch"
  };

  function mapDashboardUserIssue(issueCode, user) {
    user = user || {};
    issueCode = normalizeDashboardIssueCode(issueCode);
    var mapping = DASHBOARD_USER_ISSUE_MAP[issueCode] || {
      actionLabel: "عرض التفاصيل",
      linkedDrawer: "details",
      linkedSubPage: "dashboard_users",
      severity: "info",
      suggestedAction: "review_dashboard_user",
      title: "مشكلة في يوزر الداشبورد"
    };
    var courierId = normalizeText(user.dashboardUserId || user.userId || user.id);
    var ownerIqama = normalizeText(user.ownerIqama || user.idNumber);
    var actualRiderIqama = normalizeText(user.actualRiderIqama || user.currentRiderIqama);
    var query = joinQueryTokens([courierId, ownerIqama, actualRiderIqama]);

    return normalizeNotification({
      actionLabel: mapping.actionLabel,
      actionTarget: courierId || ownerIqama,
      city: user.city || "",
      courierId: courierId,
      entityId: courierId,
      entityType: "dashboardUsers",
      id: "dashboard_issue_" + String(courierId || "unknown") + "_" + String(issueCode || "issue"),
      issueId: issueCode,
      linkedDrawer: mapping.linkedDrawer || "",
      linkedFilters: mergeObjects(baseFilters(user), {
        actualRiderIqama: actualRiderIqama,
        assignmentReadiness: readinessFilterForIssue(issueCode),
        courierId: courierId,
        dashboardUserId: courierId,
        lifecycleStatus: lifecycleFilterForIssue(issueCode),
        ownerIqama: ownerIqama,
        readinessStatus: readinessFilterForIssue(issueCode),
        query: query
      }),
      linkedPage: "operations-shell",
      linkedSubPage: mapping.linkedSubPage || "dashboard_users",
      message: dashboardUserIssueMessage(issueCode, user),
      ownerIqama: ownerIqama,
      platform: user.platform || "",
      register: user.register || "",
      severity: mapping.severity,
      source: "operations",
      sourceEntity: "dashboardUsers",
      sourceEntityId: courierId,
      sourceModule: "dashboard_users",
      sourceType: "issue",
      status: "unread",
      suggestedAction: mapping.suggestedAction,
      title: mapping.title,
      type: "derived"
    });
  }

  function mapCurrentAssignmentIssue(issueCode, row) {
    row = row || {};
    issueCode = normalizeCurrentAssignmentIssueCode(issueCode);
    var mapping = CURRENT_ASSIGNMENT_ISSUE_MAP[issueCode] || {
      actionLabel: "مراجعة التسكين",
      linkedDrawer: "details",
      linkedSubPage: "current_assignments",
      severity: "warning",
      suggestedAction: "review_assignment",
      title: "مشكلة في التسكين الحالي"
    };
    var courierId = normalizeText(row.dashboardUserId || row.courierId);
    var assignmentId = normalizeText(row.assignmentId || row.id);
    var ownerIqama = normalizeText(row.ownerIqama);
    var actualRiderIqama = normalizeText(row.actualRiderIqama || row.currentRiderIqama);
    var query = joinQueryTokens([
      issueCode === "assignment_vehicle_mismatch" ? row.vehicleSerial : "",
      courierId,
      ownerIqama,
      actualRiderIqama
    ]);

    return normalizeNotification({
      actionLabel: mapping.actionLabel,
      actionTarget: courierId || assignmentId,
      actualRiderIqama: actualRiderIqama,
      assignmentId: assignmentId,
      city: row.city || "",
      courierId: courierId,
      entityId: assignmentId || courierId,
      entityType: "assignments",
      id: "assignment_issue_" + String(courierId || assignmentId || "row") + "_" + String(issueCode || "issue"),
      issueId: issueCode,
      linkedDrawer: mapping.linkedDrawer || "",
      linkedFilters: mergeObjects(baseFilters(row), {
        actualRiderIqama: actualRiderIqama,
        assignmentId: assignmentId,
        assignmentStatus: normalizeAssignmentStatus(issueCode, row.assignmentStatus),
        courierId: courierId,
        dashboardUserId: courierId,
        ownerIqama: ownerIqama,
        query: query,
        vehicleSerial: normalizeText(row.vehicleSerial)
      }),
      linkedPage: "operations-shell",
      linkedSubPage: mapping.linkedSubPage || "current_assignments",
      message: currentAssignmentIssueMessage(issueCode, row),
      ownerIqama: ownerIqama,
      platform: row.platform || "",
      register: row.register || "",
      severity: mapping.severity,
      source: "operations",
      sourceEntity: "assignments",
      sourceEntityId: assignmentId || courierId,
      sourceModule: "current_assignments",
      sourceType: "issue",
      status: "unread",
      suggestedAction: mapping.suggestedAction,
      title: mapping.title,
      type: "derived"
    });
  }

  function mapImportBatchNotifications(batch) {
    batch = batch || {};
    var notifications = [];
    var base = {
      city: batch.city || "",
      entityId: normalizeText(batch.id),
      entityType: "importBatches",
      importBatchId: normalizeText(batch.id),
      linkedFilters: {
        batchId: normalizeText(batch.id),
        city: batch.city || "",
        importType: batch.importType || batch.type || "",
        register: batch.register || "",
        status: batch.status || "",
        targetEntity: batch.targetEntity || "",
        templateId: batch.templateId || batch.importType || batch.type || ""
      },
      linkedPage: "import-center",
      linkedSubPage: "",
      platform: batch.platform || "",
      register: batch.register || "",
      source: "import",
      sourceEntity: "importBatches",
      sourceEntityId: normalizeText(batch.id),
      sourceModule: "import",
      status: "unread",
      type: "derived"
    };

    if (String(batch.status || "").toLowerCase() === "saved") {
      notifications.push(normalizeNotification(mergeObjects({}, base, {
        actionLabel: "فتح الدفعة",
        actionTarget: normalizeText(batch.id),
        id: "import_saved_" + String(batch.id || batch.sourceFileName || "batch"),
        message: (batch.sourceFileName || batch.fileName || "دفعة استيراد") + " تم حفظها بنجاح.",
        severity: "success",
        sourceType: "saved_batch",
        suggestedAction: "open_import_batch",
        title: "تم حفظ دفعة استيراد"
      })));
    }

    if ((batch.warnings || []).length) {
      notifications.push(normalizeNotification(mergeObjects({}, base, {
        actionLabel: "مراجعة الدفعة",
        actionTarget: normalizeText(batch.id),
        id: "import_warning_" + String(batch.id || batch.sourceFileName || "batch"),
        message: (batch.sourceFileName || batch.fileName || "دفعة استيراد") + " تحتوي على تحذيرات تحقق.",
        severity: "warning",
        sourceType: "validation_warning",
        suggestedAction: "review_import_batch",
        title: "دفعة استيراد تحتاج مراجعة"
      })));
    }

    return notifications;
  }

  function mapVehicleIssue(issue) {
    issue = issue || {};
    if (issue.resolved) {
      return null;
    }

    return normalizeNotification({
      actionLabel: "مراجعة المشكلة",
      actionTarget: normalizeText(issue.vehicleSerial || issue.id),
      city: issue.city || "",
      entityId: normalizeText(issue.id || issue.vehicleSerial),
      entityType: "vehicleComplianceIssues",
      id: "vehicle_issue_" + String(issue.id || issue.vehicleSerial || ""),
      linkedFilters: {
        city: issue.city || "",
        query: joinQueryTokens([issue.vehicleSerial, issue.vehiclePlateNumber]),
        register: issue.register || ""
      },
      linkedPage: "fleet-shell",
      linkedSubPage: "issues",
      message: issue.message || issue.issueType || "Vehicle compliance issue",
      register: issue.register || "",
      severity: issue.blocking ? "critical" : (issue.severity || "warning"),
      source: "fleet",
      sourceEntity: "vehicleComplianceIssues",
      sourceEntityId: normalizeText(issue.id || issue.vehicleSerial),
      sourceModule: "fleet",
      sourceType: "issue",
      status: "unread",
      suggestedAction: "review_vehicle_issue",
      title: "مشكلة في المركبة",
      type: "derived"
    });
  }

  function mapPerformanceIssue(issue) {
    issue = issue || {};
    if (issue.resolved) {
      return null;
    }

    return normalizeNotification({
      actionLabel: "مراجعة الأداء",
      actionTarget: normalizeText(issue.userId || issue.id),
      city: issue.city || "",
      courierId: normalizeText(issue.userId || ""),
      entityId: normalizeText(issue.id || issue.userId),
      entityType: "performanceIssues",
      id: "performance_issue_" + String(issue.id || issue.userId || ""),
      linkedFilters: {
        city: issue.city || "",
        query: joinQueryTokens([issue.userId, issue.iqama]),
        register: issue.register || ""
      },
      linkedPage: "performance-shell",
      linkedSubPage: "issues",
      message: issue.message || issue.issueType || "Performance issue requires review",
      platform: issue.platform || "",
      register: issue.register || "",
      severity: issue.severity || "warning",
      source: "performance",
      sourceEntity: "performanceIssues",
      sourceEntityId: normalizeText(issue.id || issue.userId),
      sourceModule: "performance",
      sourceType: "issue",
      status: "unread",
      suggestedAction: "review_performance_issue",
      title: "مشكلة في الأداء",
      type: "derived"
    });
  }

  function mapOperationalReview(review) {
    review = review || {};
    if (String(review.reviewStatus || "").toLowerCase() === "resolved") {
      return null;
    }

    var dashboardUserId = normalizeText(review.dashboardUserId || review.userId || review.id);
    return normalizeNotification({
      actionLabel: "مراجعة اليوزر",
      actionTarget: dashboardUserId,
      city: review.city || "",
      courierId: dashboardUserId,
      entityId: normalizeText(review.id || dashboardUserId),
      entityType: "operationalStatusReviews",
      id: "operations_review_" + String(review.id || dashboardUserId || ""),
      linkedFilters: {
        city: review.city || "",
        query: joinQueryTokens([dashboardUserId, review.ownerIqama]),
        register: review.register || ""
      },
      linkedPage: "operations-shell",
      linkedSubPage: guessOperationalReviewSubPage(review),
      message: review.recommendedAction || review.reviewStatus || "Operations review pending",
      ownerIqama: normalizeText(review.ownerIqama),
      register: review.register || "",
      severity: /missing|review|assignment/.test(String(review.recommendedAction || "").toLowerCase()) ? "warning" : "info",
      source: "operations",
      sourceEntity: "operationalStatusReviews",
      sourceEntityId: normalizeText(review.id || dashboardUserId),
      sourceModule: "dashboard_users",
      sourceType: "review",
      status: "unread",
      suggestedAction: "review_operational_status",
      title: "متابعة تشغيلية مطلوبة",
      type: "derived"
    });
  }

  function mapAuditEvent(entry) {
    entry = entry || {};
    var action = String(entry.action || "");

    if (/^monthly_rule_(created|published|locked|archived)$/.test(action)) {
      return normalizeNotification({
        actionLabel: "فتح الشروط",
        actionTarget: normalizeText(entry.entityId),
        entityId: normalizeText(entry.entityId),
        entityType: normalizeText(entry.entity || "monthlyRules"),
        id: "monthly_rule_" + String(entry.id || action),
        linkedFilters: {},
        linkedPage: "monthly-rules-shell",
        linkedSubPage: "settings",
        message: entry.note || action,
        severity: /(locked|archived)/.test(action) ? "warning" : "success",
        source: "monthly_rules",
        sourceEntity: normalizeText(entry.entity || "monthlyRules"),
        sourceEntityId: normalizeText(entry.entityId),
        sourceModule: "monthly_rules",
        sourceType: "audit",
        status: "unread",
        suggestedAction: "review_monthly_rules",
        title: "تم تحديث الشروط الشهرية",
        type: "derived"
      });
    }

    if (action === "dev_data_reset_completed") {
      return normalizeNotification({
        actionLabel: "فتح الإعدادات",
        actionTarget: "settings-shell",
        entityId: normalizeText(entry.entityId || "devDataReset"),
        entityType: normalizeText(entry.entity || "devDataReset"),
        id: "data_reset_" + String(entry.id || "completed"),
        linkedFilters: {},
        linkedPage: "settings-shell",
        linkedSubPage: "",
        message: entry.note || "Developer reset completed successfully.",
        severity: "success",
        source: "settings",
        sourceEntity: normalizeText(entry.entity || "devDataReset"),
        sourceEntityId: normalizeText(entry.entityId || "devDataReset"),
        sourceModule: "settings",
        sourceType: "audit",
        status: "unread",
        suggestedAction: "review_reset_state",
        title: "تم تصفير البيانات التجريبية",
        type: "derived"
      });
    }

    return null;
  }

  function mapStorageWarning(status) {
    status = status || {};
    if (!status.lastError) {
      return null;
    }

    return normalizeNotification({
      actionLabel: "فتح الإعدادات",
      actionTarget: "settings-shell",
      entityId: "storage_bridge_error",
      entityType: "storageBridge",
      id: "storage_bridge_error",
      linkedFilters: {},
      linkedPage: "settings-shell",
      linkedSubPage: "",
      message: status.lastError,
      severity: "critical",
      source: "storage",
      sourceEntity: "storageBridge",
      sourceEntityId: "storage_bridge_error",
      sourceModule: "storage",
      sourceType: "health",
      status: "unread",
      suggestedAction: "review_storage_warning",
      title: "تحذير في مزامنة التخزين",
      type: "derived"
    });
  }

  function normalizeNotification(notification) {
    notification = notification || {};
    var linkedFilters = cloneValue(notification.linkedFilters || {});
    var sourceModule = normalizeText(notification.sourceModule || notification.source || "system");
    var sourceEntity = normalizeText(notification.sourceEntity || notification.entityType || "");
    var sourceEntityId = normalizeText(notification.sourceEntityId || notification.entityId || "");
    var city = normalizeText(notification.city || notification.relatedCity);
    var register = normalizeText(notification.register || notification.relatedRegister);
    var linkedPage = normalizeText(notification.linkedPage || notification.actionPage);

    return {
      actionLabel: normalizeText(notification.actionLabel),
      actionPage: linkedPage,
      actionTarget: normalizeText(notification.actionTarget || notification.entityId || notification.courierId || notification.importBatchId || ""),
      actualRiderIqama: normalizeText(notification.actualRiderIqama),
      assignmentId: normalizeText(notification.assignmentId),
      blocking: !!notification.blocking,
      city: city,
      courierId: normalizeText(notification.courierId),
      createdAt: normalizeText(notification.createdAt || notification.updatedAt),
      entityId: normalizeText(notification.entityId || sourceEntityId),
      entityType: normalizeText(notification.entityType || sourceEntity),
      hiddenAt: normalizeText(notification.hiddenAt),
      hiddenBy: normalizeText(notification.hiddenBy),
      id: normalizeText(notification.id),
      importBatchId: normalizeText(notification.importBatchId),
      issueId: normalizeText(notification.issueId),
      lastOpenedAt: normalizeText(notification.lastOpenedAt),
      lastSeenAt: normalizeText(notification.lastSeenAt),
      linkedDrawer: normalizeText(notification.linkedDrawer),
      linkedFilters: linkedFilters,
      linkedPage: linkedPage,
      linkedSubPage: normalizeText(notification.linkedSubPage),
      message: normalizeText(notification.message),
      note: normalizeText(notification.note),
      ownerIqama: normalizeText(notification.ownerIqama),
      platform: normalizeText(notification.platform),
      readAt: normalizeText(notification.readAt),
      readBy: normalizeText(notification.readBy),
      register: register,
      relatedCity: city,
      relatedRegister: register,
      resolvedAt: normalizeText(notification.resolvedAt),
      resolvedBy: normalizeText(notification.resolvedBy),
      severity: normalizeSeverity(notification.severity),
      source: normalizeText(notification.source || sourceModule || "system"),
      sourceEntity: sourceEntity,
      sourceEntityId: sourceEntityId,
      sourceModule: sourceModule,
      sourceType: normalizeText(notification.sourceType || notification.type || "issue"),
      status: normalizeStatus(notification.status),
      suggestedAction: normalizeText(notification.suggestedAction),
      title: normalizeText(notification.title || "Notification"),
      type: normalizeType(notification),
      updatedAt: normalizeText(notification.updatedAt || notification.createdAt)
    };
  }

  function guessOperationalReviewSubPage(review) {
    var text = String(review && (review.recommendedAction || review.reviewStatus || "")).toLowerCase();
    if (text.indexOf("assignment") >= 0 || text.indexOf("تسكين") >= 0) {
      return "needs_assignment";
    }
    if (text.indexOf("review") >= 0 || text.indexOf("مراجعة") >= 0) {
      return "needs_review";
    }
    return "dashboard_users";
  }

  function dashboardUserIssueMessage(issueCode, user) {
    var labels = {
      accepted_user_without_assignment: "المستخدم مقبول ولكن لا يوجد له تسكين نشط حتى الآن.",
      actual_rider_missing_profile: "هناك تسكين فعلي لكن ملف المندوب الفعلي غير مكتمل أو غير مربوط.",
      assignment_exists_for_dismissed_user: "اليوزر في حالة إقالة أو خروج وما زال مرتبطا بتسكين نشط.",
      blocked_missing_owner_iqama: "لا يمكن متابعة التسكين لأن رقم إقامة صاحب اليوزر غير موجود.",
      new_user_needs_assignment: "يوزر جديد جاهز للمراجعة والتسكين لأول مرة.",
      owner_not_found_in_hr: "رقم إقامة صاحب اليوزر غير مطابق داخل HR Master.",
      register_city_scope_mismatch: "هناك تعارض بين مدينة/سجل اليوزر ونطاق التشغيل أو المندوب.",
      user_missing_from_latest_snapshot: "هذا اليوزر غير موجود في آخر تحديث للداشبورد ويحتاج مراجعة.",
      user_pending_review: "اليوزر لا يزال تحت المراجعة ولم يكتمل اعتماده التشغيلي.",
      user_rejected_documents: "اليوزر لديه مستندات أو مراجعة مرفوضة وتحتاج متابعة."
    };
    var prefix = normalizeText(user && (user.fullName || user.dashboardUserId || user.userId));
    return (labels[issueCode] || ("مشكلة تشغيلية: " + issueCode)) + (prefix ? " (" + prefix + ")" : "");
  }

  function currentAssignmentIssueMessage(issueCode, row) {
    var labels = {
      assignment_actual_rider_not_found: "تعذر ربط هوية المندوب الفعلي لهذا التسكين.",
      assignment_duplicate_active_courier: "تم اكتشاف أكثر من تسكين نشط لنفس اليوزر.",
      assignment_duplicate_active_rider: "نفس المندوب ظاهر كتسكين نشط لأكثر من يوزر.",
      assignment_for_dismissed_user: "اليوزر في حالة إقالة لكنه ما زال ظاهرا ضمن التسكين الحالي.",
      assignment_missing_actual_rider: "التسكين النشط لا يحتوي على هوية المندوب الفعلي.",
      assignment_owner_missing_hr: "رقم إقامة صاحب اليوزر غير مربوط بـ HR Master.",
      assignment_pending_review_user: "بيانات اليوزر الأساسية ما زالت تحتاج مراجعة.",
      assignment_register_city_scope_mismatch: "نطاق المدينة أو السجل للمندوب لا يطابق هذا التسكين.",
      assignment_vehicle_mismatch: "المركبة المستخدمة فعليا لا تطابق بيانات المركبة المسجلة.",
      assignment_without_start_date: "تاريخ بداية التسكين غير موجود."
    };
    var prefix = normalizeText(row && (row.dashboardUserId || row.assignmentId));
    return (labels[issueCode] || ("مشكلة تسكين: " + issueCode)) + (prefix ? " (" + prefix + ")" : "");
  }

  function normalizeAssignmentStatus(issueCode, currentStatus) {
    if (issueCode === "assignment_duplicate_active_rider" || issueCode === "assignment_duplicate_active_courier") {
      return "active";
    }
    return normalizeText(currentStatus || "");
  }

  function readinessFilterForIssue(issueCode) {
    if (issueCode === "new_user_needs_assignment" || issueCode === "accepted_user_without_assignment") {
      return "ready_for_assignment";
    }
    return "";
  }

  function lifecycleFilterForIssue(issueCode) {
    if (issueCode === "user_pending_review") {
      return "pending_review";
    }
    if (issueCode === "user_missing_from_latest_snapshot") {
      return "missing_from_latest_snapshot";
    }
    if (issueCode === "user_rejected_documents") {
      return "rejected";
    }
    if (issueCode === "assignment_exists_for_dismissed_user") {
      return "dismissed";
    }
    return "";
  }

  function baseFilters(record) {
    return {
      city: normalizeText(record && record.city),
      platform: normalizeText(record && record.platform),
      register: normalizeText(record && record.register)
    };
  }

  function joinQueryTokens(values) {
    return uniqueStrings((values || []).map(normalizeText).filter(Boolean)).join(" ");
  }

  function normalizeDashboardIssueCode(issueCode) {
    var normalized = normalizeText(issueCode);
    return DASHBOARD_USER_ISSUE_ALIASES[normalized] || normalized;
  }

  function normalizeCurrentAssignmentIssueCode(issueCode) {
    var normalized = normalizeText(issueCode);
    return CURRENT_ASSIGNMENT_ISSUE_ALIASES[normalized] || normalized;
  }

  function normalizeSeverity(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (["critical", "danger", "warning", "task", "success", "info"].indexOf(normalized) >= 0) {
      return normalized;
    }
    return "info";
  }

  function normalizeStatus(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (["unread", "read", "resolved", "hidden"].indexOf(normalized) >= 0) {
      return normalized;
    }
    return "unread";
  }

  function normalizeType(notification) {
    var explicit = normalizeText(notification.type);
    if (explicit) {
      return explicit;
    }
    if (notification.issueId || notification.linkedPage || notification.sourceType) {
      return "derived";
    }
    return "manual";
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  function uniqueStrings(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = String(value || "");
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function cloneValue(value) {
    if (!value || typeof value !== "object") {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  return {
    CURRENT_ASSIGNMENT_ISSUE_MAP: CURRENT_ASSIGNMENT_ISSUE_MAP,
    DASHBOARD_USER_ISSUE_MAP: DASHBOARD_USER_ISSUE_MAP,
    SOURCE_LABELS: SOURCE_LABELS,
    mapAuditEvent: mapAuditEvent,
    mapCurrentAssignmentIssue: mapCurrentAssignmentIssue,
    mapDashboardUserIssue: mapDashboardUserIssue,
    mapImportBatchNotifications: mapImportBatchNotifications,
    mapOperationalReview: mapOperationalReview,
    mapPerformanceIssue: mapPerformanceIssue,
    mapStorageWarning: mapStorageWarning,
    mapVehicleIssue: mapVehicleIssue,
    normalizeNotification: normalizeNotification
  };
});
