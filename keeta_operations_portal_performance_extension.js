(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  var Portal = window.KeetaPortal || {};
  if (!Portal.Runtime || !Portal.RBAC || !Portal.Runtime.performanceService) {
    return;
  }

  var runtime = Portal.Runtime;
  var service = runtime.performanceService;
  var UIShell = Portal.UIShell || null;
  var ActionDropdown = Portal.ActionDropdown || null;
  var DetailsDrawer = Portal.DetailsDrawer || null;
  var PageRenderController = Portal.PageRenderController || null;
  var bootModeState = Portal.BootMode && typeof Portal.BootMode.getState === "function"
    ? Portal.BootMode.getState()
    : { safeMode: false };
  var actionDropdownController = ActionDropdown && typeof ActionDropdown.createGlobalController === "function"
    ? ActionDropdown.createGlobalController(document)
    : null;

  document.body.dataset.performanceExtensionMode = "prompt7";

  var state = {
    activeTab: "results",
    activeView: "daily_performance",
    drawerResultId: "",
    issueSeverity: "all",
    mandatoryStatus: "all",
    month: pickDefaultMonth(),
    query: "",
    validityStatus: "all",
    vehicleType: "all"
  };
  var pageController = PageRenderController && typeof PageRenderController.createPageRenderController === "function"
    ? PageRenderController.createPageRenderController({
        debounceMs: 110,
        onRender: renderPage,
        pageId: "performance-shell"
      })
    : null;

  if (actionDropdownController) {
    actionDropdownController.initialize();
  }

  if (bootModeState.safeMode) {
    return;
  }

  function scheduleRender(reason, delayMs) {
    if (pageController) {
      pageController.requestRender({
        delayMs: delayMs,
        reason: reason || "render"
      });
      return;
    }
    renderPage();
  }

  injectStyles();
  bindEvents();
  scheduleRender("init", 40);

  function bindEvents() {
    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleFilterChange);
    document.addEventListener("change", handleFilterChange);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("keeta:action-dropdown-select", handleActionDropdownSelection);
    document.addEventListener("keeta:shell-route-change", handleShellRouteChange);
    window.addEventListener("keeta:data-changed", handleExternalUpdate);

    if (Portal.OrganizationContext && typeof Portal.OrganizationContext.subscribe === "function") {
      Portal.OrganizationContext.subscribe(handleExternalUpdate);
    }
    if (runtime.auth && typeof runtime.auth.subscribe === "function") {
      runtime.auth.subscribe(handleExternalUpdate);
    }
  }

  function handleExternalUpdate() {
    if (!state.month) {
      state.month = pickDefaultMonth();
    }
    scheduleRender("external_update", 120);
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && state.drawerResultId) {
      state.drawerResultId = "";
      renderDrawer();
    }
  }

  function handleFilterChange(event) {
    var target = event.target;
    if (!target || !target.getAttribute) {
      return;
    }
    var filterKey = target.getAttribute("data-performance-filter");
    if (!filterKey) {
      return;
    }
    state[filterKey] = target.value || "";
    if (filterKey === "month" && !state[filterKey]) {
      state[filterKey] = pickDefaultMonth();
    }
    scheduleRender(filterKey === "query" ? "search" : "filter", filterKey === "query" ? 140 : 80);
  }

  function handleClick(event) {
    var tabButton = closest(event.target, "[data-performance-tab]");
    if (tabButton) {
      state.activeTab = tabButton.getAttribute("data-performance-tab") || "results";
      scheduleRender("tab", 0);
      return;
    }

    var actionButton = closest(event.target, "[data-performance-action]");
    if (!actionButton) {
      return;
    }

    var action = actionButton.getAttribute("data-performance-action") || "";
    if (action === "view-details") {
      openResultDetails(actionButton.getAttribute("data-result-id") || "");
      return;
    }
    if (action === "close-drawer") {
      state.drawerResultId = "";
      renderDrawer();
      return;
    }
    if (action === "recalculate") {
      runRecalculation();
      return;
    }
    if (action === "export") {
      exportCurrentResults();
    }
  }

  function handleActionDropdownSelection(event) {
    var detail = event && event.detail ? event.detail : {};
    var dataset = detail.dataset || {};
    if (dataset.module !== "performance") {
      return;
    }
    if (detail.actionId === "view-details") {
      openResultDetails(dataset.resultId || "");
      return;
    }
    if (detail.actionId === "copy-user-id") {
      copyText(dataset.userId || "");
      toast("تم نسخ المعرف.", "success");
    }
  }

  function handleShellRouteChange(event) {
    var route = event && event.detail ? event.detail : {};
    if (String(route.page || "") !== "performance-shell") {
      return;
    }
    applyPerformanceRoute(route.subPage);
    scheduleRender("route", 40);
  }

  function applyPerformanceRoute(subPage) {
    var key = String(subPage || "").toLowerCase();
    var map = {
      results: "daily_performance",
      "daily-performance": "daily_performance",
      daily_performance: "daily_performance",
      "overall-performance": "overall_performance",
      overall: "overall_performance",
      overall_performance: "overall_performance",
      vda: "vda",
      vda_keeta: "vda_keeta",
      "vda-keeta": "vda_keeta",
      face_verification: "face_verification",
      "face-verification": "face_verification",
      delivery_experience: "delivery_experience",
      "delivery-experience": "delivery_experience",
      issues: "issues",
      "follow-up": "issues"
    };
    state.activeView = map[key] || "daily_performance";
    state.activeTab = state.activeView === "issues" ? "issues" : "results";
  }

  function renderPage() {
    var page = document.getElementById("page-performance-shell");
    if (!page) {
      return;
    }

    var user = getCurrentUser();
    var context = getOrganizationContext();
    var resultsState = safeList(function () {
      return service.listValidityResults(getFilters(), user, context);
    });
    var issuesState = safeList(function () {
      return service.listPerformanceIssues(getFilters(), user, context);
    });

    if (!state.month) {
      state.month = pickDefaultMonth();
    }

    page.innerHTML = [
      '<div class="perf-shell-root">',
      renderToolbar(context, user, resultsState.error || issuesState.error),
      resultsState.error || issuesState.error
        ? renderErrorPanel(resultsState.error || issuesState.error)
        : renderContent(resultsState.rows, issuesState.rows),
      '<div id="performanceDrawerHost"></div>',
      "</div>"
    ].join("");
    if (UIShell && typeof UIShell.enhanceTables === "function") {
      UIShell.enhanceTables(page);
    }

    renderDrawer();
  }

  function renderToolbar(context, user, errorText) {
    var scopeSummary = summarizeContext(context);
    var viewDefinition = getViewDefinition();
    var userLabel = user
      ? [user.displayName || user.username || user.id || "User", user.role || ""].join(" | ")
      : "\u0628\u062f\u0648\u0646 \u062c\u0644\u0633\u0629";

    return [
      '<section class="perf-surface perf-toolbar">',
      '  <div class="perf-toolbar__head">',
      '    <div class="perf-toolbar__titles">',
      '      <span class="perf-eyebrow">' + escapeHtml(viewDefinition.eyebrow) + "</span>",
      '      <h2 class="perf-title">' + escapeHtml(viewDefinition.title) + "</h2>",
      '      <p class="perf-subtitle">' + escapeHtml(viewDefinition.subtitle) + "</p>",
      "    </div>",
      '    <div class="perf-toolbar__actions">',
      '      <button class="btn green" data-performance-action="recalculate"' + (canCurrentUser("performance.recalculate") ? "" : " disabled") + '>\u0625\u0639\u0627\u062f\u0629 \u062d\u0633\u0627\u0628</button>',
      '      <button class="btn light" data-performance-action="export"' + (canCurrentUser("performance.export") ? "" : " disabled") + '>Export CSV</button>',
      "    </div>",
      "  </div>",
      '  <div class="perf-toolbar__meta">',
      '    <span class="perf-chip"><strong>\u0627\u0644\u0635\u0641\u062d\u0629:</strong> ' + escapeHtml(viewDefinition.shortLabel) + "</span>",
      '    <span class="perf-chip"><strong>\u0627\u0644\u0646\u0637\u0627\u0642:</strong> ' + escapeHtml(scopeSummary) + "</span>",
      '    <span class="perf-chip"><strong>\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645:</strong> ' + escapeHtml(userLabel) + "</span>",
      '    <span class="perf-chip"><strong>\u0627\u0644\u0634\u0647\u0631:</strong> ' + escapeHtml(state.month || "-") + "</span>",
      errorText ? '    <span class="perf-chip perf-chip--danger">' + escapeHtml(errorText) + "</span>" : "",
      "  </div>",
      '  <div class="perf-filters">',
      renderInputField("month", "\u0627\u0644\u0634\u0647\u0631", "month", state.month),
      renderSelectField("validityStatus", "\u062d\u0627\u0644\u0629 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629", state.validityStatus, [
        ["all", "\u0627\u0644\u0643\u0644"],
        ["eligible", "\u0635\u0627\u0644\u062d"],
        ["not_eligible", "\u063a\u064a\u0631 \u0635\u0627\u0644\u062d"],
        ["under_review", "\u062a\u062d\u062a \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629"],
        ["no_data", "\u0628\u0644\u0627 \u0628\u064a\u0627\u0646\u0627\u062a"]
      ]),
      renderSelectField("vehicleType", "\u0646\u0648\u0639 \u0627\u0644\u0645\u0631\u0643\u0628\u0629", state.vehicleType, [
        ["all", "\u0627\u0644\u0643\u0644"],
        ["car", "\u0633\u064a\u0627\u0631\u0629"],
        ["bike", "\u062f\u0628\u0627\u0628"]
      ]),
      renderSelectField("mandatoryStatus", "\u0627\u0644\u062d\u0636\u0648\u0631 \u0627\u0644\u0627\u0644\u0632\u0627\u0645\u064a", state.mandatoryStatus, [
        ["all", "\u0627\u0644\u0643\u0644"],
        ["met", "\u0645\u062d\u0642\u0642"],
        ["missed", "\u063a\u064a\u0631 \u0645\u062d\u0642\u0642"]
      ]),
      renderSelectField("issueSeverity", "\u0634\u062f\u0629 \u0627\u0644\u0645\u0634\u0627\u0643\u0644", state.issueSeverity, [
        ["all", "\u0627\u0644\u0643\u0644"],
        ["low", "Low"],
        ["medium", "Medium"],
        ["high", "High"],
        ["critical", "Critical"]
      ]),
      renderSearchField("query", "\u0628\u062d\u062b \u0633\u0631\u064a\u0639", state.query, "User ID / Iqama / Rider"),
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderContent(results, issues) {
    return [
      renderKpis(results, issues),
      renderTabs(),
      state.activeTab === "issues" ? renderIssuesTable(issues) : renderResultsTable(results)
    ].join("");
  }

  function renderKpis(results, issues) {
    var eligible = countBy(results, "status", "eligible");
    var notEligible = countBy(results, "status", "not_eligible");
    var underReview = countBy(results, "status", "under_review");
    var noData = countBy(results, "status", "no_data");
    var mandatoryMet = countWhere(results, function (item) {
      return item.mandatorySummary && item.mandatorySummary.met === true;
    });
    var mandatoryMissed = countWhere(results, function (item) {
      return item.mandatorySummary && item.mandatorySummary.met === false;
    });
    var fallbackUsed = countWhere(results, function (item) {
      return !!item.fallbackUsed;
    });
    var openIssues = countWhere(issues, function (item) {
      return !item.resolved;
    });
    var faceFailed = countWhere(results, function (item) {
      return item.faceSummary && item.faceSummary.status === "fail";
    });
    var vdaInvalid = countWhere(results, function (item) {
      return item.vdaSummary && item.vdaSummary.status === "invalid";
    });

    return [
      '<section class="perf-kpis">',
      renderKpiCard("\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a", results.length, "neutral"),
      renderKpiCard("\u0635\u0627\u0644\u062d", eligible, "success"),
      renderKpiCard("\u063a\u064a\u0631 \u0635\u0627\u0644\u062d", notEligible, "danger"),
      renderKpiCard("\u062a\u062d\u062a \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629", underReview, "warning"),
      renderKpiCard("\u0628\u0644\u0627 \u0628\u064a\u0627\u0646\u0627\u062a", noData, "neutral"),
      renderKpiCard("\u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645 \u0627\u0644\u0645\u062d\u0642\u0642", mandatoryMet, "success"),
      renderKpiCard("\u0641\u0648\u0627\u0626\u062a \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645", mandatoryMissed, "danger"),
      renderKpiCard("Face Fail", faceFailed, "warning"),
      renderKpiCard("VDA Invalid", vdaInvalid, "danger"),
      renderKpiCard("Fallback Active", fallbackUsed, "warning"),
      renderKpiCard("Open Issues", openIssues, "danger"),
      "</section>"
    ].join("");
  }

  function renderTabs() {
    return [
      '<section class="perf-tabs">',
      renderTab("results", "\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629"),
      renderTab("issues", "\u0627\u0644\u0645\u0634\u0627\u0643\u0644 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629"),
      "</section>"
    ].join("");
  }

  function renderResultsTable(results) {
    return [
      '<section class="perf-surface">',
      '  <div class="perf-table-wrap">',
      '    <table class="perf-table">',
      "      <thead>",
      "        <tr>",
      "          <th>User ID</th>",
      "          <th>Rider</th>",
      "          <th>Iqama</th>",
      "          <th>City</th>",
      "          <th>Register</th>",
      "          <th>Vehicle</th>",
      "          <th>Valid Days</th>",
      "          <th>Mandatory</th>",
      "          <th>Face</th>",
      "          <th>VDA</th>",
      "          <th>Delivery</th>",
      "          <th>Projection</th>",
      "          <th>Validity</th>",
      "          <th>Fallback</th>",
      "          <th>Action</th>",
      "        </tr>",
      "      </thead>",
      "      <tbody>",
      results.length ? results.map(renderResultRow).join("") : renderEmptyRow(15, "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u062d\u0627\u0644\u064a\u0629."),
      "      </tbody>",
      "    </table>",
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderIssuesTable(issues) {
    return [
      '<section class="perf-surface">',
      '  <div class="perf-table-wrap">',
      '    <table class="perf-table">',
      "      <thead>",
      "        <tr>",
      "          <th>User ID</th>",
      "          <th>Issue</th>",
      "          <th>Severity</th>",
      "          <th>Message</th>",
      "          <th>Recommendation</th>",
      "          <th>Status</th>",
      "        </tr>",
      "      </thead>",
      "      <tbody>",
      issues.length ? issues.map(renderIssueRow).join("") : renderEmptyRow(6, "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0634\u0627\u0643\u0644 \u0645\u0641\u062a\u0648\u062d\u0629 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0646\u0637\u0627\u0642."),
      "      </tbody>",
      "    </table>",
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderResultRow(item) {
    var mandatorySummary = item.mandatorySummary || {};
    var projectionSummary = item.projectionSummary || {};
    var reasons = (item.reasons || []).slice(0, 2).join(" | ");

    return [
      "<tr>",
      "  <td>" + escapeHtml(item.userId || item.dashboardUserId || "-") + "</td>",
      "  <td>" + escapeHtml(item.riderId || "-") + "</td>",
      "  <td>" + escapeHtml(item.iqama || "-") + "</td>",
      "  <td>" + escapeHtml(item.city || "-") + "</td>",
      "  <td>" + escapeHtml(item.register || "-") + "</td>",
      "  <td>" + escapeHtml(item.vehicleType || "-") + "</td>",
      "  <td>" + escapeHtml(String(item.dailySummary ? item.dailySummary.validDaysCount : 0)) + "</td>",
      "  <td>" + escapeHtml(String(mandatorySummary.valid || 0) + "/" + String(mandatorySummary.required || 0)) + "</td>",
      "  <td>" + renderStatusPill(item.faceSummary && item.faceSummary.status || "no_data") + "</td>",
      "  <td>" + renderStatusPill(item.vdaSummary && item.vdaSummary.status || "no_data") + "</td>",
      "  <td>" + renderStatusPill(item.deliveryExperienceSummary && item.deliveryExperienceSummary.status || "no_data") + "</td>",
      "  <td>" + renderProjectionCell(projectionSummary) + "</td>",
      '  <td><div class="perf-status-stack">' + renderStatusPill(item.status || "under_review") + '<span class="perf-status-reason">' + escapeHtml(reasons || "-") + "</span></div></td>",
      "  <td>" + (item.fallbackUsed ? '<span class="perf-simple-pill perf-simple-pill--gold">Yes</span>' : '<span class="perf-simple-pill">No</span>') + "</td>",
      "  <td>" + renderResultActions(item) + "</td>",
      "</tr>"
    ].join("");
  }

  function renderResultActions(item) {
    if (ActionDropdown && typeof ActionDropdown.renderActionDropdown === "function") {
      return ActionDropdown.renderActionDropdown({
        contextData: {
          module: "performance",
          "result-id": item.id || "",
          "user-id": item.userId || item.dashboardUserId || "",
          "rider-id": item.riderId || ""
        },
        dropdownId: "performance_" + escapeHtml(item.id || item.userId || item.dashboardUserId || Math.random().toString(36).slice(2, 7)),
        actions: buildResultActions(item)
      });
    }
    return '<button class="btn light perf-mini-btn" data-performance-action="view-details" data-result-id="' + escapeHtml(item.id) + '">\u062a\u0641\u0627\u0635\u064a\u0644</button>';
  }

  function buildResultActions(item) {
    return [
      {
        actionId: "view-details",
        label: "\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644",
        disabled: !canCurrentUser("performance.view"),
        reason: "\u064a\u062d\u062a\u0627\u062c \u0635\u0644\u0627\u062d\u064a\u0629 performance.view"
      },
      {
        actionId: "copy-user-id",
        label: "\u0646\u0633\u062e User ID",
        disabled: !(item.userId || item.dashboardUserId),
        reason: "\u0644\u0627 \u064a\u0648\u062c\u062f User ID \u0645\u0631\u0628\u0648\u0637 \u0628\u0627\u0644\u0633\u062c\u0644."
      }
    ];
  }

  function renderIssueRow(item) {
    return [
      "<tr>",
      "  <td>" + escapeHtml(item.userId || item.dashboardUserId || "-") + "</td>",
      "  <td>" + escapeHtml(item.issueType || "-") + "</td>",
      "  <td>" + renderStatusPill(item.severity || "medium") + "</td>",
      "  <td>" + escapeHtml(item.message || "-") + "</td>",
      "  <td>" + escapeHtml(item.recommendedAction || "-") + "</td>",
      "  <td>" + (item.resolved ? '<span class="perf-simple-pill">\u0645\u063a\u0644\u0642\u0629</span>' : '<span class="perf-simple-pill perf-simple-pill--danger">\u0645\u0641\u062a\u0648\u062d\u0629</span>') + "</td>",
      "</tr>"
    ].join("");
  }

  function renderDrawer() {
    var host = document.getElementById("performanceDrawerHost");
    if (!host) {
      return;
    }

    if (!state.drawerResultId) {
      host.innerHTML = "";
      return;
    }

    var details = null;
    try {
      details = service.getResultDetails(state.drawerResultId, getCurrentUser());
    } catch (error) {
      details = { error: error.message || String(error) };
    }

    if (!details || !details.result) {
      host.innerHTML = "";
      return;
    }

    host.innerHTML = [
      '<div class="perf-drawer-backdrop" data-performance-action="close-drawer"></div>',
      '<aside class="perf-drawer" role="dialog" aria-modal="true">',
      '  <div class="perf-drawer__head">',
      "    <div>",
      '      <span class="perf-eyebrow">Validity Result</span>',
      '      <h3 class="perf-drawer__title">' + escapeHtml(details.result.userId || details.result.dashboardUserId || details.result.riderId || "-") + "</h3>",
      "    </div>",
      '    <button class="btn light perf-mini-btn" data-performance-action="close-drawer">\u0625\u063a\u0644\u0627\u0642</button>',
      "  </div>",
      '  <div class="perf-drawer__body">',
      renderDrawerSummary(details),
      renderDrawerReasons(details),
      renderDrawerDaily(details),
      renderDrawerIssues(details),
      renderDrawerAudit(details),
      "  </div>",
      "</aside>"
    ].join("");
  }

  function renderDrawerSummary(details) {
    var result = details.result || {};
    var monthly = details.monthlyPerformance || {};
    var projection = result.projectionSummary || {};
    var mandatory = result.mandatorySummary || {};

    return [
      '<section class="perf-drawer-section">',
      "  <h4>\u0627\u0644\u0645\u0644\u062e\u0635 \u0627\u0644\u0634\u0647\u0631\u064a</h4>",
      '  <div class="perf-detail-grid">',
      renderDetailCell("\u0627\u0644\u062d\u0627\u0644\u0629", renderStatusPill(result.status || "under_review")),
      renderDetailCell("Rule", escapeHtml(result.appliedRuleId || "legacy_fallback")),
      renderDetailCell("Fallback", escapeHtml(result.fallbackUsed ? "Yes" : "No")),
      renderDetailCell("Orders", escapeHtml(String(monthly.totalCompletedOrders || monthly.totalOrders || 0))),
      renderDetailCell("Valid Days", escapeHtml(String(result.dailySummary ? result.dailySummary.validDaysCount : 0))),
      renderDetailCell("Mandatory", escapeHtml(String(mandatory.valid || 0) + "/" + String(mandatory.required || 0))),
      renderDetailCell("Face", renderStatusPill(monthly.faceStatus || (result.faceSummary && result.faceSummary.status) || "no_data")),
      renderDetailCell("VDA", renderStatusPill(monthly.vdaStatus || (result.vdaSummary && result.vdaSummary.status) || "no_data")),
      renderDetailCell("Delivery", renderStatusPill(monthly.deliveryExperienceStatus || (result.deliveryExperienceSummary && result.deliveryExperienceSummary.status) || "no_data")),
      renderDetailCell("\u0631\u0627\u062a\u0628", renderStatusPill(result.salaryEligibilityStatus || "under_review")),
      renderDetailCell("\u062d\u0627\u0641\u0632", renderStatusPill(result.incentiveEligibilityStatus || "under_review")),
      renderDetailCell("\u0627\u0644\u062a\u0648\u0642\u0639", escapeHtml(projection.message || "-")),
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderDrawerReasons(details) {
    var result = details.result || {};
    return [
      '<section class="perf-drawer-section">',
      "  <h4>\u0627\u0644\u0627\u0633\u0628\u0627\u0628 \u0648\u0627\u0644\u062a\u062d\u0630\u064a\u0631\u0627\u062a</h4>",
      renderTextBlock((result.reasons || []).join(" | ") || "-"),
      renderTextBlock((result.nonBlockingWarnings || []).join(" | ") || "\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u062d\u0630\u064a\u0631\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629."),
      "</section>"
    ].join("");
  }

  function renderDrawerDaily(details) {
    var monthly = details.monthlyPerformance || {};
    var rows = monthly.dailyRows && monthly.dailyRows.length ? monthly.dailyRows : (details.dailyRows || []);

    return [
      '<section class="perf-drawer-section">',
      "  <h4>\u0627\u0644\u062a\u0641\u0635\u064a\u0644 \u0627\u0644\u064a\u0648\u0645\u064a</h4>",
      '  <div class="perf-table-wrap">',
      '    <table class="perf-table">',
      "      <thead><tr><th>Date</th><th>Orders</th><th>Hours</th><th>Valid Day</th><th>Mandatory</th></tr></thead>",
      "      <tbody>",
      rows.length ? rows.map(function (row) {
        return [
          "<tr>",
          "  <td>" + escapeHtml(row.date || row.dateKey || "-") + "</td>",
          "  <td>" + escapeHtml(String(firstValue(row.completedOrders, row.orders, row.deliveredTasks, 0))) + "</td>",
          "  <td>" + escapeHtml(String(firstValue(row.workingHours, row.onlineHours, 0))) + "</td>",
          "  <td>" + renderStatusPill(row.validDayStatus || "no_data") + "</td>",
          "  <td>" + renderStatusPill(row.mandatoryDayStatus || "not_mandatory") + "</td>",
          "</tr>"
        ].join("");
      }).join("") : renderEmptyRow(5, "\u0644\u0627 \u062a\u0648\u062c\u062f \u0633\u062c\u0644\u0627\u062a \u064a\u0648\u0645\u064a\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631."),
      "      </tbody>",
      "    </table>",
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderDrawerIssues(details) {
    var issues = details.issues || [];
    return [
      '<section class="perf-drawer-section">',
      "  <h4>\u0627\u0644\u0645\u0634\u0627\u0643\u0644 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629</h4>",
      renderTextBlock(issues.length ? issues.map(function (item) {
        return [item.issueType, item.message].join(": ");
      }).join(" | ") : "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0634\u0627\u0643\u0644 \u0645\u0631\u062a\u0628\u0637\u0629."),
      "</section>"
    ].join("");
  }

  function renderDrawerAudit(details) {
    var events = details.auditEvents || [];
    return [
      '<section class="perf-drawer-section">',
      "  <h4>Audit Trail</h4>",
      renderTextBlock(events.length ? events.slice(0, 6).map(function (item) {
        return [item.action || "-", item.createdAt || item.timestamp || ""].join(" @ ");
      }).join(" | ") : "\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u062d\u062f\u0627\u062b audit \u0645\u0646\u0627\u0633\u0628\u0629."),
      "</section>"
    ].join("");
  }

  function openResultDetails(resultId) {
    if (!resultId) {
      toast("\u062a\u0639\u0630\u0631 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0646\u062a\u064a\u062c\u0629 \u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.", "error");
      return;
    }
    if (UIShell && typeof UIShell.openDrawer === "function" && DetailsDrawer && typeof DetailsDrawer.renderDetailsDrawer === "function") {
      try {
        var details = service.getResultDetails(resultId, getCurrentUser());
        if (!details || !details.result) {
          throw new Error("\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.");
        }
        UIShell.openDrawer(
          "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0623\u062f\u0627\u0621",
          renderSharedResultDetails(details)
        );
        return;
      } catch (error) {
        toast(error && error.message ? error.message : "\u062a\u0639\u0630\u0631 \u062d\u0645\u0644 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0623\u062f\u0627\u0621.", "error");
      }
    }
    state.drawerResultId = resultId;
    renderDrawer();
  }

  function renderSharedResultDetails(details) {
    var result = details.result || {};
    var monthly = details.monthlyPerformance || {};
    var summaryBadges = [
      { label: "Validity: " + String(result.status || "under_review"), tone: toneForStatus(result.status) },
      { label: "Face: " + String(monthly.faceStatus || (result.faceSummary && result.faceSummary.status) || "no_data"), tone: toneForStatus(monthly.faceStatus || (result.faceSummary && result.faceSummary.status)) },
      { label: "VDA: " + String(monthly.vdaStatus || (result.vdaSummary && result.vdaSummary.status) || "no_data"), tone: toneForStatus(monthly.vdaStatus || (result.vdaSummary && result.vdaSummary.status)) },
      { label: "Delivery: " + String(monthly.deliveryExperienceStatus || (result.deliveryExperienceSummary && result.deliveryExperienceSummary.status) || "no_data"), tone: toneForStatus(monthly.deliveryExperienceStatus || (result.deliveryExperienceSummary && result.deliveryExperienceSummary.status)) }
    ];
    return DetailsDrawer.renderDetailsDrawer({
      summary: {
        title: result.userId || result.dashboardUserId || result.riderId || "-",
        subtitle: [result.city || "-", result.register || "-", result.month || state.month || "-"].join(" / "),
        badges: summaryBadges
      },
      sections: [
        {
          title: "\u0645\u0644\u062e\u0635 \u0627\u0644\u0646\u062a\u064a\u062c\u0629",
          fields: [
            resultField("User ID", result.userId || result.dashboardUserId || "-", true),
            resultField("Rider ID", result.riderId || "-", true),
            resultField("Iqama", result.iqama || "-", true),
            resultField("\u0627\u0644\u0645\u062f\u064a\u0646\u0629", result.city || "-"),
            resultField("\u0627\u0644\u0633\u062c\u0644", result.register || "-"),
            resultField("\u0627\u0644\u0645\u0631\u0643\u0628\u0629", result.vehicleType || "-"),
            resultField("Valid Days", firstValue(result.dailySummary && result.dailySummary.validDaysCount, 0), true),
            resultField("Rule", result.appliedRuleId || "legacy_fallback", true),
            resultField("Salary Eligibility", result.salaryEligibilityStatus || "-"),
            resultField("Incentive Eligibility", result.incentiveEligibilityStatus || "-"),
            resultField("Fallback Used", result.fallbackUsed ? "Yes" : "No"),
            resultField("Projection", result.projectionSummary && result.projectionSummary.message ? result.projectionSummary.message : "-")
          ]
        },
        {
          title: "\u0627\u0644\u0623\u0633\u0628\u0627\u0628 \u0648\u0627\u0644\u062a\u062d\u0630\u064a\u0631\u0627\u062a",
          contentHtml: renderSharedTextSection((result.reasons || []).concat(result.nonBlockingWarnings || []), "\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0633\u0628\u0627\u0628 \u0623\u0648 \u062a\u062d\u0630\u064a\u0631\u0627\u062a \u0645\u0631\u062a\u0628\u0637\u0629.")
        },
        {
          title: "\u0627\u0644\u062a\u0641\u0635\u064a\u0644 \u0627\u0644\u064a\u0648\u0645\u064a",
          note: "\u0645\u0635\u062f\u0631\u0647\u0627 performanceDaily \u0648\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u062a\u062d\u0642\u0642 \u0627\u0644\u0634\u0647\u0631\u064a.",
          contentHtml: renderSharedDailyTable(details)
        },
        {
          title: "Warnings / Issues",
          contentHtml: renderSharedIssuesSection(details.issues || [])
        },
        {
          title: "Audit Log",
          contentHtml: renderSharedAuditSection(details.auditEvents || [])
        }
      ]
    });
  }

  function renderSharedTextSection(lines, emptyMessage) {
    var items = (lines || []).filter(Boolean);
    if (!items.length) {
      return "";
    }
    return '<div class="perf-text-block">' + items.map(function (line) {
      return '<div>' + escapeHtml(line) + "</div>";
    }).join("") + "</div>";
  }

  function renderSharedDailyTable(details) {
    var monthly = details.monthlyPerformance || {};
    var rows = monthly.dailyRows && monthly.dailyRows.length ? monthly.dailyRows : (details.dailyRows || []);
    if (!rows.length) {
      return "";
    }
    return [
      '<div class="perf-table-wrap">',
      '  <table class="perf-table">',
      '    <thead><tr><th>Date</th><th>Orders</th><th>Hours</th><th>Valid Day</th><th>Mandatory</th></tr></thead>',
      '    <tbody>',
      rows.map(function (row) {
        return [
          "<tr>",
          "  <td>" + escapeHtml(row.date || row.dateKey || "-") + "</td>",
          "  <td>" + escapeHtml(String(firstValue(row.completedOrders, row.orders, row.deliveredTasks, 0))) + "</td>",
          "  <td>" + escapeHtml(String(firstValue(row.workingHours, row.onlineHours, 0))) + "</td>",
          "  <td>" + renderStatusPill(row.validDayStatus || "no_data") + "</td>",
          "  <td>" + renderStatusPill(row.mandatoryDayStatus || "not_mandatory") + "</td>",
          "</tr>"
        ].join("");
      }).join(""),
      "    </tbody>",
      "  </table>",
      "</div>"
    ].join("");
  }

  function renderSharedIssuesSection(issues) {
    if (!(issues || []).length) {
      return "";
    }
    return '<div class="perf-text-block">' + issues.map(function (item) {
      return '<div><strong>' + escapeHtml(item.issueType || "-") + ":</strong> " + escapeHtml(item.message || "-") + "</div>";
    }).join("") + "</div>";
  }

  function renderSharedAuditSection(events) {
    if (!(events || []).length) {
      return "";
    }
    return '<div class="perf-text-block">' + events.slice(0, 8).map(function (item) {
      return '<div>' + escapeHtml([item.action || "-", item.createdAt || item.timestamp || ""].join(" @ ")) + "</div>";
    }).join("") + "</div>";
  }

  function runRecalculation() {
    try {
      var context = getOrganizationContext();
      var scope = {
        city: context.cityScope === "single" && context.selectedCities && context.selectedCities.length === 1 ? context.selectedCities[0] : "",
        register: context.registerScope === "single" && context.selectedRegisters && context.selectedRegisters.length === 1 ? context.selectedRegisters[0] : "",
        platform: "keeta",
        month: state.month || pickDefaultMonth()
      };
      var summary = service.runPerformanceRecalculationForScope(scope, getCurrentUser());
      toast("\u062a\u0645\u062a \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062d\u0633\u0627\u0628: " + String(summary.monthlyRowsCalculated || 0) + " monthly rows.", "success");
      renderPage();
    } catch (error) {
      toast(error.message || "\u062a\u0639\u0630\u0631 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062d\u0633\u0627\u0628.", "error");
    }
  }

  function exportCurrentResults() {
    try {
      var rows = service.listValidityResults(getFilters(), getCurrentUser(), getOrganizationContext());
      var csvRows = [[
        "userId",
        "riderId",
        "iqama",
        "city",
        "register",
        "month",
        "status",
        "salaryEligibilityStatus",
        "incentiveEligibilityStatus",
        "fallbackUsed"
      ].join(",")];

      rows.forEach(function (item) {
        csvRows.push([
          csvCell(item.userId || item.dashboardUserId || ""),
          csvCell(item.riderId || ""),
          csvCell(item.iqama || ""),
          csvCell(item.city || ""),
          csvCell(item.register || ""),
          csvCell(item.month || ""),
          csvCell(item.status || ""),
          csvCell(item.salaryEligibilityStatus || ""),
          csvCell(item.incentiveEligibilityStatus || ""),
          csvCell(item.fallbackUsed ? "yes" : "no")
        ].join(","));
      });

      var blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "performance_validity_results.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 0);
    } catch (error) {
      toast(error.message || "\u062a\u0639\u0630\u0631 \u0627\u0644\u062a\u0635\u062f\u064a\u0631.", "error");
    }
  }

  function pickDefaultMonth() {
    var candidates = [];
    readMonths("validityResults", candidates);
    readMonths("performanceDaily", candidates);
    readMonths("performanceMonthly", candidates);
    candidates = candidates.filter(Boolean).sort();
    return candidates.length ? candidates[candidates.length - 1] : new Date().toISOString().slice(0, 7);
  }

  function readMonths(entityName, list) {
    try {
      var rows = runtime.dataStore && typeof runtime.dataStore.getAll === "function"
        ? runtime.dataStore.getAll(entityName)
        : [];
      rows.forEach(function (row) {
        if (row && row.month) {
          list.push(String(row.month));
        }
      });
    } catch (_error) {
      // Ignore read failures for default month detection.
    }
  }

  function getCurrentUser() {
    return runtime.auth && typeof runtime.auth.getCurrentUser === "function"
      ? runtime.auth.getCurrentUser()
      : null;
  }

  function getOrganizationContext() {
    return Portal.OrganizationContext && typeof Portal.OrganizationContext.getState === "function"
      ? Portal.OrganizationContext.getState()
      : {
          cityScope: "all",
          selectedCities: [],
          registerScope: "all",
          selectedRegisters: [],
          selectedDashboards: [],
          workMode: "all"
        };
  }

  function getFilters() {
    return {
      issueSeverity: state.issueSeverity,
      mandatoryStatus: state.mandatoryStatus,
      month: state.month,
      query: state.query,
      validityStatus: state.validityStatus,
      vehicleType: state.vehicleType
    };
  }

  function safeList(loader) {
    try {
      return {
        error: "",
        rows: loader() || []
      };
    } catch (error) {
      return {
        error: error && error.message ? error.message : String(error),
        rows: []
      };
    }
  }

  function canCurrentUser(permission) {
    var user = getCurrentUser();
    return !!(user && Portal.RBAC && typeof Portal.RBAC.canPerform === "function" && Portal.RBAC.canPerform(user, permission));
  }

  function summarizeContext(context) {
    var cities = !context || !context.cityScope || context.cityScope === "all"
      ? "\u0643\u0644 \u0627\u0644\u0645\u062f\u0646"
      : (context.selectedCities || []).join(" / ");
    var registers = !context || !context.registerScope || context.registerScope === "all"
      ? "\u0643\u0644 \u0627\u0644\u0633\u062c\u0644\u0627\u062a"
      : (context.selectedRegisters || []).join(" / ");
    var workMode = context && context.workMode && context.workMode !== "all"
      ? context.workMode
      : "\u0643\u0644 \u0623\u0646\u0638\u0645\u0629 \u0627\u0644\u0639\u0645\u0644";
    return [cities, registers, workMode].join(" | ");
  }

  function getViewDefinition() {
    var views = {
      daily_performance: {
        eyebrow: "Daily Performance",
        shortLabel: "\u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u064a\u0648\u0645\u064a",
        subtitle: "\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629 \u0648\u0627\u0644\u062d\u0636\u0648\u0631 \u0648\u0627\u0644\u0623\u0647\u062f\u0627\u0641 \u0627\u0644\u064a\u0648\u0645\u064a\u0629 \u0644\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629.",
        title: "\u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u064a\u0648\u0645\u064a \u0648\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629"
      },
      overall_performance: {
        eyebrow: "Overall Performance",
        shortLabel: "\u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u0643\u0644\u064a",
        subtitle: "\u0639\u0631\u0636 \u0645\u0644\u062e\u0635 \u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u062a\u0631\u0627\u0643\u0645\u064a \u0644\u0644\u0634\u0647\u0631 \u0627\u0644\u062d\u0627\u0644\u064a \u0645\u0639 \u0627\u0644\u0625\u0633\u0642\u0627\u0637 \u0648\u0645\u0648\u0627\u0637\u0646 \u0627\u0644\u0636\u0639\u0641.",
        title: "\u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u0643\u0644\u064a \u0648\u0645\u0644\u062e\u0635 \u0627\u0644\u0634\u0647\u0631"
      },
      vda: {
        eyebrow: "VDA Review",
        shortLabel: "VDA",
        subtitle: "\u0645\u0631\u0627\u062c\u0639\u0629 \u062d\u0627\u0644\u0627\u062a VDA \u0648\u0623\u062b\u0631\u0647\u0627 \u0639\u0644\u0649 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629 \u0648\u0627\u0644\u062d\u0648\u0627\u0641\u0632.",
        title: "VDA \u0648\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629"
      },
      vda_keeta: {
        eyebrow: "VDA Keeta",
        shortLabel: "VDA_KEETA",
        subtitle: "\u062a\u0631\u0643\u064a\u0632 \u062e\u0627\u0635 \u0639\u0644\u0649 \u0633\u062c\u0644\u0627\u062a VDA \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0643\u064a\u062a\u0627.",
        title: "VDA Keeta"
      },
      face_verification: {
        eyebrow: "Face Verification",
        shortLabel: "\u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0648\u062c\u0647",
        subtitle: "\u0645\u062a\u0627\u0628\u0639\u0629 \u0646\u062a\u0627\u0626\u062c Face Verification \u0648\u062d\u0627\u0644\u0627\u062a \u0627\u0644\u0641\u0634\u0644 \u0623\u0648 \u0627\u0644\u0627\u0646\u0642\u0637\u0627\u0639.",
        title: "\u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0648\u062c\u0647"
      },
      delivery_experience: {
        eyebrow: "Delivery Experience",
        shortLabel: "\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644",
        subtitle: "\u0645\u0631\u0627\u062c\u0639\u0629 \u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644 \u0648\u0623\u062b\u0631 \u0627\u0644\u062a\u0642\u064a\u064a\u0645\u0627\u062a \u0639\u0644\u0649 \u0627\u0644\u0623\u0647\u0644\u064a\u0629.",
        title: "\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u062a\u0648\u0635\u064a\u0644"
      },
      issues: {
        eyebrow: "Follow-up Queue",
        shortLabel: "\u064a\u062d\u062a\u0627\u062c \u0645\u062a\u0627\u0628\u0639\u0629",
        subtitle: "\u0639\u0631\u0636 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0634\u0627\u0643\u0644 \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629 \u0648\u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062a \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.",
        title: "\u0637\u0627\u0628\u0648\u0631 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629"
      }
    };
    return views[state.activeView] || views.daily_performance;
  }

  function renderErrorPanel(message) {
    return [
      '<section class="perf-surface perf-error-panel">',
      '  <h3>\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0627\u062f\u0627\u0621</h3>',
      "  <p>" + escapeHtml(message || "\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639.") + "</p>",
      "</section>"
    ].join("");
  }

  function renderKpiCard(label, value, tone) {
    return [
      '<article class="perf-kpi perf-kpi--' + escapeHtml(tone) + '">',
      '  <span class="perf-kpi__label">' + escapeHtml(label) + "</span>",
      '  <strong class="perf-kpi__value">' + escapeHtml(String(value)) + "</strong>",
      "</article>"
    ].join("");
  }

  function renderTab(tabId, label) {
    var activeClass = state.activeTab === tabId ? " is-active" : "";
    return '<button class="perf-tab' + activeClass + '" data-performance-tab="' + escapeHtml(tabId) + '">' + escapeHtml(label) + "</button>";
  }

  function renderInputField(key, label, type, value) {
    return [
      '<label class="perf-field">',
      "  <span>" + escapeHtml(label) + "</span>",
      '  <input type="' + escapeHtml(type) + '" value="' + escapeHtml(value || "") + '" data-performance-filter="' + escapeHtml(key) + '">',
      "</label>"
    ].join("");
  }

  function renderSearchField(key, label, value, placeholder) {
    return [
      '<label class="perf-field perf-field--wide">',
      "  <span>" + escapeHtml(label) + "</span>",
      '  <input type="search" value="' + escapeHtml(value || "") + '" placeholder="' + escapeHtml(placeholder || "") + '" data-performance-filter="' + escapeHtml(key) + '">',
      "</label>"
    ].join("");
  }

  function renderSelectField(key, label, value, options) {
    return [
      '<label class="perf-field">',
      "  <span>" + escapeHtml(label) + "</span>",
      '  <select data-performance-filter="' + escapeHtml(key) + '">',
      (options || []).map(function (option) {
        return '<option value="' + escapeHtml(option[0]) + '"' + (option[0] === value ? " selected" : "") + ">" + escapeHtml(option[1]) + "</option>";
      }).join(""),
      "  </select>",
      "</label>"
    ].join("");
  }

  function renderProjectionCell(summary) {
    if (!summary || !summary.message) {
      return '<span class="perf-muted">-</span>';
    }
    return [
      '<div class="perf-projection">',
      renderStatusPill(summary.canStillQualify ? "possible" : "unlikely"),
      '<span class="perf-projection__meta">' + escapeHtml(String(summary.projectedOrders || 0)) + " / " + escapeHtml(String(summary.projectedValidDays || 0)) + "</span>",
      "</div>"
    ].join("");
  }

  function renderStatusPill(status) {
    var normalized = String(status || "").toLowerCase();
    var tone = "neutral";
    if (/(eligible|valid|pass|met|success|possible)/.test(normalized)) {
      tone = "success";
    } else if (/(not_eligible|invalid|fail|missed|critical|danger|unlikely)/.test(normalized)) {
      tone = "danger";
    } else if (/(under_review|warning|medium|low|no_data)/.test(normalized)) {
      tone = "warning";
    }
    return '<span class="perf-pill perf-pill--' + tone + '">' + escapeHtml(status || "-") + "</span>";
  }

  function renderDetailCell(label, htmlValue) {
    return [
      '<div class="perf-detail-cell">',
      '  <span class="perf-detail-cell__label">' + escapeHtml(label) + "</span>",
      '  <div class="perf-detail-cell__value">' + htmlValue + "</div>",
      "</div>"
    ].join("");
  }

  function renderTextBlock(text) {
    return '<div class="perf-text-block">' + escapeHtml(text || "-") + "</div>";
  }

  function resultField(label, value, ltr) {
    return {
      label: label,
      ltr: !!ltr,
      value: value == null || value === "" ? "-" : String(value)
    };
  }

  function toneForStatus(status) {
    var normalized = String(status || "").toLowerCase();
    if (/(eligible|valid|pass|met|success|possible)/.test(normalized)) {
      return "success";
    }
    if (/(not_eligible|invalid|fail|missed|critical|danger|unlikely)/.test(normalized)) {
      return "danger";
    }
    if (/(under_review|warning|medium|low|no_data)/.test(normalized)) {
      return "warning";
    }
    return "";
  }

  function renderEmptyRow(colspan, message) {
    return '<tr><td class="perf-empty-cell" colspan="' + String(colspan) + '">' + escapeHtml(message) + "</td></tr>";
  }

  function countBy(rows, key, expectedValue) {
    return countWhere(rows, function (row) {
      return String(row && row[key] || "") === expectedValue;
    });
  }

  function countWhere(rows, predicate) {
    return (rows || []).filter(predicate).length;
  }

  function firstValue() {
    var index = 0;
    while (index < arguments.length) {
      if (arguments[index] != null && arguments[index] !== "") {
        return arguments[index];
      }
      index += 1;
    }
    return "";
  }

  function csvCell(value) {
    return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
  }

  function closest(node, selector) {
    while (node && node !== document) {
      if (node.matches && node.matches(selector)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toast(message, type) {
    var stack = document.getElementById("uiToastStack");
    if (!stack) {
      return;
    }
    var item = document.createElement("div");
    item.className = "ui-toast " + (type || "info");
    item.textContent = message;
    stack.appendChild(item);
    window.setTimeout(function () {
      item.remove();
    }, 2400);
  }

  function copyText(value) {
    var text = String(value || "");
    if (!text) {
      return;
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).catch(function () {
        fallbackCopyText(text);
      });
      return;
    }
    fallbackCopyText(text);
  }

  function fallbackCopyText(text) {
    var input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "readonly");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand("copy");
    } catch (_error) {
      // Ignore clipboard fallback failures.
    }
    input.remove();
  }

  function injectStyles() {
    if (document.getElementById("prompt7PerformanceStyles")) {
      return;
    }

    var style = document.createElement("style");
    style.id = "prompt7PerformanceStyles";
    style.textContent = [
      ".perf-shell-root{display:grid;gap:18px}",
      ".perf-surface{background:rgba(14,24,39,.84);border:1px solid rgba(196,167,106,.18);border-radius:24px;padding:20px;color:#f8fafc;box-shadow:0 24px 60px rgba(15,23,42,.18)}",
      ".perf-toolbar{display:grid;gap:16px}",
      ".perf-toolbar__head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}",
      ".perf-toolbar__titles{display:grid;gap:8px}",
      ".perf-eyebrow{display:inline-flex;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#c4a76a}",
      ".perf-title{margin:0;font-size:28px;line-height:1.2;color:#fff}",
      ".perf-subtitle{margin:0;color:#cbd5e1;max-width:920px;line-height:1.8}",
      ".perf-toolbar__actions{display:flex;gap:10px;flex-wrap:wrap}",
      ".perf-toolbar__meta{display:flex;gap:10px;flex-wrap:wrap}",
      ".perf-chip{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:999px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.14);color:#e2e8f0;font-size:12px}",
      ".perf-chip--danger{background:rgba(127,29,29,.28);border-color:rgba(248,113,113,.28);color:#fecaca}",
      ".perf-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}",
      ".perf-field{display:grid;gap:6px}",
      ".perf-field span{font-size:12px;color:#dbe7f3}",
      ".perf-field input,.perf-field select{border-radius:14px;border:1px solid rgba(148,163,184,.22);background:rgba(8,15,27,.64);color:#fff;padding:12px 14px;min-height:46px}",
      ".perf-field--wide{grid-column:span 2}",
      ".perf-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px}",
      ".perf-kpi{padding:16px;border-radius:18px;background:rgba(8,15,27,.72);border:1px solid rgba(148,163,184,.12);display:grid;gap:6px}",
      ".perf-kpi--success{border-color:rgba(34,197,94,.28)}",
      ".perf-kpi--danger{border-color:rgba(248,113,113,.34)}",
      ".perf-kpi--warning{border-color:rgba(245,158,11,.34)}",
      ".perf-kpi__label{color:#cbd5e1;font-size:12px}",
      ".perf-kpi__value{font-size:28px;line-height:1;color:#fff}",
      ".perf-tabs{display:flex;gap:10px;flex-wrap:wrap}",
      ".perf-tab{border:1px solid rgba(148,163,184,.18);background:rgba(8,15,27,.58);color:#dbe7f3;border-radius:999px;padding:10px 16px;cursor:pointer}",
      ".perf-tab.is-active{background:#c4a76a;color:#111827;border-color:#c4a76a}",
      ".perf-table-wrap{overflow:auto}",
      ".perf-table{width:100%;border-collapse:collapse;min-width:1100px}",
      ".perf-table th,.perf-table td{padding:12px 10px;border-bottom:1px solid rgba(148,163,184,.12);text-align:right;vertical-align:top}",
      ".perf-table th{font-size:12px;color:#cbd5e1;text-transform:uppercase;letter-spacing:.05em}",
      ".perf-table td{font-size:13px;color:#f8fafc}",
      ".perf-pill{display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;border-radius:999px;font-size:11px;text-transform:capitalize;background:rgba(148,163,184,.16);color:#e2e8f0;white-space:nowrap}",
      ".perf-pill--success{background:rgba(34,197,94,.18);color:#bbf7d0}",
      ".perf-pill--danger{background:rgba(248,113,113,.18);color:#fecaca}",
      ".perf-pill--warning{background:rgba(245,158,11,.18);color:#fde68a}",
      ".perf-simple-pill{display:inline-flex;align-items:center;justify-content:center;padding:5px 10px;border-radius:999px;background:rgba(148,163,184,.12);font-size:11px;color:#e2e8f0}",
      ".perf-simple-pill--danger{background:rgba(248,113,113,.18);color:#fecaca}",
      ".perf-simple-pill--gold{background:rgba(196,167,106,.18);color:#fde68a}",
      ".perf-status-stack{display:grid;gap:6px}",
      ".perf-status-reason{font-size:11px;color:#cbd5e1;line-height:1.6;max-width:260px}",
      ".perf-mini-btn{padding:8px 12px;font-size:12px}",
      ".perf-projection{display:grid;gap:6px}",
      ".perf-projection__meta{font-size:11px;color:#cbd5e1}",
      ".perf-muted{color:#94a3b8}",
      ".perf-empty-cell{text-align:center;color:#94a3b8;padding:22px 12px}",
      ".perf-error-panel h3{margin:0 0 8px;color:#fff}",
      ".perf-error-panel p{margin:0;color:#fecaca;line-height:1.8}",
      ".perf-drawer-backdrop{position:fixed;inset:0;background:rgba(2,6,23,.56);z-index:var(--ui-layer-overlay-drawer, 520)}",
      ".perf-drawer{position:fixed;inset:0 auto 0 0;width:min(620px,100vw);background:#0f172a;border-right:1px solid rgba(196,167,106,.22);z-index:var(--ui-layer-drawer, 540);display:grid;grid-template-rows:auto 1fr;box-shadow:28px 0 80px rgba(2,6,23,.45)}",
      ".perf-drawer__head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:20px;border-bottom:1px solid rgba(148,163,184,.12)}",
      ".perf-drawer__title{margin:6px 0 0;color:#fff}",
      ".perf-drawer__body{overflow:auto;padding:20px;display:grid;gap:16px}",
      ".perf-drawer-section{display:grid;gap:10px}",
      ".perf-drawer-section h4{margin:0;color:#fff}",
      ".perf-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}",
      ".perf-detail-cell{padding:12px;border-radius:16px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.12)}",
      ".perf-detail-cell__label{display:block;margin-bottom:6px;font-size:11px;color:#94a3b8}",
      ".perf-detail-cell__value{font-size:13px;color:#fff;line-height:1.6}",
      ".perf-text-block{padding:14px;border-radius:16px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.1);color:#e2e8f0;line-height:1.8;white-space:pre-wrap}",
      "@media (max-width: 980px){.perf-field--wide{grid-column:span 1}.perf-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.perf-toolbar__head{flex-direction:column}}",
      "@media (max-width: 640px){.perf-title{font-size:24px}.perf-drawer{width:100vw}.perf-detail-grid{grid-template-columns:1fr}}"
    ].join("");

    document.head.appendChild(style);
  }
})();
