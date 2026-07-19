(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./importTypes.js"));
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportPreviewLib = factory(root.KeetaPortal.ImportTypes);
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes) {
  "use strict";

  function buildImportPreview(importRecord, options) {
    options = options || {};
    var analysis = importRecord && importRecord.analysis ? importRecord.analysis : (importRecord || {});
    var previewRows = analysis.tableSummary
      ? analysis.tableSummary.sampleRows
      : analysis.workbookSummary
        ? analysis.workbookSummary.bestSampleRows
        : (analysis.sampleRows || importRecord.previewRows || []);
    var previewHeaders = analysis.tableSummary
      ? analysis.tableSummary.headers
      : analysis.workbookSummary
        ? analysis.workbookSummary.bestHeaders
        : (analysis.headers || importRecord.headers || []);
    var issues = importRecord.validation ? importRecord.validation.issues : [];
    var blockingIssues = issues.filter(function (item) {
      return item.severity === "blocking";
    });
    var requiresManualReview = importRecord.reviewRequired === true ||
      importRecord.confidenceState === "manual_mapping_required" ||
      importRecord.type === "unknown";
    return {
      previewHeaders: (previewHeaders || []).slice(0, options.maxColumns || 12),
      previewRows: (previewRows || []).slice(0, options.maxRows || 20),
      issueSummary: summarizeIssues(issues),
      canSave: blockingIssues.length === 0 &&
        importRecord.type !== "zip_reference" &&
        !!importRecord.targetEntity &&
        (!requiresManualReview || !!importRecord.manualMappingApplied),
      requiresManualMapping: requiresManualReview,
      metadata: {
        fileName: importRecord.sourceFileName || importRecord.fileName || analysis.fileName || "",
        fileType: importRecord.type || "",
        confidence: Number(importRecord.confidence) || 0,
        city: importRecord.city || "",
        register: importRecord.register || "",
        month: importRecord.month || "",
        targetEntity: importRecord.targetEntity || "",
        rowCount: Number(importRecord.rowCount) || 0,
        sheetCount: analysis.workbookSummary ? analysis.workbookSummary.sheetNames.length : 0
      }
    };
  }

  function summarizeIssues(issues) {
    return (issues || []).reduce(function (memo, issue) {
      memo.total += 1;
      memo[issue.severity] = (memo[issue.severity] || 0) + 1;
      return memo;
    }, { total: 0, blocking: 0, high: 0, medium: 0, low: 0, info: 0 });
  }

  function buildDetectionReport(importRecord) {
    return {
      id: importRecord.id || "",
      sourceFileName: importRecord.sourceFileName || importRecord.fileName || "",
      fileType: importRecord.type || "",
      targetEntity: importRecord.targetEntity || "",
      confidence: Number(importRecord.confidence) || 0,
      confidenceState: importRecord.confidenceState || ImportTypes.getConfidenceState(importRecord.confidence),
      city: importRecord.city || "",
      register: importRecord.register || "",
      month: importRecord.month || "",
      reasons: importRecord.reasons || [],
      warnings: importRecord.warnings || [],
      validation: importRecord.validation || { issues: [] },
      scoreBreakdown: importRecord.scoreBreakdown || {},
      headers: importRecord.headers || [],
      sheetNames: importRecord.sheetNames || [],
      rowCount: Number(importRecord.rowCount) || 0
    };
  }

  return {
    buildDetectionReport: buildDetectionReport,
    buildImportPreview: buildImportPreview
  };
});
