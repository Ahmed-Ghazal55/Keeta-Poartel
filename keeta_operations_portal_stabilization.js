(function () {
  "use strict";

  var Portal = window.KeetaPortal || {};
  if (
    !Portal.ImportTemplateRegistry ||
    !Portal.StorageBridgeLib ||
    !Portal.ImportTypes ||
    !Portal.CsvReader ||
    !Portal.WorkbookReader
  ) {
    return;
  }

  var importState = {
    batches: [],
    entryRequest: null,
    notificationFocus: null,
    pendingFiles: [],
    selectedBatchId: "",
    storageBridge: null
  };
  var BootMode = Portal.BootMode || null;
  var StartupProfiler = Portal.StartupProfiler || null;
  var PageScopedDataLoading = Portal.PageScopedDataLoading || null;
  var RuntimeLoopGuard = Portal.RuntimeLoopGuard || null;
  var RecoveryMode = Portal.RecoveryMode || null;
  var bootModeState = BootMode && typeof BootMode.getState === "function"
    ? BootMode.getState()
    : { debugBoot: false, disableNodeSync: false, liteMode: false, safeMode: false };
  var startupProfiler = StartupProfiler && typeof StartupProfiler.createStartupProfiler === "function"
    ? StartupProfiler.createStartupProfiler()
    : null;
  window.__keetaStartupProfilerInstance = startupProfiler;
  var runtimeUiState = {
    backupBeforeReset: true,
    bootMode: bootModeState,
    clockController: null,
    hydrationInFlight: {},
    isHandlingDataChanged: false,
    lastDataUpdate: "",
    lastFleetDerivedHash: "",
    lastHydrationKey: "",
    lastNotificationHash: "",
    notificationFilter: Portal.NotificationDrawerModel && typeof Portal.NotificationDrawerModel.createFilterState === "function"
      ? Portal.NotificationDrawerModel.createFilterState()
      : {
          quickFilter: "all",
          search: "",
          severity: "all",
          sourceModule: "all",
          status: "all"
        },
    notificationSyncInFlight: false,
    notificationPanelOpen: false,
    renderDepth: 0,
    startupCompleted: false,
    startupStartedAt: Date.now(),
    runtimeUiBound: false
  };
  if (RuntimeLoopGuard && typeof RuntimeLoopGuard.createState === "function") {
    mergeRuntimeLoopState(runtimeUiState, RuntimeLoopGuard.createState());
  }
  window.__keetaRuntimeUiStateShared = runtimeUiState;
  var runtimeLifecycle = window.__keetaRuntimeLifecycle = window.__keetaRuntimeLifecycle || {
    bridgeUnsubscribe: null,
    cleanup: [],
    initialized: false
  };
  var recoveryController = RecoveryMode && typeof RecoveryMode.createRecoveryController === "function"
    ? RecoveryMode.createRecoveryController({
        onTrigger: function () {
          openRecoveryPanel({
            reason: "startup_timeout",
            timeoutMs: 5000
          });
        },
        timeoutMs: 5000
      })
    : null;
  var initialized = false;
  var notificationNavigationEventName = Portal.NotificationNavigation && Portal.NotificationNavigation.NAVIGATION_EVENT
    ? Portal.NotificationNavigation.NAVIGATION_EVENT
    : "keeta:notification-navigation";
  var notificationNavigator = Portal.NotificationNavigation && typeof Portal.NotificationNavigation.createNotificationNavigator === "function"
    ? Portal.NotificationNavigation.createNotificationNavigator({
        getUiShell: function () {
          return Portal.UIShell || null;
        }
      })
    : null;

  Portal.ImportEntryPoint = {
    focusBatch: focusImportBatch,
    getPendingRequest: function () {
      return importState.entryRequest ? mergeObjects({}, importState.entryRequest) : null;
    },
    openRouteImport: requestImportRouteEntry
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    if (runtimeLifecycle.initialized) {
      cleanupRuntimeLifecycle();
    }
    runtimeLifecycle.initialized = true;
    window.__keetaRuntimeInitialized = true;
    initialized = true;
    document.body.classList.toggle("boot-safe-mode", !!bootModeState.safeMode);
    ensureSafeModeBanner();
    ensureRecoveryPanelHost();
    if (recoveryController) {
      recoveryController.arm();
    }

    profileStep("applyLayeringVariables", applyLayeringVariables);
    profileStep("compactHeroHeader", compactHeroHeader);
    profileStep("ensureTopbarRuntimeScaffolding", ensureTopbarRuntimeScaffolding);
    profileStep("bindRuntimeUiEvents", bindRuntimeUiEvents);
    profileStep("initLiveClock", initLiveClock);
    profileStep("renderTopbarRuntime", renderTopbarRuntime);

    if (!bootModeState.safeMode) {
      profileStep("ensureImportScaffolding", ensureImportScaffolding);
      profileStep("initImportCenter", initImportCenter);
      profileStep("initStorageBridge", initStorageBridge);
      profileStep("renderHeroHeader", renderHeroHeader);
      profileStep("renderImportCenter", renderImportCenter);
      profileStep("renderSettingsStorageStatus", renderSettingsStorageStatus);
      profileStep("renderNotificationCenter", renderNotificationCenter);
      profileStep("renderDeveloperTools", renderDeveloperTools);
      profileStep("syncNotificationCenter", syncNotificationCenter);
    }

    profileStep("bindGlobalRefreshes", bindGlobalRefreshes);
    finalizeBoot();
  }

  function cleanupRuntimeLifecycle() {
    runtimeLifecycle.cleanup.splice(0).forEach(function (dispose) {
      try {
        dispose();
      } catch (_error) {
        // Keep re-initialization resilient.
      }
    });
    if (runtimeLifecycle.bridgeUnsubscribe) {
      try {
        runtimeLifecycle.bridgeUnsubscribe();
      } catch (_error) {
        // Ignore stale subscriptions during runtime cleanup.
      }
      runtimeLifecycle.bridgeUnsubscribe = null;
    }
    runtimeLifecycle.initialized = false;
    window.__keetaRuntimeInitialized = false;
    runtimeUiState.startupCompleted = false;
  }

  function applyLayeringVariables() {
    if (!Portal.UILayering || typeof Portal.UILayering.applyToRoot !== "function") {
      return;
    }
    Portal.UILayering.applyToRoot(document.documentElement);
  }

  function bindGlobalRefreshes() {
    var onDataChanged = function () {
      if (runtimeUiState.isHandlingDataChanged) {
        return;
      }
      runtimeUiState.isHandlingDataChanged = true;
      runtimeUiState.lastDataUpdate = resolveLastDataUpdate();
      try {
        if (!bootModeState.safeMode) {
          renderHeroHeader();
          renderImportCenter();
          renderSettingsStorageStatus();
          renderDeveloperTools();
          syncNotificationCenter();
        }
        renderTopbarRuntime();
      } finally {
        runtimeUiState.isHandlingDataChanged = false;
      }
    };
    var onOrganizationContextChange = function () {
      if (!bootModeState.safeMode) {
        renderHeroHeader();
        syncImportScopeDefaults();
        renderImportCenter();
      }
      renderTopbarRuntime();
      if (!bootModeState.safeMode) {
        renderNotificationCenter();
      }
    };
    var onShellRouteChange = function (event) {
      var route = event && event.detail ? event.detail : {};
      hydrateCollections(resolveHydrationEntities(route.page || ""), {
        dispatchChangeEvent: true,
        reason: "route_hydration"
      });
    };
    window.addEventListener("keeta:data-changed", onDataChanged);
    document.addEventListener("keeta:organization-context-change", onOrganizationContextChange);
    document.addEventListener("keeta:shell-route-change", onShellRouteChange);
    runtimeLifecycle.cleanup.push(function () {
      window.removeEventListener("keeta:data-changed", onDataChanged);
      document.removeEventListener("keeta:organization-context-change", onOrganizationContextChange);
      document.removeEventListener("keeta:shell-route-change", onShellRouteChange);
    });
  }

  function ensureTopbarRuntimeScaffolding() {
    var topbar = byId("uiTopbar");
    if (!topbar) {
      return;
    }
    var host = byId("appTopbarRuntime") || topbar.querySelector(".app-topbar-runtime");
    if (!host) {
      return;
    }
    dedupeRuntimeWidgets(host);
    if (!byId("topbarRuntimeStrip")) {
      host.insertAdjacentHTML("afterbegin", [
        '<div class="topbar-meta-chip topbar-runtime-strip compact-live-clock" id="topbarRuntimeStrip">',
        '  <span class="topbar-meta-line">',
        '    <b>الوقت الحالي:</b>',
        '    <strong class="is-ltr" id="topbarLiveClock">-</strong>',
        "  </span>",
        '  <span class="topbar-meta-separator" aria-hidden="true">•</span>',
        '  <span class="topbar-meta-line">',
        '    <b>آخر تحديث:</b>',
        '    <strong class="is-ltr" id="topbarRuntimeLastUpdate">-</strong>',
        "  </span>",
        "</div>"
      ].join(""));
    }
    if (!byId("topbarStorageModeChip")) {
      host.insertAdjacentHTML("beforeend", [
        '<div class="topbar-meta-chip topbar-storage-chip" id="topbarStorageModeChip">',
        '  <span class="topbar-chip-label">التخزين</span>',
        '  <strong id="topbarStorageModeLabel">Browser Local</strong>',
        "</div>"
      ].join(""));
    }
    if (!byId("topbarNotificationHost")) {
      host.insertAdjacentHTML("beforeend", [
        '<div class="topbar-notification-host" id="topbarNotificationHost">',
        '  <button type="button" class="topbar-meta-chip topbar-notification-toggle" id="topbarNotificationToggle" aria-label="الإشعارات">',
        '    <span>الإشعارات</span>',
        '    <span class="topbar-notification-toggle__icon" aria-hidden="true">🔔</span>',
        '    <span class="topbar-notification-count" id="topbarNotificationCount">0</span>',
        "  </button>",
        '  <div class="topbar-notification-panel" id="topbarNotificationPanel" hidden></div>',
        "</div>"
      ].join(""));
    }
  }

  function bindRuntimeUiEvents() {
    if (runtimeUiState.runtimeUiBound) {
      return;
    }
    runtimeUiState.runtimeUiBound = true;
    document.addEventListener("click", handleRuntimeUiClick);
    document.addEventListener("change", handleRuntimeUiChange);
    document.addEventListener("input", handleRuntimeUiInput);
    document.addEventListener(notificationNavigationEventName, handleNotificationNavigationEvent);
    runtimeLifecycle.cleanup.push(function () {
      document.removeEventListener("click", handleRuntimeUiClick);
      document.removeEventListener("change", handleRuntimeUiChange);
      document.removeEventListener("input", handleRuntimeUiInput);
      document.removeEventListener(notificationNavigationEventName, handleNotificationNavigationEvent);
      runtimeUiState.runtimeUiBound = false;
    });
  }

  function initLiveClock() {
    if (!Portal.LiveClock || typeof Portal.LiveClock.createLiveClockController !== "function") {
      return;
    }
    if (runtimeUiState.clockController && typeof runtimeUiState.clockController.stop === "function") {
      runtimeUiState.clockController.stop();
      runtimeUiState.clockController = null;
    }
    runtimeUiState.lastDataUpdate = resolveLastDataUpdate();
    runtimeUiState.clockController = Portal.LiveClock.createLiveClockController({
      intervalMs: 1000,
      onTick: function (snapshot) {
        renderTopbarRuntime(snapshot);
      }
    });
    runtimeUiState.clockController.start();
    runtimeLifecycle.cleanup.push(function () {
      if (runtimeUiState.clockController && typeof runtimeUiState.clockController.stop === "function") {
        runtimeUiState.clockController.stop();
      }
      runtimeUiState.clockController = null;
    });
  }

  function renderTopbarRuntime(snapshot) {
    if (!byId("topbarLiveClock") || !byId("topbarRuntimeLastUpdate") || !byId("topbarStorageModeChip")) {
      ensureTopbarRuntimeScaffolding();
    }
    snapshot = snapshot || (runtimeUiState.clockController && typeof runtimeUiState.clockController.getSnapshot === "function"
      ? runtimeUiState.clockController.getSnapshot()
      : { currentTime: formatOperationalStamp(new Date()) });
    var currentTime = snapshot.currentTime || formatOperationalStamp(new Date());
    var lastUpdate = runtimeUiState.lastDataUpdate ? formatOperationalStamp(runtimeUiState.lastDataUpdate) : "-";
    if (byId("topbarLiveClock")) {
      byId("topbarLiveClock").textContent = currentTime;
    }
    if (byId("topbarRuntimeLastUpdate")) {
      byId("topbarRuntimeLastUpdate").textContent = lastUpdate;
    }
    if (byId("topbarStorageModeLabel")) {
      byId("topbarStorageModeLabel").textContent = resolveStorageModeLabel();
    }
    if (byId("topbarStorageModeChip")) {
      byId("topbarStorageModeChip").setAttribute("data-storage-mode", resolveStorageModeMode());
      byId("topbarStorageModeChip").title = resolveStorageModeTitle();
    }
  }

  function syncNotificationCenter() {
    var runtime = getRuntime();
    if (bootModeState.safeMode || !runtime || !runtime.notificationCenter || !runtime.dataStore) {
      return;
    }
    if (runtimeUiState.notificationSyncInFlight) {
      return;
    }
    runtimeUiState.notificationSyncInFlight = true;
    try {
      var beforeHash = typeof runtime.notificationCenter.getStateHash === "function"
        ? runtime.notificationCenter.getStateHash()
        : runtimeUiState.lastNotificationHash;
      runtime.notificationCenter.syncDerivedNotifications({
        auditLogs: runtime.dataStore.getAll("auditLogs"),
        assignments: runtime.dataStore.getAll("assignments"),
        dashboardUsers: runtime.dataStore.getAll("dashboardUsers"),
        externalRiders: runtime.dataStore.getAll("externalRiders"),
        hrProfiles: runtime.dataStore.getAll("hrProfiles"),
        importBatches: runtime.dataStore.getAll("importBatches"),
        operationalStatusReviews: runtime.dataStore.getAll("operationalStatusReviews"),
        performanceIssues: runtime.dataStore.getAll("performanceIssues"),
        riderOperationalProfiles: runtime.dataStore.getAll("riderOperationalProfiles"),
        riderVehicleUsageHistory: runtime.dataStore.getAll("riderVehicleUsageHistory"),
        riders: runtime.dataStore.getAll("riders"),
        terminations: runtime.dataStore.getAll("terminations"),
        vehicleComplianceIssues: runtime.dataStore.getAll("vehicleComplianceIssues"),
        storageStatus: importState.storageBridge ? importState.storageBridge.getStatus() : null
      });
      var afterHash = typeof runtime.notificationCenter.getStateHash === "function"
        ? runtime.notificationCenter.getStateHash()
        : beforeHash;
      renderNotificationCenter();
      if (afterHash !== beforeHash) {
        persistNotificationCollection(afterHash);
      } else {
        runtimeUiState.lastNotificationHash = afterHash;
      }
    } finally {
      runtimeUiState.notificationSyncInFlight = false;
    }
  }

  function renderNotificationCenter() {
    ensureTopbarRuntimeScaffolding();
    var runtime = getRuntime();
    var center = runtime && runtime.notificationCenter;
    var countNode = byId("topbarNotificationCount");
    var panel = byId("topbarNotificationPanel");
    if (!countNode || !panel) {
      return;
    }
    panel.hidden = !runtimeUiState.notificationPanelOpen;
    if (bootModeState.safeMode || !center) {
      countNode.textContent = "0";
      if (runtimeUiState.notificationPanelOpen) {
        panel.innerHTML = [
          '<div class="topbar-notification-panel__head">',
          "  <div>",
          "    <h3>الإشعارات</h3>",
          "    <p>وضع الأمان يعطل مزامنة الإشعارات المشتقة. يمكن متابعة الصفحات الأساسية فقط.</p>",
          "  </div>",
          "</div>",
          '<div class="topbar-notification-safe">لا توجد إشعارات تفاعلية في وضع الأمان.</div>'
        ].join("");
      }
      return;
    }
    var drawerModel = buildNotificationDrawerModel(center.list({
      includeHidden: true,
      includeResolved: true,
      status: "all"
    }));
    var notifications = drawerModel.items || [];
    var unreadCount = drawerModel.unreadCount || 0;
    countNode.textContent = String(drawerModel.unreadCount || 0);
    if (!runtimeUiState.notificationPanelOpen) {
      return;
    }
    panel.innerHTML = [
      '<div class="topbar-notification-panel__head">',
      '  <div>',
      '    <h3>الإشعارات</h3>',
      '    <p>إشعارات التشغيل والاستيراد والتخزين مرتبة حسب الأولوية.</p>',
      "  </div>",
      '  <span class="topbar-notification-count">' + escapeHtml(String(drawerModel.unreadCount || 0)) + "</span>",
      "</div>",
      renderNotificationQuickFilters(drawerModel.quickFilters || []),
      '<div class="topbar-notification-panel__filters">',
      '  <label class="field"><span>الخطورة</span><select id="topbarNotificationSeverity">',
      renderOption("all", "الكل", runtimeUiState.notificationFilter.severity),
      renderOption("info", "Info", runtimeUiState.notificationFilter.severity),
      renderOption("success", "Success", runtimeUiState.notificationFilter.severity),
      renderOption("warning", "Warning", runtimeUiState.notificationFilter.severity),
      renderOption("danger", "Danger", runtimeUiState.notificationFilter.severity),
      renderOption("critical", "Critical", runtimeUiState.notificationFilter.severity),
      renderOption("task", "Task", runtimeUiState.notificationFilter.severity),
      "  </select></label>",
      '  <label class="field"><span>الحالة</span><select id="topbarNotificationStatus">',
      renderOption("all", "الكل", runtimeUiState.notificationFilter.status),
      renderOption("unread", "غير مقروء", runtimeUiState.notificationFilter.status),
      renderOption("read", "مقروء", runtimeUiState.notificationFilter.status),
      "  </select></label>",
      '  <label class="field"><span>المصدر</span><select id="topbarNotificationSource">',
      renderOption("all", "كل المصادر", runtimeUiState.notificationFilter.sourceModule),
      renderOption("dashboard_users", "يوزرات الداشبورد", runtimeUiState.notificationFilter.sourceModule),
      renderOption("current_assignments", "التسكين الحالي", runtimeUiState.notificationFilter.sourceModule),
      renderOption("import", "الاستيراد", runtimeUiState.notificationFilter.sourceModule),
      renderOption("storage", "التخزين", runtimeUiState.notificationFilter.sourceModule),
      "  </select></label>",
      '  <label class="field field--wide"><span>بحث</span><input id="topbarNotificationSearch" type="search" placeholder="ابحث باليوزر أو الإقامة أو الدفعة أو الرسالة" value="' + escapeHtml(runtimeUiState.notificationFilter.search || "") + '"></label>',
      "</div>",
      '<div class="topbar-notification-panel__actions">',
      '  <button type="button" class="btn light" data-notification-action="refresh">Refresh</button>',
      "</div>",
      '<div class="topbar-notification-list">',
      notifications.length ? notifications.map(renderNotificationItem).join("") : '<div class="empty">لا توجد إشعارات مطابقة للفلاتر الحالية.</div>',
      "</div>"
    ].join("");
  }

  function renderNotificationItem(item) {
    return [
      '<article class="topbar-notification-item' + (item.status !== "read" ? " is-unread" : "") + '">',
      '  <div class="topbar-notification-item__row">',
      '    <h4 class="topbar-notification-item__title">' + escapeHtml(item.title || "Notification") + "</h4>",
      '    <div class="topbar-notification-badges">',
      '      <span class="topbar-notification-module">' + escapeHtml(item.sourceModuleLabel || item.sourceModule || item.source || "system") + "</span>",
      '      <span class="topbar-notification-severity is-' + escapeHtml(String(item.severity || "info").toLowerCase()) + '">' + escapeHtml(notificationSeverityLabel(item.severity)) + "</span>",
      "    </div>",
      "  </div>",
      '  <div class="topbar-notification-item__message">' + escapeHtml(item.message || "-") + "</div>",
      item.entitySummary ? '<div class="topbar-notification-item__entity">' + escapeHtml(item.entitySummary) + "</div>" : "",
      '  <div class="topbar-notification-item__meta">',
      '    <span>' + escapeHtml(item.statusLabel || item.status || "unread") + "</span>",
      '    <span>' + escapeHtml(formatOperationalStamp(item.updatedAt || item.createdAt || "")) + "</span>",
      item.relatedCity ? '    <span>' + escapeHtml(item.relatedCity) + "</span>" : "",
      item.relatedRegister ? '    <span>' + escapeHtml(item.relatedRegister) + "</span>" : "",
      "  </div>",
      '  <div class="topbar-notification-item__buttons">',
      '<button type="button" class="btn gold" data-notification-action="open-issue" data-notification-id="' + escapeHtml(item.id) + '">مراجعة</button>',
      item.canOpenDrawer
        ? '<button type="button" class="btn light" data-notification-action="open-linked-drawer" data-notification-id="' + escapeHtml(item.id) + '">' + escapeHtml(item.openDrawerLabel || "فتح") + "</button>"
        : "",
      item.status === "read"
        ? '<button type="button" class="btn light" data-notification-action="mark-unread" data-notification-id="' + escapeHtml(item.id) + '">غير مقروء</button>'
        : '<button type="button" class="btn light" data-notification-action="mark-read" data-notification-id="' + escapeHtml(item.id) + '">تمت القراءة</button>',
      "  </div>",
      "</article>"
    ].join("");
  }

  function renderNotificationQuickFilters(filters) {
    return [
      '<div class="topbar-notification-quick-filters">',
      (filters || []).map(function (filter) {
        return '<button type="button" class="topbar-notification-chip' + (filter.isActive ? " is-active" : "") + '" data-notification-quick-filter="' + escapeHtml(filter.id) + '">' +
          "<span>" + escapeHtml(filter.label) + "</span>" +
          "<strong>" + escapeHtml(String(filter.count || 0)) + "</strong>" +
          "</button>";
      }).join(""),
      "</div>"
    ].join("");
  }

  function buildNotificationDrawerModel(notifications) {
    if (Portal.NotificationDrawerModel && typeof Portal.NotificationDrawerModel.buildDrawerModel === "function") {
      return Portal.NotificationDrawerModel.buildDrawerModel(notifications || [], runtimeUiState.notificationFilter);
    }
    return {
      items: notifications || [],
      quickFilters: [],
      totalCount: (notifications || []).length,
      unreadCount: (notifications || []).filter(function (item) {
        return String(item && item.status || "").toLowerCase() === "unread";
      }).length
    };
  }

  function notificationSeverityLabel(value) {
    var normalized = String(value || "info").toLowerCase();
    if (normalized === "critical" || normalized === "danger") {
      return "حرجة";
    }
    if (normalized === "warning" || normalized === "task") {
      return "تحذير";
    }
    if (normalized === "success") {
      return "نجاح";
    }
    return "معلومة";
  }

  function renderDeveloperTools() {
    var host = byId("settingsDeveloperTools");
    if (!host) {
      return;
    }
    var runtime = getRuntime();
    var devDataReset = runtime && runtime.devDataReset;
    var resettableCount = devDataReset && typeof devDataReset.getResettableEntities === "function"
      ? devDataReset.getResettableEntities().length
      : 0;
    var storageStatus = importState.storageBridge ? importState.storageBridge.getStatus() : {
      label: "Browser Local",
      mode: "browser_local"
    };
    host.innerHTML = [
      '<div class="dev-tools-card">',
      '  <div class="dev-tools-card__warning">',
      '    سيتم حذف بيانات التشغيل التجريبية من المتصفح و/أو data/local-db حسب اختيارك. لن يتم حذف القوالب أو ملفات المصدر أو ملفات المشروع المرجعية.',
      '  </div>',
      '  <div class="dev-tools-card__grid">',
      '    <div class="status-box"><strong>Current Storage Mode</strong><div>' + escapeHtml(storageStatus.label || "Browser Local") + "</div></div>",
      '    <div class="status-box"><strong>Resettable Collections</strong><div>' + escapeHtml(String(resettableCount)) + "</div></div>",
      "  </div>",
      '  <label class="toggle"><input id="devDataResetBackup" type="checkbox"' + (runtimeUiState.backupBeforeReset ? " checked" : "") + '> <span>Backup before reset</span></label>',
      '  <div class="dev-tools-card__actions">',
      '    <button type="button" class="btn light" data-dev-reset-action="browser">Reset Browser Data</button>',
      '    <button type="button" class="btn light" data-dev-reset-action="node">Reset Node Local DB</button>',
      '    <button type="button" class="btn red" data-dev-reset-action="all">Reset All Dev Data</button>',
      "  </div>",
      '  <div class="dev-tools-card__log">' + escapeHtml(buildDeveloperToolsLog(storageStatus)) + "</div>",
      "</div>"
    ].join("");
  }

  function buildDeveloperToolsLog(storageStatus) {
    var parts = [
      "Mode: " + String(storageStatus.label || "Browser Local")
    ];
    if (storageStatus.lastCheckedAt) {
      parts.push("Last check: " + formatOperationalStamp(storageStatus.lastCheckedAt));
    }
    if (storageStatus.lastSyncedAt) {
      parts.push("Last sync: " + formatOperationalStamp(storageStatus.lastSyncedAt));
    }
    if (storageStatus.lastError) {
      parts.push("Bridge warning: " + storageStatus.lastError);
    }
    return parts.join(" | ");
  }

  function handleRuntimeUiClick(event) {
    var target = event.target;
    if (!target || !target.closest) {
      return;
    }
    var notificationAction = target.closest("[data-notification-action]");
    if (notificationAction) {
      handleNotificationAction(
        notificationAction.getAttribute("data-notification-action") || "",
        notificationAction.getAttribute("data-notification-id") || ""
      );
      return;
    }
    var resetButton = target.closest("[data-dev-reset-action]");
    if (resetButton) {
      openDevResetConfirmation(resetButton.getAttribute("data-dev-reset-action") || "browser");
      return;
    }
    var recoveryAction = target.closest("[data-recovery-action]");
    if (recoveryAction) {
      handleRecoveryAction(recoveryAction.getAttribute("data-recovery-action") || "");
      return;
    }
    var quickFilterButton = target.closest("[data-notification-quick-filter]");
    if (quickFilterButton) {
      runtimeUiState.notificationFilter.quickFilter = quickFilterButton.getAttribute("data-notification-quick-filter") || "all";
      renderNotificationCenter();
      return;
    }
    if (target.closest("#topbarNotificationToggle")) {
      runtimeUiState.notificationPanelOpen = !runtimeUiState.notificationPanelOpen;
      if (runtimeUiState.notificationPanelOpen) {
        markOpenNotificationsAsSeen();
      }
      renderNotificationCenter();
      return;
    }
    if (runtimeUiState.notificationPanelOpen && !target.closest("#topbarNotificationHost")) {
      runtimeUiState.notificationPanelOpen = false;
      renderNotificationCenter();
    }
  }

  function handleRuntimeUiChange(event) {
    var target = event.target;
    if (!target || !target.matches) {
      return;
    }
    if (target.matches("#devDataResetBackup")) {
      runtimeUiState.backupBeforeReset = !!target.checked;
      renderDeveloperTools();
      return;
    }
    if (target.matches("#topbarNotificationSeverity")) {
      runtimeUiState.notificationFilter.severity = target.value || "all";
      renderNotificationCenter();
      return;
    }
    if (target.matches("#topbarNotificationStatus")) {
      runtimeUiState.notificationFilter.status = target.value || "all";
      renderNotificationCenter();
      return;
    }
    if (target.matches("#topbarNotificationSource")) {
      runtimeUiState.notificationFilter.sourceModule = target.value || "all";
      renderNotificationCenter();
    }
  }

  function handleRuntimeUiInput(event) {
    var target = event.target;
    if (!target || !target.matches) {
      return;
    }
    if (target.matches("#topbarNotificationSearch")) {
      runtimeUiState.notificationFilter.search = target.value || "";
      renderNotificationCenter();
    }
  }

  function handleNotificationAction(action, notificationId) {
    var runtime = getRuntime();
    var center = runtime && runtime.notificationCenter;
    if (!center) {
      return;
    }
    if (action === "open-issue") {
      openNotificationRoute(notificationId, false);
      return;
    }
    if (action === "open-linked-drawer") {
      openNotificationRoute(notificationId, true);
      return;
    }
    if (action === "mark-read") {
      var user = getCurrentUser();
      center.markAsRead(notificationId, user && (user.id || user.username || ""));
      persistNotificationCollection();
      renderNotificationCenter();
      return;
    }
    if (action === "mark-unread") {
      center.markAsUnread(notificationId);
      persistNotificationCollection();
      renderNotificationCenter();
      return;
    }
    if (action === "refresh") {
      syncNotificationCenter();
    }
  }

  function openNotificationRoute(notificationId, openDrawer) {
    var runtime = getRuntime();
    var center = runtime && runtime.notificationCenter;
    if (!center) {
      return;
    }
    var notification = typeof center.findById === "function" ? center.findById(notificationId) : null;
    if (!notification) {
      return;
    }
    if (typeof center.markAsOpened === "function") {
      center.markAsOpened(notificationId);
    }
    persistNotificationCollection();
    runtimeUiState.notificationPanelOpen = false;
    if (notificationNavigator && typeof notificationNavigator.navigate === "function") {
      notificationNavigator.navigate(notification, {
        openDrawer: !!openDrawer
      });
    }
    renderNotificationCenter();
  }

  function markOpenNotificationsAsSeen() {
    var runtime = getRuntime();
    var center = runtime && runtime.notificationCenter;
    if (!center || typeof center.markAsSeen !== "function") {
      return;
    }
    var drawerModel = buildNotificationDrawerModel(center.list({
      includeHidden: true,
      includeResolved: true,
      status: "all"
    }));
    var ids = (drawerModel.items || []).map(function (item) {
      return item.id;
    });
    if (!ids.length) {
      return;
    }
    center.markAsSeen(ids);
    persistNotificationCollection();
  }

  function handleNotificationNavigationEvent(event) {
    var detail = event && event.detail ? event.detail : {};
    if (detail.linkedPage !== "import-center") {
      return;
    }
    importState.notificationFocus = {
      batchId: detail.importBatchId || detail.entityId || detail.linkedFilters && detail.linkedFilters.batchId || "",
      importType: detail.linkedFilters && detail.linkedFilters.importType || "",
      templateId: detail.linkedFilters && detail.linkedFilters.templateId || ""
    };
    if (importState.notificationFocus.batchId) {
      importState.selectedBatchId = importState.notificationFocus.batchId;
    }
    renderImportCenter();
  }

  function handleRecoveryAction(action) {
    if (action === "safe-mode") {
      navigateWithQueryFlag("safe", "1");
      return;
    }
    if (action === "disable-node-sync") {
      navigateWithQueryFlag("lite", "1");
      return;
    }
    if (action === "reset-browser") {
      resetBrowserRuntimeData();
      return;
    }
    if (action === "diagnostics") {
      openDiagnosticsDrawer();
    }
  }

  function openDevResetConfirmation(mode) {
    var runtime = getRuntime();
    var devDataReset = runtime && runtime.devDataReset;
    var uiShell = Portal.UIShell || null;
    var resetText = Portal.DevDataResetLib && Portal.DevDataResetLib.RESET_CONFIRM_TEXT
      ? Portal.DevDataResetLib.RESET_CONFIRM_TEXT
      : "RESET";
    if (!devDataReset || !uiShell || typeof uiShell.openModal !== "function") {
      toast("أدوات التصفير غير متاحة في الجلسة الحالية.", "warning");
      return;
    }
    uiShell.openModal({
      title: "تأكيد تصفير البيانات التجريبية",
      confirmLabel: "تنفيذ RESET",
      body: [
        '<div class="ui-modal__form">',
        '  <div class="dev-tools-card__warning">',
        "سيتم حذف بيانات التشغيل التجريبية من المتصفح و/أو data/local-db.",
        "لن يتم حذف ملفات القوالب أو ملفات المصدر أو ملفات المشروع.",
        'اكتب ' + escapeHtml(resetText) + " للتأكيد.",
        "  </div>",
        '  <div class="field">',
        '    <label for="devResetConfirmInput">Confirmation</label>',
        '    <input id="devResetConfirmInput" type="text" autocomplete="off" placeholder="' + escapeHtml(resetText) + '">',
        "  </div>",
        "</div>"
      ].join(""),
      onConfirm: function () {
        if (valueOf("devResetConfirmInput").trim().toUpperCase() !== resetText) {
          toast("يرجى كتابة RESET قبل تنفيذ التصفير.", "warning");
          return false;
        }
        if (typeof uiShell.closeModal === "function") {
          uiShell.closeModal();
        }
        executeDevReset(mode);
        return false;
      }
    });
  }

  async function executeDevReset(mode) {
    var runtime = getRuntime();
    var devDataReset = runtime && runtime.devDataReset;
    if (!devDataReset) {
      toast("تعذر تهيئة خدمة تصفير البيانات.", "error");
      return;
    }
    var payload = {
      backupBeforeReset: runtimeUiState.backupBeforeReset,
      confirmText: Portal.DevDataResetLib && Portal.DevDataResetLib.RESET_CONFIRM_TEXT
        ? Portal.DevDataResetLib.RESET_CONFIRM_TEXT
        : "RESET",
      note: "Prompt 8 developer reset"
    };
    showLoading("جارٍ تنفيذ تصفير البيانات التجريبية...");
    try {
      var result;
      if (mode === "node") {
        result = await devDataReset.resetNodeLocalDb(payload);
      } else if (mode === "all") {
        result = await devDataReset.resetAllDevData(payload);
      } else {
        result = await devDataReset.resetBrowserData(payload);
      }
      if (mode === "browser" || mode === "all") {
        clearImportCenter();
      }
      if (importState.storageBridge && typeof importState.storageBridge.refreshStatus === "function") {
        await importState.storageBridge.refreshStatus();
      }
      runtimeUiState.lastDataUpdate = new Date().toISOString();
      renderHeroHeader();
      renderImportCenter();
      renderSettingsStorageStatus();
      renderDeveloperTools();
      renderTopbarRuntime();
      syncNotificationCenter();
      window.dispatchEvent(new CustomEvent("keeta:data-changed", {
        detail: {
          entityNames: devDataReset.getResettableEntities ? devDataReset.getResettableEntities() : [],
          source: "dev_data_reset"
        }
      }));
      toast(buildResetToastMessage(mode, result), mode === "node" && result && result.status === "skipped" ? "warning" : "success");
    } catch (error) {
      toast(error && error.message ? error.message : "تعذر تنفيذ عملية التصفير.", "error");
    } finally {
      hideLoading();
    }
  }

  function buildResetToastMessage(mode, result) {
    if (mode === "node" && result && result.status === "skipped") {
      return "Node Local DB غير متاح حاليا، وتم الاكتفاء بوضع المتصفح الحالي.";
    }
    if (mode === "all") {
      return "تم تنفيذ Reset All Dev Data بنجاح.";
    }
    if (mode === "node") {
      return "تم تصفير Node Local DB بنجاح.";
    }
    return "تم تصفير بيانات المتصفح التشغيلية بنجاح.";
  }

  function persistNotificationCollection(nextHash) {
    if (isIsolatedVerificationProfile() || !importState.storageBridge || typeof importState.storageBridge.persistCollections !== "function") {
      return;
    }
    if (nextHash && runtimeUiState.lastNotificationHash === nextHash) {
      return;
    }
    runtimeUiState.lastNotificationHash = nextHash || runtimeUiState.lastNotificationHash;
    importState.storageBridge.persistCollections(["notifications"]).catch(function () {
      // Keep the UI responsive when the dev API is unavailable.
    });
  }

  function resolveLastDataUpdate() {
    var runtime = getRuntime();
    var candidates = [];
    if (runtime && runtime.dataStore && typeof runtime.dataStore.getMeta === "function") {
      candidates.push(runtime.dataStore.getMeta("system:lastDataUpdate") || "");
      [
        "auditLogs",
        "importBatches",
        "monthlyRules",
        "performanceMonthly",
        "vehicles",
        "notifications"
      ].forEach(function (entityName) {
        candidates.push(runtime.dataStore.getMeta("entity:" + entityName + ":lastUpdated") || "");
      });
    }
    if (importState.storageBridge) {
      var status = importState.storageBridge.getStatus();
      candidates.push(status.lastSyncedAt || "", status.lastCheckedAt || "");
    }
    candidates = candidates.filter(Boolean).sort();
    return candidates.length ? candidates[candidates.length - 1] : "";
  }

  function formatOperationalStamp(value) {
    if (!value) {
      return "-";
    }
    var dateValue = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
      return String(value);
    }
    try {
      if (Portal.LiveClock && typeof Portal.LiveClock.formatClockStamp === "function") {
        return Portal.LiveClock.formatClockStamp(dateValue);
      }
    } catch (_error) {
      // Fall through to the raw value below.
    }
    return dateValue.toISOString();
  }

  function compactHeroHeader() {
    var hero = document.querySelector(".hero");
    if (!hero) {
      return;
    }
    hero.classList.add("hero--compact");
    var title = hero.querySelector("h1");
    if (title) {
      title.textContent = "\u0634\u0631\u0643\u0629 \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0645\u0642\u0628\u0644\u0629 \u0644\u0646\u0642\u0644 \u0627\u0644\u0637\u0631\u0648\u062f \u0648\u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0644\u0648\u062c\u0633\u062a\u064a\u0629";
    }
    var sub = hero.querySelector(".sub");
    if (sub) {
      sub.textContent = "\u0644\u0648\u062d\u0629 \u062a\u0634\u063a\u064a\u0644 \u0643\u064a\u062a\u0627 \u0628\u0646\u0638\u0627\u0645 \u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0648\u062a\u062e\u0632\u064a\u0646 \u0645\u062d\u0644\u064a \u0645\u0633\u062a\u0642\u0631 \u0648\u0645\u0631\u062a\u0628\u0637 \u0628\u0627\u0644\u0647\u064a\u0643\u0644 \u0627\u0644\u062a\u0646\u0638\u064a\u0645\u064a \u0627\u0644\u062d\u0627\u0644\u064a.";
    }
    var heroNav = hero.querySelector(".hero-nav");
    if (heroNav) {
      heroNav.remove();
    }
    renderHeroHeader();
  }

  function renderHeroHeader() {
    var heroKpis = byId("heroKpis");
    if (!heroKpis) {
      return;
    }
    if (bootModeState.safeMode) {
      heroKpis.innerHTML = "";
      return;
    }
    var runtime = getRuntime();
    var contextSummary = getContextSummary();
    var rulesSummary = getRulesSummary(runtime);
    var importSummary = getImportSummary(runtime);
    var issueSummary = getIssueSummary(runtime);
    heroKpis.innerHTML = [
      heroKpi("Active City / Scope", contextSummary.cityLabel, contextSummary.registerLabel + " \u00b7 " + contextSummary.workModeLabel),
      heroKpi("Active Rules", String(rulesSummary.count), rulesSummary.note),
      heroKpi("Imported Batches", String(importSummary.savedCount), importSummary.note),
      heroKpi("Open Issues", String(issueSummary.total), issueSummary.note)
    ].join("");

    var badges = document.querySelector(".hero-badges");
    if (badges) {
      badges.innerHTML = [
        heroBadge(getCurrentUserSummary()),
        heroBadge(getStorageBadgeSummary())
      ].join("");
    }
  }

  function heroKpi(label, value, meta) {
    return [
      '<div class="hero-kpi">',
      "  <b>" + escapeHtml(label) + "</b>",
      "  <strong>" + escapeHtml(value) + "</strong>",
      "  <small>" + escapeHtml(meta) + "</small>",
      "</div>"
    ].join("");
  }

  function heroBadge(summary) {
    return [
      '<span class="hero-badge">',
      "  <span>" + escapeHtml(summary.title) + "</span>",
      "  <small>" + escapeHtml(summary.meta) + "</small>",
      "</span>"
    ].join("");
  }

  function initStorageBridge() {
    var runtime = getRuntime();
    if (!runtime || !runtime.dataStore || !Portal.StorageBridgeLib || typeof Portal.StorageBridgeLib.createStorageBridge !== "function") {
      return;
    }
    var bridge = Portal.StorageBridgeLib.createStorageBridge({
      apiBaseUrl: "http://127.0.0.1:4174/api",
      dataStore: runtime.dataStore,
      entityNames: listTrackedEntities()
    });
    importState.storageBridge = bridge;
    runtime.storageBridge = bridge;
    if (runtime.devDataReset && typeof runtime.devDataReset.setStorageBridge === "function") {
      runtime.devDataReset.setStorageBridge(bridge);
    }
    runtimeLifecycle.bridgeUnsubscribe = bridge.subscribe(function () {
      runtimeUiState.lastDataUpdate = resolveLastDataUpdate();
      renderTopbarRuntime();
      if (!bootModeState.safeMode) {
        renderHeroHeader();
        renderSettingsStorageStatus();
        renderDeveloperTools();
        syncNotificationCenter();
      }
    });
    if (bootModeState.disableNodeSync) {
      return;
    }
    profileStep("storageBridge.refreshStatus", function () {
      return bridge.refreshStatus();
    }, { phase: "startup" }).then(function () {
      return hydrateCollections(listStartupHydrationEntities(), {
        dispatchChangeEvent: false,
        reason: "startup_hydration"
      });
    }).then(function () {
      runtimeUiState.lastDataUpdate = resolveLastDataUpdate();
      renderSettingsStorageStatus();
      renderHeroHeader();
      renderTopbarRuntime();
      renderDeveloperTools();
      syncNotificationCenter();
    }).catch(function (error) {
      toast(error.message || "\u062a\u0639\u0630\u0631 \u062a\u0647\u064a\u0626\u0629 \u0648\u0636\u0639 \u0627\u0644\u062a\u062e\u0632\u064a\u0646.", "warning");
      renderSettingsStorageStatus();
      renderDeveloperTools();
      syncNotificationCenter();
    });
  }

  function ensureImportScaffolding() {
    var importPage = byId("page-import-center");
    if (!importPage) {
      return;
    }
    if (!byId("importTemplateToolbar")) {
      var actions = byId("importAnalyzeBtn") && byId("importAnalyzeBtn").parentNode;
      if (actions) {
        actions.insertAdjacentHTML("afterend", [
          '<div class="import-template-toolbar" id="importTemplateToolbar">',
          '  <div class="field">',
          '    <label>\u0627\u0644\u0642\u0627\u0644\u0628 \u0627\u0644\u0631\u0633\u0645\u064a <span class="en-label">Official Template</span></label>',
          '    <select id="importTemplateSelect"></select>',
          "  </div>",
          '  <button type="button" class="btn light" id="importDownloadTemplateBtn">Download Template</button>',
          '  <button type="button" class="btn light" id="importDownloadAllTemplatesBtn">Download All Templates</button>',
          '  <button type="button" class="btn gold" id="importViewTemplateRequirementsBtn">View Template Requirements</button>',
          "</div>"
        ].join(""));
      }
    }

    if (!byId("importRouteBanner")) {
      var firstGrid = importPage.querySelector(".grid.grid-2");
      if (firstGrid) {
        firstGrid.insertAdjacentHTML("beforebegin", [
          '<div class="card import-route-context" id="importRouteContext" data-import-read-only="true">',
          '  <div class="note" id="importRouteBanner" data-import-route-banner="true">Import Center · read-only route entry</div>',
          '  <div class="kpi-grid" id="importScopeSummary" style="margin-top:12px"></div>',
          '  <div class="kpi-grid" id="importValidationSummary" style="margin-top:12px"></div>',
          '  <div class="mini-stack" id="importPipelineStatus" style="margin-top:12px"></div>',
          '</div>'
        ].join(""));
      }
    }

    if (!byId("importCanonicalPreviewHost")) {
      var previewPanel = byId("importPreviewPanel");
      if (previewPanel) {
        previewPanel.insertAdjacentHTML("beforeend", [
          '<section id="importCanonicalPreviewHost" style="margin-top:14px">',
          '  <h3>Canonical Preview</h3>',
          '  <div class="table-wrap"><table data-import-preview-table="true"><thead id="importCanonicalPreviewHead"></thead><tbody id="importCanonicalPreviewBody"></tbody></table></div>',
          '  <div class="mini-stack" id="importRowIssues" data-import-row-issues="true" style="margin-top:12px"></div>',
          '</section>'
        ].join(""));
      }
    }

    if (!byId("importFocusedBatchDetail")) {
      var historyBody = byId("importHistoryBody");
      var historyCard = historyBody ? historyBody.closest(".card") : null;
      if (historyCard) {
        historyCard.insertAdjacentHTML("beforeend", '<div class="surface" id="importFocusedBatchDetail" data-import-focused-batch="" data-import-read-only="true" style="margin-top:14px"></div>');
      }
    }

    if (!byId("importTemplateMatchHost") && byId("importPreviewMeta")) {
      byId("importPreviewMeta").insertAdjacentHTML("afterend", [
        '<div class="import-preview-toolbar" id="importTemplateMatchHost">',
        '  <div class="import-template-badge" id="importTemplateMatchBadge">\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0644\u0641 \u0645\u062d\u062f\u062f</div>',
        '  <button type="button" class="btn light" id="importApplyMappingBtn">\u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629</button>',
        '  <button type="button" class="btn light" id="importPreviewRequirementsBtn">View Template Requirements</button>',
        '  <button type="button" class="btn light" id="importPreviewTemplateBtn">Download Template</button>',
        "</div>",
        '<div class="import-field-map" id="importFieldMappingHost"></div>'
      ].join(""));
    }

    if (!byId("settingsStorageStatus")) {
      var settingsPage = byId("page-settings-shell");
      var settingsGrid = settingsPage ? settingsPage.querySelector(".grid") : null;
      if (settingsGrid) {
        settingsGrid.insertAdjacentHTML("beforeend", [
          '<div class="card">',
          '  <span class="eyebrow">Storage Mode</span>',
          '  <h2 class="section-title">\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u0648\u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629</h2>',
          '  <div id="settingsStorageStatus"></div>',
          "</div>"
        ].join(""));
      }
    }

    if (!byId("settingsDeveloperTools")) {
      var settingsShell = byId("page-settings-shell");
      var settingsGridHost = settingsShell ? settingsShell.querySelector(".grid") : null;
      if (settingsGridHost) {
        settingsGridHost.insertAdjacentHTML("beforeend", [
          '<div class="card">',
          '  <span class="eyebrow">Developer Data Tools</span>',
          '  <h2 class="section-title">أدوات تصفير البيانات التجريبية</h2>',
          '  <div id="settingsDeveloperTools"></div>',
          '</div>'
        ].join(""));
      }
    }
  }

  function initImportCenter() {
    var input = byId("importBatchFiles");
    if (input && input.parentNode) {
      var replacement = input.cloneNode(true);
      replacement.value = "";
      input.parentNode.replaceChild(replacement, input);
    }
    populateImportSelects();
    if (isPrompt813Verification() && !importState.entryRequest) {
      importState.entryRequest = { city: "Jeddah", register: "EXPRESS", platform: "keeta", month: "2026-07", routeId: "performance_pipeline_import", routeLabel: "Performance Pipeline Import", defaultImportType: "performance_daily_csv", defaultTargetEntity: "performanceDaily", templateId: "daily_performance" };
      importState.notificationFocus = { batchId: "batch_prompt_8_13_daily_1", importType: "daily_performance", templateId: "daily_performance" };
      importState.selectedBatchId = "batch_prompt_8_13_daily_1";
    }
    syncImportScopeDefaults();
    var importPage = byId("page-import-center");
    if (!importPage) {
      return;
    }
    importPage.addEventListener("click", handleImportPageClick);
    importPage.addEventListener("change", handleImportPageChange);
  }

  function populateImportSelects() {
    populateTemplateSelect(byId("importTemplateSelect"));
    populateImportTypeSelect(byId("importManualType"));
    populateTargetEntitySelect(byId("importManualTargetEntity"));
    populateRegisterSelect(byId("importManualRegister"), "");
  }

  function syncImportScopeDefaults() {
    var context = getOrganizationContext();
    var cityValue = context.selectedCities.length === 1 ? context.selectedCities[0] : "";
    var registerValue = context.selectedRegisters.length === 1 ? context.selectedRegisters[0] : "";
    var requestedRoute = importState.entryRequest || {};
    if (byId("importCity")) {
      byId("importCity").value = cityValue || requestedRoute.city || "\u062c\u062f\u0629";
    }
    if (byId("importManualCity")) {
      byId("importManualCity").value = cityValue || requestedRoute.city || "";
    }
    populateRegisterSelect(byId("importManualRegister"), registerValue || requestedRoute.register || "");
    applyEntryRequestDefaults();
  }

  function handleImportPageClick(event) {
    var historyRow = event.target.closest("[data-import-history-batch-id]");
    if (historyRow) {
      focusImportBatch(historyRow.getAttribute("data-import-history-batch-id"), { routeLabel: "Import Batch History" });
      return;
    }
    var actionNode = event.target.closest("[data-import-action]");
    if (actionNode) {
      handleInventoryAction(actionNode.getAttribute("data-import-action"), actionNode.getAttribute("data-batch-id"));
      return;
    }
    var target = event.target;
    if (target.matches("#importAnalyzeBtn")) {
      event.preventDefault();
      analyzePendingFiles();
      return;
    }
    if (target.matches("#importClearBtn")) {
      event.preventDefault();
      clearImportCenter();
      return;
    }
    if (target.matches("#importDownloadTemplateBtn")) {
      event.preventDefault();
      downloadSelectedTemplate();
      return;
    }
    if (target.matches("#importDownloadAllTemplatesBtn")) {
      event.preventDefault();
      downloadAllTemplates();
      return;
    }
    if (target.matches("#importViewTemplateRequirementsBtn")) {
      event.preventDefault();
      openTemplateRequirementsDrawer(getSelectedTemplateId());
      return;
    }
    if (target.matches("#importPreviewTemplateBtn")) {
      event.preventDefault();
      downloadBatchTemplate(getSelectedBatch());
      return;
    }
    if (target.matches("#importPreviewRequirementsBtn")) {
      event.preventDefault();
      var selectedBatch = getSelectedBatch();
      openTemplateRequirementsDrawer(resolveDraftTemplateId(selectedBatch));
      return;
    }
    if (target.matches("#importApplyMappingBtn")) {
      event.preventDefault();
      applyBatchReview();
      return;
    }
    if (target.matches("#importSaveBtn")) {
      event.preventDefault();
      saveSelectedBatch();
      return;
    }
    if (target.matches("#importRejectBtn")) {
      event.preventDefault();
      rejectSelectedBatch();
      return;
    }
    if (target.matches("#importRedetectBtn")) {
      event.preventDefault();
      redetectSelectedBatch();
      return;
    }
    if (target.matches("#importExportDetectionBtn")) {
      event.preventDefault();
      exportSelectedDetectionReport();
    }
  }

  function handleImportPageChange(event) {
    var target = event.target;
    if (target.matches("#importBatchFiles")) {
      importState.pendingFiles = Array.prototype.slice.call(target.files || []);
      analyzePendingFiles();
      return;
    }
    if (target.matches("#importTemplateSelect")) {
      renderImportCenter();
      return;
    }
    if (target.matches("#importManualType")) {
      updateSelectedBatchDraftFromInputs();
      syncDraftWithImportType(getSelectedBatch());
      renderPreviewPanel(getSelectedBatch());
      return;
    }
    if (
      target.matches("#importManualTargetEntity") ||
      target.matches("#importManualCity") ||
      target.matches("#importManualRegister") ||
      target.matches("#importManualMonth") ||
      target.matches(".import-field-map select")
    ) {
      updateSelectedBatchDraftFromInputs();
      markSelectedBatchReviewPending();
      renderPreviewPanel(getSelectedBatch());
    }
  }

  async function analyzePendingFiles() {
    if (!importState.pendingFiles.length) {
      toast("\u0627\u062e\u062a\u0631 \u0645\u0644\u0641\u064b\u0627 \u0623\u0648 \u0623\u0643\u062b\u0631 \u0642\u0628\u0644 \u0628\u062f\u0621 \u0627\u0644\u062a\u062d\u0644\u064a\u0644.", "warning");
      return;
    }
    showLoading("\u062c\u0627\u0631\u064d \u062a\u062d\u0644\u064a\u0644 \u062f\u0641\u0639\u0629 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f...");
    var nextBatches = [];
    try {
      for (var index = 0; index < importState.pendingFiles.length; index += 1) {
        var file = importState.pendingFiles[index];
        var batch = await analyzeFile(file);
        nextBatches.push(batch);
      }
      importState.batches = nextBatches;
      importState.selectedBatchId = nextBatches[0] ? nextBatches[0].id : "";
      renderImportCenter();
      toast("\u062a\u0645 \u062a\u062d\u0644\u064a\u0644 " + String(nextBatches.length) + " \u0645\u0644\u0641/\u0645\u0644\u0641\u0627\u062a \u0628\u0646\u062c\u0627\u062d.", "success");
    } catch (error) {
      toast(error.message || "\u062a\u0639\u0630\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u062f\u0641\u0639\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.", "error");
    } finally {
      hideLoading();
    }
  }

  async function analyzeFile(file) {
    var runtime = assertRuntime();
    var user = getCurrentUser();
    var analysis = await buildFileAnalysis(file);
    var defaults = buildDefaultImportScope();
    var detected = Portal.FileDetector.detectFile(analysis, defaults);
    var headers = getAnalysisHeaders(analysis);
    var templateResult = Portal.ImportTemplateRegistry.matchTemplates(headers, {
      importType: detected.type && detected.type !== "unknown" ? detected.type : ""
    });
    var templateMatch = templateResult.bestMatch;
    var previewBatch = runtime.importBatchService.createPreviewBatch({
      analysis: analysis,
      defaults: defaults,
      fieldMapping: templateMatch ? templateMatch.mapping.byField : {},
      reviewRequired: shouldRequireReview(detected.type, templateMatch),
      user: user
    });
    previewBatch.localFile = file;
    previewBatch.templateMatch = templateMatch;
    previewBatch.reviewConfirmed = !shouldRequireReview(previewBatch.type, templateMatch);
    previewBatch.draft = buildBatchDraft(previewBatch, templateMatch);
    return previewBatch;
  }

  async function buildFileAnalysis(file) {
    var extension = normalizeExtension(file && file.name);
    if (extension === ".csv" || extension === ".txt") {
      return buildDelimitedAnalysis(file, extension);
    }
    if (extension === ".json") {
      return buildJsonAnalysis(file, extension);
    }
    if (extension === ".xlsx" || extension === ".xls" || extension === ".xlsm") {
      return buildWorkbookAnalysis(file, extension);
    }
    if (extension === ".zip") {
      return {
        extension: extension,
        fileName: file.name,
        rowCount: 0,
        size: Number(file.size) || 0
      };
    }
    throw new Error("\u0627\u0645\u062a\u062f\u0627\u062f \u063a\u064a\u0631 \u0645\u062f\u0639\u0648\u0645 \u0641\u064a \u0645\u0631\u0643\u0632 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f: " + extension);
  }

  async function buildDelimitedAnalysis(file, extension) {
    var text = await readFileText(file);
    var tableSummary = Portal.CsvReader.readDelimitedText(file.name, text, {});
    return {
      extension: extension,
      fileName: file.name,
      rowCount: tableSummary.rowCount,
      size: Number(file.size) || 0,
      tableSummary: tableSummary
    };
  }

  async function buildJsonAnalysis(file, extension) {
    var text = await readFileText(file);
    var tableSummary = Portal.CsvReader.readJsonText(file.name, text, {});
    return {
      extension: extension,
      fileName: file.name,
      rowCount: tableSummary.rowCount,
      size: Number(file.size) || 0,
      tableSummary: tableSummary
    };
  }

  async function buildWorkbookAnalysis(file, extension) {
    if (!window.XLSX || typeof window.XLSX.read !== "function") {
      throw new Error("XLSX library is not available in the current browser runtime.");
    }
    var buffer = await readFileArrayBuffer(file);
    var workbook = window.XLSX.read(buffer, {
      type: "array",
      cellFormula: true,
      cellNF: true,
      cellStyles: true
    });
    var workbookSummary = Portal.WorkbookReader.readWorkbook(workbook, {
      extension: extension,
      fileName: file.name
    });
    return {
      extension: extension,
      fileName: file.name,
      rowCount: workbookSummary.totalRowCount,
      size: Number(file.size) || 0,
      workbook: workbook,
      workbookSummary: workbookSummary
    };
  }

  function renderImportCenter() {
    applyEntryRequestDefaults();
    renderImportStatus();
    renderImportKpis();
    renderImportWarnings();
    renderImportInventory();
    renderImportHistory();
    renderPreviewPanel(getSelectedBatch());
    renderImportCenterContext();
  }

  function renderImportCenterContext() {
    var runtime = getRuntime();
    var history = runtime && runtime.importBatchService ? runtime.importBatchService.listRecentBatches(50) : [];
    var focusedId = importState.notificationFocus && importState.notificationFocus.batchId || importState.selectedBatchId || "";
    var focusedBatch = history.filter(function (item) { return String(item.id || item.batchId || "") === String(focusedId); })[0] || getSelectedBatch() || null;
    var request = importState.entryRequest || {};
    var page = byId("page-import-center");
    if (page) {
      page.setAttribute("data-import-route", request.routeId || "import_center");
      page.setAttribute("data-import-template", request.templateId || focusedBatch && focusedBatch.templateId || "");
      page.setAttribute("data-import-focus-batch", focusedId);
      page.setAttribute("data-import-read-only", "true");
    }
    var banner = byId("importRouteBanner");
    if (banner) banner.textContent = (request.routeLabel || "Import Center") + " · " + (request.routeId || "import_center") + " · read-only until explicit Save Import";
    var scope = { city: request.city || focusedBatch && focusedBatch.city || "-", register: request.register || focusedBatch && focusedBatch.register || "-", platform: request.platform || focusedBatch && focusedBatch.platform || "-", month: request.month || focusedBatch && (focusedBatch.month || focusedBatch.cycle) || "-" };
    var scopeHost = byId("importScopeSummary");
    if (scopeHost) scopeHost.innerHTML = [kpiCard("City", scope.city, "kpi"), kpiCard("Register", scope.register, "kpi"), kpiCard("Platform", scope.platform, "kpi"), kpiCard("Month", scope.month, "kpi")].join("");
    renderFocusedBatchContext(focusedBatch, scope);
    renderPipelineContext(history);
  }

  function renderFocusedBatchContext(batch, scope) {
    var detail = byId("importFocusedBatchDetail");
    var previewPanel = byId("importPreviewPanel");
    var previewEmpty = byId("importPreviewEmpty");
    if (!batch) {
      if (detail) detail.innerHTML = '<div class="empty">Select a batch history row to inspect its read-only traceability context.</div>';
      return;
    }
    var normalized = Portal.ImportCenterViewModel ? Portal.ImportCenterViewModel.normalizeBatch(batch) : batch;
    if (detail) {
      detail.setAttribute("data-import-focused-batch", normalized.batchId || "");
      detail.innerHTML = [
        '<h3>Focused Batch Detail · Read Only</h3>',
        '<div class="grid grid-3">',
        previewMetaCard("Batch ID", normalized.batchId), previewMetaCard("Source File", normalized.sourceFileName), previewMetaCard("Template", normalized.templateId),
        previewMetaCard("Import Type", normalized.importType), previewMetaCard("Target Entity", normalized.targetEntity), previewMetaCard("Status", normalized.status),
        '</div>'
      ].join("");
    }
    var rows = batch.previewRows || [];
    if (rows.length && previewPanel && previewEmpty) { previewEmpty.style.display = "none"; previewPanel.style.display = "block"; }
    var template = Portal.ImportCenterViewModel && Portal.ImportCenterViewModel.getTemplate(batch.templateId || "daily_performance");
    var validation = Portal.ImportValidationModel ? Portal.ImportValidationModel.validateBatch({ template: template, rows: rows, city: scope.city === "-" ? "" : scope.city, register: scope.register === "-" ? "" : scope.register, platform: scope.platform === "-" ? "" : scope.platform, month: scope.month === "-" ? "" : scope.month }) : { summary: {}, issues: [] };
    var summary = mergeObjects({ ready: 0, warning: 0, invalid: 0, blocked: 0 }, validation.summary || {});
    if (batch.readyCount != null) summary.ready = Number(batch.readyCount) || 0;
    if (batch.warningCount != null) summary.warning = Number(batch.warningCount) || 0;
    if (batch.invalidCount != null) summary.invalid = Number(batch.invalidCount) || 0;
    var summaryHost = byId("importValidationSummary");
    if (summaryHost) summaryHost.innerHTML = [kpiCard("Ready", summary.ready, "kpi good"), kpiCard("Warning", summary.warning, "kpi warn"), kpiCard("Invalid", summary.invalid, "kpi bad"), kpiCard("Blocked", summary.blocked, "kpi bad")].join("");
    renderCanonicalPreview(rows, template, validation.issues || []);
  }

  function renderCanonicalPreview(rows, template, issues) {
    var head = byId("importCanonicalPreviewHead"); var body = byId("importCanonicalPreviewBody"); var issueHost = byId("importRowIssues");
    if (!head || !body || !issueHost) return;
    var columns = template && template.previewColumns && template.previewColumns.length ? template.previewColumns : ["sourceRowNumber", "userId", "city", "register", "validationStatus"];
    head.innerHTML = "<tr>" + columns.map(function (column) { return "<th>" + escapeHtml(column) + "</th>"; }).join("") + "</tr>";
    body.innerHTML = rows.length ? rows.map(function (row) { return "<tr data-source-row-number=\"" + escapeHtml(row.sourceRowNumber || row.rowNumber || "") + "\">" + columns.map(function (column) { return "<td>" + escapeHtml(row[column] == null ? "" : String(row[column])) + "</td>"; }).join("") + "</tr>"; }).join("") : '<tr><td class="empty" colspan="' + columns.length + '">No canonical preview rows are stored for this batch.</td></tr>';
    issueHost.innerHTML = issues.length ? issues.map(function (item) { return '<div class="import-issue import-issue--' + escapeHtml(item.severity) + '" data-import-issue-code="' + escapeHtml(item.issueCode) + '"><strong>Row ' + escapeHtml(item.sourceRowNumber || "batch") + ' · ' + escapeHtml(item.issueCode) + '</strong><div>' + escapeHtml(item.message) + '</div><small>' + escapeHtml(item.suggestedAction) + '</small></div>'; }).join("") : '<div class="note">No row-level issues.</div>';
  }

  function renderPipelineContext(history) {
    var host = byId("importPipelineStatus"); if (!host || !Portal.ReportPipeline) return;
    var available = {};
    (history || []).forEach(function (batch) { var type = String(batch.importType || batch.type || ""); available[type] = batch.status === "saved" || batch.status === "preview"; });
    var stages = Portal.ReportPipeline.evaluate(available);
    host.innerHTML = '<div class="list">' + stages.map(function (stage) { return '<div class="list-item" data-pipeline-stage="' + escapeHtml(stage.id) + '"><span>' + escapeHtml(stage.id) + '</span><span class="pill ' + (stage.ready ? "green" : "gold") + '">' + escapeHtml(stage.status) + '</span></div>'; }).join("") + '</div>';
  }

  function isPrompt813Verification() {
    return /(?:\?|&)verify=(?:8_13|prompt_8_13)(?:&|$)/i.test(window.location.search || "") && /prompt8_13_import_pipeline/i.test(window.location.search || "");
  }

  function renderImportStatus() {
    var statusNode = byId("importStatus");
    if (!statusNode) {
      return;
    }
    var bridgeStatus = importState.storageBridge ? importState.storageBridge.getStatus() : null;
    var fileCount = importState.pendingFiles.length;
    var storageLabel = bridgeStatus ? bridgeStatus.label : "Browser Local";
    var baseMessage = fileCount
      ? "\u062a\u0645 \u0627\u062e\u062a\u064a\u0627\u0631 " + String(fileCount) + " \u0645\u0644\u0641/\u0645\u0644\u0641\u0627\u062a. \u0648\u0636\u0639 \u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u062d\u0627\u0644\u064a: " + storageLabel + "."
      : "\u0627\u0631\u0641\u0639 CSV / XLSX / XLSM / JSON \u0645\u0639 \u0645\u0639\u0627\u064a\u0646\u0629 \u0625\u0644\u0632\u0627\u0645\u064a\u0629 \u0642\u0628\u0644 \u0627\u0644\u062d\u0641\u0638. \u0648\u0636\u0639 \u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u062d\u0627\u0644\u064a: " + storageLabel + ".";
    if (importState.entryRequest && importState.entryRequest.routeLabel) {
      statusNode.textContent = baseMessage + " " + "\u0645\u062f\u062e\u0644 \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u062d\u0627\u0644\u064a: " + importState.entryRequest.routeLabel + ".";
      return;
    }
    statusNode.textContent = baseMessage;
  }

  function renderImportKpis() {
    var host = byId("importKpis");
    if (!host) {
      return;
    }
    var stats = importState.batches.reduce(function (memo, batch) {
      memo.total += 1;
      if (batch.status === "saved") {
        memo.saved += 1;
      }
      if (batch.templateMatch && batch.templateMatch.state === "auto") {
        memo.auto += 1;
      }
      if (batch.templateMatch && batch.templateMatch.state !== "auto") {
        memo.review += 1;
      }
      return memo;
    }, { auto: 0, review: 0, saved: 0, total: 0 });
    host.innerHTML = [
      kpiCard("Selected Files", stats.total || 0, "kpi"),
      kpiCard("Auto Mapped", stats.auto || 0, "kpi good"),
      kpiCard("Need Review", stats.review || 0, "kpi warn"),
      kpiCard("Saved Batches", stats.saved || 0, "kpi")
    ].join("");
  }

  function kpiCard(label, value, className) {
    return '<div class="' + escapeHtml(className) + '"><b>' + escapeHtml(label) + "</b><strong>" + escapeHtml(String(value)) + "</strong></div>";
  }

  function renderImportWarnings() {
    var host = byId("importWarnings");
    if (!host) {
      return;
    }
    var warnings = [];
    importState.batches.forEach(function (batch) {
      (batch.warnings || []).forEach(function (warning) {
        warnings.push(formatToken(warning));
      });
      if (batch.templateMatch && batch.templateMatch.state !== "auto") {
        warnings.push("\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629 \u0642\u0628\u0644 \u0627\u0644\u062d\u0641\u0638: " + batch.sourceFileName);
      }
    });
    warnings = uniqueStrings(warnings).slice(0, 6);
    host.innerHTML = warnings.length
      ? warnings.map(function (warning) {
          return '<div class="note">' + escapeHtml(warning) + "</div>";
        }).join("")
      : '<div class="note">\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u062d\u0630\u064a\u0631\u0627\u062a \u0645\u0639\u0644\u0642\u0629 \u0641\u064a \u062f\u0641\u0639\u0629 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f.</div>';
  }

  function renderImportInventory() {
    var body = byId("importBody");
    if (!body) {
      return;
    }
    body.innerHTML = importState.batches.length
      ? importState.batches.map(renderInventoryRow).join("")
      : '<tr><td colspan="9" class="empty">\u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u0644\u064a\u0644 \u0623\u064a \u0645\u0644\u0641 \u0628\u0639\u062f.</td></tr>';
  }

  function renderInventoryRow(batch) {
    var typeLabel = Portal.ImportTypes.getImportType(batch.type || "unknown").label || batch.type;
    var templateTone = batch.templateMatch ? batch.templateMatch.state : "manual";
    var isSelected = batch.id === importState.selectedBatchId;
    return [
      "<tr>",
      "  <td>" + escapeHtml(batch.sourceFileName || "-") + "</td>",
      "  <td>" + escapeHtml(typeLabel) + "</td>",
      '  <td><span class="pill ' + escapeHtml(toneToPill(templateTone)) + '">' + escapeHtml(batch.status || "preview") + "</span></td>",
      "  <td>" + escapeHtml(batch.register || "-") + "</td>",
      "  <td>" + escapeHtml(batch.city || "-") + "</td>",
      "  <td>" + escapeHtml(batch.month || "-") + "</td>",
      "  <td>" + escapeHtml(batch.meta || "-") + "</td>",
      "  <td>" + escapeHtml(formatConfidence(batch.confidence)) + "</td>",
      '  <td><button type="button" class="btn ' + (isSelected ? "gold" : "light") + '" data-import-action="select" data-batch-id="' + escapeHtml(batch.id) + '">\u0645\u0639\u0627\u064a\u0646\u0629</button></td>',
      "</tr>"
    ].join("");
  }

  function renderImportHistory() {
    var body = byId("importHistoryBody");
    var runtime = getRuntime();
    if (!body || !runtime || !runtime.importBatchService) {
      return;
    }
    var history = runtime.importBatchService.listRecentBatches(20);
    body.innerHTML = history.length
      ? history.map(function (batch) {
          var isFocused = importState.notificationFocus && importState.notificationFocus.batchId && importState.notificationFocus.batchId === batch.id;
          return [
            '<tr' + (isFocused ? ' class="import-history-row is-focused"' : "") + ' data-import-history-batch-id="' + escapeHtml(batch.id || "") + '">',
            "  <td>" + escapeHtml(batch.updatedAt || batch.createdAt || "-") + "</td>",
            "  <td>" + escapeHtml(batch.sourceFileName || "-") + "</td>",
            "  <td>" + escapeHtml(Portal.ImportTypes.getImportType(batch.type || "unknown").label || batch.type) + "</td>",
            "  <td>" + escapeHtml(batch.status || "-") + "</td>",
            "  <td>" + escapeHtml(batch.targetEntity || "-") + "</td>",
            "  <td>" + escapeHtml((batch.city || "-") + " / " + (batch.register || "-")) + "</td>",
            "  <td>" + escapeHtml(String(batch.savedRecordCount || 0)) + "</td>",
            "</tr>"
          ].join("");
        }).join("")
      : '<tr><td colspan="7" class="empty">\u0644\u0627 \u064a\u0648\u062c\u062f \u0623\u0631\u0634\u064a\u0641 \u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0628\u0639\u062f.</td></tr>';
  }

  function renderPreviewPanel(batch) {
    var panel = byId("importPreviewPanel");
    var empty = byId("importPreviewEmpty");
    if (!panel || !empty) {
      return;
    }
    if (!batch) {
      empty.style.display = "";
      panel.style.display = "none";
      if (byId("importFieldMappingHost")) {
        byId("importFieldMappingHost").innerHTML = "";
      }
      if (byId("importTemplateMatchBadge")) {
        byId("importTemplateMatchBadge").className = "import-template-badge";
        byId("importTemplateMatchBadge").textContent = "\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0644\u0641 \u0645\u062d\u062f\u062f";
      }
      return;
    }
    empty.style.display = "none";
    panel.style.display = "block";

    populateImportTypeSelect(byId("importManualType"), batch.draft.fileType);
    populateTargetEntitySelect(byId("importManualTargetEntity"), batch.draft.targetEntity);
    populateRegisterSelect(byId("importManualRegister"), batch.draft.register);
    if (byId("importManualCity")) {
      byId("importManualCity").value = batch.draft.city || "";
    }
    if (byId("importManualMonth")) {
      byId("importManualMonth").value = batch.draft.month || "";
    }
    if (byId("importSelectedFileName")) {
      byId("importSelectedFileName").value = batch.sourceFileName || "";
    }

    renderPreviewMeta(batch);
    renderTemplateMatch(batch);
    renderPreviewIssues(batch);
    renderFieldMapping(batch);
    renderPreviewTable(batch);
    syncPreviewButtons(batch);
  }

  function renderPreviewMeta(batch) {
    var host = byId("importPreviewMeta");
    if (!host) {
      return;
    }
    host.innerHTML = [
      '<div class="import-preview-meta-grid">',
      previewMetaCard("\u0627\u0644\u0645\u0644\u0641", batch.sourceFileName || "-"),
      previewMetaCard("\u0627\u0644\u0642\u0627\u0644\u0628", resolveTemplateLabel(batch)),
      previewMetaCard("\u0627\u0644\u062b\u0642\u0629", formatConfidence(batch.confidence)),
      previewMetaCard("\u0627\u0644\u0635\u0641\u0648\u0641", String(batch.rowCount || 0)),
      "</div>"
    ].join("");
  }

  function previewMetaCard(label, value) {
    return '<div class="import-preview-card"><b>' + escapeHtml(label) + "</b><strong>" + escapeHtml(value) + "</strong></div>";
  }

  function renderTemplateMatch(batch) {
    var badge = byId("importTemplateMatchBadge");
    if (!badge) {
      return;
    }
    var match = getTemplateMatchForBatch(batch);
    var tone = match ? match.state : "manual";
    var text = match
      ? match.templateLabel + " \u00b7 " + formatConfidence(match.confidence)
      : "\u0644\u0645 \u064a\u062a\u0645 \u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0647\u064a\u062f\u0631\u0632 \u0645\u0639 \u0642\u0627\u0644\u0628 \u0645\u0639\u0631\u0648\u0641";
    badge.className = "import-template-badge is-" + tone;
    badge.textContent = text;
  }

  function renderPreviewIssues(batch) {
    var host = byId("importPreviewIssues");
    if (!host) {
      return;
    }
    var issues = batch.validation && batch.validation.issues ? batch.validation.issues : [];
    host.innerHTML = issues.length
      ? '<div class="import-issues">' + issues.map(renderIssue).join("") + "</div>"
      : '<div class="import-empty-note">\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0645\u0627\u0646\u0639\u0629 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641.</div>';
  }

  function renderIssue(issue) {
    return [
      '<div class="import-issue import-issue--' + escapeHtml(issue.severity || "info") + '">',
      "  <strong>" + escapeHtml(issue.message || issue.code || "-") + "</strong>",
      "  <div>" + escapeHtml(formatToken(issue.code || issue.severity || "")) + "</div>",
      "  <small>" + escapeHtml(issue.suggestion || "") + "</small>",
      "</div>"
    ].join("");
  }

  function renderFieldMapping(batch) {
    var host = byId("importFieldMappingHost");
    if (!host) {
      return;
    }
    var templateDefinition = Portal.ImportTemplateRegistry.getTemplate(resolveDraftTemplateId(batch));
    if (!templateDefinition) {
      host.innerHTML = '<div class="import-empty-note">\u0627\u062e\u062a\u0631 \u0646\u0648\u0639 \u0627\u0644\u0645\u0644\u0641 \u0644\u0625\u0638\u0647\u0627\u0631 \u062d\u0642\u0648\u0644 \u0627\u0644\u0631\u0628\u0637 \u0627\u0644\u064a\u062f\u0648\u064a.</div>';
      return;
    }
    var headers = (batch.headers || []).slice();
    if (!headers.length && batch.preview && batch.preview.previewHeaders) {
      headers = batch.preview.previewHeaders.slice();
    }
    var rows = templateDefinition.columns.map(function (column) {
      return renderFieldMappingRow(column, batch, headers);
    }).join("");
    host.innerHTML = rows;
  }

  function renderFieldMappingRow(column, batch, headers) {
    var selectedHeader = (batch.draft.fieldMapping && batch.draft.fieldMapping[column.fieldName]) || "";
    return [
      '<div class="import-field-map__row">',
      "  <div><strong>" + escapeHtml(column.header) + "</strong><small>" + escapeHtml(column.required ? "required" : "optional") + "</small></div>",
      '  <div><select data-field-name="' + escapeHtml(column.fieldName) + '"><option value="">--</option>' + headers.map(function (header) {
        return '<option value="' + escapeHtml(header) + '"' + (header === selectedHeader ? " selected" : "") + ">" + escapeHtml(header) + "</option>";
      }).join("") + "</select></div>",
      "  <div><small>" + escapeHtml(column.aliases.slice(0, 5).join(" \u2022 ")) + "</small></div>",
      "</div>"
    ].join("");
  }

  function renderPreviewTable(batch) {
    var head = byId("importPreviewHead");
    var body = byId("importPreviewBody");
    if (!head || !body) {
      return;
    }
    var headers = batch.preview ? batch.preview.previewHeaders : [];
    var rows = batch.preview ? batch.preview.previewRows : [];
    head.innerHTML = headers.length ? "<tr>" + headers.map(function (header) {
      return "<th>" + escapeHtml(header) + "</th>";
    }).join("") + "</tr>" : "";
    body.innerHTML = rows.length ? rows.map(function (row) {
      return "<tr>" + headers.map(function (header) {
        return "<td>" + escapeHtml(String(row[header] == null ? "" : row[header])) + "</td>";
      }).join("") + "</tr>";
    }).join("") : '<tr><td colspan="' + Math.max(1, headers.length) + '" class="empty">\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u0648\u0641 \u0644\u0644\u0645\u0639\u0627\u064a\u0646\u0629.</td></tr>';
  }

  function syncPreviewButtons(batch) {
    var saveButton = byId("importSaveBtn");
    var applyButton = byId("importApplyMappingBtn");
    if (saveButton) {
      saveButton.disabled = batch.preview ? !batch.preview.canSave : true;
    }
    if (applyButton) {
      applyButton.disabled = !shouldRequireReview(batch.draft.fileType, getTemplateMatchForBatch(batch));
    }
  }

  function updateSelectedBatchDraftFromInputs() {
    var batch = getSelectedBatch();
    if (!batch) {
      return;
    }
    batch.draft.fileType = valueOf("importManualType");
    batch.draft.targetEntity = valueOf("importManualTargetEntity");
    batch.draft.city = valueOf("importManualCity");
    batch.draft.register = valueOf("importManualRegister");
    batch.draft.month = valueOf("importManualMonth");
    batch.draft.fieldMapping = batch.draft.fieldMapping || {};
    qsa("#importFieldMappingHost select[data-field-name]").forEach(function (selectNode) {
      batch.draft.fieldMapping[selectNode.getAttribute("data-field-name")] = selectNode.value || "";
    });
  }

  function syncDraftWithImportType(batch) {
    if (!batch) {
      return;
    }
    var templateDefinition = Portal.ImportTemplateRegistry.getTemplateByImportType(batch.draft.fileType || "");
    if (!templateDefinition) {
      return;
    }
    batch.draft.templateId = templateDefinition.id;
    batch.draft.targetEntity = templateDefinition.targetEntity;
    var templateMatch = Portal.ImportTemplateRegistry.matchTemplates(getAnalysisHeaders(batch.analysis), {
      importType: batch.draft.fileType
    }).bestMatch;
    if (templateMatch && templateMatch.mapping && templateMatch.mapping.byField) {
      batch.draft.fieldMapping = mergeObjects({}, templateMatch.mapping.byField, batch.draft.fieldMapping || {});
    }
  }

  function markSelectedBatchReviewPending() {
    var batch = getSelectedBatch();
    if (!batch) {
      return;
    }
    batch.reviewConfirmed = false;
    var refreshed = rebuildPreviewBatch(batch, false);
    replaceSelectedBatch(refreshed);
  }

  function applyBatchReview() {
    var batch = getSelectedBatch();
    if (!batch) {
      return;
    }
    updateSelectedBatchDraftFromInputs();
    var refreshed = rebuildPreviewBatch(batch, true);
    if (!hasRequiredFieldMappings(refreshed)) {
      toast("\u064a\u0631\u062c\u0649 \u0631\u0628\u0637 \u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0642\u0628\u0644 \u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629.", "warning");
      replaceSelectedBatch(refreshed);
      return;
    }
    refreshed.reviewConfirmed = true;
    refreshed.preview = Portal.ImportPreviewLib.buildImportPreview(refreshed, {});
    replaceSelectedBatch(refreshed);
    toast("\u062a\u0645 \u0627\u0639\u062a\u0645\u0627\u062f \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0631\u0628\u0637 \u0644\u0644\u0645\u0644\u0641 \u0627\u0644\u0645\u062d\u062f\u062f.", "success");
  }

  function rebuildPreviewBatch(batch, manualMappingApplied) {
    var runtime = assertRuntime();
    var user = getCurrentUser();
    var templateMatch = Portal.ImportTemplateRegistry.matchTemplates(getAnalysisHeaders(batch.analysis), {
      importType: batch.draft.fileType || batch.type || ""
    }).bestMatch;
    var previewBatch = runtime.importBatchService.createPreviewBatch({
      id: batch.id,
      analysis: batch.analysis,
      defaults: buildDefaultImportScope(),
      fieldMapping: mergeObjects({}, templateMatch && templateMatch.mapping ? templateMatch.mapping.byField : {}, batch.draft.fieldMapping || {}),
      manualMapping: {
        city: batch.draft.city || "",
        fileType: batch.draft.fileType || "",
        month: batch.draft.month || "",
        register: batch.draft.register || "",
        targetEntity: batch.draft.targetEntity || ""
      },
      manualMappingApplied: manualMappingApplied === true,
      reviewRequired: shouldRequireReview(batch.draft.fileType || batch.type, templateMatch),
      user: user
    });
    previewBatch.localFile = batch.localFile;
    previewBatch.templateMatch = templateMatch;
    previewBatch.reviewConfirmed = manualMappingApplied === true;
    previewBatch.draft = mergeObjects({}, batch.draft, {
      targetEntity: batch.draft.targetEntity || previewBatch.targetEntity,
      templateId: resolveTemplateId(batch.draft.fileType || previewBatch.type, templateMatch)
    });
    return previewBatch;
  }

  async function saveSelectedBatch() {
    var batch = getSelectedBatch();
    if (!batch) {
      return;
    }
    updateSelectedBatchDraftFromInputs();
    var reviewRequired = shouldRequireReview(batch.draft.fileType || batch.type, getTemplateMatchForBatch(batch));
    if (reviewRequired && !batch.reviewConfirmed) {
      toast("\u064a\u0631\u062c\u0649 \u0627\u0644\u0636\u063a\u0637 \u0639\u0644\u0649 \u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0642\u0628\u0644 \u0627\u0644\u062d\u0641\u0638.", "warning");
      return;
    }
    showLoading("\u062c\u0627\u0631\u064d \u062d\u0641\u0638 \u062f\u0641\u0639\u0629 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f...");
    try {
      var runtime = assertRuntime();
      var savedBatch = runtime.importBatchService.saveImportBatch({
        id: batch.id,
        analysis: batch.analysis,
        defaults: buildDefaultImportScope(),
        fieldMapping: batch.draft.fieldMapping || {},
        manualMapping: {
          city: batch.draft.city || "",
          fileType: batch.draft.fileType || batch.type || "",
          month: batch.draft.month || "",
          register: batch.draft.register || "",
          targetEntity: batch.draft.targetEntity || ""
        },
        manualMappingApplied: reviewRequired ? true : !!batch.reviewConfirmed,
        reviewRequired: reviewRequired,
        user: getCurrentUser()
      });
      savedBatch.localFile = batch.localFile;
      savedBatch.templateMatch = getTemplateMatchForBatch(batch);
      savedBatch.reviewConfirmed = true;
      savedBatch.draft = batch.draft;
      replaceSelectedBatch(savedBatch);
      await persistSavedCollections(savedBatch);
      dispatchDataChanged(savedBatch);
      renderImportCenter();
      toast("\u062a\u0645 \u062d\u0641\u0638 \u062f\u0641\u0639\u0629 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0628\u0646\u062c\u0627\u062d.", "success");
    } catch (error) {
      toast(error.message || "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u062f\u0641\u0639\u0629 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f.", "error");
    } finally {
      hideLoading();
    }
  }

  async function rejectSelectedBatch() {
    var batch = getSelectedBatch();
    if (!batch) {
      return;
    }
    try {
      var runtime = assertRuntime();
      var rejected = runtime.importBatchService.rejectImportBatch({
        id: batch.id,
        analysis: batch.analysis,
        defaults: buildDefaultImportScope(),
        manualMapping: {
          city: batch.draft.city || "",
          fileType: batch.draft.fileType || batch.type || "",
          month: batch.draft.month || "",
          register: batch.draft.register || "",
          targetEntity: batch.draft.targetEntity || ""
        },
        user: getCurrentUser()
      });
      rejected.localFile = batch.localFile;
      rejected.templateMatch = getTemplateMatchForBatch(batch);
      rejected.reviewConfirmed = batch.reviewConfirmed;
      rejected.draft = batch.draft;
      replaceSelectedBatch(rejected);
      await persistCollections(["auditLogs", "importBatches"]);
      renderImportCenter();
      toast("\u062a\u0645 \u0631\u0641\u0636 \u0627\u0644\u062f\u0641\u0639\u0629 \u0627\u0644\u0645\u062d\u062f\u062f\u0629.", "info");
    } catch (error) {
      toast(error.message || "\u062a\u0639\u0630\u0631 \u0631\u0641\u0636 \u0627\u0644\u062f\u0641\u0639\u0629.", "error");
    }
  }

  function redetectSelectedBatch() {
    var batch = getSelectedBatch();
    if (!batch) {
      return;
    }
    updateSelectedBatchDraftFromInputs();
    var refreshed = rebuildPreviewBatch(batch, false);
    replaceSelectedBatch(refreshed);
    toast("\u062a\u0645 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0641\u062d\u0635 \u0628\u062d\u0633\u0628 \u0627\u0644\u0627\u062e\u062a\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u062d\u0627\u0644\u064a\u0629.", "success");
  }

  function exportSelectedDetectionReport() {
    var batch = getSelectedBatch();
    if (!batch) {
      return;
    }
    var report = Portal.ImportPreviewLib.buildDetectionReport(batch);
    downloadBlob(JSON.stringify(report, null, 2), sanitizeFileName(batch.sourceFileName || "import-batch") + "-detection.json", "application/json");
    toast("\u062a\u0645 \u062a\u062c\u0647\u064a\u0632 \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0643\u0634\u0641 \u0644\u0644\u062a\u0635\u062f\u064a\u0631.", "success");
  }

  function handleInventoryAction(action, batchId) {
    if (action !== "select") {
      return;
    }
    importState.selectedBatchId = batchId || "";
    if (!batchId || !importState.notificationFocus || importState.notificationFocus.batchId !== batchId) {
      importState.notificationFocus = null;
    }
    renderImportCenter();
  }

  function clearImportCenter() {
    importState.batches = [];
    importState.entryRequest = null;
    importState.notificationFocus = null;
    importState.pendingFiles = [];
    importState.selectedBatchId = "";
    if (byId("importBatchFiles")) {
      byId("importBatchFiles").value = "";
    }
    renderImportCenter();
  }

  async function persistSavedCollections(savedBatch) {
    var names = resolveChangedCollections(savedBatch);
    await persistCollections(names);
  }

  async function persistCollections(entityNames) {
    if (isIsolatedVerificationProfile() || !importState.storageBridge) {
      return;
    }
    await importState.storageBridge.persistCollections(entityNames);
    renderSettingsStorageStatus();
  }

  function dispatchDataChanged(savedBatch) {
    window.dispatchEvent(new CustomEvent("keeta:data-changed", {
      detail: {
        batchId: savedBatch.id,
        entityNames: resolveChangedCollections(savedBatch),
        source: "import-center"
      }
    }));
  }

  function resolveChangedCollections(savedBatch) {
    var names = ["auditLogs", "importBatches"];
    (savedBatch.savedEntities || []).forEach(function (entitySummary) {
      if (entitySummary && entitySummary.entityName) {
        names.push(entitySummary.entityName);
      }
    });
    if (/^performance_/.test(String(savedBatch.type || "")) || /^(vda_|face_verification_|delivery_experience_)/.test(String(savedBatch.type || ""))) {
      names.push("performanceDaily", "performanceMonthly", "validityResults", "performanceIssues", "vdaResults", "faceVerification", "deliveryExperience");
    }
    return uniqueStrings(names);
  }

  function renderSettingsStorageStatus() {
    var host = byId("settingsStorageStatus");
    if (!host) {
      return;
    }
    var bridgeStatus = importState.storageBridge ? importState.storageBridge.getStatus() : {
      adapterInfo: getRuntime() && getRuntime().dataStore ? getRuntime().dataStore.getAdapterInfo() : { active: "unknown", persistent: false },
      label: "Browser Local",
      lastCheckedAt: "",
      lastSyncedAt: "",
      mode: "browser_local"
    };
    host.innerHTML = [
      '<div class="storage-status-card">',
      '  <span class="storage-status-card__pill ' + escapeHtml(storageToneClass(bridgeStatus.mode)) + '">' + escapeHtml(bridgeStatus.label) + "</span>",
      "  <div>\u064a\u0633\u062a\u062e\u062f\u0645 \u0647\u0630\u0627 \u0627\u0644\u0634\u064a\u0644 DataStore + BrowserLocalStore \u062f\u0627\u0626\u0645\u064b\u0627\u060c \u0645\u0639 \u0645\u0632\u0627\u0645\u0646\u0629 Node Local DB \u0639\u0646\u062f \u062a\u0648\u0641\u0631 Dev API.</div>",
      '  <div class="storage-status-grid">',
      storageCell("\u0627\u0644\u0645\u062d\u0648\u0644 \u0627\u0644\u0641\u0639\u0627\u0644", bridgeStatus.adapterInfo && bridgeStatus.adapterInfo.active ? bridgeStatus.adapterInfo.active : "unknown"),
      storageCell("\u0627\u0644\u062d\u0641\u0638 \u0627\u0644\u062f\u0627\u0626\u0645", bridgeStatus.adapterInfo && bridgeStatus.adapterInfo.persistent ? "yes" : "no"),
      storageCell("Last Check", bridgeStatus.lastCheckedAt || "-"),
      storageCell("Last Sync", bridgeStatus.lastSyncedAt || "-"),
      "</div>",
      "</div>"
    ].join("");
  }

  function storageCell(label, value) {
    return "<div><b>" + escapeHtml(label) + "</b><span>" + escapeHtml(String(value || "-")) + "</span></div>";
  }

  function downloadSelectedTemplate() {
    var templateId = getSelectedTemplateId();
    downloadTemplate(templateId);
  }

  function downloadBatchTemplate(batch) {
    downloadTemplate(resolveDraftTemplateId(batch));
  }

  function downloadTemplate(templateId) {
    var templateDefinition = Portal.ImportTemplateRegistry.getTemplate(templateId);
    if (!templateDefinition) {
      toast("\u0627\u062e\u062a\u0631 \u0642\u0627\u0644\u0628\u064b\u0627 \u0645\u0639\u0631\u0648\u0641\u064b\u0627 \u0642\u0628\u0644 \u0627\u0644\u062a\u062d\u0645\u064a\u0644.", "warning");
      return;
    }
    if (!window.XLSX || typeof window.XLSX.writeFile !== "function") {
      toast("XLSX writeFile is not available in this browser runtime.", "error");
      return;
    }
    var workbook = Portal.ImportTemplateRegistry.createTemplateWorkbook(templateDefinition.id, window.XLSX);
    window.XLSX.writeFile(workbook, "template-" + templateDefinition.id + ".xlsx");
  }

  function downloadAllTemplates() {
    if (!window.XLSX || typeof window.XLSX.writeFile !== "function") {
      toast("XLSX writeFile is not available in this browser runtime.", "error");
      return;
    }
    var workbook = Portal.ImportTemplateRegistry.createTemplateBundleWorkbook(window.XLSX);
    window.XLSX.writeFile(workbook, "keeta-import-templates-bundle.xlsx");
  }

  function openTemplateRequirementsDrawer(templateId) {
    var templateDefinition = Portal.ImportTemplateRegistry.getTemplate(templateId);
    if (!templateDefinition) {
      toast("\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u062a\u0637\u0644\u0628\u0627\u062a \u0642\u0627\u0644\u0628 \u0645\u062a\u0627\u062d\u0629 \u062d\u0627\u0644\u064a\u064b\u0627.", "warning");
      return;
    }
    openDrawer(templateDefinition.label, buildTemplateRequirementsHtml(templateDefinition));
  }

  function buildTemplateRequirementsHtml(templateDefinition) {
    return [
      '<div class="import-issues">',
      renderRequirementCard("\u0627\u0644\u0643\u064a\u0627\u0646 \u0627\u0644\u0645\u0633\u062a\u0647\u062f\u0641", templateDefinition.targetEntity),
      renderRequirementCard("\u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0646\u0641\u064a\u0630\u064a\u0629", templateDefinition.implementationStatus || "ready"),
      renderRequirementCard("\u0627\u0644\u0645\u0641\u062a\u0627\u062d \u0627\u0644\u0623\u0633\u0627\u0633\u064a", templateDefinition.primaryKey || "-"),
      renderRequirementCard("\u0627\u0644\u0645\u0641\u0627\u062a\u064a\u062d \u0627\u0644\u062b\u0627\u0646\u0648\u064a\u0629", (templateDefinition.secondaryKeys || []).join(", ")),
      renderRequirementCard("\u0627\u0644\u0647\u064a\u062f\u0631\u0632 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629", (templateDefinition.requiredHeaders || []).join(", ")),
      renderRequirementCard("\u0627\u0644\u0647\u064a\u062f\u0631\u0632 \u0627\u0644\u0627\u062e\u062a\u064a\u0627\u0631\u064a\u0629", (templateDefinition.optionalHeaders || []).join(", ")),
      renderRequirementCard("\u0627\u0644\u0623\u0639\u0645\u062f\u0629 \u0627\u0644\u0645\u062d\u0633\u0648\u0628\u0629", (templateDefinition.computedHeaders || []).join(", ")),
      renderRequirementCard("\u0642\u0648\u0627\u0639\u062f \u0627\u0644\u062a\u062d\u0642\u0642", (templateDefinition.validationRules || []).join(" \u2022 ")),
      renderRequirementCard("Import Types", (templateDefinition.supportedImportTypes || templateDefinition.importTypes || []).join(", ")),
      renderRequirementCard("\u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062a", (templateDefinition.relationships || []).join(" \u2022 ")),
      "</div>"
    ].join("");
  }

  function renderRequirementCard(label, value) {
    return '<div class="import-issue import-issue--info"><strong>' + escapeHtml(label) + "</strong><div>" + escapeHtml(value || "-") + "</div></div>";
  }

  function getSelectedBatch() {
    return importState.batches.filter(function (batch) {
      return batch.id === importState.selectedBatchId;
    })[0] || null;
  }

  function replaceSelectedBatch(batch) {
    importState.batches = importState.batches.map(function (entry) {
      return entry.id === batch.id ? batch : entry;
    });
    importState.selectedBatchId = batch.id;
    renderImportCenter();
  }

  function buildBatchDraft(batch, templateMatch) {
    return {
      city: batch.city || valueOf("importCity") || "",
      fieldMapping: mergeObjects({}, batch.mapping && batch.mapping.byField ? batch.mapping.byField : {}),
      fileType: batch.type || "",
      month: batch.month || "",
      register: batch.register || "",
      targetEntity: batch.targetEntity || "",
      templateId: resolveTemplateId(batch.type, templateMatch)
    };
  }

  function resolveTemplateId(importTypeId, templateMatch) {
    if (templateMatch && templateMatch.templateId) {
      return templateMatch.templateId;
    }
    var templateDefinition = Portal.ImportTemplateRegistry.getTemplateByImportType(importTypeId || "");
    return templateDefinition ? templateDefinition.id : "";
  }

  function resolveDraftTemplateId(batch) {
    if (!batch) {
      return getSelectedTemplateId();
    }
    return batch.draft && batch.draft.templateId
      ? batch.draft.templateId
      : resolveTemplateId(batch.draft && batch.draft.fileType ? batch.draft.fileType : batch.type, getTemplateMatchForBatch(batch));
  }

  function resolveTemplateLabel(batch) {
    var templateDefinition = Portal.ImportTemplateRegistry.getTemplate(resolveDraftTemplateId(batch));
    return templateDefinition ? templateDefinition.label : "\u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641";
  }

  function getTemplateMatchForBatch(batch) {
    if (!batch) {
      return null;
    }
    var templateMatch = Portal.ImportTemplateRegistry.matchTemplates(getAnalysisHeaders(batch.analysis), {
      importType: batch.draft && batch.draft.fileType ? batch.draft.fileType : batch.type
    }).bestMatch;
    batch.templateMatch = templateMatch;
    return templateMatch;
  }

  function shouldRequireReview(importTypeId, templateMatch) {
    if (!templateMatch) {
      return !!Portal.ImportTemplateRegistry.getTemplateByImportType(importTypeId || "") || !importTypeId || importTypeId === "unknown";
    }
    return templateMatch.state !== "auto";
  }

  function hasRequiredFieldMappings(batch) {
    var templateDefinition = Portal.ImportTemplateRegistry.getTemplate(resolveDraftTemplateId(batch));
    if (!templateDefinition) {
      return true;
    }
    return templateDefinition.requiredFields.every(function (fieldName) {
      return !!(batch.draft && batch.draft.fieldMapping && batch.draft.fieldMapping[fieldName]);
    });
  }

  function getSelectedTemplateId() {
    return valueOf("importTemplateSelect") || Portal.ImportTemplateRegistry.TEMPLATES[0].id;
  }

  function populateTemplateSelect(selectNode) {
    if (!selectNode) {
      return;
    }
    var selectedValue = (importState.entryRequest && importState.entryRequest.templateId) ||
      selectNode.value ||
      (Portal.ImportTemplateRegistry.TEMPLATES[0] && Portal.ImportTemplateRegistry.TEMPLATES[0].id) || "";
    selectNode.innerHTML = Portal.ImportTemplateRegistry.listTemplates().map(function (templateDefinition) {
      return '<option value="' + escapeHtml(templateDefinition.id) + '"' + (templateDefinition.id === selectedValue ? " selected" : "") + ">" + escapeHtml(templateDefinition.label) + "</option>";
    }).join("");
  }

  function populateImportTypeSelect(selectNode, selectedValue) {
    if (!selectNode) {
      return;
    }
    var types = Portal.ImportTypes.listImportTypes().filter(function (item) {
      return item.id !== "unknown" && item.id !== "zip_reference";
    });
    selectNode.innerHTML = types.map(function (item) {
      var isSelected = String(item.id) === String(selectedValue || selectNode.value || "");
      return '<option value="' + escapeHtml(item.id) + '"' + (isSelected ? " selected" : "") + ">" + escapeHtml(item.label) + "</option>";
    }).join("");
  }

  function populateTargetEntitySelect(selectNode, selectedValue) {
    if (!selectNode) {
      return;
    }
    selectNode.innerHTML = Portal.ImportTypes.getSupportedTargetEntities().map(function (entityName) {
      var isSelected = String(entityName) === String(selectedValue || selectNode.value || "");
      return '<option value="' + escapeHtml(entityName) + '"' + (isSelected ? " selected" : "") + ">" + escapeHtml(entityName) + "</option>";
    }).join("");
  }

  function populateRegisterSelect(selectNode, selectedValue) {
    if (!selectNode) {
      return;
    }
    var registers = getRuntime() && getRuntime().dataStore
      ? getRuntime().dataStore.getAll("registers")
      : [];
    var options = ['<option value="">\u063a\u064a\u0631 \u0645\u062d\u062f\u062f</option>'].concat(registers.map(function (register) {
      var value = register.code || register.id || "";
      var label = register.name || value;
      var isSelected = String(value) === String(selectedValue || selectNode.value || "");
      return '<option value="' + escapeHtml(value) + '"' + (isSelected ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
    }));
    selectNode.innerHTML = options.join("");
  }

  function getContextSummary() {
    var context = getOrganizationContext();
    var cityLabel = context.selectedCities.length === 1 ? context.selectedCities[0] : "\u0643\u0644 \u0627\u0644\u0645\u062f\u0646";
    var registerLabel = context.selectedRegisters.length === 1
      ? Portal.ImportTypes.registerLabel(context.selectedRegisters[0])
      : "\u0643\u0644 \u0627\u0644\u0633\u062c\u0644\u0627\u062a";
    return {
      cityLabel: cityLabel,
      registerLabel: registerLabel,
      workModeLabel: context.workMode === "all" ? "\u0643\u0644 \u0627\u0644\u0623\u0646\u0638\u0645\u0629" : context.workMode
    };
  }

  function getRulesSummary(runtime) {
    if (!runtime || !runtime.monthlyRulesService || typeof runtime.monthlyRulesService.resolveRulesForContext !== "function") {
      return { count: 0, note: "\u0644\u0645 \u064a\u062a\u0645 \u062a\u0647\u064a\u0626\u0629 \u0645\u062d\u0631\u0643 \u0627\u0644\u0634\u0631\u0648\u0637" };
    }
    var resolved = runtime.monthlyRulesService.resolveRulesForContext(getOrganizationContext(), new Date());
    var activeRule = resolved.activeRule;
    return {
      count: resolved.matches.length,
      note: activeRule ? ((activeRule.month || "-") + " \u00b7 " + (activeRule.version || 1)) : "\u0644\u0627 \u064a\u0648\u062c\u062f \u0642\u0627\u0639\u062f\u0629 \u0646\u0634\u0637\u0629"
    };
  }

  function getImportSummary(runtime) {
    if (!runtime || !runtime.dataStore) {
      return { note: "\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0641\u0639\u0627\u062a \u0645\u0633\u062c\u0644\u0629", savedCount: 0 };
    }
    var totalCount = runtime.dataStore.getMeta && runtime.dataStore.getMeta("entity:importBatches:count")
      ? Number(runtime.dataStore.getMeta("entity:importBatches:count")) || 0
      : runtime.dataStore.getAll("importBatches").length;
    return {
      note: totalCount ? (String(totalCount) + " total batches recorded") : "\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0641\u0639\u0627\u062a \u0645\u0633\u062c\u0644\u0629",
      savedCount: totalCount
    };
  }

  function getIssueSummary(runtime) {
    if (!runtime || !runtime.dataStore) {
      return { note: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0634\u0627\u0643\u0644", total: 0 };
    }
    var performanceIssues = runtime.dataStore.getMeta && runtime.dataStore.getMeta("entity:performanceIssues:count")
      ? Number(runtime.dataStore.getMeta("entity:performanceIssues:count")) || 0
      : runtime.dataStore.getAll("performanceIssues").length;
    var statusReviews = runtime.dataStore.getMeta && runtime.dataStore.getMeta("entity:operationalStatusReviews:count")
      ? Number(runtime.dataStore.getMeta("entity:operationalStatusReviews:count")) || 0
      : runtime.dataStore.getAll("operationalStatusReviews").length;
    return {
      note: String(performanceIssues) + " performance / " + String(statusReviews) + " operations",
      total: performanceIssues + statusReviews
    };
  }

  function getCurrentUserSummary() {
    var user = getCurrentUser();
    if (!user) {
      return { meta: "\u0628\u062f\u0648\u0646 \u062c\u0644\u0633\u0629", title: "\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645" };
    }
    return {
      meta: user.role || "viewer",
      title: user.displayName || user.username || user.id || "\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645"
    };
  }

  function getStorageBadgeSummary() {
    var status = importState.storageBridge ? importState.storageBridge.getStatus() : { label: "Browser Local", lastSyncedAt: "" };
    return {
      meta: status.lastSyncedAt || "\u0628\u062f\u0648\u0646 \u0645\u0632\u0627\u0645\u0646\u0629",
      title: status.label || "Browser Local"
    };
  }

  function resolveStorageModeLabel() {
    var status = importState.storageBridge ? importState.storageBridge.getStatus() : null;
    return status && status.label ? status.label : "Browser Local";
  }

  function resolveStorageModeMode() {
    var status = importState.storageBridge ? importState.storageBridge.getStatus() : null;
    return status && status.mode ? status.mode : "browser_local";
  }

  function resolveStorageModeTitle() {
    var status = importState.storageBridge ? importState.storageBridge.getStatus() : null;
    if (!status) {
      return "Browser Local";
    }
    return [
      status.label || "Browser Local",
      status.lastCheckedAt ? ("Last check: " + formatOperationalStamp(status.lastCheckedAt)) : "",
      status.lastSyncedAt ? ("Last sync: " + formatOperationalStamp(status.lastSyncedAt)) : ""
    ].filter(Boolean).join(" | ");
  }

  function dedupeRuntimeWidgets(host) {
    if (!host || !Portal.RuntimeContainment || typeof Portal.RuntimeContainment.dedupeRuntimeWidgets !== "function") {
      return;
    }
    Portal.RuntimeContainment.dedupeRuntimeWidgets(document, {
      hostId: host.id || "appTopbarRuntime"
    });
  }

  function filterByContext(rows) {
    var context = getOrganizationContext();
    return (rows || []).filter(function (row) {
      if (context.selectedCities && context.selectedCities.length && context.selectedCities.length < 2 && row.city && context.selectedCities.indexOf(row.city) < 0) {
        return false;
      }
      if (context.selectedRegisters && context.selectedRegisters.length && context.selectedRegisters.length < 4 && row.register && context.selectedRegisters.indexOf(row.register) < 0) {
        return false;
      }
      return true;
    });
  }

  function getOrganizationContext() {
    if (Portal.OrganizationContext && typeof Portal.OrganizationContext.getState === "function") {
      return Portal.OrganizationContext.getState();
    }
    return {
      selectedCities: [],
      selectedRegisters: [],
      workMode: "all"
    };
  }

  function buildDefaultImportScope() {
    var context = getOrganizationContext();
    return {
      city: context.selectedCities.length === 1 ? context.selectedCities[0] : (valueOf("importCity") || importState.entryRequest && importState.entryRequest.city || ""),
      month: "",
      register: context.selectedRegisters.length === 1 ? context.selectedRegisters[0] : (importState.entryRequest && importState.entryRequest.register || "")
    };
  }

  function requestImportRouteEntry(routeId, options) {
    options = options || {};
    if (!Portal.LifecycleRegistry || typeof Portal.LifecycleRegistry.resolveImportRoute !== "function") {
      return false;
    }
    var route = Portal.LifecycleRegistry.resolveImportRoute(routeId);
    if (!route) {
      return false;
    }
    var context = getOrganizationContext();
    importState.entryRequest = {
      city: options.city || (context.selectedCities.length === 1 ? context.selectedCities[0] : ""),
      defaultImportType: route.defaultImportType || "",
      defaultTargetEntity: route.defaultTargetEntity || "",
      description: route.description || "",
      register: options.register || (context.selectedRegisters.length === 1 ? context.selectedRegisters[0] : ""),
      routeId: route.id,
      routeLabel: route.label,
      templateId: route.templateIds && route.templateIds[0] ? route.templateIds[0] : ""
    };
    navigateToImportCenter();
    renderImportCenter();
    toast("\u062a\u0645 \u0641\u062a\u062d \u0645\u0631\u0643\u0632 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0639\u0644\u0649 \u0645\u062f\u062e\u0644 " + importState.entryRequest.routeLabel + ".", "info");
    return true;
  }

  function focusImportBatch(batchId, options) {
    batchId = String(batchId || "").trim();
    if (!batchId) {
      return false;
    }
    options = options || {};
    importState.entryRequest = mergeObjects({}, importState.entryRequest || {}, {
      city: options.city || importState.entryRequest && importState.entryRequest.city || "",
      defaultImportType: options.importType || importState.entryRequest && importState.entryRequest.defaultImportType || "",
      defaultTargetEntity: options.targetEntity || importState.entryRequest && importState.entryRequest.defaultTargetEntity || "",
      register: options.register || importState.entryRequest && importState.entryRequest.register || "",
      routeId: options.routeId || importState.entryRequest && importState.entryRequest.routeId || "",
      routeLabel: options.routeLabel || importState.entryRequest && importState.entryRequest.routeLabel || "Import Center",
      templateId: options.templateId || importState.entryRequest && importState.entryRequest.templateId || ""
    });
    importState.notificationFocus = {
      batchId: batchId,
      importType: options.importType || "",
      templateId: options.templateId || ""
    };
    importState.selectedBatchId = batchId;
    if (!navigateToImportCenter()) {
      return false;
    }
    renderImportCenter();
    return true;
  }

  function navigateToImportCenter() {
    if (Portal.UIShell && typeof Portal.UIShell.openPage === "function") {
      Portal.UIShell.openPage("import-center");
      return true;
    }
    var navButton = document.querySelector('.nav-btn[data-page="import-center"]');
    if (navButton) {
      navButton.click();
      return true;
    }
    return false;
  }

  function applyEntryRequestDefaults() {
    if (!importState.entryRequest) {
      return;
    }
    if (!getSelectedBatch()) {
      populateTemplateSelect(byId("importTemplateSelect"));
      populateImportTypeSelect(byId("importManualType"), importState.entryRequest.defaultImportType || "");
      populateTargetEntitySelect(byId("importManualTargetEntity"), importState.entryRequest.defaultTargetEntity || "");
      if (byId("importManualCity") && !byId("importManualCity").value) {
        byId("importManualCity").value = importState.entryRequest.city || "";
      }
      if (byId("importManualRegister")) {
        populateRegisterSelect(byId("importManualRegister"), importState.entryRequest.register || "");
      }
    }
  }

  function getAnalysisHeaders(analysis) {
    if (!analysis) {
      return [];
    }
    if (analysis.workbookSummary && analysis.workbookSummary.bestHeaders) {
      return analysis.workbookSummary.bestHeaders.slice();
    }
    if (analysis.tableSummary && analysis.tableSummary.headers) {
      return analysis.tableSummary.headers.slice();
    }
    return [];
  }

  function getCurrentUser() {
    var runtime = getRuntime();
    if (!runtime || !runtime.auth) {
      return null;
    }
    var currentUser = runtime.auth.getCurrentUser ? runtime.auth.getCurrentUser() : null;
    if (currentUser) {
      return currentUser;
    }
    var users = runtime.auth.getUsers ? runtime.auth.getUsers() : [];
    return users[0] || null;
  }

  function getRuntime() {
    return Portal.Runtime || null;
  }

  function assertRuntime() {
    var runtime = getRuntime();
    if (!runtime || !runtime.importBatchService) {
      throw new Error("Prompt 2 runtime is not available for import operations.");
    }
    return runtime;
  }

  function hydrateCollections(entityNames, options) {
    options = options || {};
    if (
      bootModeState.safeMode ||
      isIsolatedVerificationProfile() ||
      !importState.storageBridge ||
      typeof importState.storageBridge.hydrateEntity !== "function"
    ) {
      return Promise.resolve([]);
    }
    var uniqueNames = uniqueEntityNames(entityNames);
    if (!uniqueNames.length) {
      return Promise.resolve([]);
    }
    var hydrationKey = PageScopedDataLoading && typeof PageScopedDataLoading.buildHydrationKey === "function"
      ? PageScopedDataLoading.buildHydrationKey(options.pageKey || resolveActivePageKey(), uniqueNames)
      : uniqueNames.slice().sort().join("|");
    if (!options.force && runtimeUiState.lastHydrationKey === hydrationKey) {
      return Promise.resolve([]);
    }
    runtimeUiState.lastHydrationKey = hydrationKey;
    return Promise.all(uniqueNames.map(function (entityName) {
      if (runtimeUiState.hydrationInFlight[entityName]) {
        return runtimeUiState.hydrationInFlight[entityName];
      }
      runtimeUiState.hydrationInFlight[entityName] = profileStep("hydrateEntity:" + entityName, function () {
        return importState.storageBridge.hydrateEntity(entityName);
      }, { phase: "hydration" })
        .catch(function () {
          return [];
        })
        .finally(function () {
          delete runtimeUiState.hydrationInFlight[entityName];
        });
      return runtimeUiState.hydrationInFlight[entityName];
    })).then(function (results) {
      if (options.dispatchChangeEvent) {
        window.dispatchEvent(new CustomEvent("keeta:data-changed", {
          detail: {
            entityNames: uniqueNames.slice(),
            source: options.reason || "storage_hydration"
          }
        }));
      }
      return results;
    });
  }

  function isIsolatedVerificationProfile() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return /^prompt8_/i.test(params.get("storageProfile") || "") && !!params.get("verify");
    } catch (_error) {
      return false;
    }
  }

  function listStartupHydrationEntities() {
    return PageScopedDataLoading && typeof PageScopedDataLoading.getStartupEntities === "function"
      ? PageScopedDataLoading.getStartupEntities()
      : ["importBatches", "auditLogs", "notifications"];
  }

  function resolveHydrationEntities(pageKey) {
    if (PageScopedDataLoading && typeof PageScopedDataLoading.resolvePageEntities === "function") {
      var scopedEntities = PageScopedDataLoading.resolvePageEntities(pageKey);
      if (scopedEntities.length) {
        return scopedEntities;
      }
    }
    return [];
  }

  function listTrackedEntities() {
    return [
      "assignments",
      "assignmentHistory",
      "auditLogs",
      "dashboardUsers",
      "deliveryExperience",
      "faceVerification",
      "hrProfiles",
      "importBatches",
      "internalSettlement",
      "invoiceCourierDetail",
      "monthlyRules",
      "notifications",
      "operationalStatusReviews",
      "performanceDaily",
      "performanceIssues",
      "performanceMonthly",
      "riderArchiveEvents",
      "riderIdentities",
      "riderPlatformAccounts",
      "riders",
      "shiftSchedules",
      "terminations",
      "validityResults",
      "vdaResults",
      "vehicles",
      "vehicleAssignments",
      "vehicleCapacityReviews",
      "vehicleComplianceIssues",
      "vehicleImportSnapshots",
      "vehicleMovementEvents"
    ];
  }

  function uniqueEntityNames(entityNames) {
    var seen = {};
    return (entityNames || []).filter(function (entityName) {
      var key = String(entityName || "").trim();
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function mergeRuntimeLoopState(target, source) {
    Object.keys(source || {}).forEach(function (key) {
      if (target[key] == null || target[key] === "") {
        target[key] = source[key];
      }
    });
  }

  function profileStep(name, handler, meta) {
    if (!startupProfiler || typeof startupProfiler.step !== "function") {
      return handler();
    }
    return startupProfiler.step(name, handler, meta || {});
  }

  function finalizeBoot() {
    runtimeUiState.startupCompleted = true;
    runtimeUiState.lastDataUpdate = resolveLastDataUpdate();
    if (startupProfiler && typeof startupProfiler.finalize === "function") {
      var summary = startupProfiler.finalize({
        bootMode: bootModeState.safeMode ? "safe" : (bootModeState.liteMode ? "lite" : "normal")
      });
      window.__keetaStartupProfiler = summary;
      if (summary.events.length) {
        var totalEvent = summary.events.filter(function (item) {
          return item.name === "startup.total";
        })[0];
        if (totalEvent && totalEvent.durationMs >= 5000) {
          openRecoveryPanel({
            durationMs: totalEvent.durationMs,
            reason: "startup_slow"
          });
        }
      }
    }
    if (recoveryController) {
      recoveryController.disarm();
    }
  }

  function ensureSafeModeBanner() {
    var topbar = byId("uiTopbar");
    if (!topbar) {
      return;
    }
    var nextNode = topbar.nextElementSibling;
    if (!bootModeState.safeMode) {
      if (nextNode && nextNode.id === "safeModeBanner") {
        nextNode.remove();
      }
      return;
    }
    if (byId("safeModeBanner")) {
      return;
    }
    topbar.insertAdjacentHTML("afterend", [
      '<section class="safe-mode-banner" id="safeModeBanner">',
      '  <strong>Safe Mode Active</strong>',
      '  <span>heavy runtime disabled</span>',
      "</section>"
    ].join(""));
  }

  function ensureRecoveryPanelHost() {
    if (byId("runtimeRecoveryPanel")) {
      return;
    }
    document.body.insertAdjacentHTML("beforeend", [
      '<section class="runtime-recovery-panel" id="runtimeRecoveryPanel" hidden>',
      '  <div class="runtime-recovery-panel__body">',
      '    <h3>التشغيل الآمن</h3>',
      '    <p id="runtimeRecoveryMessage">الصفحة استغرقت وقتًا طويلًا في التحميل.</p>',
      '    <div class="runtime-recovery-panel__actions">',
      '      <button type="button" class="btn gold" data-recovery-action="safe-mode">فتح Safe Mode</button>',
      '      <button type="button" class="btn light" data-recovery-action="reset-browser">Reset Browser Runtime Data</button>',
      '      <button type="button" class="btn light" data-recovery-action="disable-node-sync">تعطيل Node Sync مؤقتًا</button>',
      '      <button type="button" class="btn dark" data-recovery-action="diagnostics">فتح Diagnostics</button>',
      "    </div>",
      "  </div>",
      "</section>"
    ].join(""));
  }

  function openRecoveryPanel(meta) {
    ensureRecoveryPanelHost();
    var panel = byId("runtimeRecoveryPanel");
    if (!panel) {
      return;
    }
    var message = byId("runtimeRecoveryMessage");
    if (message) {
      var extra = meta && meta.durationMs ? (" (" + Math.round(meta.durationMs) + "ms)") : "";
      message.textContent = "الصفحة استغرقت وقتًا طويلًا في التحميل." + extra;
    }
    panel.hidden = false;
  }

  function closeRecoveryPanel() {
    if (byId("runtimeRecoveryPanel")) {
      byId("runtimeRecoveryPanel").hidden = true;
    }
  }

  function resolveActivePageKey() {
    return Portal.UIShell && typeof Portal.UIShell.getActivePageKey === "function"
      ? Portal.UIShell.getActivePageKey()
      : "dashboard";
  }

  function navigateWithQueryFlag(key, value) {
    if (typeof window === "undefined" || !window.location || typeof URL !== "function") {
      return;
    }
    var nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(key, value);
    window.location.href = nextUrl.toString();
  }

  function resetBrowserRuntimeData() {
    var runtime = getRuntime();
    if (runtime && runtime.devDataReset && typeof runtime.devDataReset.resetBrowserData === "function") {
      runtime.devDataReset.resetBrowserData({
        backupBeforeReset: runtimeUiState.backupBeforeReset !== false
      }).finally(function () {
        closeRecoveryPanel();
      });
      return;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      Object.keys(window.localStorage).filter(function (key) {
        return key.indexOf("keeta.") === 0;
      }).forEach(function (key) {
        window.localStorage.removeItem(key);
      });
      window.location.reload();
    }
  }

  function openDiagnosticsDrawer() {
    var summary = window.__keetaStartupProfiler || { events: [] };
    openDrawer("Startup Diagnostics", [
      '<div class="diag-list">',
      summary.events.length
        ? summary.events.map(function (item) {
            return '<div class="diag-list__item"><strong>' + escapeHtml(item.name) + '</strong><span>' + escapeHtml(String(item.durationMs)) + 'ms</span><small>' + escapeHtml(item.level || "normal") + "</small></div>";
          }).join("")
        : '<div class="empty">No diagnostics recorded yet.</div>',
      "</div>"
    ].join(""));
    closeRecoveryPanel();
  }

  function openDrawer(title, bodyHtml) {
    var titleNode = byId("uiDrawerTitle");
    var bodyNode = byId("uiDrawerBody");
    if (titleNode) {
      titleNode.textContent = title;
    }
    if (bodyNode) {
      bodyNode.innerHTML = bodyHtml;
    }
    document.body.classList.add("ui-drawer-open");
  }

  function showLoading(message) {
    document.body.classList.add("ui-loading");
    if (byId("uiLoadingText")) {
      byId("uiLoadingText").textContent = message || "\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631...";
    }
  }

  function hideLoading() {
    document.body.classList.remove("ui-loading");
  }

  function toast(message, type) {
    var stack = byId("uiToastStack");
    if (!stack) {
      window.alert(message);
      return;
    }
    var node = document.createElement("div");
    node.className = "ui-toast " + (type || "info");
    node.textContent = message;
    stack.appendChild(node);
    window.setTimeout(function () {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }, 3200);
  }

  function downloadBlob(content, fileName, mimeType) {
    var blob = new Blob([content], { type: mimeType || "application/octet-stream" });
    var url = window.URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () {
      window.URL.revokeObjectURL(url);
    }, 0);
  }

  function readFileArrayBuffer(file) {
    if (file.arrayBuffer) {
      return file.arrayBuffer();
    }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function readFileText(file) {
    if (file.text) {
      return file.text();
    }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function storageToneClass(mode) {
    if (mode === "node_local_db") {
      return "is-node";
    }
    if (mode === "api_unavailable_fallback") {
      return "is-fallback";
    }
    return "";
  }

  function toneToPill(state) {
    if (state === "auto") {
      return "";
    }
    if (state === "review") {
      return "gold";
    }
    return "red";
  }

  function formatConfidence(value) {
    return String(Math.round((Number(value) || 0) * 100)) + "%";
  }

  function formatToken(value) {
    return String(value || "").replace(/_/g, " ");
  }

  function normalizeExtension(fileName) {
    var match = String(fileName || "").match(/(\.[^.]+)$/);
    return match ? match[1].toLowerCase() : "";
  }

  function sanitizeFileName(value) {
    return String(value || "download").replace(/[^\w.-]+/g, "-");
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

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  function valueOf(id) {
    return byId(id) ? byId(id).value : "";
  }

  function renderOption(value, label, selectedValue) {
    return '<option value="' + escapeHtml(value) + '"' + (String(value) === String(selectedValue || "") ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function qsa(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
