(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(require("./monthlyArchiveModel.js")); return; }
  root.KeetaPortal = root.KeetaPortal || {}; root.KeetaPortal.MonthlyArchiveUiModel = factory(root.KeetaPortal.MonthlyArchiveModel);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Model) {
  "use strict";
  var TABS = [
    { id: "archive_overview", label: "Archive Overview" }, { id: "monthly_archive_preview", label: "Monthly Archive Preview" },
    { id: "archive_runs", label: "Archive Runs" }, { id: "archive_issues", label: "Archive Issues" },
    { id: "archive_source_traceability", label: "Archive Source Traceability" }
  ];
  function createView(run, activeTab) {
    run = Model.createArchiveRun(run || {}); var counts = Model.ITEM_FAMILIES.map(function (family) { return { family: family, count: Number(run.snapshotCounts[family]) || 0 }; });
    return { tabs: TABS.slice(), activeTab: TABS.some(function (t) { return t.id === activeTab; }) ? activeTab : "archive_overview",
      scope: { register: run.register, city: run.city, platform: run.platform, month: run.month },
      kpis: { families: counts.filter(function (x) { return x.count > 0; }).length, items: counts.reduce(function (n, x) { return n + x.count; }, 0), warnings: run.warningCount, blockers: run.blockedCount },
      counts: counts, findings: run.validation || [], sourceBatches: run.items.import_batches || [],
      performanceIncluded: !!(run.snapshotCounts.performance_daily || run.snapshotCounts.performance_overall),
      validityIncluded: !!run.snapshotCounts.validity_results, archiveCreationEnabled: false, readOnly: true };
  }
  function detailFor(item) { return { title: (item.archiveFamily || "archive") + " detail", fields: Object.assign({}, item), readOnly: true, nonAuditing: true }; }
  return { TABS: TABS, createView: createView, detailFor: detailFor };
});
