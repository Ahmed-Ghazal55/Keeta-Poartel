(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  var Portal = window.KeetaPortal;
  if (
    !Portal ||
    !Portal.Runtime ||
    !Portal.RBAC ||
    !Portal.ImportTypes ||
    !Portal.MonthlyRulesDefaults ||
    !Portal.MonthlyRulesPreview ||
    !Portal.MonthlyRulesService
  ) {
    return;
  }

  var runtime = Portal.Runtime;
  var RBAC = Portal.RBAC;
  var ImportTypes = Portal.ImportTypes;
  var Defaults = Portal.MonthlyRulesDefaults;
  var Preview = Portal.MonthlyRulesPreview;
  var PageRenderController = Portal.PageRenderController || null;
  var bootModeState = Portal.BootMode && typeof Portal.BootMode.getState === "function"
    ? Portal.BootMode.getState()
    : { safeMode: false };
  var service = runtime.monthlyRulesService || Portal.MonthlyRulesService.createMonthlyRulesService({
    auditLog: runtime.auditLog,
    dataStore: runtime.dataStore,
    rbac: RBAC
  });

  runtime.monthlyRulesService = service;
  document.body.dataset.monthlyRulesExtensionMode = "prompt6";

  var state = {
    activeTab: "settings",
    draft: null,
    routeFocus: "",
    selectedRuleId: "",
    validation: null,
    filters: {
      search: "",
      status: "all"
    }
  };
  var pageController = PageRenderController && typeof PageRenderController.createPageRenderController === "function"
    ? PageRenderController.createPageRenderController({
        debounceMs: 100,
        onRender: renderPage,
        pageId: "monthly-rules-shell"
      })
    : null;

  if (bootModeState.safeMode) {
    return;
  }

  injectStyles();
  bootstrap();

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

  function bootstrap() {
    document.addEventListener("click", handleClick);
    document.addEventListener("input", handleInput);
    document.addEventListener("change", handleChange);
    document.addEventListener("keeta:shell-route-change", handleShellRouteChange);
    window.addEventListener("keeta:data-changed", function () {
      scheduleRender("data", 120);
    });
    if (Portal.OrganizationContext && typeof Portal.OrganizationContext.subscribe === "function") {
      Portal.OrganizationContext.subscribe(function () {
        scheduleRender("organization", 80);
      });
    }
    if (runtime.auth && typeof runtime.auth.subscribe === "function") {
      runtime.auth.subscribe(function () {
        state.selectedRuleId = "";
        state.validation = null;
        state.draft = null;
        scheduleRender("auth", 80);
      });
    }
    scheduleRender("init", 40);
  }

  function handleClick(event) {
    var tabButton = event.target.closest("[data-rules-tab]");
    if (tabButton) {
      state.activeTab = tabButton.getAttribute("data-rules-tab") || "settings";
      scheduleRender("tab", 0);
      return;
    }

    var ruleButton = event.target.closest("[data-select-rule-id]");
    if (ruleButton) {
      state.selectedRuleId = ruleButton.getAttribute("data-select-rule-id") || "";
      state.validation = null;
      state.draft = buildDraftFromRule(findRule(state.selectedRuleId));
      scheduleRender("rule_select", 0);
      return;
    }

    var actionButton = event.target.closest("[data-rules-action]");
    if (actionButton) {
      handleAction(actionButton.getAttribute("data-rules-action") || "");
      return;
    }

    var collectionRemoveButton = event.target.closest("[data-rules-remove-value]");
    if (collectionRemoveButton) {
      if (!isDraftEditable()) {
        renderPage();
        return;
      }
      removeArrayValue(
        collectionRemoveButton.getAttribute("data-rules-remove-path") || "",
        collectionRemoveButton.getAttribute("data-rules-remove-value") || ""
      );
      renderPage();
      return;
    }

    var tierActionButton = event.target.closest("[data-tier-action]");
    if (tierActionButton) {
      if (!isDraftEditable()) {
        renderPage();
        return;
      }
      handleTierAction(
        tierActionButton.getAttribute("data-tier-action") || "",
        tierActionButton.getAttribute("data-tier-kind") || "",
        tierActionButton.getAttribute("data-tier-index") || ""
      );
      renderPage();
      return;
    }

    var focusButton = event.target.closest("[data-rules-focus]");
    if (focusButton) {
      state.routeFocus = focusButton.getAttribute("data-rules-focus") || "";
      renderPage();
    }
  }

  function handleShellRouteChange(event) {
    var route = event && event.detail ? event.detail : {};
    if (String(route.page || "") !== "monthly-rules-shell") {
      return;
    }
    applyShellRoute(route.subPage);
    scheduleRender("route", 40);
  }

  function applyShellRoute(subPage) {
    var key = String(subPage || "").toLowerCase();
    if (!key) {
      return;
    }
    if (key === "settings" || key === "monthly-rules") {
      state.activeTab = "settings";
      state.routeFocus = "";
      return;
    }
    if (key === "mandatory" || key === "mandatory-days") {
      state.activeTab = "mandatory";
      state.routeFocus = "mandatory";
      return;
    }
    if (key === "incentives_cars" || key === "car-incentives") {
      state.activeTab = "incentives";
      state.routeFocus = "car";
      return;
    }
    if (key === "incentives_bikes" || key === "bike-incentives") {
      state.activeTab = "incentives";
      state.routeFocus = "bike";
      return;
    }
    if (key === "quality" || key === "ata-cancellation") {
      state.activeTab = "quality";
      state.routeFocus = "ata";
      return;
    }
    if (key === "validity") {
      state.activeTab = "validity";
      state.routeFocus = "";
      return;
    }
    if (key === "vehicles") {
      state.activeTab = "vehicles";
      state.routeFocus = "";
      return;
    }
    if (key === "compliance") {
      state.activeTab = "compliance";
      state.routeFocus = "";
      return;
    }
    if (key === "preview") {
      state.activeTab = "preview";
      state.routeFocus = "";
      return;
    }
    if (key === "history") {
      state.activeTab = "history";
      state.routeFocus = "";
    }
  }

  function handleInput(event) {
    if (!event.target) {
      return;
    }
    if (event.target.id === "monthlyRulesSearch") {
      state.filters.search = event.target.value || "";
      scheduleRender("search", 140);
      return;
    }
    if (event.target.id === "monthlyRulesStatusFilter") {
      state.filters.status = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.hasAttribute("data-rule-path")) {
      if (!isDraftEditable()) {
        renderPage();
        return;
      }
      updateDraftPathFromField(event.target);
    }
    if (event.target.hasAttribute("data-rule-list-path")) {
      if (!isDraftEditable()) {
        renderPage();
        return;
      }
      setDraftPath(
        event.target.getAttribute("data-rule-list-path"),
        parseListInput(event.target.value)
      );
    }
  }

  function handleChange(event) {
    if (!event.target) {
      return;
    }
    if (event.target.hasAttribute("data-rule-path")) {
      if (!isDraftEditable()) {
        renderPage();
        return;
      }
      updateDraftPathFromField(event.target);
      if (event.target.getAttribute("data-render-on-change") === "true") {
        renderPage();
      }
      return;
    }
    if (event.target.hasAttribute("data-rule-collection")) {
      if (!isDraftEditable()) {
        renderPage();
        return;
      }
      updateDraftCollection(
        event.target.getAttribute("data-rule-collection"),
        event.target.value,
        event.target.checked
      );
      renderPage();
      return;
    }
    if (event.target.id === "monthlyRulesImportInput") {
      importFromFile(event.target.files && event.target.files[0]);
    }
  }

  function handleAction(action) {
    var user = getCurrentUser();
    var selectedRule = findRule(state.selectedRuleId);
    var persisted;
    var result;

    try {
      if (action === "new") {
        state.selectedRuleId = "";
        state.validation = null;
        state.draft = buildDraftFromContext();
        renderPage();
        return;
      }

      if (action === "reset") {
        state.validation = null;
        state.draft = state.selectedRuleId ? buildDraftFromRule(selectedRule) : buildDraftFromContext();
        renderPage();
        return;
      }

      if (action === "validate") {
        ensureDraft();
        state.validation = service.validateMonthlyRules(state.draft, {
          existingRules: service.listMonthlyRules(),
          mode: "draft",
          user: user
        });
        renderPage();
        toast(state.validation.isValid ? "المسودة سليمة وجاهزة للمراجعة." : "تم العثور على ملاحظات على المسودة.", state.validation.isValid ? "success" : "error");
        return;
      }

      if (action === "save") {
        persisted = persistDraft(user);
        state.selectedRuleId = persisted.id;
        state.draft = buildDraftFromRule(persisted);
        state.validation = service.validateMonthlyRules(persisted, {
          existingRules: service.listMonthlyRules(),
          mode: "draft",
          user: user
        });
        notifyRuleDataChanged("monthly_rules_saved");
        renderPage();
        toast("تم حفظ المسودة بنجاح.", "success");
        return;
      }

      if (action === "activate") {
        persisted = persistDraft(user);
        result = service.activateMonthlyRules(persisted.id, user);
        state.selectedRuleId = result.id;
        state.validation = service.validateMonthlyRules(result, {
          existingRules: service.listMonthlyRules(),
          mode: "activate",
          user: user
        });
        state.draft = buildDraftFromRule(result);
        notifyRuleDataChanged("monthly_rules_activated");
        renderPage();
        toast("تم تفعيل القاعدة الشهرية.", "success");
        return;
      }

      if (action === "clone") {
        persisted = ensurePersistedSelectedRule(user);
        result = service.cloneMonthlyRules(persisted.id, nextMonthKey(persisted.month || currentMonthKey()), user);
        state.selectedRuleId = result.id;
        state.draft = buildDraftFromRule(result);
        state.validation = null;
        notifyRuleDataChanged("monthly_rules_cloned");
        renderPage();
        toast("تم إنشاء نسخة للشهر التالي كمسودة جديدة.", "success");
        return;
      }

      if (action === "lock") {
        persisted = ensurePersistedSelectedRule(user);
        result = service.lockMonthlyRules(persisted.id, user);
        state.selectedRuleId = result.id;
        state.draft = buildDraftFromRule(result);
        state.validation = null;
        notifyRuleDataChanged("monthly_rules_locked");
        renderPage();
        toast("تم قفل القاعدة الشهرية.", "success");
        return;
      }

      if (action === "unlock") {
        persisted = ensurePersistedSelectedRule(user);
        result = service.unlockMonthlyRules(persisted.id, user);
        state.selectedRuleId = result.id;
        state.draft = buildDraftFromRule(result);
        state.validation = null;
        notifyRuleDataChanged("monthly_rules_unlocked");
        renderPage();
        toast("تم فتح القاعدة الشهرية للتعديل.", "success");
        return;
      }

      if (action === "archive") {
        persisted = ensurePersistedSelectedRule(user);
        result = service.archiveMonthlyRules(persisted.id, user);
        state.selectedRuleId = result.id;
        state.draft = buildDraftFromRule(result);
        state.validation = null;
        notifyRuleDataChanged("monthly_rules_archived");
        renderPage();
        toast("تمت أرشفة القاعدة الشهرية.", "success");
        return;
      }

      if (action === "export") {
        persisted = ensurePersistedSelectedRule(user);
        downloadJson(
          "monthly-rules-" + persisted.month + "-" + buildScopeSlug(persisted) + ".json",
          service.exportMonthlyRules(persisted.id, user)
        );
        toast("تم تجهيز ملف JSON للتصدير.", "success");
        return;
      }

      if (action === "import") {
        var input = document.getElementById("monthlyRulesImportInput");
        if (input) {
          input.value = "";
          input.click();
        }
        return;
      }

      if (action === "compare") {
        openCompareDrawer();
        return;
      }

      if (action === "copy-preview") {
        copyPreviewText();
        return;
      }

      if (action === "confirm-add-mandatory-date") {
        ensureEditable();
        addMandatoryDateFromInput();
        renderPage();
      }
    } catch (error) {
      toast(error && error.message ? error.message : "تعذر تنفيذ العملية المطلوبة.", "error");
    }
  }

  function renderPage() {
    var page = document.getElementById("page-monthly-rules-shell");
    var user = getCurrentUser();
    var context = getScopedOrganizationContext();
    var model;

    if (!page) {
      return;
    }

    if (user && !RBAC.canPerform(user, "monthlyRules.view")) {
      page.innerHTML = renderEmptyState("لا تملك صلاحية الوصول إلى صفحة الشروط الشهرية في الجلسة الحالية.");
      return;
    }

    model = buildModel(user, context);
    page.innerHTML = renderLayout(model);
    if (Portal.UIShell && typeof Portal.UIShell.enhanceTables === "function") {
      Portal.UIShell.enhanceTables(page);
    }
  }

  function buildModel(user, context) {
    var allRules = service.listMonthlyRules();
    var visibleRules = filterVisibleRules(allRules, user, context);
    var selectedRule = findRule(state.selectedRuleId);
    var selectedVisibleRule = visibleRules.filter(function (item) {
      return String(item.id || "") === String(state.selectedRuleId || "");
    })[0] || null;
    var unsavedDraftMode = isUnsavedDraft(state.draft) && !state.selectedRuleId;
    var currentRule = unsavedDraftMode ? null : (selectedVisibleRule || visibleRules[0] || selectedRule || null);
    var shouldResetDraft = !state.draft;
    var availableCities = listCityOptions();
    var availableRegisters = listRegisterOptions(context.selectedCities);
    if (!unsavedDraftMode && !state.selectedRuleId && currentRule) {
      state.selectedRuleId = currentRule.id;
      shouldResetDraft = true;
    }
    if (!unsavedDraftMode && state.selectedRuleId && !findRule(state.selectedRuleId) && currentRule) {
      state.selectedRuleId = currentRule.id;
      shouldResetDraft = true;
    }
    if (!unsavedDraftMode && currentRule && state.selectedRuleId && String(currentRule.id || "") !== String(state.selectedRuleId || "")) {
      state.selectedRuleId = currentRule.id;
      shouldResetDraft = true;
    }
    if (shouldResetDraft) {
      state.draft = currentRule ? buildDraftFromRule(currentRule) : buildDraftFromContext();
    }
    var preview = Preview.buildMonthlyRulesPreview(ensureDraftOrRule(currentRule));
    var audits = listRuleAudits(currentRule, allRules);
    var relatedVersions = listRelatedVersions(currentRule, allRules);
    var summary = summarizeRules(visibleRules, currentRule);
    var validation = state.validation;
    var readOnly = !isDraftEditable();
    var tabOptions = getTabOptions(user);
    var activeTab = tabOptions.some(function (item) { return item.id === state.activeTab; })
      ? state.activeTab
      : tabOptions[0].id;

    state.activeTab = activeTab;

    return {
      activeTab: activeTab,
      audits: audits,
      availableCities: availableCities,
      availableRegisters: availableRegisters,
      canActivate: !!user && RBAC.canPerform(user, "monthlyRules.activate"),
      canArchive: !!user && RBAC.canPerform(user, "monthlyRules.archive"),
      canCreate: !!user && RBAC.canPerform(user, "monthlyRules.create"),
      canEdit: !!user && RBAC.canPerform(user, "monthlyRules.edit"),
      canExport: !!user && RBAC.canPerform(user, "monthlyRules.export"),
      canImport: !!user && RBAC.canPerform(user, "monthlyRules.import"),
      canLock: !!user && RBAC.canPerform(user, "monthlyRules.lock"),
      canUnlock: !!user && RBAC.canPerform(user, "monthlyRules.unlock"),
      context: context,
      currentRule: currentRule,
      currentStatus: currentRule ? String(currentRule.status || "draft") : "draft",
      draft: ensureDraft(),
      hasUnsavedDraft: unsavedDraftMode,
      isDirty: !!currentRule && isRuleDirty(currentRule, ensureDraft()),
      preview: preview,
      readOnly: readOnly,
      relatedVersions: relatedVersions,
      routeFocus: state.routeFocus || "",
      summary: summary,
      tabOptions: tabOptions,
      user: user,
      validation: validation,
      visibleRules: applyListFilters(visibleRules)
    };
  }

  function renderLayout(model) {
    return [
      '<section class="ui-shell-card monthly-rules-shell">',
      renderHeader(model),
      renderKpis(model),
      '<div class="monthly-rules-layout">',
      renderRuleList(model),
      renderEditor(model),
      '</div>',
      '<input type="file" id="monthlyRulesImportInput" accept="application/json,.json" hidden>',
      '</section>'
    ].join("");
  }

  function renderHeader(model) {
    var contextSummary = buildContextSummary(model.context);
    var draft = model.draft;
    return [
      '<div class="ui-shell-card__head monthly-rules-head">',
      '  <div>',
      '    <h3>Monthly Rules Manager</h3>',
      '    <p>إدارة سياسة التشغيل الشهرية لكل شهر ومدينة وسجل مع نسخ versions وتفعيل وقفل وتدقيق كامل.</p>',
      '  </div>',
      '  <div class="monthly-rules-scope">',
      '    <strong>النطاق الحالي</strong>',
      '    <span>' + escapeHtml(contextSummary.summaryLine) + '</span>',
      '    <small>' + escapeHtml(draft.month || currentMonthKey()) + ' / ' + escapeHtml(platformLabel(draft.platform)) + '</small>',
      '  </div>',
      '</div>',
      '<div class="monthly-rules-toolbar">',
      '  <div class="monthly-rules-toolbar__search">',
      '    <input id="monthlyRulesSearch" class="monthly-field__input" type="search" placeholder="بحث بالشهر أو المدينة أو السجل أو الملاحظات" value="' + escapeHtml(state.filters.search) + '">',
      '  </div>',
      '  <div class="monthly-rules-toolbar__filters">',
      '    <select id="monthlyRulesStatusFilter" class="monthly-field__input">',
      renderOption("all", "كل الحالات", state.filters.status),
      renderOption("draft", "Draft", state.filters.status),
      renderOption("active", "Active", state.filters.status),
      renderOption("locked", "Locked", state.filters.status),
      renderOption("archived", "Archived", state.filters.status),
      '    </select>',
      '  </div>',
      '  <div class="monthly-rules-toolbar__actions">',
      renderActionButton("new", "Rule جديدة", model.canCreate, "secondary"),
      renderActionButton("save", "Save Draft", model.canEdit || model.canCreate, "primary"),
      renderActionButton("validate", "Validate", true, "ghost"),
      renderActionButton("activate", "Activate", model.canActivate, "success"),
      renderActionButton("clone", "Clone للشهر التالي", model.canCreate, "ghost"),
      renderActionButton("lock", "Lock Month", model.canLock, "ghost"),
      renderActionButton("unlock", "Unlock", model.canUnlock, "ghost"),
      renderActionButton("archive", "Archive", model.canArchive, "danger"),
      renderActionButton("export", "Export JSON", model.canExport, "ghost"),
      renderActionButton("import", "Import JSON", model.canImport, "ghost"),
      renderActionButton("compare", "Compare Versions", !!model.currentRule, "ghost"),
      renderActionButton("reset", "Reset to Defaults", model.canEdit || model.canCreate, "secondary"),
      '  </div>',
      '</div>',
      renderValidationBanner(model.validation),
      renderModeBanner(model)
    ].join("");
  }

  function renderKpis(model) {
    return [
      '<div class="monthly-rules-kpis">',
      renderKpiCard("الشهر الحالي", model.draft.month || currentMonthKey(), "MR-01"),
      renderKpiCard("Active Rules", String(model.summary.activeCount), "MR-02"),
      renderKpiCard("Draft Rules", String(model.summary.draftCount), "MR-03"),
      renderKpiCard("Locked Months", String(model.summary.lockedCount), "MR-04"),
      renderKpiCard("آخر تعديل", model.summary.lastUpdatedLabel, "MR-05"),
      renderKpiCard("Needs Review", String(model.summary.needsReviewCount), "MR-06"),
      renderKpiCard("المدن المغطاة", String(model.summary.coveredCitiesCount), "MR-07"),
      renderKpiCard("السجلات المغطاة", String(model.summary.coveredRegistersCount), "MR-08"),
      '</div>'
    ].join("");
  }

  function renderRuleList(model) {
    var items = model.visibleRules.map(function (rule) {
      var isSelected = String(rule.id || "") === String(model.currentRule && model.currentRule.id || "");
      var preview = Preview.buildMonthlyRulesPreview(rule);
      return [
        '<button type="button" class="monthly-rule-list__item' + (isSelected ? ' is-selected' : '') + '" data-select-rule-id="' + escapeHtml(rule.id) + '">',
        '  <div class="monthly-rule-list__item-head">',
        '    <strong>' + escapeHtml(rule.month || "غير محدد") + '</strong>',
        '    <span class="monthly-status-pill monthly-status-pill--' + escapeHtml(String(rule.status || "draft")) + '">' + escapeHtml(String(rule.status || "draft")) + '</span>',
        '  </div>',
        '  <div class="monthly-rule-list__scope">' + escapeHtml(preview.title) + '</div>',
        '  <div class="monthly-rule-list__meta">',
        '    <span>V' + escapeHtml(String(rule.version || 1)) + '</span>',
        '    <span>' + escapeHtml(formatDateTime(rule.updatedAt)) + '</span>',
        '  </div>',
        '</button>'
      ].join("");
    }).join("");

    if (!items) {
      items = '<div class="monthly-empty-note">لا توجد قواعد مطابقة للنطاق الحالي. يمكنك إنشاء Rule جديدة من نفس الصفحة.</div>';
    }

    return [
      '<aside class="monthly-rule-list">',
      '  <div class="monthly-panel-title">',
      '    <h4>Rule Registry</h4>',
      '    <span>' + escapeHtml(String(model.visibleRules.length)) + ' Rule</span>',
      '  </div>',
      '  <div class="monthly-rule-list__items">',
      items,
      '  </div>',
      '</aside>'
    ].join("");
  }

  function renderEditor(model) {
    return [
      '<section class="monthly-editor">',
      renderEditorSummary(model),
      renderTabs(model),
      '<div class="monthly-editor__body">',
      renderTabBody(model),
      '</div>',
      '</section>'
    ].join("");
  }

  function renderEditorSummary(model) {
    var draft = model.draft;
    var summary = Preview.buildMonthlyRulesPreview(draft);
    return [
      '<div class="monthly-editor__summary">',
      '  <div>',
      '    <h4>' + escapeHtml(summary.title) + '</h4>',
      '    <p>' + escapeHtml((model.currentRule && model.currentRule.id) ? "Rule ID: " + model.currentRule.id : "مسودة جديدة غير محفوظة بعد") + '</p>',
      '  </div>',
      '  <div class="monthly-editor__summary-pills">',
      '    <span class="monthly-chip">Status: ' + escapeHtml(String(draft.status || "draft")) + '</span>',
      '    <span class="monthly-chip">Version: ' + escapeHtml(String(draft.version || 1)) + '</span>',
      '    <span class="monthly-chip">' + (model.isDirty ? "Unsaved changes" : "Saved state") + '</span>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderTabs(model) {
    return [
      '<div class="monthly-tabs">',
      model.tabOptions.map(function (tab) {
        return '<button type="button" class="monthly-tab' + (tab.id === model.activeTab ? ' is-active' : '') + '" data-rules-tab="' + escapeHtml(tab.id) + '">' + escapeHtml(tab.label) + '</button>';
      }).join(""),
      '</div>'
    ].join("");
  }

  function renderTabBody(model) {
    if (model.activeTab === "settings") {
      return renderSettingsTab(model);
    }
    if (model.activeTab === "validity") {
      return renderValidityTab(model);
    }
    if (model.activeTab === "mandatory") {
      return renderMandatoryTab(model);
    }
    if (model.activeTab === "vehicles") {
      return renderVehiclesTab(model);
    }
    if (model.activeTab === "incentives") {
      return renderIncentivesTab(model);
    }
    if (model.activeTab === "quality") {
      return renderQualityTab(model);
    }
    if (model.activeTab === "compliance") {
      return renderComplianceTab(model);
    }
    if (model.activeTab === "preview") {
      return renderPreviewTab(model);
    }
    return renderHistoryTab(model);
  }

  function renderSettingsTab(model) {
    var draft = model.draft;
    return [
      '<div class="monthly-grid monthly-grid--2">',
      renderFieldCard("إعدادات الشهر", [
        renderField("Month", '<input class="monthly-field__input" type="month" data-rule-path="month" value="' + escapeHtml(draft.month || "") + '">'),
        renderField("Platform", renderPlatformSelect(draft.platform)),
        renderField("Status", '<input class="monthly-field__input" type="text" value="' + escapeHtml(String(draft.status || "draft")) + '" readonly>'),
        renderField("Notes", '<textarea class="monthly-field__input monthly-field__input--textarea" data-rule-path="notes">' + escapeHtml(draft.notes || "") + '</textarea>')
      ]),
      renderFieldCard("النطاق التنظيمي", [
        renderField("City Scope", renderScopeSelect("cityScope", draft.cityScope)),
        renderChecklistField("Cities", model.availableCities, draft.selectedCities, "selectedCities", draft.cityScope === "all" || model.readOnly),
        renderField("Register Scope", renderScopeSelect("registerScope", draft.registerScope)),
        renderChecklistField("Registers", model.availableRegisters, draft.selectedRegisters, "selectedRegisters", draft.registerScope === "all" || model.readOnly)
      ]),
      '</div>'
    ].join("");
  }

  function renderValidityTab(model) {
    var draft = model.draft;
    return [
      '<div class="monthly-grid monthly-grid--2">',
      renderFieldCard("Valid Day Rules", [
        renderField("Enabled", renderCheckbox("validDayRules.enabled", draft.validDayRules.enabled)),
        renderField("Mode", [
          '<select class="monthly-field__input" data-rule-path="validDayRules.validDayMode">',
          renderOption("orders_or_hours", "Orders OR Hours", draft.validDayRules.validDayMode),
          renderOption("orders_and_hours", "Orders AND Hours", draft.validDayRules.validDayMode),
          renderOption("orders_only", "Orders Only", draft.validDayRules.validDayMode),
          renderOption("hours_only", "Hours Only", draft.validDayRules.validDayMode),
          '</select>'
        ].join("")),
        renderField("Min Orders Car", renderNumberInput("validDayRules.minOrdersCar", draft.validDayRules.minOrdersCar)),
        renderField("Min Orders Bike", renderNumberInput("validDayRules.minOrdersBike", draft.validDayRules.minOrdersBike)),
        renderField("Min Hours Car", renderNumberInput("validDayRules.minWorkingHoursCar", draft.validDayRules.minWorkingHoursCar)),
        renderField("Min Hours Bike", renderNumberInput("validDayRules.minWorkingHoursBike", draft.validDayRules.minWorkingHoursBike)),
        renderField("Min Online Hours", renderNumberInput("validDayRules.minOnlineHours", draft.validDayRules.minOnlineHours, true)),
        renderField("Allow Manual Override", renderCheckbox("validDayRules.allowManualOverride", draft.validDayRules.allowManualOverride))
      ]),
      renderFieldCard("Attendance + Order Thresholds", [
        renderField("Attendance Enabled", renderCheckbox("attendanceRules.enabled", draft.attendanceRules.enabled)),
        renderField("Minimum Valid Days", renderNumberInput("attendanceRules.minimumValidDays", draft.attendanceRules.minimumValidDays)),
        renderField("Grace Days", renderNumberInput("attendanceRules.allowGraceDays", draft.attendanceRules.allowGraceDays)),
        renderField("Order Rules Enabled", renderCheckbox("orderRules.enabled", draft.orderRules.enabled)),
        renderField("Mandatory Day Min Orders", renderNumberInput("orderRules.mandatoryDayMinOrders", draft.orderRules.mandatoryDayMinOrders)),
        renderField("Regular Day Min Orders", renderNumberInput("orderRules.regularDayMinOrders", draft.orderRules.regularDayMinOrders))
      ]),
      '</div>'
    ].join("");
  }

  function renderMandatoryTab(model) {
    var draft = model.draft;
    return [
      '<div class="monthly-grid monthly-grid--2">',
      renderFieldCard("Mandatory Days", [
        renderField("Enabled", renderCheckbox("mandatoryDaysRules.enabled", draft.mandatoryDaysRules.enabled)),
        '<div class="monthly-field">',
        '  <span>Add Mandatory Date</span>',
        '  <div class="monthly-inline-actions">',
        '    <input id="monthlyMandatoryDateInput" class="monthly-field__input" type="date" value="">',
        '    <button type="button" class="monthly-mini-btn" data-rules-action="confirm-add-mandatory-date">إضافة التاريخ</button>',
        '  </div>',
        '</div>',
        renderDateEditor(draft.mandatoryDaysRules.mandatoryDates),
        renderField("Required Mandatory Valid Days", renderNumberInput("mandatoryDaysRules.minRequiredValidMandatoryDays", draft.mandatoryDaysRules.minRequiredValidMandatoryDays)),
        renderField("Allowed Missed Mandatory Days", renderNumberInput("mandatoryDaysRules.allowMissedMandatoryDays", draft.mandatoryDaysRules.allowMissedMandatoryDays)),
        renderField("Penalty Enabled", renderCheckbox("mandatoryDaysRules.missingMandatoryDayPenalty.enabled", draft.mandatoryDaysRules.missingMandatoryDayPenalty.enabled)),
        renderField("Penalty Amount", renderNumberInput("mandatoryDaysRules.missingMandatoryDayPenalty.amount", draft.mandatoryDaysRules.missingMandatoryDayPenalty.amount)),
        renderField("Penalty Per Day", renderCheckbox("mandatoryDaysRules.missingMandatoryDayPenalty.perDay", draft.mandatoryDaysRules.missingMandatoryDayPenalty.perDay))
      ]),
      renderFieldCard("Recurring Mandatory Weekdays", [
        renderChecklistField("Weekdays", weekdayOptions(), draft.mandatoryDaysRules.mandatoryWeekdays, "mandatoryDaysRules.mandatoryWeekdays", model.readOnly),
        renderField("Rule Note", '<textarea class="monthly-field__input monthly-field__input--textarea" data-rule-path="mandatoryDaysRules.note">' + escapeHtml(draft.mandatoryDaysRules.note || "") + '</textarea>')
      ]),
      '</div>'
    ].join("");
  }

  function renderVehiclesTab(model) {
    var draft = model.draft;
    return [
      '<div class="monthly-grid monthly-grid--2">',
      renderFieldCard("Vehicle Rules — Cars", [
        renderField("Enabled", renderCheckbox("vehicleRules.car.enabled", draft.vehicleRules.car.enabled)),
        renderField("Monthly Target", renderNumberInput("vehicleRules.car.monthlyTarget", draft.vehicleRules.car.monthlyTarget)),
        renderField("Valid Day Min Orders", renderNumberInput("vehicleRules.car.validDayMinOrders", draft.vehicleRules.car.validDayMinOrders)),
        renderField("Valid Day Min Hours", renderNumberInput("vehicleRules.car.validDayMinHours", draft.vehicleRules.car.validDayMinHours))
      ]),
      renderFieldCard("Vehicle Rules — Bikes", [
        renderField("Enabled", renderCheckbox("vehicleRules.bike.enabled", draft.vehicleRules.bike.enabled)),
        renderField("Monthly Target", renderNumberInput("vehicleRules.bike.monthlyTarget", draft.vehicleRules.bike.monthlyTarget)),
        renderField("Valid Day Min Orders", renderNumberInput("vehicleRules.bike.validDayMinOrders", draft.vehicleRules.bike.validDayMinOrders)),
        renderField("Valid Day Min Hours", renderNumberInput("vehicleRules.bike.validDayMinHours", draft.vehicleRules.bike.validDayMinHours)),
        renderField("Midday Ban Enabled", renderCheckbox("vehicleRules.bike.middayBan.enabled", draft.vehicleRules.bike.middayBan.enabled)),
        renderField("Midday Ban From", '<input class="monthly-field__input" type="time" data-rule-path="vehicleRules.bike.middayBan.from" value="' + escapeHtml(draft.vehicleRules.bike.middayBan.from || "") + '">'),
        renderField("Midday Ban To", '<input class="monthly-field__input" type="time" data-rule-path="vehicleRules.bike.middayBan.to" value="' + escapeHtml(draft.vehicleRules.bike.middayBan.to || "") + '">')
      ]),
      '</div>'
    ].join("");
  }

  function renderIncentivesTab(model) {
    var draft = model.draft;
    var focus = model.routeFocus === "bike" ? "bike" : "car";
    var tierTables = focus === "bike"
      ? [renderTierTable("Bikes", "bike", draft.incentiveRules.bikeTiers), renderTierTable("Cars", "car", draft.incentiveRules.carTiers)]
      : [renderTierTable("Cars", "car", draft.incentiveRules.carTiers), renderTierTable("Bikes", "bike", draft.incentiveRules.bikeTiers)];
    return [
      renderRouteFocusStrip("\u0627\u0644\u062d\u0648\u0627\u0641\u0632", [
        { id: "car", label: "\u062d\u0648\u0627\u0641\u0632 \u0627\u0644\u0633\u064a\u0627\u0631\u0627\u062a" },
        { id: "bike", label: "\u062d\u0648\u0627\u0641\u0632 \u0627\u0644\u062f\u0628\u0627\u0628\u0627\u062a" }
      ], focus),
      '<div class="monthly-grid monthly-grid--2">',
      renderFieldCard("Incentive Rules", [
        renderField("Enabled", renderCheckbox("incentiveRules.enabled", draft.incentiveRules.enabled)),
        renderField("Currency", '<input class="monthly-field__input" type="text" data-rule-path="incentiveRules.currency" value="' + escapeHtml(draft.incentiveRules.currency || "SAR") + '">'),
        renderField("Commission Enabled", renderCheckbox("incentiveRules.companyCommission.enabled", draft.incentiveRules.companyCommission.enabled)),
        renderField("Commission Type", [
          '<select class="monthly-field__input" data-rule-path="incentiveRules.companyCommission.type">',
          renderOption("percent", "Percent", draft.incentiveRules.companyCommission.type),
          renderOption("fixed", "Fixed", draft.incentiveRules.companyCommission.type),
          '</select>'
        ].join("")),
        renderField("Commission Value", renderNumberInput("incentiveRules.companyCommission.value", draft.incentiveRules.companyCommission.value))
      ]),
      renderFieldCard("Salary Eligibility", [
        renderField("Enabled", renderCheckbox("salaryEligibilityRules.enabled", draft.salaryEligibilityRules.enabled)),
        renderField("Minimum Valid Days", renderNumberInput("salaryEligibilityRules.minimumValidDays", draft.salaryEligibilityRules.minimumValidDays)),
        renderField("Minimum Orders Car", renderNumberInput("salaryEligibilityRules.minimumOrdersCar", draft.salaryEligibilityRules.minimumOrdersCar)),
        renderField("Minimum Orders Bike", renderNumberInput("salaryEligibilityRules.minimumOrdersBike", draft.salaryEligibilityRules.minimumOrdersBike))
      ]),
      '</div>',
      tierTables.join("")
    ].join("");
  }

  function renderQualityTab(model) {
    var draft = model.draft;
    var focus = model.routeFocus === "ata" ? "ata" : "";
    var cards = [
      renderFieldCard("Face Verification", [
        renderField("Enabled", renderCheckbox("faceVerificationRules.enabled", draft.faceVerificationRules.enabled)),
        renderField("Pass Rate Required", renderNumberInput("faceVerificationRules.passRateRequired", draft.faceVerificationRules.passRateRequired)),
        renderField("Skip Counts As Fail", renderCheckbox("faceVerificationRules.skipCountsAsFail", draft.faceVerificationRules.skipCountsAsFail)),
        renderField("First Result Date Is Start", renderCheckbox("faceVerificationRules.firstResultDateIsStart", draft.faceVerificationRules.firstResultDateIsStart)),
        renderField("Exclude No Result Days", renderCheckbox("faceVerificationRules.excludeNoResultDays", draft.faceVerificationRules.excludeNoResultDays)),
        renderField("Allow Expected Projection", renderCheckbox("faceVerificationRules.allowExpectedProjection", draft.faceVerificationRules.allowExpectedProjection))
      ]),
      renderFieldCard("VDA", [
        renderField("Enabled", renderCheckbox("vdaRules.enabled", draft.vdaRules.enabled)),
        renderField("Required Statuses", '<input class="monthly-field__input" type="text" data-rule-list-path="vdaRules.requiredStatus" value="' + escapeHtml((draft.vdaRules.requiredStatus || []).join(", ")) + '">'),
        renderField("Invalid Statuses", '<input class="monthly-field__input" type="text" data-rule-list-path="vdaRules.invalidStatuses" value="' + escapeHtml((draft.vdaRules.invalidStatuses || []).join(", ")) + '">'),
        renderField("Affects Validity", renderCheckbox("vdaRules.affectsValidity", draft.vdaRules.affectsValidity)),
        renderField("Affects Salary Eligibility", renderCheckbox("vdaRules.affectsSalaryEligibility", draft.vdaRules.affectsSalaryEligibility))
      ]),
      renderFieldCard("Delivery Experience", [
        renderField("Enabled", renderCheckbox("deliveryExperienceRules.enabled", draft.deliveryExperienceRules.enabled)),
        renderField("Minimum Grade", '<input class="monthly-field__input" type="text" data-rule-path="deliveryExperienceRules.minGrade" value="' + escapeHtml(draft.deliveryExperienceRules.minGrade || "") + '">'),
        renderField("Grade A", renderNumberInput("deliveryExperienceRules.gradeScores.A", draft.deliveryExperienceRules.gradeScores.A)),
        renderField("Grade B", renderNumberInput("deliveryExperienceRules.gradeScores.B", draft.deliveryExperienceRules.gradeScores.B)),
        renderField("Grade C", renderNumberInput("deliveryExperienceRules.gradeScores.C", draft.deliveryExperienceRules.gradeScores.C)),
        renderField("Grade D", renderNumberInput("deliveryExperienceRules.gradeScores.D", draft.deliveryExperienceRules.gradeScores.D)),
        renderField("Grade E", renderNumberInput("deliveryExperienceRules.gradeScores.E", draft.deliveryExperienceRules.gradeScores.E)),
        renderField("Grade F", renderNumberInput("deliveryExperienceRules.gradeScores.F", draft.deliveryExperienceRules.gradeScores.F)),
        renderField("Affects Incentive", renderCheckbox("deliveryExperienceRules.affectsIncentive", draft.deliveryExperienceRules.affectsIncentive))
      ]),
      renderFieldCard("ATA + Cancellation", [
        renderField("ATA Enabled", renderCheckbox("ataRules.enabled", draft.ataRules.enabled)),
        renderField("ATA Min Score", renderNumberInput("ataRules.minScore", draft.ataRules.minScore, true)),
        renderField("ATA Max Late Count", renderNumberInput("ataRules.maxLateCount", draft.ataRules.maxLateCount, true)),
        renderField("ATA Affects Validity", renderCheckbox("ataRules.affectsValidity", draft.ataRules.affectsValidity)),
        renderField("ATA Affects Incentive", renderCheckbox("ataRules.affectsIncentive", draft.ataRules.affectsIncentive)),
        renderField("ATA Penalty Rules", '<textarea class="monthly-field__input monthly-field__input--textarea" data-rule-list-path="ataRules.penaltyRules">' + escapeHtml((draft.ataRules.penaltyRules || []).join("\n")) + '</textarea>'),
        renderField("Cancellation Enabled", renderCheckbox("cancellationRules.enabled", draft.cancellationRules.enabled)),
        renderField("Max Rejects Per Day", renderNumberInput("cancellationRules.maxRejectsPerDay", draft.cancellationRules.maxRejectsPerDay)),
        renderField("Penalty After Rejects", renderNumberInput("cancellationRules.penaltyAfterRejects", draft.cancellationRules.penaltyAfterRejects)),
        renderField("Penalty Amount", renderNumberInput("cancellationRules.penaltyAmount", draft.cancellationRules.penaltyAmount)),
        renderField("Cancellation Affects Validity", renderCheckbox("cancellationRules.affectsValidity", draft.cancellationRules.affectsValidity)),
        renderField("Cancellation Affects Incentive", renderCheckbox("cancellationRules.affectsIncentive", draft.cancellationRules.affectsIncentive))
      ])
    ];
    if (focus === "ata") {
      cards = [cards[3], cards[0], cards[1], cards[2]];
    }
    return [
      renderRouteFocusStrip("Face / VDA / Delivery", [
        { id: "ata", label: "ATA + Cancellation" },
        { id: "", label: "All Quality Rules" }
      ], focus),
      '<div class="monthly-grid monthly-grid--2">',
      cards.join(""),
      '</div>'
    ].join("");
  }

  function renderComplianceTab(model) {
    var draft = model.draft;
    return [
      '<div class="monthly-grid monthly-grid--2">',
      renderFieldCard("Compliance Rules", [
        renderField("STC Pay Required", renderCheckbox("complianceRules.stcPayRequired", draft.complianceRules.stcPayRequired)),
        renderField("Bag Required", renderCheckbox("complianceRules.bagRequired", draft.complianceRules.bagRequired)),
        renderField("Vehicle Photo Required", renderCheckbox("complianceRules.vehiclePhotoRequired", draft.complianceRules.vehiclePhotoRequired)),
        renderField("License Required", renderCheckbox("complianceRules.licenseRequired", draft.complianceRules.licenseRequired)),
        renderField("Health Card Required", renderCheckbox("complianceRules.healthCardRequired", draft.complianceRules.healthCardRequired))
      ]),
      renderFieldCard("Rule Resolution Notes", [
        '<div class="monthly-note monthly-note--soft">',
        '  <strong>ملاحظات التشغيل الحالية</strong>',
        '  <ul>',
        '    <li>هذه الصفحة أصبحت المصدر المركزي لشروط الشهر لكل scope.</li>',
        '    <li>محركات الحساب القديمة ما زالت موجودة مؤقتًا حتى Prompt 7 لتجنب كسر المنظومة الحالية.</li>',
        '    <li>التفعيل يمنع تكرار Rule active لنفس الشهر/المنصة/النطاق.</li>',
        '  </ul>',
        '</div>'
      ]),
      '</div>'
    ].join("");
  }

  function renderPreviewTab(model) {
    return [
      '<div class="monthly-grid monthly-grid--2">',
      renderFieldCard("Arabic Rule Preview", [
        '<div class="monthly-preview">',
        model.preview.sections.map(function (section) {
          return [
            '<div class="monthly-preview__section">',
            '  <h5>' + escapeHtml(section.title) + '</h5>',
            '  <ul>',
            (section.body || []).map(function (line) {
              return '<li>' + escapeHtml(line) + '</li>';
            }).join(""),
            '  </ul>',
            '</div>'
          ].join("");
        }).join(""),
        '</div>',
        renderActionButton("copy-preview", "Copy Preview", true, "ghost")
      ]),
      renderFieldCard("Raw Preview Text", [
        '<textarea class="monthly-field__input monthly-field__input--code" readonly>' + escapeHtml(model.preview.summaryText) + '</textarea>'
      ]),
      '</div>'
    ].join("");
  }

  function renderHistoryTab(model) {
    return [
      '<div class="monthly-grid monthly-grid--2">',
      renderFieldCard("Version Lineage", [
        renderVersionList(model.relatedVersions)
      ]),
      renderFieldCard("Audit Log", [
        renderAuditList(model.audits)
      ]),
      '</div>'
    ].join("");
  }

  function renderVersionList(rules) {
    if (!rules.length) {
      return '<div class="monthly-empty-note">لا توجد نسخ مرتبطة بهذه القاعدة بعد.</div>';
    }
    return [
      '<div class="monthly-history-list">',
      rules.map(function (rule) {
        return [
          '<div class="monthly-history-item">',
          '  <div>',
          '    <strong>' + escapeHtml(rule.month || "-") + ' / V' + escapeHtml(String(rule.version || 1)) + '</strong>',
          '    <p>' + escapeHtml(buildScopeTitle(rule)) + '</p>',
          '  </div>',
          '  <div class="monthly-history-item__meta">',
          '    <span class="monthly-status-pill monthly-status-pill--' + escapeHtml(String(rule.status || "draft")) + '">' + escapeHtml(String(rule.status || "draft")) + '</span>',
          '    <small>' + escapeHtml(formatDateTime(rule.updatedAt)) + '</small>',
          '  </div>',
          '</div>'
        ].join("");
      }).join(""),
      '</div>'
    ].join("");
  }

  function renderAuditList(audits) {
    if (!audits.length) {
      return '<div class="monthly-empty-note">لا توجد سجلات Audit مرتبطة بهذه القاعدة بعد.</div>';
    }
    return [
      '<div class="monthly-history-list">',
      audits.map(function (item) {
        return [
          '<div class="monthly-history-item">',
          '  <div>',
          '    <strong>' + escapeHtml(item.action || "-") + '</strong>',
          '    <p>' + escapeHtml(item.note || "No note") + '</p>',
          '  </div>',
          '  <div class="monthly-history-item__meta">',
          '    <span>' + escapeHtml(item.userId || "-") + '</span>',
          '    <small>' + escapeHtml(formatDateTime(item.timestamp)) + '</small>',
          '  </div>',
          '</div>'
        ].join("");
      }).join(""),
      '</div>'
    ].join("");
  }

  function renderTierTable(title, tierKind, tiers) {
    return [
      '<div class="monthly-tier-card">',
      '  <div class="monthly-panel-title">',
      '    <h4>' + escapeHtml(title) + ' Tiers</h4>',
      '    <button type="button" class="monthly-mini-btn" data-tier-action="add" data-tier-kind="' + escapeHtml(tierKind) + '">إضافة شريحة</button>',
      '  </div>',
      '  <div class="monthly-table-wrap">',
      '    <table class="monthly-table">',
      '      <thead><tr><th>Min Orders</th><th>Max Orders</th><th>Rate</th><th>Action</th></tr></thead>',
      '      <tbody>',
      (tiers || []).map(function (tier, index) {
        return [
          '<tr>',
          '  <td><input class="monthly-field__input" type="number" data-rule-path="incentiveRules.' + escapeHtml(tierKind) + 'Tiers.' + index + '.minOrders" data-value-type="number" value="' + escapeHtml(String(tier.minOrders == null ? "" : tier.minOrders)) + '"></td>',
          '  <td><input class="monthly-field__input" type="number" data-rule-path="incentiveRules.' + escapeHtml(tierKind) + 'Tiers.' + index + '.maxOrders" data-value-type="number" data-nullable="true" value="' + escapeHtml(String(tier.maxOrders == null ? "" : tier.maxOrders)) + '"></td>',
          '  <td><input class="monthly-field__input" type="number" data-rule-path="incentiveRules.' + escapeHtml(tierKind) + 'Tiers.' + index + '.rate" data-value-type="number" value="' + escapeHtml(String(tier.rate == null ? "" : tier.rate)) + '"></td>',
          '  <td><button type="button" class="monthly-mini-btn monthly-mini-btn--danger" data-tier-action="remove" data-tier-kind="' + escapeHtml(tierKind) + '" data-tier-index="' + escapeHtml(String(index)) + '">حذف</button></td>',
          '</tr>'
        ].join("");
      }).join(""),
      '      </tbody>',
      '    </table>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderValidationBanner(validation) {
    if (!validation) {
      return "";
    }
    return [
      '<div class="monthly-note ' + (validation.isValid ? 'monthly-note--ok' : 'monthly-note--warn') + '">',
      '  <strong>' + (validation.isValid ? "Validation Passed" : "Validation Issues") + '</strong>',
      '  <span>Blocking: ' + escapeHtml(String(validation.summary.blocking)) + ' / Total: ' + escapeHtml(String(validation.summary.total)) + '</span>',
      validation.issues.length ? '<ul>' + validation.issues.map(function (issue) {
        return '<li><strong>' + escapeHtml(issue.code) + '</strong>: ' + escapeHtml(issue.message) + '</li>';
      }).join("") + '</ul>' : '',
      '</div>'
    ].join("");
  }

  function renderModeBanner(model) {
    if (!model.user) {
      return "";
    }
    if (model.user.role === "finance_officer") {
      return '<div class="monthly-note monthly-note--soft">وضع العرض المالي: يمكنك مراجعة الحوافز وأهلية الراتب وتصدير JSON، لكن لا يمكنك تعديل القواعد أو تفعيلها.</div>';
    }
    if (model.readOnly) {
      return '<div class="monthly-note monthly-note--soft">وضع القراءة فقط: الصلاحيات الحالية تسمح بالمراجعة فقط بدون تعديل.</div>';
    }
    return "";
  }

  function renderDateEditor(values) {
    var items = (values || []).length
      ? (values || []).map(function (value) {
          return '<span class="monthly-tag">' + escapeHtml(value) + '<button type="button" data-rules-remove-path="mandatoryDaysRules.mandatoryDates" data-rules-remove-value="' + escapeHtml(value) + '">×</button></span>';
        }).join("")
      : '<div class="monthly-empty-note">لا توجد تواريخ إلزامية محددة بعد.</div>';
    return [
      '<div class="monthly-date-list">',
      items,
      '</div>'
    ].join("");
  }

  function renderFieldCard(title, bodyParts) {
    return [
      '<div class="monthly-card">',
      '  <div class="monthly-panel-title"><h4>' + escapeHtml(title) + '</h4></div>',
      '  <div class="monthly-card__body">',
      bodyParts.join(""),
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderField(label, controlHtml) {
    return [
      '<label class="monthly-field">',
      '  <span>' + escapeHtml(label) + '</span>',
      '  ' + controlHtml,
      '</label>'
    ].join("");
  }

  function renderChecklistField(label, options, selectedValues, path, disabled) {
    return [
      '<div class="monthly-field">',
      '  <span>' + escapeHtml(label) + '</span>',
      '  <div class="monthly-checklist' + (disabled ? ' is-disabled' : '') + '">',
      (options || []).map(function (option) {
        var value = typeof option === "string" ? option : option.value;
        var labelText = typeof option === "string" ? option : option.label;
        return [
          '<label class="monthly-check">',
          '  <input type="checkbox" data-rule-collection="' + escapeHtml(path) + '" value="' + escapeHtml(value) + '"' + (hasValue(selectedValues, value) ? ' checked' : '') + (disabled ? ' disabled' : '') + '>',
          '  <span>' + escapeHtml(labelText) + '</span>',
          '</label>'
        ].join("");
      }).join(""),
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderPlatformSelect(value) {
    return [
      '<select class="monthly-field__input" data-rule-path="platform">',
      renderOption("keeta", "Keeta", value),
      renderOption("all", "All Platforms", value),
      renderOption("ninja", "Ninja", value),
      renderOption("jahez", "Jahez", value),
      renderOption("chefz", "Chefz", value),
      renderOption("hungerstation", "HungerStation", value),
      renderOption("amazon", "Amazon", value),
      '</select>'
    ].join("");
  }

  function renderScopeSelect(path, value) {
    return [
      '<select class="monthly-field__input" data-rule-path="' + escapeHtml(path) + '" data-render-on-change="true">',
      renderOption("all", "All", value),
      renderOption("single", "Single", value),
      renderOption("multi", "Multi", value),
      '</select>'
    ].join("");
  }

  function renderNumberInput(path, value, nullable) {
    return '<input class="monthly-field__input" type="number" data-rule-path="' + escapeHtml(path) + '" data-value-type="number"' + (nullable ? ' data-nullable="true"' : '') + ' value="' + escapeHtml(String(value == null ? "" : value)) + '">';
  }

  function renderCheckbox(path, checked) {
    return '<label class="monthly-toggle"><input type="checkbox" data-rule-path="' + escapeHtml(path) + '" data-value-type="boolean"' + (checked ? ' checked' : '') + '><span>' + (checked ? "مفعل" : "غير مفعل") + '</span></label>';
  }

  function renderActionButton(action, label, enabled, variant) {
    return '<button type="button" class="monthly-action monthly-action--' + escapeHtml(variant || "ghost") + (enabled ? "" : " is-disabled") + '" data-rules-action="' + escapeHtml(action) + '"' + (enabled ? "" : ' disabled') + '>' + escapeHtml(label) + '</button>';
  }

  function renderOption(value, label, selectedValue) {
    return '<option value="' + escapeHtml(value) + '"' + (String(value) === String(selectedValue) ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
  }

  function renderKpiCard(label, value, code) {
    return [
      '<div class="monthly-kpi">',
      '  <span class="monthly-kpi__code">' + escapeHtml(code) + '</span>',
      '  <strong>' + escapeHtml(value) + '</strong>',
      '  <span>' + escapeHtml(label) + '</span>',
      '</div>'
    ].join("");
  }

  function renderEmptyState(message) {
    return '<section class="ui-shell-card"><div class="monthly-empty-note">' + escapeHtml(message) + '</div></section>';
  }

  function ensurePersistedSelectedRule(user) {
    if (isUnsavedDraft(state.draft) && !state.selectedRuleId) {
      return persistDraft(user);
    }
    var selectedRule = findRule(state.selectedRuleId);
    if (!selectedRule) {
      throw new Error("اختر Rule محفوظة أولاً أو احفظ المسودة الحالية.");
    }
    if (isRuleDirty(selectedRule, ensureDraft())) {
      return persistDraft(user);
    }
    return selectedRule;
  }

  function persistDraft(user) {
    var draft = ensureDraft();
    var existingRule = findRule(state.selectedRuleId);
    if (existingRule) {
      return service.updateMonthlyRules(existingRule.id, draft, user);
    }
    return service.createMonthlyRules(draft, user);
  }

  function ensureDraft() {
    if (!state.draft) {
      state.draft = buildDraftFromContext();
    }
    return state.draft;
  }

  function ensureDraftOrRule(rule) {
    if (state.draft) {
      return state.draft;
    }
    if (rule) {
      return buildDraftFromRule(rule);
    }
    return buildDraftFromContext();
  }

  function buildDraftFromRule(rule) {
    return Defaults.createDefaultMonthlyRule(Defaults.clone(rule || {}));
  }

  function buildDraftFromContext() {
    var context = getScopedOrganizationContext();
    var user = getCurrentUser();
    var draft = Defaults.createDefaultMonthlyRule({
      month: currentMonthKey(),
      cityScope: context.cityScope || "all",
      platform: "keeta",
      registerScope: context.registerScope || "all",
      selectedCities: context.cityScope === "all" ? [] : (context.selectedCities || []).slice(),
      selectedRegisters: context.registerScope === "all" ? [] : (context.selectedRegisters || []).slice(),
      status: "draft"
    });
    if (user && user.cityScope !== "all" && draft.cityScope === "all") {
      draft.cityScope = user.selectedCities && user.selectedCities.length > 1 ? "multi" : "single";
      draft.selectedCities = (user.selectedCities || []).slice();
    }
    if (user && user.registerScope !== "all" && draft.registerScope === "all") {
      draft.registerScope = user.selectedRegisters && user.selectedRegisters.length > 1 ? "multi" : "single";
      draft.selectedRegisters = (user.selectedRegisters || []).slice();
    }
    return draft;
  }

  function updateDraftPathFromField(field) {
    ensureEditable();
    var path = field.getAttribute("data-rule-path");
    if (!path) {
      return;
    }
    setDraftPath(path, coerceFieldValue(field));
  }

  function updateDraftCollection(path, value, checked) {
    ensureEditable();
    var current = normalizeArray(getDraftPath(ensureDraft(), path));
    var next = current.filter(function (item) {
      return String(item) !== String(value);
    });
    if (checked) {
      next.push(value);
    }
    setDraftPath(path, unique(next));
  }

  function removeArrayValue(path, value) {
    ensureEditable();
    if (path === "mandatoryDaysRules.mandatoryDates" && !value) {
      return;
    }
    setDraftPath(path, normalizeArray(getDraftPath(ensureDraft(), path)).filter(function (item) {
      return String(item) !== String(value);
    }));
  }

  function handleTierAction(action, tierKind, indexValue) {
    ensureEditable();
    var path = "incentiveRules." + tierKind + "Tiers";
    var tiers = Defaults.clone(getDraftPath(ensureDraft(), path) || []);
    var index = Number(indexValue);
    if (action === "add") {
      tiers.push({
        minOrders: tiers.length ? Number(tiers[tiers.length - 1].maxOrders == null ? tiers[tiers.length - 1].minOrders + 10 : tiers[tiers.length - 1].maxOrders + 1) : 0,
        maxOrders: null,
        rate: 0
      });
      if (tiers.length > 1 && tiers[tiers.length - 2].maxOrders == null) {
        tiers[tiers.length - 2].maxOrders = tiers[tiers.length - 1].minOrders - 1;
      }
      setDraftPath(path, tiers);
      return;
    }
    if (action === "remove" && index >= 0 && index < tiers.length) {
      tiers.splice(index, 1);
      setDraftPath(path, tiers);
    }
  }

  function importFromFile(file) {
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var user = getCurrentUser();
        var result = service.importMonthlyRules(String(reader.result || ""), user);
        state.selectedRuleId = result.id;
        state.draft = buildDraftFromRule(result);
        state.validation = service.validateMonthlyRules(result, {
          existingRules: service.listMonthlyRules(),
          mode: "draft",
          user: user
        });
        notifyRuleDataChanged("monthly_rules_imported");
        renderPage();
        toast("تم استيراد ملف JSON كمسودة جديدة.", "success");
      } catch (error) {
        toast(error && error.message ? error.message : "تعذر استيراد ملف JSON.", "error");
      }
    };
    reader.readAsText(file);
  }

  function openCompareDrawer() {
    var selectedRule = findRule(state.selectedRuleId);
    var diff;
    var title;
    if (selectedRule && isRuleDirty(selectedRule, ensureDraft())) {
      diff = service.compareVersions(selectedRule, ensureDraft());
      title = "مقارنة النسخة المحفوظة مع المسودة الحالية";
    } else if (selectedRule && selectedRule.previousVersionId) {
      diff = service.compareVersions(selectedRule.previousVersionId, selectedRule.id);
      title = "مقارنة النسخة الحالية مع النسخة السابقة";
    } else {
      toast("لا توجد مقارنة متاحة لهذه القاعدة حالياً.", "error");
      return;
    }
    openDrawer(title, renderCompareDiff(diff));
  }

  function renderCompareDiff(diff) {
    if (!diff || !diff.changeCount) {
      return '<div class="monthly-empty-note">لا توجد فروقات بين النسختين.</div>';
    }
    return [
      '<div class="monthly-compare">',
      '  <div class="monthly-note monthly-note--soft">عدد التغييرات: <strong>' + escapeHtml(String(diff.changeCount)) + '</strong></div>',
      diff.changes.map(function (change) {
        return [
          '<div class="monthly-compare__item">',
          '  <strong>' + escapeHtml(change.path) + '</strong>',
          '  <div class="monthly-compare__values">',
          '    <pre>' + escapeHtml(prettyValue(change.before)) + '</pre>',
          '    <pre>' + escapeHtml(prettyValue(change.after)) + '</pre>',
          '  </div>',
          '</div>'
        ].join("");
      }).join(""),
      '</div>'
    ].join("");
  }

  function copyPreviewText() {
    var text = Preview.buildMonthlyRulesPreview(ensureDraft()).summaryText;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast("تم نسخ Rule Preview.", "success");
      }, function () {
        fallbackCopy(text);
      });
      return;
    }
    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
    toast("تم نسخ Rule Preview.", "success");
  }

  function setDraftPath(path, value) {
    var draft = ensureDraft();
    var segments = String(path || "").split(".");
    var cursor = draft;
    var index;

    for (index = 0; index < segments.length - 1; index += 1) {
      if (!cursor[segments[index]] || typeof cursor[segments[index]] !== "object") {
        cursor[segments[index]] = /^\d+$/.test(segments[index + 1]) ? [] : {};
      }
      cursor = cursor[segments[index]];
    }
    cursor[segments[segments.length - 1]] = value;

    if (path === "cityScope" && value === "all") {
      draft.selectedCities = [];
    }
    if (path === "registerScope" && value === "all") {
      draft.selectedRegisters = [];
    }
    if (path === "cityScope" && value === "single" && draft.selectedCities.length > 1) {
      draft.selectedCities = draft.selectedCities.slice(0, 1);
    }
    if (path === "registerScope" && value === "single" && draft.selectedRegisters.length > 1) {
      draft.selectedRegisters = draft.selectedRegisters.slice(0, 1);
    }
  }

  function getDraftPath(source, path) {
    return String(path || "").split(".").reduce(function (cursor, segment) {
      return cursor == null ? undefined : cursor[segment];
    }, source);
  }

  function coerceFieldValue(field) {
    var valueType = field.getAttribute("data-value-type") || field.type || "text";
    if (valueType === "boolean" || field.type === "checkbox") {
      return !!field.checked;
    }
    if (valueType === "number") {
      if (field.value === "" && field.getAttribute("data-nullable") === "true") {
        return null;
      }
      return Number(field.value || 0);
    }
    return field.value;
  }

  function filterVisibleRules(rules, user, context) {
    return (rules || []).filter(function (rule) {
      return ruleMatchesUserScope(rule, user) && ruleMatchesContext(rule, context);
    }).sort(function (left, right) {
      return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
    });
  }

  function applyListFilters(rules) {
    return (rules || []).filter(function (rule) {
      if (state.filters.status !== "all" && String(rule.status || "") !== String(state.filters.status || "")) {
        return false;
      }
      if (!state.filters.search) {
        return true;
      }
      return normalizeText([
        rule.month,
        buildScopeTitle(rule),
        rule.platform,
        rule.notes
      ].join(" ")).indexOf(normalizeText(state.filters.search)) >= 0;
    });
  }

  function ruleMatchesContext(rule, context) {
    if (!rule) {
      return false;
    }
    if (context.cityScope !== "all" && context.selectedCities && context.selectedCities.length) {
      if (!rule.cityScope || rule.cityScope === "all") {
        return true;
      }
      if (!(context.selectedCities || []).some(function (city) { return hasValue(rule.selectedCities, city); })) {
        return false;
      }
    }
    if (context.registerScope !== "all" && context.selectedRegisters && context.selectedRegisters.length) {
      if (!rule.registerScope || rule.registerScope === "all") {
        return true;
      }
      if (!(context.selectedRegisters || []).some(function (registerCode) { return matchesRegister(registerCode, rule.selectedRegisters || []); })) {
        return false;
      }
    }
    return true;
  }

  function ruleMatchesUserScope(rule, user) {
    if (!rule || !user) {
      return true;
    }
    if (user.cityScope !== "all") {
      if (rule.cityScope !== "all" && !(rule.selectedCities || []).some(function (city) { return RBAC.canAccessCity(user, city); })) {
        return false;
      }
      if (rule.cityScope === "single" && rule.selectedCities && rule.selectedCities.length && !RBAC.canAccessCity(user, rule.selectedCities[0])) {
        return false;
      }
    }
    if (user.registerScope !== "all") {
      if (rule.registerScope !== "all" && !(rule.selectedRegisters || []).some(function (registerCode) { return matchesRegister(registerCode, user.selectedRegisters || []); })) {
        return false;
      }
    }
    return true;
  }

  function summarizeRules(rules, currentRule) {
    var activeRules = (rules || []).filter(function (item) { return String(item.status || "") === "active"; });
    var draftRules = (rules || []).filter(function (item) { return String(item.status || "") === "draft"; });
    var lockedRules = (rules || []).filter(function (item) { return String(item.status || "") === "locked"; });
    var cities = {};
    var registers = {};
    var lastUpdated = "";

    (rules || []).forEach(function (rule) {
      if (rule.cityScope === "all") {
        listCityOptions().forEach(function (city) { cities[city.value] = true; });
      } else {
        (rule.selectedCities || []).forEach(function (city) { cities[city] = true; });
      }
      if (rule.registerScope === "all") {
        listRegisterOptions().forEach(function (registerItem) { registers[registerItem.value] = true; });
      } else {
        (rule.selectedRegisters || []).forEach(function (registerCode) { registers[registerCode] = true; });
      }
      if (String(rule.updatedAt || "") > lastUpdated) {
        lastUpdated = String(rule.updatedAt || "");
      }
    });

    return {
      activeCount: activeRules.length,
      coveredCitiesCount: Object.keys(cities).length,
      coveredRegistersCount: Object.keys(registers).length,
      draftCount: draftRules.length,
      lastUpdatedLabel: formatDateTime(lastUpdated),
      lockedCount: lockedRules.length,
      needsReviewCount: (currentRule && state.validation && !state.validation.isValid ? 1 : 0) + draftRules.length
    };
  }

  function listRuleAudits(rule, allRules) {
    var ruleIds = {};
    var related = listRelatedVersions(rule, allRules);
    related.forEach(function (item) {
      ruleIds[item.id] = true;
    });
    if (rule && rule.id) {
      ruleIds[rule.id] = true;
    }
    return getCollection("auditLogs").filter(function (item) {
      return item.entity === "monthlyRules" && ruleIds[item.entityId];
    }).sort(function (left, right) {
      return String(right.timestamp || "").localeCompare(String(left.timestamp || ""));
    }).slice(0, 12);
  }

  function listRelatedVersions(rule, allRules) {
    if (!rule) {
      return [];
    }
    var group = (allRules || []).filter(function (item) {
      return String(item.id || "") === String(rule.id || "") ||
        String(item.previousVersionId || "") === String(rule.id || "") ||
        String(rule.previousVersionId || "") === String(item.id || "") ||
        sameScope(item, rule);
    }).sort(function (left, right) {
      if (String(left.month || "") !== String(right.month || "")) {
        return String(left.month || "").localeCompare(String(right.month || ""));
      }
      return Number(left.version || 0) - Number(right.version || 0);
    });
    return uniqueById(group);
  }

  function sameScope(left, right) {
    if (!left || !right) {
      return false;
    }
    return String(left.month || "") === String(right.month || "") &&
      String(left.platform || "") === String(right.platform || "") &&
      String(left.cityScope || "") === String(right.cityScope || "") &&
      String(left.registerScope || "") === String(right.registerScope || "") &&
      normalizeArray(left.selectedCities).join("|") === normalizeArray(right.selectedCities).join("|") &&
      normalizeArray(left.selectedRegisters).join("|") === normalizeArray(right.selectedRegisters).join("|");
  }

  function getTabOptions(user) {
    if (user && user.role === "finance_officer") {
      return [
        { id: "settings", label: "النطاق" },
        { id: "incentives", label: "الحوافز" },
        { id: "preview", label: "Preview" },
        { id: "history", label: "History" }
      ];
    }
    return [
      { id: "settings", label: "إعدادات الشهر" },
      { id: "validity", label: "اليوم الصالح" },
      { id: "mandatory", label: "الأيام الإلزامية" },
      { id: "vehicles", label: "المركبات" },
      { id: "incentives", label: "الحوافز" },
      { id: "quality", label: "Face / VDA / Delivery" },
      { id: "compliance", label: "Compliance" },
      { id: "preview", label: "Preview" },
      { id: "history", label: "History" }
    ];
  }

  function renderRouteFocusStrip(title, options, currentFocus) {
    return [
      '<div class="monthly-note monthly-note--soft">',
      '  <strong>' + escapeHtml(title) + '</strong>',
      '  <div class="monthly-inline-actions" style="margin-top:10px">',
      (options || []).map(function (option) {
        var isActive = String(option.id || "") === String(currentFocus || "");
        return '<button type="button" class="monthly-mini-btn' + (isActive ? ' is-active' : '') + '" data-rules-focus="' + escapeHtml(option.id || "") + '">' + escapeHtml(option.label) + '</button>';
      }).join(""),
      '  </div>',
      '</div>'
    ].join("");
  }

  function notifyRuleDataChanged(source) {
    window.dispatchEvent(new CustomEvent("keeta:data-changed", {
      detail: {
        entityNames: ["monthlyRules", "auditLogs"],
        source: source || "monthly_rules"
      }
    }));
  }

  function listCityOptions() {
    var repository = runtime.repositories && runtime.repositories.cities;
    var rows = repository && typeof repository.all === "function" ? repository.all() : [];
    if (rows.length) {
      return rows.map(function (row) {
        return { value: row.name, label: row.name };
      });
    }
    return (ImportTypes.CITY_DEFINITIONS || []).map(function (item) {
      return { value: item.label, label: item.label };
    });
  }

  function listRegisterOptions(selectedCities) {
    var repository = runtime.repositories && runtime.repositories.registers;
    var rows = repository && typeof repository.all === "function" ? repository.all() : [];
    var normalizedCities = normalizeArray(selectedCities);
    var filtered = rows.filter(function (row) {
      return !normalizedCities.length || normalizedCities.indexOf(row.city) >= 0;
    });
    if (filtered.length) {
      return filtered.map(function (row) {
        return { value: row.code, label: row.name + " (" + row.city + ")" };
      });
    }
    return (ImportTypes.REGISTER_DEFINITIONS || []).map(function (item) {
      return { value: item.code, label: item.label };
    });
  }

  function weekdayOptions() {
    return [
      { value: "Sunday", label: "Sunday" },
      { value: "Monday", label: "Monday" },
      { value: "Tuesday", label: "Tuesday" },
      { value: "Wednesday", label: "Wednesday" },
      { value: "Thursday", label: "Thursday" },
      { value: "Friday", label: "Friday" },
      { value: "Saturday", label: "Saturday" }
    ];
  }

  function addMandatoryDateFromInput() {
    var input = document.getElementById("monthlyMandatoryDateInput");
    var dateValue = input ? String(input.value || "") : "";
    var current = normalizeArray(getDraftPath(ensureDraft(), "mandatoryDaysRules.mandatoryDates"));
    if (!dateValue) {
      throw new Error("اختر تاريخًا أولاً قبل إضافته.");
    }
    current.push(dateValue);
    setDraftPath("mandatoryDaysRules.mandatoryDates", unique(current).sort());
  }

  function ensureEditable() {
    if (!isDraftEditable()) {
      throw new Error("الجلسة الحالية للعرض فقط ولا تسمح بتعديل الشروط الشهرية.");
    }
  }

  function isDraftEditable() {
    var user = getCurrentUser();
    return !!user && (RBAC.canPerform(user, "monthlyRules.edit") || RBAC.canPerform(user, "monthlyRules.create"));
  }

  function copyArray(values) {
    return normalizeArray(values).slice();
  }

  function hasValue(values, target) {
    return normalizeArray(values).indexOf(String(target)) >= 0;
  }

  function matchesRegister(registerCode, candidates) {
    return normalizeArray(candidates).some(function (candidate) {
      return ImportTypes.matchUserRegisterScope(candidate, registerCode) ||
        ImportTypes.matchUserRegisterScope(registerCode, candidate) ||
        String(ImportTypes.normalizeRegisterCode(candidate) || candidate) === String(ImportTypes.normalizeRegisterCode(registerCode) || registerCode);
    });
  }

  function buildContextSummary(context) {
    if (Portal.OrganizationContext && typeof Portal.OrganizationContext.getState === "function") {
      return getOrganizationSummary(context);
    }
    return {
      summaryLine: buildScopeTitle(context || {})
    };
  }

  function getOrganizationSummary(context) {
    var stateContext = context || getScopedOrganizationContext();
    var cityLabel = stateContext.cityScope === "all"
      ? "كل المدن"
      : (stateContext.selectedCities || []).join("، ");
    var registerLabel = stateContext.registerScope === "all"
      ? "كل السجلات"
      : (stateContext.selectedRegisters || []).map(function (code) {
          return ImportTypes.registerLabel(code) || code;
        }).join("، ");
    return {
      summaryLine: cityLabel + " / " + registerLabel
    };
  }

  function buildScopeTitle(rule) {
    if (!rule) {
      return "Rule جديدة";
    }
    return [
      buildScopePart(rule.cityScope, rule.selectedCities, "كل المدن"),
      buildScopePart(rule.registerScope, (rule.selectedRegisters || []).map(function (code) {
        return ImportTypes.registerLabel(code) || code;
      }), "كل السجلات"),
      platformLabel(rule.platform)
    ].join(" / ");
  }

  function buildScopePart(scope, values, fallback) {
    return scope === "all" || !(values || []).length ? fallback : values.join("، ");
  }

  function buildScopeSlug(rule) {
    return [
      rule.cityScope === "all" ? "all-cities" : normalizeText((rule.selectedCities || []).join("-")),
      rule.registerScope === "all" ? "all-registers" : normalizeText((rule.selectedRegisters || []).join("-"))
    ].join("-").replace(/\s+/g, "-");
  }

  function currentMonthKey() {
    return new Date().toISOString().slice(0, 7);
  }

  function nextMonthKey(monthKey) {
    var parts = String(monthKey || currentMonthKey()).split("-");
    var year = Number(parts[0]) || Number(currentMonthKey().slice(0, 4));
    var month = Number(parts[1]) || Number(currentMonthKey().slice(5, 7));
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return String(year) + "-" + String(month).padStart(2, "0");
  }

  function parseListInput(value) {
    return unique(String(value || "").split(/[\n,]+/).map(function (item) {
      return item.trim();
    }).filter(Boolean));
  }

  function unique(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = String(value == null ? "" : value).trim();
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    }).map(function (value) {
      return String(value).trim();
    });
  }

  function normalizeArray(values) {
    return Array.isArray(values) ? values.slice() : [];
  }

  function normalizeText(value) {
    return ImportTypes.normalizeText(value).toLowerCase();
  }

  function getCurrentUser() {
    return runtime.auth && typeof runtime.auth.getCurrentUser === "function"
      ? runtime.auth.getCurrentUser()
      : null;
  }

  function getScopedOrganizationContext() {
    var base = Portal.OrganizationContext && typeof Portal.OrganizationContext.getState === "function"
      ? Portal.OrganizationContext.getState()
      : {
          cityScope: "all",
          registerScope: "all",
          selectedCities: [],
          selectedRegisters: [],
          selectedDashboards: [],
          workMode: "all"
        };
    var user = getCurrentUser();
    return RBAC.clampOrganizationContextForUser(user, base, function () { return true; });
  }

  function getCollection(entityName) {
    return runtime.dataStore && typeof runtime.dataStore.getAll === "function"
      ? runtime.dataStore.getAll(entityName)
      : [];
  }

  function findRule(id) {
    return service.findRuleById(id);
  }

  function isUnsavedDraft(draft) {
    return !!draft && !draft.id;
  }

  function isRuleDirty(savedRule, draftRule) {
    if (!savedRule || !draftRule) {
      return false;
    }
    return JSON.stringify(cleanRuleForComparison(savedRule)) !== JSON.stringify(cleanRuleForComparison(draftRule));
  }

  function cleanRuleForComparison(rule) {
    var copy = Defaults.clone(rule || {});
    [
      "createdAt",
      "createdBy",
      "updatedAt",
      "updatedBy",
      "effectiveFrom",
      "effectiveTo",
      "lockedAt",
      "lockedBy",
      "archivedAt",
      "archivedBy"
    ].forEach(function (key) {
      delete copy[key];
    });
    return copy;
  }

  function uniqueById(rows) {
    var seen = {};
    return (rows || []).filter(function (row) {
      var key = String(row && row.id || "");
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function prettyValue(value) {
    if (typeof value === "string") {
      return value;
    }
    return JSON.stringify(value, null, 2);
  }

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function platformLabel(platform) {
    var labels = {
      all: "All Platforms",
      amazon: "Amazon",
      chefz: "Chefz",
      hungerstation: "HungerStation",
      jahez: "Jahez",
      keeta: "Keeta",
      ninja: "Ninja"
    };
    return labels[platform] || (platform || "Unknown");
  }

  function downloadJson(fileName, payload) {
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var href = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () {
      URL.revokeObjectURL(href);
    }, 500);
  }

  function openDrawer(title, bodyHtml) {
    var titleNode = document.getElementById("uiDrawerTitle");
    var bodyNode = document.getElementById("uiDrawerBody");
    var drawer = document.getElementById("uiDetailDrawer");
    if (titleNode) {
      titleNode.textContent = title;
    }
    if (bodyNode) {
      bodyNode.innerHTML = bodyHtml;
    }
    if (drawer) {
      drawer.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("ui-drawer-open");
  }

  function toast(message, type) {
    var stack = document.getElementById("uiToastStack");
    var toastNode = document.createElement("div");
    toastNode.className = "ui-toast " + (type || "info");
    toastNode.textContent = message;
    if (stack) {
      stack.appendChild(toastNode);
    } else {
      toastNode.style.position = "fixed";
      toastNode.style.left = "20px";
      toastNode.style.bottom = "20px";
      toastNode.style.zIndex = "var(--ui-layer-toast, 640)";
      toastNode.style.padding = "12px 16px";
      toastNode.style.borderRadius = "14px";
      toastNode.style.background = type === "error" ? "#a22d2d" : "#0b2348";
      toastNode.style.color = "#fff";
      document.body.appendChild(toastNode);
    }
    window.setTimeout(function () {
      if (toastNode.parentNode) {
        toastNode.parentNode.removeChild(toastNode);
      }
    }, 2800);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function injectStyles() {
    if (document.getElementById("monthlyRulesPrompt6Styles")) {
      return;
    }
    var style = document.createElement("style");
    style.id = "monthlyRulesPrompt6Styles";
    style.textContent = [
      ".monthly-rules-shell{display:grid;gap:18px}",
      ".monthly-rules-head{align-items:flex-start}",
      ".monthly-rules-head h3{margin:0;color:var(--navy)}",
      ".monthly-rules-head p{margin:6px 0 0;color:var(--muted)}",
      ".monthly-rules-scope{display:grid;gap:4px;justify-items:end;color:var(--muted);text-align:left}",
      ".monthly-rules-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 190px auto;gap:12px;align-items:start}",
      ".monthly-rules-toolbar__actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}",
      ".monthly-rules-layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:18px;align-items:start}",
      ".monthly-rules-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}",
      ".monthly-kpi{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;display:grid;gap:6px;box-shadow:0 10px 28px rgba(15,23,42,0.06)}",
      ".monthly-kpi strong{font-size:1.15rem;color:var(--navy)}",
      ".monthly-kpi span{color:var(--muted)}",
      ".monthly-kpi__code{font-size:.72rem;font-weight:900;color:#0b8b52;letter-spacing:.08em;text-transform:uppercase}",
      ".monthly-rule-list,.monthly-editor{background:#fff;border:1px solid var(--line);border-radius:24px;padding:18px;box-shadow:0 18px 40px rgba(15,23,42,0.08)}",
      ".monthly-rule-list__items{display:grid;gap:10px;max-height:980px;overflow:auto;padding-inline-end:4px}",
      ".monthly-rule-list__item{border:1px solid var(--line);border-radius:18px;padding:14px;background:#f8fbff;text-align:right;display:grid;gap:8px;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}",
      ".monthly-rule-list__item:hover{transform:translateY(-1px);border-color:#bfd6eb;box-shadow:0 10px 22px rgba(15,23,42,0.08)}",
      ".monthly-rule-list__item.is-selected{border-color:#0b2348;background:#eef5ff}",
      ".monthly-rule-list__item-head,.monthly-rule-list__meta,.monthly-panel-title,.monthly-editor__summary{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}",
      ".monthly-rule-list__scope{color:#334155;font-size:.92rem;line-height:1.6}",
      ".monthly-rule-list__meta{color:var(--muted);font-size:.82rem}",
      ".monthly-editor{display:grid;gap:16px}",
      ".monthly-editor__summary h4{margin:0;color:var(--navy)}",
      ".monthly-editor__summary p{margin:6px 0 0;color:var(--muted)}",
      ".monthly-editor__summary-pills{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}",
      ".monthly-chip,.monthly-status-pill{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:6px 10px;font-size:.82rem;font-weight:800}",
      ".monthly-chip{background:#eef5ff;color:#0b2348}",
      ".monthly-status-pill--draft{background:#fff7e0;color:#8a5c00}",
      ".monthly-status-pill--active{background:#eaf8ef;color:#0b8b52}",
      ".monthly-status-pill--locked{background:#edf2f7;color:#334155}",
      ".monthly-status-pill--archived{background:#fdecec;color:#a22d2d}",
      ".monthly-tabs{display:flex;flex-wrap:wrap;gap:8px}",
      ".monthly-tab,.monthly-action,.monthly-mini-btn{border:none;border-radius:14px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer;transition:transform .18s ease,opacity .18s ease,background .18s ease}",
      ".monthly-tab{background:#eef3f9;color:#334155}",
      ".monthly-tab.is-active{background:linear-gradient(135deg,#0b2348,#113d74);color:#fff}",
      ".monthly-action--primary{background:#0b2348;color:#fff}",
      ".monthly-action--success{background:#0b8b52;color:#fff}",
      ".monthly-action--danger,.monthly-mini-btn--danger{background:#a22d2d;color:#fff}",
      ".monthly-action--secondary{background:#d9e8f7;color:#0b2348}",
      ".monthly-action--ghost,.monthly-mini-btn{background:#eef3f9;color:#0b2348}",
      ".monthly-action.is-disabled{opacity:.45;cursor:not-allowed}",
      ".monthly-editor__body,.monthly-card__body,.monthly-grid{display:grid;gap:14px}",
      ".monthly-grid--2{grid-template-columns:repeat(2,minmax(0,1fr))}",
      ".monthly-card{border:1px solid var(--line);border-radius:20px;padding:16px;background:linear-gradient(180deg,#ffffff,#fbfdff)}",
      ".monthly-panel-title h4{margin:0;color:var(--navy)}",
      ".monthly-panel-title span{color:var(--muted)}",
      ".monthly-field{display:grid;gap:7px}",
      ".monthly-field span{font-weight:800;color:#334155}",
      ".monthly-field__input{width:100%;border:1px solid var(--line);border-radius:14px;padding:11px 13px;background:#fff;font:inherit;color:#0f172a}",
      ".monthly-field__input--textarea{min-height:110px;resize:vertical}",
      ".monthly-field__input--code{min-height:340px;font-family:Consolas,'Courier New',monospace;direction:ltr;text-align:left}",
      ".monthly-toggle{display:flex;align-items:center;gap:10px;font-weight:700;color:#0f172a}",
      ".monthly-toggle input{width:18px;height:18px}",
      ".monthly-checklist{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
      ".monthly-checklist.is-disabled{opacity:.6}",
      ".monthly-check{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:14px;padding:10px 12px;background:#f8fbff}",
      ".monthly-note{padding:14px 16px;border-radius:16px;border:1px solid var(--line);display:grid;gap:8px}",
      ".monthly-note ul{margin:0;padding-inline-start:18px}",
      ".monthly-note--ok{background:#eef7f1;color:#0b8b52}",
      ".monthly-note--warn{background:#fff3da;color:#8a5c00}",
      ".monthly-note--soft{background:#f6f9fc;color:#334155}",
      ".monthly-preview{display:grid;gap:12px}",
      ".monthly-preview__section{border:1px dashed #d7e3ee;border-radius:16px;padding:14px;background:#fbfdff}",
      ".monthly-preview__section h5{margin:0 0 8px;color:var(--navy)}",
      ".monthly-preview__section ul{margin:0;padding-inline-start:18px;display:grid;gap:6px}",
      ".monthly-history-list,.monthly-date-list{display:grid;gap:10px}",
      ".monthly-history-item,.monthly-tag{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border:1px solid var(--line);border-radius:16px;padding:12px 14px;background:#fbfdff}",
      ".monthly-history-item p{margin:6px 0 0;color:var(--muted)}",
      ".monthly-history-item__meta{display:grid;gap:4px;justify-items:end;color:var(--muted);font-size:.82rem}",
      ".monthly-tag{display:inline-flex;align-items:center;justify-content:space-between}",
      ".monthly-tag button{border:none;background:transparent;color:#a22d2d;font-size:1rem;cursor:pointer}",
      ".monthly-inline-actions{display:flex;gap:8px;align-items:center}",
      ".monthly-empty-note{padding:16px;border:1px dashed #c7d8e9;border-radius:18px;background:#f8fbff;color:#4b5563}",
      ".monthly-tier-card{border:1px solid var(--line);border-radius:20px;padding:16px;background:#fff}",
      ".monthly-table-wrap{overflow:auto}",
      ".monthly-table{width:100%;border-collapse:collapse}",
      ".monthly-table th,.monthly-table td{padding:10px;border-bottom:1px solid #edf2f7;text-align:right;vertical-align:top}",
      ".monthly-compare{display:grid;gap:12px}",
      ".monthly-compare__item{border:1px solid var(--line);border-radius:16px;padding:14px;background:#fbfdff;display:grid;gap:10px}",
      ".monthly-compare__values{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
      ".monthly-compare__values pre{margin:0;padding:12px;border-radius:14px;background:#0f172a;color:#e2e8f0;overflow:auto;white-space:pre-wrap;word-break:break-word}",
      "@media (max-width: 1180px){.monthly-rules-layout{grid-template-columns:1fr}.monthly-rule-list__items{max-height:none}.monthly-rules-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.monthly-rules-toolbar{grid-template-columns:1fr}.monthly-rules-toolbar__actions{justify-content:flex-start}.monthly-rules-scope{justify-items:start;text-align:right}}",
      "@media (max-width: 820px){.monthly-grid--2,.monthly-checklist,.monthly-compare__values{grid-template-columns:1fr}.monthly-rules-kpis{grid-template-columns:1fr}.monthly-rule-list,.monthly-editor{padding:14px}}"
    ].join("");
    document.head.appendChild(style);
  }

})();
