(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../import/importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.DashboardUserLifecycle = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  var normalizeText = ImportTypes.normalizeText;

  function computeDashboardLifecycleStatus(record, options) {
    options = options || {};
    var lifecycleInput = summarizeLifecycleInput(record, options);

    if (!lifecycleInput.presentInLatestImport) {
      return lifecycleInput.missingMeansDismissed ? "dismissed" : "missing_from_latest_snapshot";
    }
    if (lifecycleInput.employmentState === "out_of_service") {
      return "dismissed";
    }
    if (lifecycleInput.employmentState === "frozen") {
      return "frozen";
    }
    if (lifecycleInput.reviewState === "rejected" || lifecycleInput.documentState === "rejected") {
      return "rejected";
    }
    if (lifecycleInput.requiresManualReview) {
      return "needs_review";
    }
    if (lifecycleInput.reviewState === "pending") {
      return "pending_review";
    }
    if (lifecycleInput.hasActiveAssignment) {
      return "active_assigned";
    }
    if (lifecycleInput.isNewRecord) {
      return "new";
    }
    if (lifecycleInput.isAcceptedAndActive) {
      return lifecycleInput.hasHistoricalAssignment ? "active_unassigned" : "ready_for_assignment";
    }
    return "pending_review";
  }

  function summarizeLifecycleInput(record, options) {
    record = record || {};
    options = options || {};
    var noteText = normalizeText(record.pleaseNote || record.notes).toLowerCase();
    var employmentState = normalizeEmploymentState(record.employmentStatus || record.jobStatus || record.status || "");
    var reviewState = normalizeReviewState(record.activationStatus || record.reviewStatus || options.reviewStatus || "");
    var documentState = normalizeDocumentState(record.documentChangeStatus || "");
    var hasActiveAssignment = options.hasActiveAssignment === true ||
      isActiveAssignmentStatus(record.assignmentStatus) ||
      !!normalizeText(record.currentAssignmentId || "");
    var presentInLatestImport = options.presentInLatestImport !== false && !record.missingFromLatestImport;
    var isNewRecord = options.isNewRecord === true || !!(record.__snapshotMeta && record.__snapshotMeta.isNew);
    var hasHistoricalAssignment = !!normalizeText(record.handoverDate || record.returnDate) ||
      ["ended", "stopped", "swapped", "cancelled", "none"].indexOf(normalizeText(record.assignmentStatus).toLowerCase()) >= 0;
    var operationalReviewState = normalizeOperationalReviewState(record.reviewStatus || options.reviewStatus || "");
    var requiresManualReview = !!record.forceStatusReview ||
      !!record.duplicateDashboardUserId ||
      operationalReviewState === "conflict" ||
      operationalReviewState === "needs_review" ||
      operationalReviewState === "needs_swap" ||
      operationalReviewState === "missing_from_latest_import" ||
      documentState === "blocked" ||
      documentState === "missing" ||
      noteText.indexOf("freeze") >= 0 ||
      noteText.indexOf("hold") >= 0 ||
      noteText.indexOf("manual review") >= 0;

    return {
      documentState: documentState,
      employmentState: noteText.indexOf("freeze") >= 0 || noteText.indexOf("hold") >= 0 ? "frozen" : employmentState,
      hasActiveAssignment: hasActiveAssignment,
      hasHistoricalAssignment: hasHistoricalAssignment,
      isAcceptedAndActive: reviewState === "accepted" && employmentState === "in_service",
      isNewRecord: isNewRecord,
      missingMeansDismissed: options.missingMeansDismissed === true || normalizeText(record.missingPolicy).toLowerCase() === "dismissed",
      operationalReviewState: operationalReviewState,
      presentInLatestImport: presentInLatestImport,
      requiresManualReview: requiresManualReview,
      reviewState: reviewState
    };
  }

  function normalizeDocumentState(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text) {
      return "unknown";
    }
    if (containsAny(text, ["no change", "clear", "approved", "valid", "nochange", "لا يوجد تغيير", "ساري"])) {
      return "clear";
    }
    if (containsAny(text, ["reject", "invalid", "refused", "blocked by document", "مرفوض", "غير صالح"])) {
      return "rejected";
    }
    if (containsAny(text, ["missing", "expire", "expired", "incomplete", "ناقص", "منتهي"])) {
      return "missing";
    }
    if (containsAny(text, ["change", "update", "pending", "review", "تغيير", "تحديث", "مراجعة"])) {
      return "blocked";
    }
    return "unknown";
  }

  function normalizeEmploymentState(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text) {
      return "unknown";
    }
    if (containsAny(text, ["freeze", "frozen", "suspend", "hold", "مجمد", "موقوف"])) {
      return "frozen";
    }
    if (containsAny(text, ["terminated", "dismissed", "inactive", "out of service", "resigned", "not_working", "not working", "مقال", "مفصول", "خارج الخدمة"])) {
      return "out_of_service";
    }
    if (containsAny(text, ["active", "working", "in service", "accepted", "approved", "في الخدمة", "يعمل", "نشط"])) {
      return "in_service";
    }
    if (containsAny(text, ["pending", "review", "under review", "مراجعة", "قيد"])) {
      return "pending";
    }
    return "unknown";
  }

  function normalizeOperationalReviewState(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text || text === "ok") {
      return "ok";
    }
    if (containsAny(text, ["conflict", "تعارض"])) {
      return "conflict";
    }
    if (containsAny(text, ["needs_swap", "swap", "تبديل"])) {
      return "needs_swap";
    }
    if (containsAny(text, ["needs_review", "review", "مراجعة"])) {
      return "needs_review";
    }
    if (containsAny(text, ["missing_from_latest_import", "missing", "مفقود"])) {
      return "missing_from_latest_import";
    }
    if (containsAny(text, ["needs_assignment", "assignment", "تسكين"])) {
      return "needs_assignment";
    }
    return "ok";
  }

  function normalizeReviewState(value) {
    var text = normalizeText(value).toLowerCase();
    if (!text) {
      return "unknown";
    }
    if (containsAny(text, ["accepted", "approved", "active", "accepted_in_service", "مقبول", "معتمد"])) {
      return "accepted";
    }
    if (containsAny(text, ["rejected", "reject", "refused", "مرفوض"])) {
      return "rejected";
    }
    if (containsAny(text, ["pending", "under review", "review", "قيد", "مراجعة"])) {
      return "pending";
    }
    return "unknown";
  }

  function isActiveAssignmentStatus(value) {
    var text = normalizeText(value).toLowerCase();
    return text === "active" || text === "assigned";
  }

  function containsAny(text, candidates) {
    return (candidates || []).some(function (candidate) {
      return text.indexOf(String(candidate)) >= 0;
    });
  }

  return {
    computeDashboardLifecycleStatus: computeDashboardLifecycleStatus,
    normalizeDocumentState: normalizeDocumentState,
    normalizeEmploymentState: normalizeEmploymentState,
    normalizeOperationalReviewState: normalizeOperationalReviewState,
    normalizeReviewState: normalizeReviewState,
    summarizeLifecycleInput: summarizeLifecycleInput
  };
});
