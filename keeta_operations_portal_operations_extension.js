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
    !Portal.CurrentAssignmentsViewModel ||
    !Portal.AssignmentService ||
    !Portal.SwapService ||
    !Portal.TerminationService
  ) {
    return;
  }

  document.body.dataset.operationsExtensionMode = "prompt5";

  var ImportTypes = Portal.ImportTypes;
  var RBAC = Portal.RBAC;
  var runtime = Portal.Runtime;
  var normalizeOperationMode = Portal.AssignmentWorkflowSupport && typeof Portal.AssignmentWorkflowSupport.normalizeOperationMode === "function"
    ? Portal.AssignmentWorkflowSupport.normalizeOperationMode
    : function (value) {
        return normalizeText(value).toLowerCase();
      };
  var UIShell = Portal.UIShell || null;
  var ActionDropdown = Portal.ActionDropdown || null;
  var CurrentAssignmentsViewModel = Portal.CurrentAssignmentsViewModel || null;
  var OperationsViewModel = Portal.OperationsViewModel || null;
  var DetailsDrawer = Portal.DetailsDrawer || null;
  var AssignmentReadinessService = Portal.AssignmentReadinessService || null;
  var OperationsLogView = Portal.OperationsLogView || null;
  var PageRenderController = Portal.PageRenderController || null;
  var bootModeState = Portal.BootMode && typeof Portal.BootMode.getState === "function"
    ? Portal.BootMode.getState()
    : { safeMode: false };
  var riderResolverFacade = runtime.riderResolverFacade || (
    Portal.RiderResolverFacade && typeof Portal.RiderResolverFacade.createRiderResolverFacade === "function"
      ? Portal.RiderResolverFacade.createRiderResolverFacade(runtime)
      : null
  );
  var assignmentService = Portal.AssignmentService.createAssignmentService(runtime);
  var swapService = Portal.SwapService.createSwapService(runtime);
  var terminationService = Portal.TerminationService.createTerminationService(runtime);
  var actionDropdownController = ActionDropdown && typeof ActionDropdown.createGlobalController === "function"
    ? ActionDropdown.createGlobalController(document)
    : null;
  var operationsLogView = OperationsLogView && typeof OperationsLogView.createOperationsLogView === "function"
    ? OperationsLogView.createOperationsLogView({
        pageSize: 25,
        repository: runtime.repositories && runtime.repositories.auditLogs ? runtime.repositories.auditLogs : null
      })
    : null;

  var state = {
    activeTab: "dashboard_users",
    auditFilters: {
      actorUserId: "",
      city: "",
      dateFrom: "",
      dateTo: "",
      entityType: "",
      eventType: "",
      register: ""
    },
    auditPage: 1,
    drawerDrafts: {
      assign: createDrawerDraft(),
      swap: createDrawerDraft()
    },
    drawerMode: "",
    drawerSearch: "",
    filters: {
      assignmentReadiness: "all",
      assignmentStatus: "all",
      city: "all",
      employmentStatus: "all",
      lifecycleStatus: "all",
      operationMode: "all",
      platform: "all",
      query: "",
      register: "all",
      riderSource: "all",
      reviewStatus: "all",
      supervisor: "all",
      vehicleType: "all"
    },
    notificationFocus: null
  };
  var pageController = PageRenderController && typeof PageRenderController.createPageRenderController === "function"
    ? PageRenderController.createPageRenderController({
        debounceMs: 100,
        onRender: renderPage,
        pageId: "operations-shell"
      })
    : null;

  if (actionDropdownController) {
    actionDropdownController.initialize();
  }

  if (bootModeState.safeMode) {
    return;
  }

  injectStyles();
  scheduleRender("init", 40);

  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("change", handleChange);
  document.addEventListener("keeta:action-dropdown-select", handleActionDropdownSelection);
  document.addEventListener("keeta:notification-navigation", handleNotificationNavigation);
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
      scheduleRender("auth", 80);
    });
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

  function handleClick(event) {
    var importButton = event.target.closest("[data-ops-import-route]");
    if (importButton) {
      openImportRoute(importButton.getAttribute("data-ops-import-route") || "");
      return;
    }
    var auditPageButton = event.target.closest("[data-ops-audit-page]");
    if (auditPageButton) {
      state.auditPage = Math.max(1, Number(auditPageButton.getAttribute("data-ops-audit-page")) || 1);
      scheduleRender("audit-page", 0);
      return;
    }

    var tabButton = event.target.closest("[data-ops-tab]");
    if (tabButton) {
      state.activeTab = tabButton.getAttribute("data-ops-tab") || "dashboard_users";
      scheduleRender("tab", 0);
      return;
    }

    var actionButton = event.target.closest("[data-ops-action]");
    if (actionButton) {
      handleAction(
        actionButton.getAttribute("data-ops-action"),
        actionButton.getAttribute("data-dashboard-user-id"),
        actionButton.getAttribute("data-rider-id")
      );
    }
  }

  function handleActionDropdownSelection(event) {
    var detail = event && event.detail ? event.detail : {};
    var dataset = detail.dataset || {};
    if (dataset.module !== "operations") {
      return;
    }
    handleAction(detail.actionId, dataset.dashboardUserId, dataset.riderId);
  }

  function handleShellRouteChange(event) {
    var route = event && event.detail ? event.detail : {};
    if (String(route.page || "") !== "operations-shell") {
      return;
    }
    state.activeTab = normalizeOperationsRoute(route.subPage);
    scheduleRender("route", 40);
  }

  function handleNotificationNavigation(event) {
    var detail = event && event.detail ? event.detail : {};
    if (String(detail.linkedPage || "") !== "operations-shell") {
      return;
    }
    focusOperationsView(detail, {
      openPage: false,
      reason: "notification-navigation"
    });
  }

  function normalizeOperationsRoute(subPage) {
    if (OperationsViewModel && typeof OperationsViewModel.normalizeOperationsRoute === "function") {
      return OperationsViewModel.normalizeOperationsRoute(subPage);
    }
    var key = normalizeText(subPage).toLowerCase();
    return key || "dashboard_users";
  }

  function applyNotificationFilters(detail) {
    var linkedFilters = detail && detail.linkedFilters ? detail.linkedFilters : {};
    resetOperationalFilters();
    state.filters.city = normalizeText(linkedFilters.city) || "all";
    state.filters.platform = normalizeText(linkedFilters.platform) || "all";
    state.filters.register = normalizeText(linkedFilters.register) || "all";
    state.filters.lifecycleStatus = normalizeText(linkedFilters.lifecycleStatus) || "all";
    state.filters.assignmentReadiness = normalizeText(linkedFilters.assignmentReadiness || linkedFilters.readinessStatus) || "all";
    state.filters.assignmentStatus = normalizeText(linkedFilters.assignmentStatus) || "all";
    state.filters.query = buildNotificationSearchQuery(detail, linkedFilters);
  }

  function resetOperationalFilters() {
    state.filters.assignmentReadiness = "all";
    state.filters.assignmentStatus = "all";
    state.filters.city = "all";
    state.filters.employmentStatus = "all";
    state.filters.lifecycleStatus = "all";
    state.filters.operationMode = "all";
    state.filters.platform = "all";
    state.filters.query = "";
    state.filters.register = "all";
    state.filters.riderSource = "all";
    state.filters.reviewStatus = "all";
    state.filters.supervisor = "all";
    state.filters.vehicleType = "all";
  }

  function buildNotificationSearchQuery(detail, linkedFilters) {
    if (OperationsViewModel && typeof OperationsViewModel.buildNotificationSearchQuery === "function") {
      return OperationsViewModel.buildNotificationSearchQuery(detail, linkedFilters);
    }
    return [
      linkedFilters && linkedFilters.query,
      linkedFilters && linkedFilters.vehicleSerial,
      linkedFilters && linkedFilters.assignmentId,
      linkedFilters && linkedFilters.courierId,
      linkedFilters && linkedFilters.dashboardUserId,
      linkedFilters && linkedFilters.ownerIqama,
      linkedFilters && linkedFilters.actualRiderIqama,
      detail && detail.courierId,
      detail && detail.assignmentId,
      detail && detail.ownerIqama,
      detail && detail.actualRiderIqama
    ].reduce(function (memo, value) {
      normalizeText(value).split(/\s+/).filter(Boolean).forEach(function (part) {
        memo.push(part);
      });
      return memo;
    }, []).filter(uniqueToken).join(" ");
  }

  function buildOperationsFocusDetail(options) {
    options = options || {};
    var user = options.user || null;
    var assignmentRow = options.assignmentRow || null;
    var courierId = normalizeText(options.courierId || assignmentRow && (assignmentRow.dashboardUserId || assignmentRow.courierId) || user && (user.dashboardUserId || user.userId));
    var ownerIqama = normalizeText(options.ownerIqama || assignmentRow && assignmentRow.ownerIqama || user && user.ownerIqama);
    var actualRiderIqama = normalizeText(options.actualRiderIqama || assignmentRow && assignmentRow.actualRiderIqama || user && (user.actualRiderIqama || user.currentRiderIqama));
    var assignmentId = normalizeText(options.assignmentId || assignmentRow && assignmentRow.assignmentId || user && user.currentAssignmentId);
    var vehicleSerial = normalizeText(options.vehicleSerial || assignmentRow && assignmentRow.vehicleSerial || user && user.vehicleSerial);
    return {
      actualRiderIqama: actualRiderIqama,
      assignmentId: assignmentId,
      courierId: courierId,
      entityId: courierId,
      explicitDrawer: !!options.explicitDrawer,
      linkedDrawer: normalizeText(options.linkedDrawer),
      linkedFilters: mergeObjects({
        actualRiderIqama: actualRiderIqama,
        assignmentId: assignmentId,
        city: normalizeText(options.city || assignmentRow && assignmentRow.city || user && user.city),
        courierId: courierId,
        ownerIqama: ownerIqama,
        platform: normalizeText(options.platform || assignmentRow && assignmentRow.platform || user && user.platform),
        register: normalizeText(options.register || assignmentRow && assignmentRow.register || user && user.register),
        vehicleSerial: vehicleSerial
      }, options.linkedFilters || {}),
      linkedPage: "operations-shell",
      linkedSubPage: normalizeOperationsRoute(options.linkedSubPage || "dashboard_users"),
      ownerIqama: ownerIqama
    };
  }

  function focusOperationsView(detail, options) {
    detail = detail || {};
    options = options || {};
    state.activeTab = normalizeOperationsRoute(detail.linkedSubPage || detail.subPage || "dashboard_users");
    applyNotificationFilters(detail);
    state.notificationFocus = {
      actualRiderIqama: normalizeText(detail.actualRiderIqama),
      assignmentId: normalizeText(detail.assignmentId),
      courierId: normalizeText(detail.courierId || detail.entityId),
      explicitDrawer: !!detail.explicitDrawer,
      linkedDrawer: normalizeText(detail.linkedDrawer),
      notificationId: normalizeText(detail.notificationId),
      ownerIqama: normalizeText(detail.ownerIqama)
    };
    if (options.openPage !== false && UIShell && typeof UIShell.openPage === "function") {
      UIShell.openPage("operations-shell", {
        page: "operations-shell",
        subPage: state.activeTab
      });
    }
    scheduleRender(options.reason || "operations-focus", 0);
  }

  function handleInput(event) {
    if (event.target.id === "opsSearchInput") {
      state.filters.query = event.target.value || "";
      scheduleRender("search", 140);
      return;
    }
    if (event.target.id === "opsDrawerRiderSearch") {
      state.drawerSearch = event.target.value || "";
      renderCurrentDrawer();
      return;
    }
    if (event.target.id === "opsAuditActorFilter") {
      state.auditFilters.actorUserId = event.target.value || "";
      state.auditPage = 1;
      scheduleRender("audit-filter", 60);
      return;
    }
    if (event.target.id === "opsAuditDateFrom") {
      state.auditFilters.dateFrom = event.target.value || "";
      state.auditPage = 1;
      scheduleRender("audit-filter", 60);
      return;
    }
    if (event.target.id === "opsAuditDateTo") {
      state.auditFilters.dateTo = event.target.value || "";
      state.auditPage = 1;
      scheduleRender("audit-filter", 60);
      return;
    }
    if ([
      "opsAssignIqama",
      "opsAssignRiderName",
      "opsAssignReason",
      "opsAssignStartDate",
      "opsAssignReceiveDate",
      "opsAssignFirstOnlineDate",
      "opsAssignContactPhone",
      "opsAssignAppPhone",
      "opsAssignIban",
      "opsAssignGasCard",
      "opsAssignTools",
      "opsAssignOperationMode",
      "opsAssignActualVehicle",
      "opsAssignVehicleType",
      "opsAssignPlateNumber",
      "opsAssignVehicleSerial",
      "opsAssignSupervisor"
    ].indexOf(event.target.id) >= 0) {
      syncDraftFromDom("assign");
      if (event.target.id === "opsAssignIqama") {
        getDrawerDraft("assign").riderId = "";
      }
      renderCurrentDrawer();
      return;
    }
    if ([
      "opsSwapIqama",
      "opsSwapRiderName",
      "opsSwapReason",
      "opsSwapDate",
      "opsSwapReceiveDate",
      "opsSwapFirstOnlineDate",
      "opsSwapContactPhone",
      "opsSwapAppPhone",
      "opsSwapIban",
      "opsSwapGasCard",
      "opsSwapTools",
      "opsSwapOperationMode",
      "opsSwapActualVehicle",
      "opsSwapVehicleType",
      "opsSwapPlateNumber",
      "opsSwapVehicleSerial",
      "opsSwapSupervisor"
    ].indexOf(event.target.id) >= 0) {
      syncDraftFromDom("swap");
      if (event.target.id === "opsSwapIqama") {
        getDrawerDraft("swap").riderId = "";
      }
      renderCurrentDrawer();
    }
  }

  function handleChange(event) {
    if (event.target.id === "opsRegisterFilter") {
      state.filters.register = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsCityFilter") {
      state.filters.city = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsPlatformFilter") {
      state.filters.platform = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsLifecycleFilter") {
      state.filters.lifecycleStatus = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsReadinessFilter") {
      state.filters.assignmentReadiness = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsReviewFilter") {
      state.filters.reviewStatus = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsEmploymentFilter") {
      state.filters.employmentStatus = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsModeFilter") {
      state.filters.operationMode = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsVehicleFilter") {
      state.filters.vehicleType = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsAssignmentStatusFilter") {
      state.filters.assignmentStatus = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsRiderSourceFilter") {
      state.filters.riderSource = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsSupervisorFilter") {
      state.filters.supervisor = event.target.value || "all";
      scheduleRender("filter", 80);
      return;
    }
    if (event.target.id === "opsAuditEventFilter") {
      state.auditFilters.eventType = event.target.value || "";
      state.auditPage = 1;
      scheduleRender("audit-filter", 60);
      return;
    }
    if (event.target.id === "opsAuditEntityFilter") {
      state.auditFilters.entityType = event.target.value || "";
      state.auditPage = 1;
      scheduleRender("audit-filter", 60);
      return;
    }
    if (event.target.id === "opsAuditCityFilter") {
      state.auditFilters.city = event.target.value || "";
      state.auditPage = 1;
      scheduleRender("audit-filter", 60);
      return;
    }
    if (event.target.id === "opsAuditRegisterFilter") {
      state.auditFilters.register = event.target.value || "";
      state.auditPage = 1;
      scheduleRender("audit-filter", 60);
      return;
    }
    if (
      event.target.id === "opsAssignRiderSelect" ||
      event.target.id === "opsSwapRiderSelect" ||
      event.target.id === "opsTerminationAction"
    ) {
      if (event.target.id === "opsAssignRiderSelect") {
        syncDrawerDraftWithSelectedRider("assign", event.target.value || "");
      }
      if (event.target.id === "opsSwapRiderSelect") {
        syncDrawerDraftWithSelectedRider("swap", event.target.value || "");
      }
      renderCurrentDrawer();
    }
  }

  function handleSubmit(event) {
    if (event.target.id === "opsAssignForm") {
      event.preventDefault();
      submitAssignment(event.target);
      return;
    }
    if (event.target.id === "opsSwapForm") {
      event.preventDefault();
      submitSwap(event.target);
      return;
    }
    if (event.target.id === "opsTerminationForm") {
      event.preventDefault();
      submitTermination(event.target);
    }
  }

  function openImportRoute(routeId) {
    if (!Portal.ImportEntryPoint || typeof Portal.ImportEntryPoint.openRouteImport !== "function") {
      return false;
    }
    var context = getOrganizationContext();
    return Portal.ImportEntryPoint.openRouteImport(routeId, {
      city: context.selectedCities && context.selectedCities.length === 1 ? context.selectedCities[0] : "",
      register: context.selectedRegisters && context.selectedRegisters.length === 1 ? context.selectedRegisters[0] : ""
    });
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

  function getCollection(entityName) {
    return runtime.dataStore && typeof runtime.dataStore.getAll === "function"
      ? runtime.dataStore.getAll(entityName)
      : [];
  }

  function normalizeText(value) {
    return ImportTypes.normalizeText(value);
  }

  function normalizeRegister(value) {
    return ImportTypes.normalizeRegisterCode(value) || normalizeText(value);
  }

  function escapeSelectorValue(value) {
    return String(value == null ? "" : value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function uniqueToken(value, index, values) {
    return values.indexOf(value) === index;
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  function createDrawerDraft(seed) {
    return mergeObjects({
      actualVehicle: "",
      appPhone: "",
      contactPhone: "",
      date: today(),
      firstOnlineDate: "",
      gasCard: "",
      iban: "",
      iqama: "",
      operationMode: "",
      plateNumber: "",
      reason: "",
      receiveDate: "",
      riderId: "",
      riderName: "",
      supervisor: "",
      vehicleSerial: "",
      vehicleType: "",
      tools: ""
    }, seed || {});
  }

  function getDrawerDraft(mode) {
    if (!state.drawerDrafts[mode]) {
      state.drawerDrafts[mode] = createDrawerDraft();
    }
    return state.drawerDrafts[mode];
  }

  function resetDrawerDraft(mode) {
    state.drawerDrafts[mode] = createDrawerDraft();
  }

  function getDrawerFieldIds(mode) {
    return mode === "swap"
      ? {
          actualVehicle: "opsSwapActualVehicle",
          appPhone: "opsSwapAppPhone",
          contactPhone: "opsSwapContactPhone",
          date: "opsSwapDate",
          firstOnlineDate: "opsSwapFirstOnlineDate",
          gasCard: "opsSwapGasCard",
          iban: "opsSwapIban",
          iqama: "opsSwapIqama",
          operationMode: "opsSwapOperationMode",
          plateNumber: "opsSwapPlateNumber",
          reason: "opsSwapReason",
          receiveDate: "opsSwapReceiveDate",
          riderId: "opsSwapRiderSelect",
          riderName: "opsSwapRiderName",
          supervisor: "opsSwapSupervisor",
          tools: "opsSwapTools"
          ,
          vehicleSerial: "opsSwapVehicleSerial",
          vehicleType: "opsSwapVehicleType"
        }
      : {
          actualVehicle: "opsAssignActualVehicle",
          appPhone: "opsAssignAppPhone",
          contactPhone: "opsAssignContactPhone",
          date: "opsAssignStartDate",
          firstOnlineDate: "opsAssignFirstOnlineDate",
          gasCard: "opsAssignGasCard",
          iban: "opsAssignIban",
          iqama: "opsAssignIqama",
          operationMode: "opsAssignOperationMode",
          plateNumber: "opsAssignPlateNumber",
          reason: "opsAssignReason",
          receiveDate: "opsAssignReceiveDate",
          riderId: "opsAssignRiderSelect",
          riderName: "opsAssignRiderName",
          supervisor: "opsAssignSupervisor",
          tools: "opsAssignTools"
          ,
          vehicleSerial: "opsAssignVehicleSerial",
          vehicleType: "opsAssignVehicleType"
        };
  }

  function syncDraftFromDom(mode) {
    var ids = getDrawerFieldIds(mode);
    var draft = getDrawerDraft(mode);
    Object.keys(ids).forEach(function (key) {
      var node = document.getElementById(ids[key]);
      if (node) {
        draft[key] = node.value || "";
      }
    });
    return draft;
  }

  function findRiderById(riderId) {
    return getCollection("riders").filter(function (item) {
      return String(item.id || "") === String(riderId || "");
    })[0] || null;
  }

  function buildResolverContextForUser(user) {
    return {
      city: user && user.city ? user.city : "",
      organizationContext: getOrganizationContext(),
      platform: user && user.platform ? user.platform : "",
      register: user && user.register ? user.register : "",
      source: "operations_drawer",
      user: getCurrentUser()
    };
  }

  function primeDrawerDraft(mode, user, seed) {
    var draft = createDrawerDraft({
      actualVehicle: user && (user.actualVehicle || user.actualVehicleSummary || user.actualUsedVehicleDisplay) ? (user.actualVehicle || user.actualVehicleSummary || user.actualUsedVehicleDisplay) : "",
      date: today(),
      firstOnlineDate: "",
      operationMode: user && (user.operationMode || user.settlementMode) ? (user.operationMode || user.settlementMode) : "",
      plateNumber: user && user.plateNumber ? user.plateNumber : "",
      receiveDate: today(),
      supervisor: user && user.supervisor ? user.supervisor : "",
      vehicleSerial: user && user.vehicleSerial ? user.vehicleSerial : "",
      vehicleType: user && user.vehicleType ? user.vehicleType : ""
    });
    if (seed) {
      draft = mergeObjects(draft, seed);
    }
    if (user && user.currentRiderId) {
      var currentRider = findRiderById(user.currentRiderId);
      if (currentRider && mode === "swap") {
        draft.riderId = "";
        draft.iqama = "";
        draft.riderName = "";
      }
    }
    state.drawerDrafts[mode] = draft;
    return draft;
  }

  function syncDrawerDraftWithSelectedRider(mode, riderId) {
    var draft = getDrawerDraft(mode);
    var rider = findRiderById(riderId);
    draft.riderId = riderId || "";
    if (!rider) {
      return draft;
    }
    draft.iqama = rider.primaryIqama || draft.iqama || "";
    draft.riderName = rider.displayName || draft.riderName || "";
    draft.contactPhone = rider.phones && rider.phones[0] ? rider.phones[0] : (draft.contactPhone || "");
    if (riderResolverFacade && draft.iqama) {
      try {
        var resolved = riderResolverFacade.resolveRiderByIqama(draft.iqama, {
          allowCreateExternal: true
        });
        draft.appPhone = resolved.appPhone || draft.appPhone || "";
        draft.iban = resolved.iban || draft.iban || "";
        draft.gasCard = resolved.gasCard || draft.gasCard || "";
        draft.tools = resolved.tools || draft.tools || "";
      } catch (_error) {
        // Keep the drawer resilient even if resolver data is incomplete.
      }
    }
    return draft;
  }

  function getDrawerResolverState(mode, user) {
    var draft = getDrawerDraft(mode);
    var rider = findRiderById(draft.riderId);
    var iqama = normalizeText(draft.iqama || rider && rider.primaryIqama || "");
    var resolved = null;
    if (riderResolverFacade && iqama) {
      try {
        resolved = riderResolverFacade.prepareRiderForAssignment(iqama, {
          allowCreateExternal: true
        });
      } catch (_error) {
        resolved = null;
      }
    }
    return {
      draft: draft,
      iqama: iqama,
      rider: rider,
      resolved: resolved,
      user: user || null
    };
  }

  function ensureInlineExternalIdentity(mode, user, resolverState) {
    if (!riderResolverFacade || !resolverState || !resolverState.resolved || !resolverState.resolved.canCreateExternal || !resolverState.iqama) {
      return resolverState;
    }
    var draft = resolverState.draft || getDrawerDraft(mode);
    if (!normalizeText(draft.riderName)) {
      throw new Error("Rider name is required before creating a new External rider.");
    }
    riderResolverFacade.createExternalRider({
      appPhone: draft.appPhone,
      contactPhone: draft.contactPhone,
      fullName: draft.riderName,
      gasCard: draft.gasCard,
      iban: draft.iban,
      iqama: resolverState.iqama,
      notes: draft.reason,
      platform: user && user.platform ? user.platform : "",
      preferredCity: user && user.city ? user.city : "",
      preferredRegister: user && user.register ? user.register : "",
      tools: draft.tools
    }, buildResolverContextForUser(user));
    return getDrawerResolverState(mode, user);
  }

  function isCurrentAssignmentsTab(tabKey) {
    return !!(OperationsViewModel && typeof OperationsViewModel.isAssignmentTab === "function"
      ? OperationsViewModel.isAssignmentTab(tabKey)
      : normalizeOperationsRoute(tabKey) === "current_assignments");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function unique(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = normalizeText(value);
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    }).map(function (value) {
      return normalizeText(value);
    });
  }

  function matchRegister(selectedRegister, recordRegister) {
    return normalizeRegister(selectedRegister) === normalizeRegister(recordRegister) ||
      ImportTypes.matchUserRegisterScope(selectedRegister, recordRegister) ||
      ImportTypes.matchUserRegisterScope(recordRegister, selectedRegister);
  }

  function matchesContext(record, context) {
    if (!record) {
      return false;
    }
    if (context.cityScope !== "all" && context.selectedCities && context.selectedCities.length) {
      if (context.selectedCities.indexOf(record.city) < 0) {
        return false;
      }
    }
    if (context.registerScope !== "all" && context.selectedRegisters && context.selectedRegisters.length) {
      if (!(context.selectedRegisters || []).some(function (code) { return matchRegister(code, record.register); })) {
        return false;
      }
    }
    if (context.workMode && context.workMode !== "all" && record.workMode) {
      if (normalizeText(record.workMode) !== normalizeText(context.workMode)) {
        return false;
      }
    }
    return true;
  }

  function matchesUserScope(record, user) {
    if (!record || !user) {
      return true;
    }
    if (user.cityScope !== "all" && !RBAC.canAccessCity(user, record.city)) {
      return false;
    }
    if (user.registerScope !== "all" && !(user.selectedRegisters || []).some(function (code) { return matchRegister(code, record.register); })) {
      return false;
    }
    return true;
  }

  function matchesSearch(text, query) {
    var normalizedQuery = normalizeText(query).toLowerCase();
    if (!normalizedQuery) {
      return true;
    }
    var normalizedText = normalizeText(text).toLowerCase();
    if (normalizedText.indexOf(normalizedQuery) >= 0) {
      return true;
    }
    return normalizedQuery.split(/\s+/).filter(Boolean).every(function (token) {
      return normalizedText.indexOf(token) >= 0;
    });
  }

  function pickLatest(left, right) {
    if (!left) {
      return right;
    }
    if (!right) {
      return left;
    }
    if ((right.updatedAt || "") > (left.updatedAt || "")) {
      return right;
    }
    if (!!right.dashboardUserId && !left.dashboardUserId) {
      return right;
    }
    return left;
  }

  function dedupeDashboardUsers(rows) {
    var byDashboardUserId = {};
    (rows || []).forEach(function (row) {
      var key = normalizeText(row && (row.dashboardUserId || row.userId || row.id));
      if (!key) {
        return;
      }
      byDashboardUserId[key] = pickLatest(byDashboardUserId[key], row);
    });
    return Object.keys(byDashboardUserId).map(function (key) {
      return byDashboardUserId[key];
    }).sort(function (left, right) {
      return normalizeText(left.dashboardUserId || left.userId).localeCompare(normalizeText(right.dashboardUserId || right.userId));
    });
  }

  function indexByNormalizedField(rows, fieldName) {
    return (rows || []).reduce(function (memo, item) {
      var key = normalizeText(item && item[fieldName]);
      if (key) {
        memo[key] = item;
      }
      return memo;
    }, {});
  }

  function buildVehicleSummaryText(vehicle, fallbackSerial, fallbackPlateNumber) {
    if (!vehicle && !fallbackSerial && !fallbackPlateNumber) {
      return "serial_missing";
    }
    var serial = normalizeText(vehicle && vehicle.vehicleSerial || fallbackSerial);
    var plateNumber = normalizeText(vehicle && vehicle.plateNumber || fallbackPlateNumber);
    var city = normalizeText(vehicle && vehicle.city);
    var register = normalizeText(vehicle && vehicle.register);
    return [serial, plateNumber, city, register].filter(Boolean).join(" / ") || "serial_missing";
  }

  function mergeDashboardUserWithFleet(row, vehicleAssignment, capacityReview) {
    var fleetWarnings = unique((vehicleAssignment && vehicleAssignment.warnings || []).concat(vehicleAssignment && vehicleAssignment.notes || []));
    var fleetBlockingIssues = unique(vehicleAssignment && vehicleAssignment.blockingIssues || []);
    return mergeObjects({}, row, {
      actualUsedVehicle: vehicleAssignment && vehicleAssignment.actualUsedVehicle || null,
      actualUsedVehicleDisplay: buildVehicleSummaryText(vehicleAssignment && vehicleAssignment.actualUsedVehicle, vehicleAssignment && vehicleAssignment.actualUsedVehicleSerial, vehicleAssignment && vehicleAssignment.actualUsedVehiclePlateNumber),
      fleetBlockingIssues: fleetBlockingIssues,
      fleetCapacityStatus: normalizeText(vehicleAssignment && vehicleAssignment.capacityStatus || capacityReview && capacityReview.reviewStatus || ""),
      fleetMatchStatus: normalizeText(vehicleAssignment && vehicleAssignment.matchStatus || ""),
      fleetWarnings: fleetWarnings,
      registeredVehicleDisplay: buildVehicleSummaryText(vehicleAssignment && vehicleAssignment.registeredVehicleOnDashboard, row.vehicleSerial || row.registeredVehicleSerial, row.plateNumber),
      registeredVehicleOnDashboard: vehicleAssignment && vehicleAssignment.registeredVehicleOnDashboard || null,
      vehicleMovementStatus: normalizeText(vehicleAssignment && vehicleAssignment.movementStatus || "")
    });
  }

  function buildDataModel() {
    var user = getCurrentUser();
    var context = getOrganizationContext();
    var allAssignments = getCollection("assignments");
    var allRiderOperationalProfiles = getCollection("riderOperationalProfiles");
    var allRiders = getCollection("riders");
    var externalRiders = getCollection("externalRiders").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var hrProfiles = getCollection("hrProfiles").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var vehicleAssignments = getCollection("vehicleAssignments").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var capacityReviews = getCollection("vehicleCapacityReviews").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var riderVehicleUsageHistory = getCollection("riderVehicleUsageHistory").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var assignmentsByDashboardUserId = indexByNormalizedField(vehicleAssignments, "dashboardUserId");
    var capacityBySerial = indexByNormalizedField(capacityReviews, "vehicleSerial");
    var dashboardUsers = dedupeDashboardUsers(getCollection("dashboardUsers")).filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    }).map(function (item) {
      var vehicleAssignment = assignmentsByDashboardUserId[normalizeText(item.dashboardUserId || item.userId)] || null;
      var capacityReview = capacityBySerial[normalizeText(item.vehicleSerial)] || null;
      var merged = mergeDashboardUserWithFleet(item, vehicleAssignment, capacityReview);
      return decorateDashboardRow(merged, {
        assignments: allAssignments,
        externalRiders: externalRiders,
        hrProfiles: hrProfiles,
        riderOperationalProfiles: allRiderOperationalProfiles,
        riders: allRiders
      });
    });
    var riders = allRiders.filter(function (item) {
      return matchesContext({
        city: (item.cities || [item.city])[0] || item.city || "",
        register: (item.registers || [item.register])[0] || item.register || ""
      }, context) && matchesUserScope({
        city: (item.cities || [item.city])[0] || item.city || "",
        register: (item.registers || [item.register])[0] || item.register || ""
      }, user);
    });
    var assignments = allAssignments.filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var assignmentHistory = getCollection("assignmentHistory").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var terminations = getCollection("terminations").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var statusReviews = getCollection("operationalStatusReviews").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var auditLogs = getCollection("auditLogs").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var riderPlatformAccounts = getCollection("riderPlatformAccounts").filter(function (item) {
      return matchesContext({
        city: item.city || "",
        register: item.register || ""
      }, context) && matchesUserScope({
        city: item.city || "",
        register: item.register || ""
      }, user);
    });
    var currentAssignmentRows = CurrentAssignmentsViewModel && typeof CurrentAssignmentsViewModel.buildCurrentAssignmentRows === "function"
      ? CurrentAssignmentsViewModel.buildCurrentAssignmentRows({
          assignmentHistory: assignmentHistory,
          assignments: assignments,
          auditLogs: auditLogs,
          dashboardUsers: dashboardUsers,
          externalRiders: externalRiders,
          hrProfiles: hrProfiles,
          riderOperationalProfiles: allRiderOperationalProfiles,
          riderVehicleUsageHistory: riderVehicleUsageHistory,
          riders: riders,
          terminations: terminations
        })
      : [];
    var filteredDashboardUsers = applyDashboardUserFilters(dashboardUsers);
    var visibleDashboardUsers = filterDashboardRowsForTab(filteredDashboardUsers, state.activeTab);
    var filteredCurrentAssignmentRowsBase = applyCurrentAssignmentFiltersForTab(currentAssignmentRows, "current_assignments");
    var filteredCurrentAssignmentRows = applyCurrentAssignmentFilters(currentAssignmentRows);
    var filteredAssignmentHistory = filterAssignmentHistoryByRows(assignmentHistory, filteredCurrentAssignmentRows);
    var filteredTerminations = filterTerminationsByRows(terminations, filteredCurrentAssignmentRows);
    var currentAssignmentKpis = CurrentAssignmentsViewModel && typeof CurrentAssignmentsViewModel.buildCurrentAssignmentKpis === "function"
      ? CurrentAssignmentsViewModel.buildCurrentAssignmentKpis(filteredCurrentAssignmentRows, {
          assignmentHistory: filteredAssignmentHistory,
          terminations: filteredTerminations
        }, {
          now: new Date().toISOString()
        })
      : {};
    var dashboardKpis = buildDashboardKpis(visibleDashboardUsers);
    var visibleWorkingRiders = applyWorkingRiderFilters(riders);
    var visibleSwaps = applySwapFilters(assignmentHistory);
    var visibleTerminations = applyTerminationFilters(terminations);
    var visibleAuditLogs = applyAuditSearchFilter(auditLogs);
    return {
      assignments: assignments,
      assignmentHistory: assignmentHistory,
      auditLogs: auditLogs,
      capacityReviews: capacityReviews,
      context: context,
      dashboardKpis: dashboardKpis,
      dashboardUsers: visibleDashboardUsers,
      currentAssignmentKpis: currentAssignmentKpis,
      currentAssignmentRows: currentAssignmentRows,
      externalRiders: externalRiders,
      filteredCurrentAssignmentRows: filteredCurrentAssignmentRows,
      filteredCurrentAssignmentRowsBase: filteredCurrentAssignmentRowsBase,
      filteredDashboardUsers: filteredDashboardUsers,
      hrProfiles: hrProfiles,
      rawDashboardUsers: dashboardUsers,
      riderPlatformAccounts: riderPlatformAccounts,
      riderVehicleUsageHistory: riderVehicleUsageHistory,
      riders: riders,
      statusReviews: statusReviews,
      tabCounts: buildTabCounts({
        assignmentHistory: visibleSwaps,
        auditLogs: visibleAuditLogs,
        dashboardUsers: filteredDashboardUsers,
        filteredCurrentAssignmentRowsBase: filteredCurrentAssignmentRowsBase,
        riders: visibleWorkingRiders,
        terminations: visibleTerminations,
        user: user
      }),
      terminations: terminations,
      user: user,
      vehicleAssignments: vehicleAssignments,
      visibleAuditLogs: visibleAuditLogs,
      visibleSwaps: visibleSwaps,
      visibleTerminations: visibleTerminations,
      visibleWorkingRiders: visibleWorkingRiders
    };
  }

  function isDashboardUsersTab(tabKey) {
    return !!(OperationsViewModel && typeof OperationsViewModel.isDashboardTab === "function"
      ? OperationsViewModel.isDashboardTab(tabKey)
      : normalizeOperationsRoute(tabKey) === "dashboard_users");
  }

  function getVisibleFilterKeys(tabKey) {
    if (OperationsViewModel && typeof OperationsViewModel.getVisibleFilterKeys === "function") {
      return OperationsViewModel.getVisibleFilterKeys(tabKey);
    }
    return ["search", "register", "city", "platform"];
  }

  function getImportButtons(tabKey) {
    if (OperationsViewModel && typeof OperationsViewModel.getImportButtons === "function") {
      return OperationsViewModel.getImportButtons(tabKey);
    }
    return ["dashboard_users_import", "current_assignments_import"];
  }

  function filterDashboardRowsForTab(rows, tabKey) {
    if (OperationsViewModel && typeof OperationsViewModel.filterDashboardRowsForTab === "function") {
      return OperationsViewModel.filterDashboardRowsForTab(rows, tabKey);
    }
    return rows || [];
  }

  function filterAssignmentRowsForTab(rows, tabKey) {
    if (OperationsViewModel && typeof OperationsViewModel.filterAssignmentRowsForTab === "function") {
      return OperationsViewModel.filterAssignmentRowsForTab(rows, tabKey);
    }
    return rows || [];
  }

  function buildDashboardKpis(rows) {
    if (OperationsViewModel && typeof OperationsViewModel.buildDashboardKpis === "function") {
      return OperationsViewModel.buildDashboardKpis(rows);
    }
    return {
      assigned: 0,
      dismissedOrMissing: 0,
      needsReview: 0,
      newUsers: 0,
      pendingReview: 0,
      readyForAssignment: 0,
      rejected: 0,
      totalDashboardUsers: (rows || []).length
    };
  }

  function applyCurrentAssignmentFiltersForTab(rows, tabKey) {
    if (CurrentAssignmentsViewModel && typeof CurrentAssignmentsViewModel.filterCurrentAssignmentRows === "function") {
      return CurrentAssignmentsViewModel.filterCurrentAssignmentRows(rows, state.filters, tabKey);
    }
    return rows || [];
  }

  function filterAssignmentHistoryByRows(historyRows, assignmentRows) {
    var dashboardUserIds = {};
    (assignmentRows || []).forEach(function (row) {
      var key = normalizeText(row && (row.dashboardUserId || row.courierId));
      if (key) {
        dashboardUserIds[key] = true;
      }
    });
    if (!Object.keys(dashboardUserIds).length) {
      return [];
    }
    return (historyRows || []).filter(function (item) {
      return !!dashboardUserIds[normalizeText(item && item.dashboardUserId)];
    });
  }

  function filterTerminationsByRows(terminationRows, assignmentRows) {
    var dashboardUserIds = {};
    (assignmentRows || []).forEach(function (row) {
      var key = normalizeText(row && (row.dashboardUserId || row.courierId));
      if (key) {
        dashboardUserIds[key] = true;
      }
    });
    if (!Object.keys(dashboardUserIds).length) {
      return [];
    }
    return (terminationRows || []).filter(function (item) {
      return !!dashboardUserIds[normalizeText(item && item.dashboardUserId)];
    });
  }

  function applyWorkingRiderFilters(rows) {
    var filteredRows = (rows || []).filter(function (item) {
      return normalizeText(item.currentWorkStatus) === "working";
    });
    if (OperationsViewModel && typeof OperationsViewModel.applySearchToSimpleRows === "function") {
      return OperationsViewModel.applySearchToSimpleRows(filteredRows, state.filters.query, [
        "id",
        "displayName",
        "primaryIqama",
        "city",
        "register",
        "platforms",
        "cities",
        "registers"
      ]);
    }
    return filteredRows;
  }

  function applySwapFilters(rows) {
    var swapRows = (rows || []).filter(function (item) {
      return normalizeText(item.action) === "swap";
    });
    if (OperationsViewModel && typeof OperationsViewModel.applySearchToSimpleRows === "function") {
      return OperationsViewModel.applySearchToSimpleRows(swapRows, state.filters.query, [
        "dashboardUserId",
        "previousRiderId",
        "previousRiderIqama",
        "newRiderId",
        "newRiderIqama",
        "city",
        "register",
        "reason"
      ]);
    }
    return swapRows;
  }

  function applyTerminationFilters(rows) {
    if (OperationsViewModel && typeof OperationsViewModel.applySearchToSimpleRows === "function") {
      return OperationsViewModel.applySearchToSimpleRows(rows || [], state.filters.query, [
        "dashboardUserId",
        "riderId",
        "riderIqama",
        "city",
        "register",
        "reason",
        "statusAfter",
        "terminationType"
      ]);
    }
    return rows || [];
  }

  function applyAuditSearchFilter(rows) {
    var query = state.filters.query || "";
    if (!query) {
      return rows || [];
    }
    return (rows || []).filter(function (item) {
      return matchesSearch([
        item.action,
        item.eventType,
        item.entity,
        item.entityType,
        item.entityId,
        item.note,
        item.reason,
        item.userId,
        item.actorUserId
      ].join(" "), query);
    });
  }

  function buildTabCounts(model) {
    model = model || {};
    var dashboardRows = model.dashboardUsers || [];
    var assignmentRows = model.filteredCurrentAssignmentRowsBase || [];
    var currentUser = model.user || null;
    var counts = {
      audit_log: (model.auditLogs || []).length,
      current_assignments: assignmentRows.length,
      dashboard_users: dashboardRows.length,
      external_mode: filterAssignmentRowsForTab(assignmentRows, "external_mode").length,
      needs_assignment: filterDashboardRowsForTab(dashboardRows, "needs_assignment").length,
      needs_review: filterDashboardRowsForTab(dashboardRows, "needs_review").length,
      per_order: filterAssignmentRowsForTab(assignmentRows, "per_order").length,
      replacement: filterAssignmentRowsForTab(assignmentRows, "replacement").length,
      salary: filterAssignmentRowsForTab(assignmentRows, "salary").length,
      stopped: filterAssignmentRowsForTab(assignmentRows, "stopped").length,
      swaps: (model.assignmentHistory || []).length,
      terminations: (model.terminations || []).length,
      working: filterDashboardRowsForTab(dashboardRows, "working").length,
      working_riders: (model.riders || []).length
    };
    if (currentUser && !RBAC.canPerform(currentUser, "audit.view")) {
      delete counts.audit_log;
    }
    return counts;
  }

  function decorateDashboardRow(row, dataSources) {
    if (AssignmentReadinessService && typeof AssignmentReadinessService.decorateDashboardUser === "function") {
      return AssignmentReadinessService.decorateDashboardUser(row, dataSources, {
        lifecycleStatus: row && row.lifecycleStatus ? row.lifecycleStatus : ""
      });
    }
    return row;
  }

  function applyDashboardUserFilters(rows) {
    return (rows || []).filter(function (row) {
      var assignmentReadiness = state.filters.assignmentReadiness;
      var city = state.filters.city;
      var employmentStatus = state.filters.employmentStatus;
      var lifecycleStatus = state.filters.lifecycleStatus;
      var operationMode = state.filters.operationMode;
      var platform = state.filters.platform;
      var query = state.filters.query;
      var register = state.filters.register;
      var reviewStatus = state.filters.reviewStatus;
      var vehicleType = state.filters.vehicleType;
      var searchable = [
        row.dashboardUserId,
        row.fullName,
        row.ownerIqama,
        row.ownerPhone,
        row.phoneNumber,
        row.currentRiderName,
        row.currentRiderIqama,
        row.city,
        row.register,
        row.assignmentReadiness,
        row.lifecycleStatus,
        row.registeredVehicleDisplay,
        row.actualUsedVehicleDisplay,
        row.vehicleMovementStatus,
        row.fleetMatchStatus,
        (row.fleetWarnings || []).join(" "),
        (row.fleetBlockingIssues || []).join(" ")
      ].join(" ");
      if (!matchesSearch(searchable, query)) {
        return false;
      }
      if (register !== "all" && normalizeRegister(row.register || "") !== normalizeRegister(register)) {
        return false;
      }
      if (city !== "all" && normalizeText(row.city || "") !== city) {
        return false;
      }
      if (platform !== "all" && normalizeText(row.platform || "") !== platform) {
        return false;
      }
      if (lifecycleStatus !== "all" && normalizeText(row.lifecycleStatus || "") !== lifecycleStatus) {
        return false;
      }
      if (assignmentReadiness !== "all" && normalizeText(row.assignmentReadiness || "") !== assignmentReadiness) {
        return false;
      }
      if (reviewStatus !== "all" && normalizeText(row.reviewStatus || "") !== reviewStatus) {
        return false;
      }
      if (employmentStatus !== "all" && normalizeText(row.employmentStatus || row.jobStatus || "") !== employmentStatus) {
        return false;
      }
      if (operationMode !== "all" && normalizeText(row.operationMode || row.settlementMode || "") !== operationMode) {
        return false;
      }
      if (vehicleType !== "all" && normalizeText(row.vehicleType || "") !== vehicleType) {
        return false;
      }
      return true;
    });
  }

  function applyCurrentAssignmentFilters(rows) {
    if (CurrentAssignmentsViewModel && typeof CurrentAssignmentsViewModel.filterCurrentAssignmentRows === "function") {
      return CurrentAssignmentsViewModel.filterCurrentAssignmentRows(rows, state.filters, state.activeTab);
    }
    return rows || [];
  }

  function renderPage() {
    var page = document.getElementById("page-operations-shell");
    var model = buildDataModel();
    if (!page) {
      return;
    }
    if (model.user && !RBAC.canPerform(model.user, "operations.view")) {
      page.innerHTML = renderEmptyState("لا تملك صلاحية الوصول إلى صفحة العمليات في الجلسة الحالية.");
      return;
    }
    page.innerHTML = [
      '<section class="ui-shell-card ops-shell">',
      renderHeader(model),
      renderKpis(model),
      renderTabs(model),
      renderTabBody(model),
      "</section>"
    ].join("");
    if (UIShell && typeof UIShell.enhanceTables === "function") {
      UIShell.enhanceTables(page);
    }
    applyNotificationFocus();
  }

  function hasVisibleFilter(filterKeys, key) {
    return (filterKeys || []).indexOf(key) >= 0;
  }

  function renderOperationsSelect(id, currentValue, allLabel, rows, fieldName, labelResolver) {
    return [
      '<select id="' + id + '" class="ops-select">',
      renderOption("all", allLabel, currentValue),
      renderDynamicOptions(rows, fieldName, labelResolver, currentValue),
      "</select>"
    ].join("");
  }

  function renderOperationsImportButtons(routeIds) {
    var labels = {
      current_assignments_import: "Import Current Assignments",
      dashboard_users_import: "Import Dashboard Users"
    };
    return [
      '<div class="ops-toolbar-actions">',
      (routeIds || []).map(function (routeId) {
        return '<button type="button" class="ops-action-btn" data-ops-import-route="' + escapeHtml(routeId) + '">' + escapeHtml(labels[routeId] || routeId) + "</button>";
      }).join(""),
      '  <span class="ops-inline-note">Import entry points only open the Import Center with the proper route and keep preview and validation read-only until confirmed save.</span>',
      "</div>"
    ].join("");
  }

  function renderHeader(model) {
    return renderOperationsHeader(model);
    var context = model.context || {};
    var rows = model.rawDashboardUsers || [];
    var assignmentRows = model.currentAssignmentRows || [];
    var cityLabel = context.cityScope === "all"
      ? "كل المدن"
      : (context.selectedCities || []).join("، ");
    var registerLabel = context.registerScope === "all"
      ? "كل السجلات"
      : (context.selectedRegisters || []).map(function (code) {
          return ImportTypes.registerLabel(code) || code;
        }).join("، ");
    return [
      '<div class="ui-shell-card__head">',
      "  <div>",
      "    <h3>Operations Module</h3>",
      '    <p>إدارة يوزرات الداشبورد والتسكين والتبديل والإيقاف مع ربط مباشر بالـ HR Master و Audit Log.</p>',
      "  </div>",
      '  <div class="ops-scope-note">',
      '    <strong>النطاق الحالي</strong>',
      '    <span>' + escapeHtml(cityLabel) + " / " + escapeHtml(registerLabel) + "</span>",
      "  </div>",
      "</div>",
      '<div class="ops-toolbar ops-toolbar--extended">',
      '  <input id="opsSearchInput" type="search" class="ops-input" placeholder="بحث باليوزر أو اسم المالك أو المندوب أو الإقامة أو الجوال أو اللوحة أو السيريال" value="' + escapeHtml(state.filters.query) + '">',
      '  <select id="opsRegisterFilter" class="ops-select">',
      renderOption("all", "كل السجلات", state.filters.register),
      renderDynamicOptions(rows, "register", function (value) { return ImportTypes.registerLabel(value) || value; }, state.filters.register),
      "  </select>",
      '  <select id="opsCityFilter" class="ops-select">',
      renderOption("all", "كل المدن", state.filters.city),
      renderDynamicOptions(rows, "city", null, state.filters.city),
      "  </select>",
      '  <select id="opsPlatformFilter" class="ops-select">',
      renderOption("all", "كل التطبيقات", state.filters.platform),
      renderDynamicOptions(rows, "platform", platformLabel, state.filters.platform),
      "  </select>",
      '  <select id="opsLifecycleFilter" class="ops-select">',
      renderOption("all", "كل حالات دورة الحياة", state.filters.lifecycleStatus),
      renderDynamicOptions(rows, "lifecycleStatus", lifecycleLabel, state.filters.lifecycleStatus),
      "  </select>",
      '  <select id="opsReadinessFilter" class="ops-select">',
      renderOption("all", "كل حالات الجاهزية", state.filters.assignmentReadiness),
      renderDynamicOptions(rows, "assignmentReadiness", readinessLabel, state.filters.assignmentReadiness),
      "  </select>",
      '  <select id="opsReviewFilter" class="ops-select">',
      renderOption("all", "كل حالات المراجعة", state.filters.reviewStatus),
      renderDynamicOptions(rows, "reviewStatus", reviewStatusLabel, state.filters.reviewStatus),
      "  </select>",
      '  <select id="opsEmploymentFilter" class="ops-select">',
      renderOption("all", "كل حالات الوظيفة", state.filters.employmentStatus),
      renderDynamicOptions(rows, "employmentStatus", employmentStatusLabel, state.filters.employmentStatus),
      "  </select>",
      '  <select id="opsModeFilter" class="ops-select">',
      renderOption("all", "كل أنظمة التشغيل", state.filters.operationMode),
      renderDynamicOptions(rows, "operationMode", operationModeLabel, state.filters.operationMode),
      "  </select>",
      '  <select id="opsVehicleFilter" class="ops-select">',
      renderOption("all", "كل المركبات", state.filters.vehicleType),
      renderOption("car", "سيارة", state.filters.vehicleType),
      renderOption("bike", "دباب", state.filters.vehicleType),
      renderOption("unknown", "غير محدد", state.filters.vehicleType),
      "  </select>",
      "</div>",
      '<div class="ops-toolbar ops-toolbar--assignments">',
      '  <select id="opsAssignmentStatusFilter" class="ops-select">',
      renderOption("all", "كل حالات التسكين", state.filters.assignmentStatus),
      renderDynamicOptions(assignmentRows, "assignmentStatus", assignmentStatusLabel, state.filters.assignmentStatus),
      "  </select>",
      '  <select id="opsRiderSourceFilter" class="ops-select">',
      renderOption("all", "كل مصادر المندوب", state.filters.riderSource),
      renderDynamicOptions(assignmentRows, "riderSource", riderSourceLabel, state.filters.riderSource),
      "  </select>",
      '  <select id="opsSupervisorFilter" class="ops-select">',
      renderOption("all", "كل المشرفين", state.filters.supervisor),
      renderDynamicOptions(assignmentRows, "supervisor", null, state.filters.supervisor),
      "  </select>",
      "</div>",
      '<div class="ops-toolbar-actions">',
      '  <button type="button" class="ops-action-btn" data-ops-import-route="dashboard_users_import">Import Dashboard Users</button>',
      '  <button type="button" class="ops-action-btn" data-ops-import-route="current_assignments_import">Import Current Assignments</button>',
      '  <span class="ops-inline-note">Import entry points only open the Import Center with the proper route and keep preview and validation read-only until confirmed save.</span>',
      "</div>"
    ].join("");
  }

  function renderKpis(model) {
    return renderOperationsKpis(model);
    if (isCurrentAssignmentsTab(state.activeTab)) {
      return renderCurrentAssignmentKpis(model.currentAssignmentKpis || {});
    }
    var rows = model.rawDashboardUsers || [];
    var items = [
      { label: "إجمالي يوزرات الداشبورد", value: rows.length },
      { label: "جديد", value: rows.filter(function (item) { return normalizeText(item.lifecycleStatus) === "new"; }).length, className: "good" },
      { label: "جاهز للتسكين", value: rows.filter(function (item) { return normalizeText(item.assignmentReadiness) === "ready_for_assignment"; }).length, className: "good" },
      { label: "مسكن", value: rows.filter(function (item) { return normalizeText(item.lifecycleStatus) === "active_assigned"; }).length, className: "good" },
      { label: "قيد المراجعة", value: rows.filter(function (item) { return normalizeText(item.lifecycleStatus) === "pending_review"; }).length, className: "warn" },
      { label: "مرفوض", value: rows.filter(function (item) { return normalizeText(item.lifecycleStatus) === "rejected"; }).length, className: "bad" },
      { label: "مقال / مختفي", value: rows.filter(function (item) { return ["dismissed", "missing_from_latest_snapshot"].indexOf(normalizeText(item.lifecycleStatus)) >= 0; }).length, className: "bad" },
      { label: "يحتاج مراجعة", value: rows.filter(function (item) { return normalizeText(item.lifecycleStatus) === "needs_review" || normalizeText(item.assignmentReadiness) === "needs_manual_review"; }).length, className: "warn" }
    ];
    return '<div class="kpi-grid ops-kpis">' + items.map(function (item) {
      return '<article class="kpi ' + escapeHtml(item.className || "") + '"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></article>";
    }).join("") + "</div>";
  }

  function renderCurrentAssignmentKpis(kpis) {
    var items = [
      { label: "إجمالي التسكينات الحالية", value: kpis.totalCurrentAssignments || 0 },
      { label: "نشط", value: kpis.active || 0, className: "good" },
      { label: "يحتاج تسكين", value: kpis.needsAssignment || 0, className: "warn" },
      { label: "بالطلب", value: kpis.perOrder || 0, className: "good" },
      { label: "راتب", value: kpis.salary || 0, className: "good" },
      { label: "خارجي", value: kpis.externalMode || 0, className: "blue" },
      { label: "بديل", value: kpis.replacement || 0, className: "gold" },
      { label: "موقوف", value: kpis.stopped || 0, className: "bad" },
      { label: "تبديلات هذا الشهر", value: kpis.swapsThisMonth || 0, className: "blue" },
      { label: "إقالات هذا الشهر", value: kpis.terminationsThisMonth || 0, className: "bad" },
      { label: "مركبة شركة", value: kpis.companyVehicles || 0, className: "good" },
      { label: "مركبة خاصة", value: kpis.privateVehicles || 0, className: "warn" }
    ];
    return '<div class="kpi-grid ops-kpis">' + items.map(function (item) {
      return '<article class="kpi ' + escapeHtml(item.className || "") + '"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></article>";
    }).join("") + "</div>";
  }

  function renderTabs(model) {
    return renderOperationsTabs(model);
    var counts = {
      current_assignments: (model.currentAssignmentRows || []).length,
      dashboard_users: (model.dashboardUsers || []).length,
      needs_assignment: (model.currentAssignmentRows || []).filter(function (item) {
        return item.needsAssignment;
      }).length,
      working: (model.currentAssignmentRows || []).filter(function (item) {
        return item.isActive;
      }).length,
      per_order: (model.currentAssignmentRows || []).filter(function (item) {
        return item.isActive && normalizeOperationMode(item.operationMode) === "per_order";
      }).length,
      salary: (model.currentAssignmentRows || []).filter(function (item) {
        return item.isActive && normalizeOperationMode(item.operationMode) === "salary_tiers";
      }).length,
      external_mode: (model.currentAssignmentRows || []).filter(function (item) {
        return item.isActive && (normalizeOperationMode(item.operationMode) === "external" || normalizeText(item.riderSource) === "External");
      }).length,
      replacement: (model.currentAssignmentRows || []).filter(function (item) {
        return item.isActive && (normalizeOperationMode(item.operationMode) === "replacement" || normalizeText(item.assignmentType) === "swap");
      }).length,
      stopped: (model.currentAssignmentRows || []).filter(function (item) {
        return item.statusBucket === "stopped";
      }).length,
      working_riders: (model.riders || []).filter(function (item) {
        return normalizeText(item.currentWorkStatus) === "working";
      }).length,
      needs_review: (model.dashboardUsers || []).filter(function (item) {
        return ["pending_review", "needs_review", "frozen"].indexOf(normalizeText(item.lifecycleStatus)) >= 0 ||
          normalizeText(item.assignmentReadiness) === "needs_manual_review";
      }).length,
      swaps: (model.assignmentHistory || []).filter(function (item) { return item.action === "swap"; }).length,
      terminations: (model.terminations || []).length,
      audit_log: (model.auditLogs || []).length
    };
    var tabs = [
      ["dashboard_users", "يوزرات الداشبورد"],
      ["current_assignments", "التسكين الحالي"],
      ["needs_assignment", "تحتاج تسكين"],
      ["working", "تعمل حاليًا"],
      ["per_order", "بالطلب"],
      ["salary", "راتب"],
      ["external_mode", "خارجي"],
      ["replacement", "بديل"],
      ["stopped", "موقوفة"],
      ["working_riders", "المناديب التي تعمل"],
      ["needs_review", "تحتاج مراجعة"],
      ["swaps", "التبديلات"],
      ["terminations", "الإقالات"],
    ];
    if (!model.user || RBAC.canPerform(model.user, "audit.view")) {
      tabs.push(["audit_log", "سجل العمليات"]);
    }
    return '<div class="ops-tabs">' + tabs.map(function (item) {
      var isActive = state.activeTab === item[0];
      return '<button type="button" class="ops-tab' + (isActive ? " is-active" : "") + '" data-ops-tab="' + escapeHtml(item[0]) + '">' +
        escapeHtml(item[1]) + ' <span>' + escapeHtml(String(counts[item[0]] || 0)) + "</span></button>";
    }).join("") + "</div>";
  }

  function renderTabBody(model) {
    return renderOperationsTabBody(model);
    if (state.activeTab === "swaps") {
      return renderSwapsTable(model.assignmentHistory || []);
    }
    if (state.activeTab === "terminations") {
      return renderTerminationsTable(model.terminations || []);
    }
    if (state.activeTab === "audit_log") {
      return renderAuditTable(model.auditLogs || []);
    }
    if (state.activeTab === "working_riders") {
      return renderWorkingRidersTable(model.riders || [], model.riderPlatformAccounts || []);
    }
    if (isCurrentAssignmentsTab(state.activeTab)) {
      return renderCurrentAssignmentsTable(model.filteredCurrentAssignmentRows || [], model.user);
    }
    var rows = model.dashboardUsers || [];
    if (state.activeTab === "needs_assignment") {
      rows = rows.filter(function (item) {
        return normalizeText(item.assignmentReadiness) === "ready_for_assignment";
      });
    } else if (state.activeTab === "working") {
      rows = rows.filter(isAssigned);
    } else if (state.activeTab === "needs_review") {
      rows = rows.filter(function (item) {
        return ["pending_review", "needs_review", "frozen"].indexOf(normalizeText(item.lifecycleStatus)) >= 0 ||
          normalizeText(item.assignmentReadiness) === "needs_manual_review";
      });
    }
    return renderDashboardUsersTable(rows, model.user);
  }

  function renderOperationsHeader(model) {
    var context = model.context || {};
    var rows = model.filteredDashboardUsers || model.rawDashboardUsers || [];
    var assignmentRows = model.filteredCurrentAssignmentRowsBase || model.currentAssignmentRows || [];
    var scopeRows = rows.concat(assignmentRows || []);
    var visibleFilterKeys = getVisibleFilterKeys(state.activeTab);
    var importButtons = getImportButtons(state.activeTab);
    var cityLabel = context.cityScope === "all"
      ? "كل المدن"
      : (context.selectedCities || []).join("، ");
    var registerLabel = context.registerScope === "all"
      ? "كل السجلات"
      : (context.selectedRegisters || []).map(function (code) {
          return ImportTypes.registerLabel(code) || code;
        }).join("، ");
    var filterControls = [];

    if (hasVisibleFilter(visibleFilterKeys, "search")) {
      filterControls.push('<input id="opsSearchInput" type="search" class="ops-input" placeholder="بحث باليوزر أو اسم المالك أو المندوب أو الإقامة أو الجوال أو اللوحة أو السيريال أو رقم التسكين" value="' + escapeHtml(state.filters.query) + '">');
    }
    if (hasVisibleFilter(visibleFilterKeys, "register")) {
      filterControls.push(renderOperationsSelect("opsRegisterFilter", state.filters.register, "كل السجلات", scopeRows, "register", function (value) {
        return ImportTypes.registerLabel(value) || value;
      }));
    }
    if (hasVisibleFilter(visibleFilterKeys, "city")) {
      filterControls.push(renderOperationsSelect("opsCityFilter", state.filters.city, "كل المدن", scopeRows, "city"));
    }
    if (hasVisibleFilter(visibleFilterKeys, "platform")) {
      filterControls.push(renderOperationsSelect("opsPlatformFilter", state.filters.platform, "كل التطبيقات", scopeRows, "platform", platformLabel));
    }
    if (hasVisibleFilter(visibleFilterKeys, "lifecycleStatus")) {
      filterControls.push(renderOperationsSelect("opsLifecycleFilter", state.filters.lifecycleStatus, "كل حالات دورة الحياة", rows, "lifecycleStatus", lifecycleLabel));
    }
    if (hasVisibleFilter(visibleFilterKeys, "assignmentReadiness")) {
      filterControls.push(renderOperationsSelect("opsReadinessFilter", state.filters.assignmentReadiness, "كل حالات الجاهزية", rows, "assignmentReadiness", readinessLabel));
    }
    if (hasVisibleFilter(visibleFilterKeys, "reviewStatus")) {
      filterControls.push(renderOperationsSelect("opsReviewFilter", state.filters.reviewStatus, "كل حالات المراجعة", rows, "reviewStatus", reviewStatusLabel));
    }
    if (hasVisibleFilter(visibleFilterKeys, "employmentStatus")) {
      filterControls.push(renderOperationsSelect("opsEmploymentFilter", state.filters.employmentStatus, "كل حالات الوظيفة", rows, "employmentStatus", employmentStatusLabel));
    }
    if (hasVisibleFilter(visibleFilterKeys, "operationMode")) {
      filterControls.push(renderOperationsSelect("opsModeFilter", state.filters.operationMode, "كل أنظمة التشغيل", isCurrentAssignmentsTab(state.activeTab) ? assignmentRows : rows, "operationMode", operationModeLabel));
    }
    if (hasVisibleFilter(visibleFilterKeys, "vehicleType")) {
      filterControls.push([
        '<select id="opsVehicleFilter" class="ops-select">',
        renderOption("all", "كل المركبات", state.filters.vehicleType),
        renderOption("car", "سيارة", state.filters.vehicleType),
        renderOption("bike", "دباب", state.filters.vehicleType),
        renderOption("unknown", "غير محدد", state.filters.vehicleType),
        "</select>"
      ].join(""));
    }
    if (hasVisibleFilter(visibleFilterKeys, "assignmentStatus")) {
      filterControls.push(renderOperationsSelect("opsAssignmentStatusFilter", state.filters.assignmentStatus, "كل حالات التسكين", assignmentRows, "assignmentStatus", assignmentStatusLabel));
    }
    if (hasVisibleFilter(visibleFilterKeys, "riderSource")) {
      filterControls.push(renderOperationsSelect("opsRiderSourceFilter", state.filters.riderSource, "كل مصادر المندوب", assignmentRows, "riderSource", riderSourceLabel));
    }
    if (hasVisibleFilter(visibleFilterKeys, "supervisor")) {
      filterControls.push(renderOperationsSelect("opsSupervisorFilter", state.filters.supervisor, "كل المشرفين", assignmentRows, "supervisor"));
    }

    var tabDescription = isCurrentAssignmentsTab(state.activeTab)
      ? "عرض التسكينات الحالية والربط بين صاحب اليوزر والمندوب الفعلي والمركبة المستخدمة مع انتقالات آمنة إلى التبديل أو الإيقاف أو الإقالة."
      : isDashboardUsersTab(state.activeTab)
        ? "إدارة دورة حياة يوزرات الداشبورد وربط الجاهزية بالتسكين مع الحفاظ على الفصل بين الهوية الأساسية والتسكين التشغيلي."
        : state.activeTab === "working_riders"
          ? "عرض المناديب التي تعمل حاليا ضمن النطاق الحالي مع ربط سريع بحسابات المنصات."
          : state.activeTab === "audit_log"
            ? "عرض سجل العمليات الحقيقي فقط بدون توليد أي أحداث وهمية من التنقل أو البحث أو الفتح."
            : "متابعة السجلات التشغيلية داخل النطاق الحالي مع بقاء جميع الإجراءات للقراءة فقط حتى تنفيذ عملية حقيقية.";

    return [
      '<div class="ui-shell-card__head">',
      "  <div>",
      "    <h3>Operations Module</h3>",
      '    <p>' + escapeHtml(tabDescription) + "</p>",
      "  </div>",
      '  <div class="ops-scope-note">',
      '    <strong>النطاق الحالي</strong>',
      '    <span>' + escapeHtml(cityLabel) + " / " + escapeHtml(registerLabel) + "</span>",
      "  </div>",
      "</div>",
      filterControls.length ? '<div class="ops-toolbar ops-toolbar--filters">' + filterControls.join("") + "</div>" : "",
      importButtons.length ? renderOperationsImportButtons(importButtons) : ""
    ].join("");
  }

  function renderOperationsKpis(model) {
    if (isCurrentAssignmentsTab(state.activeTab)) {
      return renderCurrentAssignmentKpis(model.currentAssignmentKpis || {});
    }
    if (!isDashboardUsersTab(state.activeTab)) {
      return "";
    }
    var kpis = model.dashboardKpis || {};
    var items = [
      { label: "إجمالي يوزرات الداشبورد", value: kpis.totalDashboardUsers || 0 },
      { label: "جديد", value: kpis.newUsers || 0, className: "blue" },
      { label: "جاهز للتسكين", value: kpis.readyForAssignment || 0, className: "good" },
      { label: "مسكن", value: kpis.assigned || 0, className: "good" },
      { label: "قيد المراجعة", value: kpis.pendingReview || 0, className: "warn" },
      { label: "مرفوض", value: kpis.rejected || 0, className: "bad" },
      { label: "مقال / مختفي", value: kpis.dismissedOrMissing || 0, className: "bad" },
      { label: "يحتاج مراجعة", value: kpis.needsReview || 0, className: "warn" }
    ];
    return '<div class="kpi-grid ops-kpis">' + items.map(function (item) {
      return '<article class="kpi ' + escapeHtml(item.className || "") + '"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></article>";
    }).join("") + "</div>";
  }

  function renderOperationsTabs(model) {
    var counts = model.tabCounts || {};
    var tabs = OperationsViewModel && typeof OperationsViewModel.listOperationTabs === "function"
      ? OperationsViewModel.listOperationTabs({
          includeAudit: !model.user || RBAC.canPerform(model.user, "audit.view"),
          includeOptional: true
        })
      : [];
    return '<div class="ops-tabs">' + tabs.map(function (item) {
      var isActive = state.activeTab === item.key;
      return '<button type="button" class="ops-tab' + (isActive ? " is-active" : "") + '" data-ops-tab="' + escapeHtml(item.key) + '">' +
        escapeHtml(item.label) + ' <span>' + escapeHtml(String(counts[item.key] || 0)) + "</span></button>";
    }).join("") + "</div>";
  }

  function renderOperationsTabBody(model) {
    if (state.activeTab === "swaps") {
      return renderSwapsTable(model.visibleSwaps || []);
    }
    if (state.activeTab === "terminations") {
      return renderTerminationsTable(model.visibleTerminations || []);
    }
    if (state.activeTab === "audit_log") {
      return renderAuditTable(model.auditLogs || []);
    }
    if (state.activeTab === "working_riders") {
      return renderWorkingRidersTable(model.visibleWorkingRiders || [], model.riderPlatformAccounts || []);
    }
    if (isCurrentAssignmentsTab(state.activeTab)) {
      return renderCurrentAssignmentsTable(model.filteredCurrentAssignmentRows || [], model.user);
    }
    if (isDashboardUsersTab(state.activeTab)) {
      return renderDashboardUsersTable(model.dashboardUsers || [], model.user);
    }
    return renderEmptyState("لا توجد صفحة تشغيل مطابقة لهذا التبويب حاليا.");
  }

  function renderWorkingRidersTable(rows, platformAccounts) {
    var accountsByRider = (platformAccounts || []).reduce(function (memo, item) {
      var key = String(item.riderId || "");
      memo[key] = memo[key] || [];
      memo[key].push(item);
      return memo;
    }, {});
    var workingRows = (rows || []).filter(function (item) {
      return normalizeText(item.currentWorkStatus) === "working";
    });
    if (!workingRows.length) {
      return renderEmptyState("لا توجد مناديب تعمل حاليًا ضمن النطاق الحالي.");
    }
    return [
      '<div class="table-wrap" style="margin-top:16px"><table><thead><tr>',
      "<th>Rider ID</th><th>الاسم</th><th>الإقامة</th><th>المدن</th><th>السجلات</th><th>المنصات</th><th>Accounts</th><th>Work Status</th>",
      "</tr></thead><tbody>",
      workingRows.map(function (rider) {
        var linkedAccounts = accountsByRider[rider.id] || [];
        return "<tr>" +
          '<td class="mono">' + escapeHtml(rider.id || "-") + "</td>" +
          "<td>" + escapeHtml(rider.displayName || "-") + "</td>" +
          '<td class="mono">' + escapeHtml(rider.primaryIqama || "-") + "</td>" +
          "<td>" + escapeHtml((rider.cities || [rider.city]).filter(Boolean).join(" / ") || "-") + "</td>" +
          "<td>" + escapeHtml((rider.registers || [rider.register]).filter(Boolean).join(" / ") || "-") + "</td>" +
          "<td>" + escapeHtml((rider.platforms || []).join(" / ") || "-") + "</td>" +
          "<td>" + escapeHtml(String(linkedAccounts.length)) + "</td>" +
          "<td>" + renderStatusPill(rider.currentWorkStatus || "-") + "</td>" +
          "</tr>";
      }).join(""),
      "</tbody></table></div>"
    ].join("");
  }

  function renderCurrentAssignmentsTable(rows, user) {
    if (!rows.length) {
      return renderEmptyState("لا توجد نتائج مطابقة لفلترة التسكين الحالية داخل هذا التبويب. جرّب مسح البحث أو توسيع نطاق السجل والمدينة.");
    }
    return [
      '<div class="table-wrap" style="margin-top:16px">',
      "  <table>",
      "    <thead>",
      "      <tr>",
      "        <th>Courier ID</th>",
      "        <th>صاحب اليوزر</th>",
      "        <th>إقامة صاحب اليوزر</th>",
      "        <th>المندوب المستخدم فعليًا</th>",
      "        <th>إقامة المندوب الفعلي</th>",
      "        <th>نوع المندوب</th>",
      "        <th>السجل</th>",
      "        <th>المدينة</th>",
      "        <th>التطبيق</th>",
      "        <th>نوع التشغيل</th>",
      "        <th>حالة التسكين</th>",
      "        <th>تاريخ بداية التسكين</th>",
      "        <th>تاريخ الاستلام</th>",
      "        <th>تاريخ أول يوم عمل</th>",
      "        <th>المركبة المسجلة</th>",
      "        <th>المركبة المستخدمة</th>",
      "        <th>نوع المركبة</th>",
      "        <th>اللوحة</th>",
      "        <th>الرقم التسلسلي</th>",
      "        <th>المشرف</th>",
      "        <th>الإجراءات</th>",
      "      </tr>",
      "    </thead>",
      "    <tbody>",
      rows.map(function (row) {
        return renderCurrentAssignmentRow(row, user);
      }).join(""),
      "    </tbody>",
      "  </table>",
      "</div>"
    ].join("");
  }

  function renderCurrentAssignmentRow(row, user) {
    var isFocused = state.notificationFocus && (
      normalizeText(state.notificationFocus.assignmentId) === normalizeText(row.assignmentId) ||
      normalizeText(state.notificationFocus.courierId) === normalizeText(row.dashboardUserId || row.courierId)
    );
    return [
      '<tr class="' + (isFocused ? "ops-row-highlight" : "") + '" data-assignment-row="' + escapeHtml(row.assignmentId || "") + '" data-dashboard-user-row="' + escapeHtml(row.dashboardUserId || row.courierId || "") + '"' + ((row.actualRiderId || row.currentRiderId) ? ' data-rider-id="' + escapeHtml(row.actualRiderId || row.currentRiderId) + '"' : "") + ">",
      '  <td class="mono">' + escapeHtml(row.dashboardUserId || row.courierId || "-") + "</td>",
      "  <td>" + renderPersonCell(row.ownerName || "-", row.ownerExistsInHr ? "HR" : "HR Missing") + "</td>",
      '  <td class="mono">' + escapeHtml(row.ownerIqama || "-") + "</td>",
      "  <td>" + renderPersonCell(row.actualRiderName || "-", row.actualRiderFound ? "Resolved" : "Needs review") + renderIssueBadges(row.issues) + "</td>",
      '  <td class="mono">' + escapeHtml(row.actualRiderIqama || "-") + "</td>",
      "  <td>" + renderSourcePill(row.riderSource || "Unknown") + "</td>",
      "  <td>" + escapeHtml(ImportTypes.registerLabel(row.register) || row.register || "-") + "</td>",
      "  <td>" + escapeHtml(row.city || "-") + "</td>",
      "  <td>" + renderPill(platformLabel(row.platform || "-"), "blue") + "</td>",
      "  <td>" + renderStatusPill(operationModeLabel(row.operationMode || "-")) + "</td>",
      "  <td>" + renderStatusPill(assignmentStatusLabel(row.assignmentStatus || "-")) + "</td>",
      '  <td class="mono">' + escapeHtml(formatDate(row.assignmentStartDate)) + "</td>",
      '  <td class="mono">' + escapeHtml(formatDate(row.riderReceiveDate)) + "</td>",
      '  <td class="mono">' + escapeHtml(formatDate(row.firstOnlineDate)) + "</td>",
      '  <td><div class="ops-cell-stack"><span class="mono">' + escapeHtml(row.dashboardVehicleSummary || "-") + "</span></div></td>",
      "  <td>" + renderAssignmentVehicleCell(row.actualVehicleSummary || "-", row.vehicleCompanyStatus || "unknown") + "</td>",
      "  <td>" + renderStatusPill(vehicleLabel(row.vehicleType || "-")) + "</td>",
      '  <td class="mono">' + escapeHtml(row.plateNumber || "-") + "</td>",
      '  <td class="mono">' + escapeHtml(row.vehicleSerial || "-") + "</td>",
      "  <td>" + escapeHtml(row.supervisor || "-") + "</td>",
      "  <td>" + renderActionButtons(row, user) + "</td>",
      "</tr>"
    ].join("");
  }

  function renderPersonCell(name, meta) {
    return '<div class="ops-cell-stack"><strong>' + escapeHtml(name || "-") + '</strong><span class="ops-inline-note">' + escapeHtml(meta || "-") + "</span></div>";
  }

  function renderAssignmentVehicleCell(summary, vehicleSource) {
    return '<div class="ops-cell-stack"><span class="mono">' + escapeHtml(summary || "-") + "</span>" + renderSourcePill(vehicleSourceLabel(vehicleSource || "unknown")) + "</div>";
  }

  function renderIssueBadges(issues) {
    issues = (issues || []).slice(0, 2);
    if (!issues.length) {
      return "";
    }
    return '<div class="ops-inline-badges">' + issues.map(function (issueCode) {
      return renderPill(issueLabel(issueCode), issueCode.indexOf("duplicate") >= 0 || issueCode.indexOf("dismissed") >= 0 ? "red" : "gold");
    }).join("") + "</div>";
  }

  function renderSourcePill(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (normalized === "hr" || normalized === "company") {
      return renderPill(value, "");
    }
    if (normalized === "external" || normalized === "private") {
      return renderPill(value, "blue");
    }
    return renderPill(value || "-", "gold");
  }

  function renderDashboardUsersTable(rows, user) {
    if (!rows.length) {
      return renderEmptyState("لا توجد نتائج مطابقة للفلترة الحالية داخل هذا التبويب. جرّب تعديل فلاتر الجاهزية أو دورة الحياة أو مسح البحث.");
    }
    return [
      '<div class="table-wrap" style="margin-top:16px">',
      "  <table>",
      "    <thead>",
      "      <tr>",
      "        <th>Courier ID</th>",
      "        <th>الاسم الكامل</th>",
      "        <th>رقم إقامة صاحب اليوزر</th>",
      "        <th>الجوال</th>",
      "        <th>السجل</th>",
      "        <th>المدينة</th>",
      "        <th>التطبيق</th>",
      "        <th>Employment</th>",
      "        <th>Review</th>",
      "        <th>Document</th>",
      "        <th>Lifecycle</th>",
      "        <th>Assignment Readiness</th>",
      "        <th>المندوب المستخدم فعليًا</th>",
      "        <th>نوع المندوب الفعلي</th>",
      "        <th>حالة التسكين</th>",
      "        <th>المركبة</th>",
      "        <th>آخر ظهور</th>",
      "        <th>الإجراءات</th>",
      "      </tr>",
      "    </thead>",
      "    <tbody>",
      rows.map(function (row) {
        return renderDashboardUserRow(row, user);
      }).join(""),
      "    </tbody>",
      "  </table>",
      "</div>"
    ].join("");
  }

  function renderDashboardUserRow(row, user) {
    var isFocused = state.notificationFocus && normalizeText(state.notificationFocus.courierId) === normalizeText(row.dashboardUserId || row.userId);
    return [
      '<tr class="' + (isFocused ? "ops-row-highlight" : "") + '" data-dashboard-user-row="' + escapeHtml(row.dashboardUserId || row.userId || "") + '"' + ((row.actualRiderId || row.currentRiderId) ? ' data-rider-id="' + escapeHtml(row.actualRiderId || row.currentRiderId) + '"' : "") + ">",
      '  <td class="mono">' + escapeHtml(row.dashboardUserId || row.userId || "-") + "</td>",
      "  <td>" + escapeHtml(row.fullName || "-") + "</td>",
      "  <td class=\"mono\">" + escapeHtml(row.ownerIqama || "-") + "</td>",
      "  <td class=\"mono\">" + escapeHtml(row.phoneNumber || row.ownerPhone || "-") + "</td>",
      "  <td>" + escapeHtml(ImportTypes.registerLabel(row.register) || row.register || "-") + "</td>",
      "  <td>" + escapeHtml(row.city || "-") + "</td>",
      "  <td>" + renderPill(platformLabel(row.platform || "-"), "blue") + "</td>",
      "  <td>" + renderStatusPill(employmentStatusLabel(row.employmentStatus || row.jobStatus || "-")) + "</td>",
      "  <td>" + renderStatusPill(reviewStatusLabel(row.reviewStatus || "-")) + "</td>",
      "  <td>" + renderStatusPill(documentStatusLabel(row.documentChangeStatus || "-")) + "</td>",
      "  <td>" + renderStatusPill(lifecycleLabel(row.lifecycleStatus || "-")) + "</td>",
      "  <td>" + renderStatusPill(readinessLabel(row.assignmentReadiness || "-")) + "</td>",
      "  <td>" + escapeHtml(row.actualRiderName || row.currentRiderName || "-") + "</td>",
      "  <td>" + escapeHtml(row.actualRiderSource || "-") + "</td>",
      "  <td>" + renderStatusPill(row.assignmentStatus || "none") + "</td>",
      "  <td>" + renderVehicleSummaryCell(row.registeredVehicleOnDashboard || row.actualUsedVehicle, row.vehicleSerial || row.registeredVehicleSerial, row.plateNumber) + "</td>",
      '  <td class="mono">' + escapeHtml(formatDate(row.lastSeenAt || row.updatedAt || "")) + "</td>",
      "  <td>" + renderActionButtons(row, user) + "</td>",
      "</tr>"
    ].join("");
  }

  function renderVehicleSummaryCell(vehicle, fallbackSerial, fallbackPlateNumber) {
    var summary = buildVehicleSummaryText(vehicle, fallbackSerial, fallbackPlateNumber);
    var status = normalizeText(vehicle && vehicle.status);
    var html = '<div class="ops-cell-stack"><span class="mono">' + escapeHtml(summary) + "</span>";
    if (status) {
      html += renderPill(status, status.indexOf("excluded") >= 0 || status.indexOf("blocked") >= 0 ? "red" : "blue");
    }
    html += "</div>";
    return html;
  }

  function renderFleetMatchCell(row) {
    var items = [renderStatusPill(row.fleetMatchStatus || "missing")];
    if (row.fleetWarnings && row.fleetWarnings.length) {
      items.push('<span class="ops-inline-note">' + escapeHtml((row.fleetWarnings || []).join(", ")) + "</span>");
    }
    if (row.fleetBlockingIssues && row.fleetBlockingIssues.length) {
      items.push('<span class="ops-inline-note ops-inline-note--danger">' + escapeHtml((row.fleetBlockingIssues || []).join(", ")) + "</span>");
    }
    return '<div class="ops-cell-stack">' + items.join("") + "</div>";
  }

  function renderActionButtons(row, user) {
    return renderActionButtonsSafe(row, user);
    if (ActionDropdown && typeof ActionDropdown.renderActionDropdown === "function") {
      return ActionDropdown.renderActionDropdown({
        dropdownId: "ops_" + escapeHtml(row.dashboardUserId || row.userId || row.id || "row"),
        label: "العمليات",
        contextData: {
          module: "operations",
          "dashboard-user-id": row.dashboardUserId || row.userId || "",
          "rider-id": row.actualRiderId || row.currentRiderId || ""
        },
        actions: buildDropdownActions(row, user)
      });
    }
    return [
      '<div class="ops-actions">',
      renderActionButton("details", "التفاصيل", row, !user || RBAC.canPerform(user, "operations.view"), ""),
      renderActionButton("assign", "تسكين", row, (!user || RBAC.canPerform(user, "operations.assign")) && row.canAssign !== false, "الحالة الحالية لا تسمح بالتسكين"),
      renderActionButton("swap", "تبديل", row, (!user || RBAC.canPerform(user, "operations.swap")) && row.canSwap !== false, "الحالة الحالية لا تسمح بالتبديل"),
      renderActionButton("stop", "إيقاف", row, (!user || RBAC.canPerform(user, "operations.terminate")) && row.canStop !== false, "الحالة الحالية لا تسمح بالإيقاف"),
      renderActionButton("terminate", "إقالة", row, (!user || RBAC.canPerform(user, "operations.terminate")) && row.canDismiss !== false, "الحالة الحالية لا تسمح بالإقالة"),
      renderActionButton("copy", "نسخ User ID", row, true, ""),
      "</div>"
    ].join("");
  }

  function buildDropdownActions(row, user) {
    return buildDropdownActionsSafe(row, user);
    var linkedRiderId = row.actualRiderId || row.currentRiderId || "";
    var riderArchiveAllowed = !!linkedRiderId && (!user || RBAC.canPerform(user, "archive.view"));
    var assignAllowed = (!user || RBAC.canPerform(user, "operations.assign")) && row.canAssign !== false;
    var swapAllowed = (!user || RBAC.canPerform(user, "operations.swap")) && row.canSwap !== false;
    var stopAllowed = (!user || RBAC.canPerform(user, "operations.terminate")) && row.canStop !== false;
    var dismissAllowed = (!user || RBAC.canPerform(user, "operations.terminate")) && row.canDismiss !== false;
    return [
      dropdownAction("linked-dashboard-user", "فتح يوزر الداشبورد", !!(row.dashboardUserId || row.userId), (row.dashboardUserId || row.userId) ? "" : "لا يوجد يوزر داشبورد مرتبط", false),
      dropdownAction("linked-current-assignment", "فتح التسكين الحالي", !!(row.dashboardUserId || row.userId), (row.dashboardUserId || row.userId) ? "" : "لا يوجد تسكين مرتبط", false),
      dropdownAction("details", "عرض التفاصيل", !user || RBAC.canPerform(user, "operations.view"), "", false),
      dropdownAction("assign", "تسكين لأول مرة", assignAllowed, assignAllowed ? "" : "الحالة الحالية لا تسمح بالتسكين", false),
      dropdownAction("swap", "تبديل مندوب", swapAllowed, swapAllowed ? "" : "الحالة الحالية لا تسمح بالتبديل", false),
      dropdownAction("stop", "إيقاف بدون بديل", stopAllowed, stopAllowed ? "" : "الحالة الحالية لا تسمح بالإيقاف", false),
      dropdownAction("terminate", "إقالة اليوزر", dismissAllowed, dismissAllowed ? "" : "الحالة الحالية لا تسمح بالإقالة", true),
      dropdownAction("history", "عرض سجل الحركة", true, "", false),
      dropdownAction("actual-rider-details", "عرض المندوب الفعلي", !!row.currentRiderId, row.currentRiderId ? "" : "لا يوجد مندوب فعلي حاليًا", false),
      dropdownAction("owner-details", "عرض صاحب اليوزر", !!row.ownerIqama, row.ownerIqama ? "" : "لا توجد إقامة مالك", false),
      dropdownAction("resolver", "فتح Resolver", true, "", false),
      dropdownAction("source-batch", "فتح Import Source Batch", !!(row.sourceBatchId || row.lastSeenImportBatchId), "لا يوجد Batch مرتبط", false),
      dropdownAction("copy", "نسخ User ID", true, "", false),
      dropdownAction("rider-archive", "أرشيف المندوب", riderArchiveAllowed, row.currentRiderId ? "يحتاج صلاحية archive.view" : "لا يوجد مندوب مرتبط", false)
    ];
  }

  function dropdownAction(actionId, label, allowed, deniedReason, danger) {
    return {
      actionId: actionId,
      danger: !!danger,
      disabled: !allowed,
      label: label,
      reason: deniedReason || ""
    };
  }

  function renderActionButton(action, label, row, allowed, deniedReason) {
    return '<button type="button" class="ops-action-btn' + (allowed ? "" : " is-disabled") + '"' +
      ' data-ops-action="' + escapeHtml(action) + '"' +
      ' data-dashboard-user-id="' + escapeHtml(row.dashboardUserId || row.userId || "") + '"' +
      (row.currentRiderId ? ' data-rider-id="' + escapeHtml(row.currentRiderId) + '"' : "") +
      (allowed ? "" : ' disabled title="' + escapeHtml(deniedReason) + '"') +
      ">" + escapeHtml(label) + "</button>";
  }

  function renderActionButtonsSafe(row, user) {
    if (ActionDropdown && typeof ActionDropdown.renderActionDropdown === "function") {
      return ActionDropdown.renderActionDropdown({
        dropdownId: "ops_" + escapeHtml(row.dashboardUserId || row.userId || row.id || "row"),
        label: "العمليات",
        contextData: {
          module: "operations",
          "dashboard-user-id": row.dashboardUserId || row.userId || "",
          "rider-id": row.actualRiderId || row.currentRiderId || ""
        },
        actions: buildDropdownActionsSafe(row, user)
      });
    }
    return [
      '<div class="ops-actions">',
      renderActionButtonSafe("details", "التفاصيل", row, !user || RBAC.canPerform(user, "operations.view"), ""),
      renderActionButtonSafe("assign", "تسكين", row, (!user || RBAC.canPerform(user, "operations.assign")) && row.canAssign !== false, "الحالة الحالية لا تسمح بالتسكين"),
      renderActionButtonSafe("swap", "تبديل", row, (!user || RBAC.canPerform(user, "operations.swap")) && row.canSwap !== false, "الحالة الحالية لا تسمح بالتبديل"),
      renderActionButtonSafe("stop", "إيقاف", row, (!user || RBAC.canPerform(user, "operations.terminate")) && row.canStop !== false, "الحالة الحالية لا تسمح بالإيقاف"),
      renderActionButtonSafe("terminate", "إقالة", row, (!user || RBAC.canPerform(user, "operations.terminate")) && row.canDismiss !== false, "الحالة الحالية لا تسمح بالإقالة"),
      renderActionButtonSafe("copy", "نسخ User ID", row, true, ""),
      "</div>"
    ].join("");
  }

  function buildDropdownActionsSafe(row, user) {
    var linkedRiderId = row.actualRiderId || row.currentRiderId || "";
    var riderArchiveAllowed = !!linkedRiderId && (!user || RBAC.canPerform(user, "archive.view"));
    var assignAllowed = (!user || RBAC.canPerform(user, "operations.assign")) && row.canAssign !== false;
    var swapAllowed = (!user || RBAC.canPerform(user, "operations.swap")) && row.canSwap !== false;
    var stopAllowed = (!user || RBAC.canPerform(user, "operations.terminate")) && row.canStop !== false;
    var dismissAllowed = (!user || RBAC.canPerform(user, "operations.terminate")) && row.canDismiss !== false;
    return [
      dropdownAction("linked-dashboard-user", "فتح يوزر الداشبورد", !!(row.dashboardUserId || row.userId), (row.dashboardUserId || row.userId) ? "" : "لا يوجد يوزر داشبورد مرتبط", false),
      dropdownAction("linked-current-assignment", "فتح التسكين الحالي", !!(row.dashboardUserId || row.userId), (row.dashboardUserId || row.userId) ? "" : "لا يوجد تسكين مرتبط", false),
      dropdownAction("details", "عرض التفاصيل", !user || RBAC.canPerform(user, "operations.view"), "", false),
      dropdownAction("assign", "تسكين لأول مرة", assignAllowed, assignAllowed ? "" : "الحالة الحالية لا تسمح بالتسكين", false),
      dropdownAction("swap", "تبديل مندوب", swapAllowed, swapAllowed ? "" : "الحالة الحالية لا تسمح بالتبديل", false),
      dropdownAction("stop", "إيقاف بدون بديل", stopAllowed, stopAllowed ? "" : "الحالة الحالية لا تسمح بالإيقاف", false),
      dropdownAction("terminate", "إقالة اليوزر", dismissAllowed, dismissAllowed ? "" : "الحالة الحالية لا تسمح بالإقالة", true),
      dropdownAction("history", "عرض سجل الحركة", true, "", false),
      dropdownAction("actual-rider-details", "عرض المندوب الفعلي", !!linkedRiderId, linkedRiderId ? "" : "لا يوجد مندوب فعلي حاليا", false),
      dropdownAction("owner-details", "عرض صاحب اليوزر", !!row.ownerIqama, row.ownerIqama ? "" : "لا توجد إقامة مالك", false),
      dropdownAction("resolver", "فتح Resolver", true, "", false),
      dropdownAction("source-batch", "فتح Import Source Batch", !!(row.sourceBatchId || row.lastSeenImportBatchId), "لا يوجد Batch مرتبط", false),
      dropdownAction("copy", "نسخ User ID", true, "", false),
      dropdownAction("rider-archive", "أرشيف المندوب", riderArchiveAllowed, linkedRiderId ? "يحتاج صلاحية archive.view" : "لا يوجد مندوب مرتبط", false)
    ];
  }

  function renderActionButtonSafe(action, label, row, allowed, deniedReason) {
    return '<button type="button" class="ops-action-btn' + (allowed ? "" : " is-disabled") + '"' +
      ' data-ops-action="' + escapeHtml(action) + '"' +
      ' data-dashboard-user-id="' + escapeHtml(row.dashboardUserId || row.userId || "") + '"' +
      ((row.actualRiderId || row.currentRiderId) ? ' data-rider-id="' + escapeHtml(row.actualRiderId || row.currentRiderId) + '"' : "") +
      (allowed ? "" : ' disabled title="' + escapeHtml(deniedReason) + '"') +
      ">" + escapeHtml(label) + "</button>";
  }

  function renderSwapsTable(rows) {
    rows = (rows || []).filter(function (item) { return item.action === "swap"; });
    if (!rows.length) {
      return renderEmptyState("لا توجد عمليات تبديل ضمن النطاق الحالي.");
    }
    return [
      '<div class="table-wrap" style="margin-top:16px"><table><thead><tr>',
      "<th>Date</th><th>User ID</th><th>Previous Rider</th><th>New Rider</th><th>City</th><th>Register</th><th>Reason</th>",
      "</tr></thead><tbody>",
      rows.map(function (item) {
        return "<tr>" +
          "<td>" + escapeHtml(formatDate(item.actionDate || item.createdAt)) + "</td>" +
          '<td class="mono">' + escapeHtml(item.dashboardUserId || "-") + "</td>" +
          "<td>" + escapeHtml(item.previousRiderId || "-") + "</td>" +
          "<td>" + escapeHtml(item.newRiderId || "-") + "</td>" +
          "<td>" + escapeHtml(item.city || "-") + "</td>" +
          "<td>" + escapeHtml(ImportTypes.registerLabel(item.register) || item.register || "-") + "</td>" +
          "<td>" + escapeHtml(item.reason || "-") + "</td>" +
          "</tr>";
      }).join(""),
      "</tbody></table></div>"
    ].join("");
  }

  function renderTerminationsTable(rows) {
    if (!rows.length) {
      return renderEmptyState("لا توجد إقالات أو إيقافات ضمن النطاق الحالي.");
    }
    return [
      '<div class="table-wrap" style="margin-top:16px"><table><thead><tr>',
      "<th>Date</th><th>User ID</th><th>Rider</th><th>Type</th><th>Status After</th><th>City</th><th>Register</th><th>Reason</th>",
      "</tr></thead><tbody>",
      rows.map(function (item) {
        return "<tr>" +
          "<td>" + escapeHtml(formatDate(item.terminationDate || item.createdAt)) + "</td>" +
          '<td class="mono">' + escapeHtml(item.dashboardUserId || "-") + "</td>" +
          "<td>" + escapeHtml(item.riderId || "-") + "</td>" +
          "<td>" + escapeHtml(item.terminationType || "-") + "</td>" +
          "<td>" + renderStatusPill(item.statusAfter || item.status || "-") + "</td>" +
          "<td>" + escapeHtml(item.city || "-") + "</td>" +
          "<td>" + escapeHtml(ImportTypes.registerLabel(item.register) || item.register || "-") + "</td>" +
          "<td>" + escapeHtml(item.reason || "-") + "</td>" +
          "</tr>";
      }).join(""),
      "</tbody></table></div>"
    ].join("");
  }

  function renderAuditFilters(filterOptions) {
    return [
      '<div class="ops-toolbar" style="margin-top:16px">',
      '  <select id="opsAuditEventFilter" class="ops-select">',
      renderOption("", "All Events", state.auditFilters.eventType),
      (filterOptions.eventTypes || []).map(function (value) {
        return renderOption(value, value, state.auditFilters.eventType);
      }).join(""),
      "  </select>",
      '  <select id="opsAuditEntityFilter" class="ops-select">',
      renderOption("", "All Entities", state.auditFilters.entityType),
      (filterOptions.entityTypes || []).map(function (value) {
        return renderOption(value, value, state.auditFilters.entityType);
      }).join(""),
      "  </select>",
      '  <select id="opsAuditCityFilter" class="ops-select">',
      renderOption("", "All Cities", state.auditFilters.city),
      (filterOptions.cities || []).map(function (value) {
        return renderOption(value, value, state.auditFilters.city);
      }).join(""),
      "  </select>",
      '  <select id="opsAuditRegisterFilter" class="ops-select">',
      renderOption("", "All Registers", state.auditFilters.register),
      (filterOptions.registers || []).map(function (value) {
        return renderOption(value, ImportTypes.registerLabel(value) || value, state.auditFilters.register);
      }).join(""),
      "  </select>",
      "</div>",
      '<div class="ops-toolbar" style="margin-top:12px">',
      '  <input id="opsAuditActorFilter" type="search" class="ops-input" placeholder="Actor / User ID" value="' + escapeHtml(state.auditFilters.actorUserId) + '">',
      '  <input id="opsAuditDateFrom" type="date" class="ops-input" value="' + escapeHtml(state.auditFilters.dateFrom) + '">',
      '  <input id="opsAuditDateTo" type="date" class="ops-input" value="' + escapeHtml(state.auditFilters.dateTo) + '">',
      "</div>"
    ].join("");
  }

  function renderAuditPagination(result) {
    var page = result && result.page ? result.page : 1;
    var totalPages = result && result.totalPages ? result.totalPages : 1;
    if (totalPages <= 1) {
      return "";
    }
    return [
      '<div class="ops-toolbar" style="margin-top:12px;justify-content:space-between">',
      '  <span class="ops-inline-note">Page ' + escapeHtml(String(page)) + " / " + escapeHtml(String(totalPages)) + "</span>",
      '  <div class="actions">',
      '    <button type="button" class="btn light" data-ops-audit-page="' + escapeHtml(String(Math.max(1, page - 1))) + '"' + (page <= 1 ? " disabled" : "") + ">Previous</button>",
      '    <button type="button" class="btn light" data-ops-audit-page="' + escapeHtml(String(Math.min(totalPages, page + 1))) + '"' + (page >= totalPages ? " disabled" : "") + ">Next</button>",
      "  </div>",
      "</div>"
    ].join("");
  }

  function renderAuditTable(rows) {
    var query = state.filters.query || "";
    var result = operationsLogView
      ? operationsLogView.listEvents(mergeObjects({}, state.auditFilters, {
          query: query
        }), {
          page: state.auditPage,
          pageSize: 25
        })
      : {
          items: (rows || []).filter(function (item) {
            return matchesSearch([item.action, item.entity, item.entityId, item.note].join(" "), query);
          }),
          page: 1,
          total: (rows || []).length,
          totalPages: 1
        };
    var visibleRows = result.items || [];
    var filterOptions = operationsLogView ? operationsLogView.getFilterOptions() : {
      actorUserIds: [],
      cities: [],
      entityTypes: [],
      eventTypes: [],
      registers: []
    };
    if (!visibleRows.length && !result.total) {
      return renderEmptyState("لا توجد سجلات Audit ضمن الفلترة الحالية.");
    }
    return [
      renderAuditFilters(filterOptions),
      '<div class="table-wrap" style="margin-top:16px"><table><thead><tr>',
      "<th>Time</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Actor</th><th>City</th><th>Register</th><th>Note</th>",
      "</tr></thead><tbody>",
      visibleRows.map(function (item) {
        return "<tr>" +
          "<td>" + escapeHtml(formatDate(item.timestamp)) + "</td>" +
          "<td>" + escapeHtml(item.eventType || item.action || "-") + "</td>" +
          "<td>" + escapeHtml(item.entityType || item.entity || "-") + "</td>" +
          '<td class="mono">' + escapeHtml(item.entityId || "-") + "</td>" +
          "<td>" + escapeHtml(item.userId || item.actorUserId || item.actorName || "-") + "</td>" +
          "<td>" + escapeHtml(item.city || "-") + "</td>" +
          "<td>" + escapeHtml(ImportTypes.registerLabel(item.register) || item.register || "-") + "</td>" +
          "<td>" + escapeHtml(item.reason || item.note || "-") + "</td>" +
          "</tr>";
      }).join(""),
      "</tbody></table></div>",
      renderAuditPagination(result)
    ].join("");
  }

  function handleLinkedOperationsAction(action, user, assignmentRow) {
    if (action !== "linked-dashboard-user" && action !== "linked-current-assignment") {
      return false;
    }
    var detail = buildOperationsFocusDetail({
      assignmentRow: assignmentRow,
      linkedSubPage: action === "linked-current-assignment" ? "current_assignments" : "dashboard_users",
      user: user || assignmentRow || null
    });
    focusOperationsView(detail, {
      openPage: true,
      reason: action
    });
    return true;
  }

  function handleAction(action, dashboardUserId, riderId) {
    var user = findDashboardUser(dashboardUserId);
    var assignmentRow = findCurrentAssignmentRow(dashboardUserId);
    if (handleLinkedOperationsAction(action, user, assignmentRow)) {
      return;
    }
    if (action === "copy") {
      copyText(dashboardUserId || "");
      toast("تم نسخ User ID");
      return;
    }
    if (!user && !assignmentRow) {
      toast("تعذر العثور على اليوزر المطلوب.", "error");
      return;
    }
    if (action === "details") {
      state.drawerMode = "details";
      openDrawer(
        isCurrentAssignmentsTab(state.activeTab) ? "تفاصيل التسكين الحالي" : "تفاصيل اليوزر",
        isCurrentAssignmentsTab(state.activeTab) && assignmentRow
          ? renderCurrentAssignmentDetailsDrawer(assignmentRow)
          : renderDetailsDrawer(user)
      );
      return;
    }
    if (action === "assign") {
      state.drawerMode = "assign";
      state.drawerSearch = "";
      primeDrawerDraft("assign", user, {
        date: today(),
        reason: ""
      });
      openDrawer("تسكين مندوب", renderAssignDrawer(user));
      return;
    }
    if (action === "swap") {
      state.drawerMode = "swap";
      state.drawerSearch = "";
      primeDrawerDraft("swap", user, {
        date: today(),
        reason: ""
      });
      openDrawer("تبديل مندوب", renderSwapDrawer(user));
      return;
    }
    if (action === "stop") {
      state.drawerMode = "termination";
      openDrawer("إيقاف بدون بديل", renderTerminationDrawer(user, "stop_without_replacement"));
      return;
    }
    if (action === "terminate") {
      state.drawerMode = "termination";
      openDrawer("نقل إلى الإقالات", renderTerminationDrawer(user, "terminate"));
      return;
    }
    if (action === "history") {
      state.drawerMode = "details";
      openDrawer(
        isCurrentAssignmentsTab(state.activeTab) && assignmentRow ? "السجل التشغيلي للتسكين" : "سجل حركة اليوزر",
        isCurrentAssignmentsTab(state.activeTab) && assignmentRow
          ? renderCurrentAssignmentHistoryDrawer(assignmentRow)
          : renderDashboardHistoryDrawer(user)
      );
      return;
    }
    if (action === "actual-rider-details") {
      state.drawerMode = "details";
      openDrawer("بيانات المندوب الفعلي", renderActualRiderDetailsDrawer(user));
      return;
    }
    if (action === "owner-details") {
      state.drawerMode = "details";
      openDrawer("بيانات صاحب اليوزر", renderOwnerDetailsDrawer(user));
      return;
    }
    if (action === "resolver") {
      state.drawerMode = "details";
      openDrawer("Resolver", renderResolverInspectorDrawer(user));
      return;
    }
    if (action === "source-batch") {
      state.drawerMode = "details";
      openDrawer("Import Source Batch", renderImportSourceBatchDrawer(user));
      return;
    }
    if (action === "rider-archive" && riderId) {
      state.drawerMode = "details";
      openDrawer("أرشيف المندوب", renderRiderArchiveDrawer(riderId));
    }
  }

  function renderCurrentDrawer() {
    var titleNode = document.getElementById("uiDrawerTitle");
    if (!titleNode) {
      return;
    }
    var dashboardUserId = document.getElementById("opsDrawerDashboardUserId");
    if (!dashboardUserId) {
      return;
    }
    var user = findDashboardUser(dashboardUserId.value);
    if (!user) {
      return;
    }
    if (state.drawerMode === "assign") {
      openDrawer("تسكين مندوب", renderAssignDrawer(user));
      return;
    }
    if (state.drawerMode === "swap") {
      openDrawer("تبديل مندوب", renderSwapDrawer(user));
      return;
    }
    if (state.drawerMode === "termination") {
      var actionNode = document.getElementById("opsTerminationAction");
      openDrawer("إجراء على اليوزر", renderTerminationDrawer(user, actionNode ? actionNode.value : "terminate"));
      return;
    }
    openDrawer("تفاصيل اليوزر", renderDetailsDrawer(user));
  }

  function renderDetailsDrawer(user) {
    if (!user) {
      return '<div class="empty">لا توجد بيانات متاحة لهذا اليوزر.</div>';
    }
    if (!DetailsDrawer || typeof DetailsDrawer.renderDetailsDrawer !== "function") {
      return renderLegacyDetailsDrawer(user);
    }
    var history = getCollection("assignmentHistory").filter(function (item) {
      return String(item.dashboardUserId || "") === String(user.dashboardUserId || user.userId || "");
    });
    var reviews = getCollection("operationalStatusReviews").filter(function (item) {
      return String(item.dashboardUserId || "") === String(user.dashboardUserId || user.userId || "");
    });
    var audits = getCollection("auditLogs").filter(function (item) {
      return String(item.entityId || "") === String(user.id || "") ||
        String(item.entityId || "") === String(user.dashboardUserId || user.userId || "") ||
        String(item.after && item.after.dashboardUserId || "") === String(user.dashboardUserId || user.userId || "") ||
        String(item.before && item.before.dashboardUserId || "") === String(user.dashboardUserId || user.userId || "");
    }).slice().sort(function (left, right) {
      return String(right.timestamp || "").localeCompare(String(left.timestamp || ""));
    }).slice(0, 10);
    var ownerProfile = getCollection("hrProfiles").filter(function (item) {
      return normalizeText(item.iqama || "") === normalizeText(user.ownerIqama || "");
    })[0] || null;
    var sourceBatch = getCollection("importBatches").filter(function (item) {
      return String(item.id || "") === String(user.sourceBatchId || user.lastSeenImportBatchId || "");
    })[0] || null;
    var summaryTitle = user.dashboardUserId || user.userId || "-";
    var subtitle = [user.fullName || "-", user.city || "-", ImportTypes.registerLabel(user.register) || user.register || "-"].join(" • ");
    return [
      '<input type="hidden" id="opsDrawerDashboardUserId" value="' + escapeHtml(user.dashboardUserId || user.userId || "") + '">',
      DetailsDrawer.renderDetailsDrawer({
        summary: {
          title: summaryTitle,
          subtitle: subtitle,
          badges: [
            { label: lifecycleLabel(user.lifecycleStatus || "unknown"), tone: normalizeText(user.lifecycleStatus) === "rejected" ? "danger" : "success" },
            { label: readinessLabel(user.assignmentReadiness || "needs_manual_review"), tone: normalizeText(user.assignmentReadiness).indexOf("ready") >= 0 ? "success" : "warning" },
            { label: user.fleetMatchStatus || "fleet_missing", tone: (user.fleetBlockingIssues || []).length ? "danger" : "success" }
          ]
        },
        sections: [
          {
            title: "1. Dashboard user identity",
            fields: [
              detailsField("User ID", summaryTitle, true),
              detailsField("First Name", user.firstName || "-"),
              detailsField("Last Name", user.lastName || "-"),
              detailsField("الاسم الكامل", user.fullName || "-"),
              detailsField("المدينة", user.city || "-"),
              detailsField("السجل", ImportTypes.registerLabel(user.register) || user.register || "-"),
              detailsField("التطبيق", platformLabel(user.platform || "-")),
              detailsField("المركبة", vehicleLabel(user.vehicleType)),
              detailsField("رقم الجوال", user.phoneNumber || user.ownerPhone || "-"),
              detailsField("Qualification", user.qualificationType || user.courierQualificationType || "-")
            ]
          },
          {
            title: "2. Owner profile",
            fields: [
              detailsField("Owner Name", user.ownerName || user.fullName || "-"),
              detailsField("Owner Iqama", user.ownerIqama || "-", true),
              detailsField("Owner Source", user.ownerSource || "-"),
              detailsField("Matched in HR", user.ownerExistsInHr ? "Yes" : "No"),
              detailsField("HR Profile", ownerProfile ? (ownerProfile.fullNameArabic || ownerProfile.fullNameEnglish || ownerProfile.id || "-") : "-"),
              detailsField("HR Status", ownerProfile ? (ownerProfile.hrStatus || ownerProfile.status || "-") : "-")
            ]
          },
          {
            title: "3. Current actual rider / assignment",
            fields: [
              detailsField("Actual Rider", user.actualRiderName || user.currentRiderName || "-"),
              detailsField("Actual Rider ID", user.actualRiderId || user.currentRiderId || "-", true),
              detailsField("Actual Rider Iqama", user.actualRiderIqama || user.currentRiderIqama || "-", true),
              detailsField("Rider Source", user.actualRiderSource || "-"),
              detailsField("Assignment", user.currentAssignmentId || "-", true),
              detailsField("Assignment Status", user.assignmentStatus || "-")
            ]
          },
          {
            title: "4. Assignment readiness reasons",
            fields: [
              detailsField("Lifecycle", lifecycleLabel(user.lifecycleStatus || "-")),
              detailsField("Readiness", readinessLabel(user.assignmentReadiness || "-")),
              detailsField("Reason", user.assignmentReadinessReason || user.recommendedAction || "-"),
              detailsField("Issues", renderDetailsBadges(user.assignmentReadinessIssues || []), false, true),
              detailsField("Can Assign", user.canAssign ? "Yes" : "No"),
              detailsField("Can Swap / Stop", [user.canSwap ? "Swap" : "", user.canStop ? "Stop" : ""].filter(Boolean).join(" / ") || "-")
            ]
          },
          {
            title: "5. Vehicle summary",
            fields: [
              detailsField("Registered Vehicle", user.registeredVehicleDisplay || buildVehicleSummaryText(user.registeredVehicleOnDashboard, user.vehicleSerial, user.plateNumber)),
              detailsField("Actual Used Vehicle", user.actualUsedVehicleDisplay || buildVehicleSummaryText(user.actualUsedVehicle, user.actualUsedVehicleSerial, user.actualUsedVehiclePlateNumber)),
              detailsField("Vehicle Match", user.fleetMatchStatus || "-"),
              detailsField("Movement Status", user.vehicleMovementStatus || "-"),
              detailsField("Capacity", user.fleetCapacityStatus || "-"),
              detailsField("Fleet Warnings", renderDetailsBadges(user.fleetWarnings), false, true),
              detailsField("Blocking Issues", renderDetailsBadges(user.fleetBlockingIssues), false, true)
            ]
          },
          {
            title: "6. Review / document status",
            fields: [
              detailsField("Employment Status", employmentStatusLabel(user.employmentStatus || user.jobStatus || "-")),
              detailsField("Review Status", reviewStatusLabel(user.reviewStatus || "-")),
              detailsField("Document Status", documentStatusLabel(user.documentChangeStatus || "-")),
              detailsField("Settlement Mode", operationModeLabel(user.operationMode || user.settlementMode || "-")),
              detailsField("Please Note", user.pleaseNote || user.notes || "-"),
              detailsField("Latest Presence", user.latestImportPresence || "-")
            ]
          },
          {
            title: "7. Latest import batch / source",
            fields: [
              detailsField("Source Batch", user.sourceBatchId || user.lastSeenImportBatchId || "-", true),
              detailsField("Source File", sourceBatch ? (sourceBatch.sourceFileName || sourceBatch.fileName || "-") : (user.sourceFile || "-")),
              detailsField("Source Sheet", user.sourceSheet || "-"),
              detailsField("Source Row", user.sourceRow ? String(user.sourceRow) : "-"),
              detailsField("First Seen", formatDate(user.firstSeenAt)),
              detailsField("Last Seen", formatDate(user.lastSeenAt))
            ]
          },
          {
            title: "8. History links",
            contentHtml: [
              renderSimpleTable("Assignment History", ["Date", "Action", "Previous Rider", "New Rider", "Reason"], history.map(function (item) {
                return [
                  formatDate(item.actionDate || item.createdAt),
                  item.action || "-",
                  item.previousRiderId || "-",
                  item.newRiderId || "-",
                  item.reason || "-"
                ];
              })),
              renderSimpleTable("Status Reviews", ["Time", "Review", "Reasons", "Recommended Action"], reviews.map(function (item) {
                return [
                  formatDate(item.reviewedAt || item.createdAt),
                  item.reviewStatus || "-",
                  (item.reasons || []).join(", ") || "-",
                  item.recommendedAction || "-"
                ];
              })),
              renderSimpleTable("Latest Audit Logs", ["Time", "Action", "Entity", "Note"], audits.map(function (item) {
                return [
                  formatDate(item.timestamp),
                  item.action || "-",
                  item.entity || "-",
                  item.note || "-"
                ];
              }))
            ].join("")
          }
        ]
      })
    ].join("");
  }

  function renderCurrentAssignmentDetailsDrawer(row) {
    if (!row) {
      return '<div class="empty">لا توجد بيانات تسكين متاحة لهذا السجل.</div>';
    }
    var timelineRows = buildCurrentAssignmentTimeline(row);
    var sourceBatch = getCollection("importBatches").filter(function (item) {
      return String(item.id || "") === String(row.sourceBatchId || row.sourceImportBatchId || "");
    })[0] || null;
    var badges = [
      { label: assignmentStatusLabel(row.assignmentStatus || "-"), tone: row.isActive ? "success" : "warning" },
      { label: riderSourceLabel(row.riderSource || "Unknown"), tone: normalizeText(row.riderSource) === "HR" ? "success" : "info" },
      { label: vehicleSourceLabel(row.vehicleCompanyStatus || "unknown"), tone: row.vehicleCompanyStatus === "company" ? "success" : "warning" }
    ];
    if (DetailsDrawer && typeof DetailsDrawer.renderDetailsDrawer === "function") {
      return DetailsDrawer.renderDetailsDrawer({
        summary: {
          title: row.dashboardUserId || row.assignmentId || "-",
          subtitle: [row.ownerName || "-", row.city || "-", ImportTypes.registerLabel(row.register) || row.register || "-"].join(" • "),
          badges: badges
        },
        sections: [
          {
            title: "1. Assignment identity",
            fields: [
              detailsField("Assignment ID", row.assignmentId || "-", true),
              detailsField("Courier ID", row.dashboardUserId || row.courierId || "-", true),
              detailsField("Platform", platformLabel(row.platform || "-")),
              detailsField("Register", ImportTypes.registerLabel(row.register) || row.register || "-"),
              detailsField("City", row.city || "-"),
              detailsField("Assignment Type", row.assignmentType || "-")
            ]
          },
          {
            title: "2. Dashboard user owner",
            fields: [
              detailsField("Owner Name", row.ownerName || "-"),
              detailsField("Owner Iqama", row.ownerIqama || "-", true),
              detailsField("Matched in HR", row.ownerExistsInHr ? "Yes" : "No"),
              detailsField("Dashboard User Exists", row.dashboardUserExists ? "Yes" : "No")
            ]
          },
          {
            title: "3. Actual rider / resolver result",
            fields: [
              detailsField("Actual Rider", row.actualRiderName || "-"),
              detailsField("Actual Rider Iqama", row.actualRiderIqama || "-", true),
              detailsField("Rider Source", riderSourceLabel(row.riderSource || "Unknown")),
              detailsField("Resolved", row.actualRiderFound ? "Yes" : "No"),
              detailsField("Phone", row.actualRiderPhone || "-", true),
              detailsField("Issues", renderDetailsBadges(row.issues || []), false, true)
            ]
          },
          {
            title: "4. Operational profile",
            fields: [
              detailsField("Operation Mode", operationModeLabel(row.operationMode || "-")),
              detailsField("Supervisor", row.supervisor || "-"),
              detailsField("Profile Source", row.operationalProfile ? row.operationalProfile.riderSource || "-" : "-"),
              detailsField("Preferred City", row.actualRiderPreferredCity || "-"),
              detailsField("Preferred Register", row.actualRiderPreferredRegister || "-"),
              detailsField("Profile Notes", row.operationalProfile && row.operationalProfile.notes ? row.operationalProfile.notes : "-")
            ]
          },
          {
            title: "5. Vehicle usage summary",
            fields: [
              detailsField("Registered Vehicle", row.dashboardVehicleSummary || "-"),
              detailsField("Actual Vehicle", row.actualVehicleSummary || "-"),
              detailsField("Vehicle Type", vehicleLabel(row.vehicleType || "-")),
              detailsField("Vehicle Source", vehicleSourceLabel(row.vehicleCompanyStatus || "unknown")),
              detailsField("Plate Number", row.plateNumber || "-", true),
              detailsField("Vehicle Serial", row.vehicleSerial || "-", true),
              detailsField("Active Usage", row.vehicleUsageSummary || "-")
            ]
          },
          {
            title: "6. Dates and assignment period",
            fields: [
              detailsField("Start Date", formatDate(row.assignmentStartDate)),
              detailsField("Rider Receive Date", formatDate(row.riderReceiveDate)),
              detailsField("First Online Date", formatDate(row.firstOnlineDate)),
              detailsField("End Date", formatDate(row.endDate)),
              detailsField("Last Activity", formatDate(row.lastActivityAt))
            ]
          },
          {
            title: "7. Current status and allowed actions",
            fields: [
              detailsField("Assignment Status", assignmentStatusLabel(row.assignmentStatus || "-")),
              detailsField("Status Bucket", row.statusBucket || "-"),
              detailsField("Can Assign", row.canAssign ? "Yes" : "No"),
              detailsField("Can Swap", row.canSwap ? "Yes" : "No"),
              detailsField("Can Stop", row.canStop ? "Yes" : "No"),
              detailsField("Can Dismiss", row.canDismiss ? "Yes" : "No")
            ]
          },
          {
            title: "8. History links",
            contentHtml: [
              renderSimpleTable("Assignment Timeline", ["Time", "Event", "Old Rider", "New Rider", "Status", "Reason"], timelineRows.map(function (item) {
                return [
                  formatDate(item.eventTime),
                  item.eventType || "-",
                  item.oldActualRiderIqama || "-",
                  item.newActualRiderIqama || "-",
                  item.assignmentStatus || "-",
                  item.reason || "-"
                ];
              })),
              renderSimpleTable("History Links", ["View", "Reference"], [
                ["assignment history", row.dashboardUserId || "-"],
                ["swap history", row.dashboardUserId || "-"],
                ["termination history", row.dashboardUserId || "-"],
                ["vehicle usage history", row.actualRiderIqama || "-"],
                ["performance by actual rider", row.actualRiderIqama || "-"],
                ["audit logs for this assignment/courierId", row.assignmentId || row.dashboardUserId || "-"]
              ])
            ].join("")
          },
          {
            title: "9. Source import batch",
            fields: [
              detailsField("Batch ID", row.sourceBatchId || row.sourceImportBatchId || "-", true),
              detailsField("File", sourceBatch ? (sourceBatch.sourceFileName || sourceBatch.fileName || "-") : (row.sourceFile || "-")),
              detailsField("Template", sourceBatch ? (sourceBatch.templateId || "-") : "-"),
              detailsField("Import Type", sourceBatch ? (sourceBatch.type || sourceBatch.importType || "-") : "-")
            ]
          },
          {
            title: "10. Notes",
            fields: [
              detailsField("Assignment Notes", row.notes || "-")
            ]
          }
        ]
      });
    }
    return renderCurrentAssignmentHistoryDrawer(row);
  }

  function renderCurrentAssignmentHistoryDrawer(row) {
    var timelineRows = buildCurrentAssignmentTimeline(row);
    return [
      renderMiniCard("التسكين الحالي", [
        miniRow("User ID", row.dashboardUserId || "-"),
        miniRow("Owner", row.ownerName || "-"),
        miniRow("Actual Rider", row.actualRiderName || "-"),
        miniRow("Status", assignmentStatusLabel(row.assignmentStatus || "-")),
        miniRow("Operation Mode", operationModeLabel(row.operationMode || "-")),
        miniRow("Vehicle", row.actualVehicleSummary || "-")
      ]),
      renderSimpleTable("Timeline", ["Time", "Event", "Old Rider", "New Rider", "Mode", "Status", "Reason"], timelineRows.map(function (item) {
        return [
          formatDate(item.eventTime),
          item.eventType || "-",
          item.oldActualRiderIqama || "-",
          item.newActualRiderIqama || "-",
          item.operationMode || "-",
          item.assignmentStatus || "-",
          item.reason || "-"
        ];
      }))
    ].join("");
  }

  function buildCurrentAssignmentTimeline(row) {
    if (!CurrentAssignmentsViewModel || typeof CurrentAssignmentsViewModel.buildAssignmentTimeline !== "function") {
      return [];
    }
    return CurrentAssignmentsViewModel.buildAssignmentTimeline(row, {
      assignmentHistory: getCollection("assignmentHistory"),
      auditLogs: getCollection("auditLogs"),
      terminations: getCollection("terminations")
    }, {
      limit: 12
    });
  }

  function renderLegacyDetailsDrawer(user) {
    return [
      '<input type="hidden" id="opsDrawerDashboardUserId" value="' + escapeHtml(user.dashboardUserId || user.userId || "") + '">',
      '<div class="ops-drawer-grid">',
      renderMiniCard("بيانات اليوزر", [
        miniRow("User ID", user.dashboardUserId || user.userId || "-"),
        miniRow("الاسم", user.fullName || "-"),
        miniRow("المدينة", user.city || "-"),
        miniRow("السجل", ImportTypes.registerLabel(user.register) || user.register || "-"),
        miniRow("المركبة", vehicleLabel(user.vehicleType)),
        miniRow("حالة الوظيفة", user.jobStatus || user.status || "-"),
        miniRow("Review Status", user.reviewStatus || "-"),
        miniRow("Recommended Action", user.recommendedAction || "-")
      ]),
      renderMiniCard("المندوب الحالي", [
        miniRow("Rider", user.currentRiderName || "-"),
        miniRow("Rider ID", user.currentRiderId || "-"),
        miniRow("Iqama", user.currentRiderIqama || "-"),
        miniRow("Assignment", user.currentAssignmentId || "-"),
        miniRow("Handover", formatDate(user.handoverDate)),
        miniRow("Return", formatDate(user.returnDate))
      ]),
      renderMiniCard("ربط المركبة", [
        miniRow("Registered Vehicle", user.registeredVehicleDisplay || buildVehicleSummaryText(user.registeredVehicleOnDashboard, user.vehicleSerial, user.plateNumber)),
        miniRow("Actual Used Vehicle", user.actualUsedVehicleDisplay || buildVehicleSummaryText(user.actualUsedVehicle, user.actualUsedVehicleSerial, user.actualUsedVehiclePlateNumber)),
        miniRow("Vehicle Match", user.fleetMatchStatus || "-"),
        miniRow("Movement Status", user.vehicleMovementStatus || "-"),
        miniRow("Capacity", user.fleetCapacityStatus || "-"),
        miniRow("Fleet Warnings", (user.fleetWarnings || []).join(", ") || "-"),
        miniRow("Blocking Issues", (user.fleetBlockingIssues || []).join(", ") || "-")
      ]),
      "</div>"
    ].join("");
  }

  function resolverSourceLabel(resolved) {
    var source = normalizeText(resolved && resolved.riderSource);
    if (source === "hr") {
      return "HR / Sponsorship";
    }
    if (source === "external") {
      return "External";
    }
    if (resolved && resolved.canCreateExternal) {
      return "New External";
    }
    return "Unknown";
  }

  function renderResolverBadge(resolved) {
    if (!resolved) {
      return '<span class="pill warn">Waiting for iqama</span>';
    }
    var tone = normalizeText(resolved.riderSource) === "hr"
      ? "green"
      : normalizeText(resolved.riderSource) === "external"
        ? "blue"
        : "warn";
    return '<span class="pill ' + tone + '">' + escapeHtml(resolverSourceLabel(resolved)) + "</span>";
  }

  function renderDrawerResolverCard(mode, user, resolverState) {
    resolverState = resolverState || getDrawerResolverState(mode, user);
    if (!resolverState.iqama && !resolverState.rider) {
      return '<div class="ops-resolver-card"><h4>Rider Resolver</h4><div class="ops-note">Select an existing rider or enter iqama manually to resolve HR or External identity before saving.</div></div>';
    }
    var resolved = resolverState.resolved;
    if (!resolved) {
      return '<div class="ops-resolver-card"><h4>Rider Resolver</h4><div class="ops-note ops-note--warn">Resolver data is currently unavailable for this iqama.</div></div>';
    }
    var lines = [];
    if (resolved.currentUserSummary) {
      lines.push("Current User: " + resolved.currentUserSummary);
    }
    if (resolved.currentVehicleSummary) {
      lines.push("Vehicle: " + resolved.currentVehicleSummary);
    }
    if (resolved.currentVehicleUsage && resolved.currentVehicleUsage.startDate) {
      lines.push("Active Period: " + [resolved.currentVehicleUsage.startDate, resolved.currentVehicleUsage.endDate || "active"].join(" -> "));
    }
    if (resolved.canCreateExternal) {
      lines.push("A new External rider can be created inline when you confirm this operation.");
    }
    return [
      '<div class="ops-resolver-card">',
      "  <h4>Rider Resolver</h4>",
      '  <div class="ops-resolver-meta">',
      '    <div class="ops-resolver-chip"><span>Source</span><strong>' + renderResolverBadge(resolved) + "</strong></div>",
      '    <div class="ops-resolver-chip"><span>Iqama</span><strong class="mono">' + escapeHtml(resolved.iqama || resolverState.iqama || "-") + "</strong></div>",
      '    <div class="ops-resolver-chip"><span>Name</span><strong>' + escapeHtml(resolved.fullName || resolverState.draft.riderName || "-") + "</strong></div>",
      "  </div>",
      lines.length ? '<div class="ops-note">' + lines.map(function (item) {
        return "<div>" + escapeHtml(item) + "</div>";
      }).join("") + "</div>" : "",
      renderWarningsBox((resolved.warnings || []).concat(resolved.issues || [])),
      "</div>"
    ].join("");
  }

  function renderOperationalDraftFields(mode, draft) {
    var prefix = mode === "swap" ? "Swap" : "Assign";
    return [
      '<div class="ops-drawer-grid ops-drawer-grid--form">',
      '  <label class="ops-field"><span>نوع التشغيل</span><select id="ops' + prefix + 'OperationMode" class="ops-select">' +
        renderOption("salary_tiers", "راتب / شرائح", draft.operationMode || "") +
        renderOption("per_order", "بالطلب", draft.operationMode || "") +
        renderOption("external", "خارجي", draft.operationMode || "") +
        renderOption("replacement", "بديل", draft.operationMode || "") +
        "</select></label>",
      '  <label class="ops-field"><span>تاريخ الاستلام</span><input id="ops' + prefix + 'ReceiveDate" type="date" class="ops-input" value="' + escapeHtml(draft.receiveDate || draft.date || today()) + '"></label>',
      '  <label class="ops-field"><span>تاريخ أول يوم عمل</span><input id="ops' + prefix + 'FirstOnlineDate" type="date" class="ops-input" value="' + escapeHtml(draft.firstOnlineDate || "") + '"></label>',
      '  <label class="ops-field"><span>Contact Phone</span><input id="ops' + prefix + 'ContactPhone" type="text" class="ops-input" value="' + escapeHtml(draft.contactPhone || "") + '" placeholder="Contact phone"></label>',
      '  <label class="ops-field"><span>App Phone</span><input id="ops' + prefix + 'AppPhone" type="text" class="ops-input" value="' + escapeHtml(draft.appPhone || "") + '" placeholder="App phone"></label>',
      '  <label class="ops-field"><span>IBAN</span><input id="ops' + prefix + 'Iban" type="text" class="ops-input" value="' + escapeHtml(draft.iban || "") + '" placeholder="IBAN"></label>',
      '  <label class="ops-field"><span>Gas Card</span><input id="ops' + prefix + 'GasCard" type="text" class="ops-input" value="' + escapeHtml(draft.gasCard || "") + '" placeholder="Gas card"></label>',
      '  <label class="ops-field"><span>Tools</span><input id="ops' + prefix + 'Tools" type="text" class="ops-input" value="' + escapeHtml(draft.tools || "") + '" placeholder="Tools / assets"></label>',
      '  <label class="ops-field"><span>المركبة المستخدمة فعليًا</span><input id="ops' + prefix + 'ActualVehicle" type="text" class="ops-input" value="' + escapeHtml(draft.actualVehicle || "") + '" placeholder="Actual vehicle"></label>',
      '  <label class="ops-field"><span>نوع المركبة</span><select id="ops' + prefix + 'VehicleType" class="ops-select">' +
        renderOption("car", "سيارة", draft.vehicleType || "") +
        renderOption("bike", "دباب", draft.vehicleType || "") +
        renderOption("private_car", "سيارة خاصة", draft.vehicleType || "") +
        renderOption("private_bike", "دباب خاص", draft.vehicleType || "") +
        renderOption("unknown", "غير محدد", draft.vehicleType || "") +
        "</select></label>",
      '  <label class="ops-field"><span>رقم اللوحة</span><input id="ops' + prefix + 'PlateNumber" type="text" class="ops-input mono" value="' + escapeHtml(draft.plateNumber || "") + '" placeholder="Plate number"></label>',
      '  <label class="ops-field"><span>الرقم التسلسلي</span><input id="ops' + prefix + 'VehicleSerial" type="text" class="ops-input mono" value="' + escapeHtml(draft.vehicleSerial || "") + '" placeholder="Vehicle serial"></label>',
      '  <label class="ops-field"><span>المشرف</span><input id="ops' + prefix + 'Supervisor" type="text" class="ops-input" value="' + escapeHtml(draft.supervisor || "") + '" placeholder="Supervisor"></label>',
      "</div>"
    ].join("");
  }

  function renderAssignDrawer(user) {
    var riderState = getDrawerRiderState(user, false, "assign");
    var resolverState = getDrawerResolverState("assign", user);
    var warnings = buildRiderWarnings(user, riderState.selectedRider, resolverState);
    var draft = resolverState.draft;
    return [
      '<input type="hidden" id="opsDrawerDashboardUserId" value="' + escapeHtml(user.dashboardUserId || user.userId || "") + '">',
      '<form id="opsAssignForm" class="ops-form-stack">',
      renderDrawerLead(user),
      renderDrawerResolverCard("assign", user, resolverState),
      '<label class="ops-field"><span>بحث عن المندوب</span><input id="opsDrawerRiderSearch" type="search" class="ops-input" value="' + escapeHtml(state.drawerSearch) + '" placeholder="ابحث بالاسم أو الإقامة أو الهاتف أو Rider ID"></label>',
      '<label class="ops-field"><span>اختيار المندوب</span><select id="opsAssignRiderSelect" class="ops-select">' + renderRiderOptions(riderState.rows, false, "", draft.riderId) + "</select></label>",
      '<label class="ops-field"><span>أو أدخل إقامة يدويًا</span><input id="opsAssignIqama" type="text" class="ops-input" value="' + escapeHtml(draft.iqama || "") + '" placeholder="رقم الإقامة"></label>',
      '<label class="ops-field"><span>اسم المندوب (اختياري)</span><input id="opsAssignRiderName" type="text" class="ops-input" value="' + escapeHtml(draft.riderName || "") + '" placeholder="اسم المندوب"></label>',
      renderOperationalDraftFields("assign", draft),
      '<label class="ops-field"><span>سبب التسكين</span><input id="opsAssignReason" type="text" class="ops-input" value="' + escapeHtml(draft.reason || "") + '" placeholder="سبب التسكين"></label>',
      '<label class="ops-field"><span>تاريخ البداية</span><input id="opsAssignStartDate" type="date" class="ops-input" value="' + escapeHtml(draft.date || today()) + '"></label>',
      renderWarningsBox(warnings),
      '<button type="submit" class="ops-primary-btn">تأكيد التسكين</button>',
      "</form>"
    ].join("");
  }

  function renderSwapDrawer(user) {
    var riderState = getDrawerRiderState(user, true, "swap");
    var resolverState = getDrawerResolverState("swap", user);
    var warnings = buildRiderWarnings(user, riderState.selectedRider, resolverState);
    var draft = resolverState.draft;
    return [
      '<input type="hidden" id="opsDrawerDashboardUserId" value="' + escapeHtml(user.dashboardUserId || user.userId || "") + '">',
      '<form id="opsSwapForm" class="ops-form-stack">',
      renderDrawerLead(user),
      '<div class="ops-note">المندوب الحالي: <strong>' + escapeHtml(user.currentRiderName || user.currentRiderId || "غير محدد") + "</strong></div>",
      '<label class="ops-field"><span>بحث عن المندوب الجديد</span><input id="opsDrawerRiderSearch" type="search" class="ops-input" value="' + escapeHtml(state.drawerSearch) + '" placeholder="ابحث بالاسم أو الإقامة أو الهاتف أو Rider ID"></label>',
      renderDrawerResolverCard("swap", user, resolverState),
      '<label class="ops-field"><span>اختيار المندوب الجديد</span><select id="opsSwapRiderSelect" class="ops-select">' + renderRiderOptions(riderState.rows, true, user.currentRiderId, draft.riderId) + "</select></label>",
      '<label class="ops-field"><span>أو أدخل إقامة يدويًا</span><input id="opsSwapIqama" type="text" class="ops-input" value="' + escapeHtml(draft.iqama || "") + '" placeholder="رقم الإقامة"></label>',
      '<label class="ops-field"><span>اسم المندوب الجديد (اختياري)</span><input id="opsSwapRiderName" type="text" class="ops-input" value="' + escapeHtml(draft.riderName || "") + '" placeholder="اسم المندوب"></label>',
      renderOperationalDraftFields("swap", draft),
      '<label class="ops-field"><span>سبب التبديل</span><input id="opsSwapReason" type="text" class="ops-input" value="' + escapeHtml(draft.reason || "") + '" placeholder="سبب التبديل"></label>',
      '<label class="ops-field"><span>تاريخ التبديل</span><input id="opsSwapDate" type="date" class="ops-input" value="' + escapeHtml(draft.date || today()) + '"></label>',
      renderWarningsBox(warnings),
      '<button type="submit" class="ops-primary-btn">تأكيد التبديل</button>',
      "</form>"
    ].join("");
  }

  function renderTerminationDrawer(user, defaultAction) {
    return [
      '<input type="hidden" id="opsDrawerDashboardUserId" value="' + escapeHtml(user.dashboardUserId || user.userId || "") + '">',
      '<form id="opsTerminationForm" class="ops-form-stack">',
      renderDrawerLead(user),
      '<label class="ops-field"><span>نوع الإجراء</span><select id="opsTerminationAction" class="ops-select">',
      renderOption("terminate", "نقل إلى الإقالات", defaultAction || "terminate"),
      renderOption("stop_without_replacement", "إيقاف بدون بديل", defaultAction || "terminate"),
      renderOption("mark_missing_from_dashboard", "تحديد كمفقود من آخر تحديث", defaultAction || "terminate"),
      renderOption("cancel_assignment", "إلغاء تسكين / Duplicate Cleanup", defaultAction || "terminate"),
      "</select></label>",
      '<label class="ops-field"><span>السبب</span><input id="opsTerminationReason" type="text" class="ops-input" placeholder="اكتب سبب الإجراء"></label>',
      '<label class="ops-field"><span>التاريخ</span><input id="opsTerminationDate" type="date" class="ops-input" value="' + escapeHtml(today()) + '"></label>',
      '<button type="submit" class="ops-danger-btn">تأكيد الإجراء</button>',
      "</form>"
    ].join("");
  }

  function renderRiderArchiveDrawer(riderId) {
    var events = getCollection("riderArchiveEvents").filter(function (item) {
      return String(item.riderId || "") === String(riderId || "");
    });
    return renderSimpleTable("Rider Archive", ["Date", "Event", "Platform", "Note"], events.map(function (item) {
      return [
        formatDate(item.eventDate || item.createdAt),
        item.eventType || "-",
        item.platform || "-",
        item.note || "-"
      ];
    }));
  }

  function renderActualRiderDetailsDrawer(user) {
    var rider = findRiderById(user.currentRiderId || user.actualRiderId || "");
    if (!rider) {
      return '<div class="empty">لا توجد بطاقة Rider مرتبطة بالمندوب الفعلي الحالي.</div>';
    }
    return [
      renderMiniCard("المندوب الفعلي", [
        miniRow("Rider ID", rider.id || "-"),
        miniRow("الاسم", rider.displayName || "-"),
        miniRow("الإقامة", rider.primaryIqama || "-"),
        miniRow("المصدر", user.actualRiderSource || "-"),
        miniRow("المدن", (rider.cities || [rider.city]).filter(Boolean).join(" / ") || "-"),
        miniRow("السجلات", (rider.registers || [rider.register]).filter(Boolean).join(" / ") || "-")
      ]),
      renderRiderArchiveDrawer(rider.id)
    ].join("");
  }

  function renderOwnerDetailsDrawer(user) {
    var ownerProfile = getCollection("hrProfiles").filter(function (item) {
      return normalizeText(item.iqama || "") === normalizeText(user.ownerIqama || "");
    })[0] || null;
    if (!ownerProfile) {
      return '<div class="empty">لم يتم العثور على صاحب اليوزر داخل HR Master.</div>';
    }
    return renderMiniCard("Owner Profile", [
      miniRow("الاسم", ownerProfile.fullNameArabic || ownerProfile.fullNameEnglish || "-"),
      miniRow("الإقامة", ownerProfile.iqama || "-"),
      miniRow("المدينة", ownerProfile.city || "-"),
      miniRow("السجل", ImportTypes.registerLabel(ownerProfile.register) || ownerProfile.register || "-"),
      miniRow("نوع التوظيف", ownerProfile.employmentType || "-"),
      miniRow("حالة HR", ownerProfile.hrStatus || "-"),
      miniRow("الهاتف", ownerProfile.phone || "-")
    ]);
  }

  function renderResolverInspectorDrawer(user) {
    if (!riderResolverFacade || typeof riderResolverFacade.resolveRiderByIqama !== "function") {
      return '<div class="empty">Rider Resolver غير متاح في الجلسة الحالية.</div>';
    }
    var resolution = riderResolverFacade.resolveRiderByIqama(user.currentRiderIqama || user.ownerIqama || "");
    if (!resolution) {
      return '<div class="empty">لا توجد نتيجة Resolver مرتبطة بهذا اليوزر.</div>';
    }
    return renderMiniCard("Resolver Summary", [
      miniRow("المصدر", resolverSourceLabel(resolution)),
      miniRow("الاسم", resolution.fullName || "-"),
      miniRow("الإقامة", resolution.iqama || "-"),
      miniRow("الحساب الحالي", resolution.currentUserSummary || "-"),
      miniRow("المركبة الحالية", resolution.currentVehicleSummary || "-"),
      miniRow("Warnings", (resolution.warnings || []).join(", ") || "-")
    ]);
  }

  function renderImportSourceBatchDrawer(user) {
    var batchId = user.sourceBatchId || user.lastSeenImportBatchId || "";
    var batch = getCollection("importBatches").filter(function (item) {
      return String(item.id || "") === String(batchId);
    })[0] || null;
    if (!batch) {
      return '<div class="empty">لا توجد بيانات Batch محفوظة لهذا اليوزر.</div>';
    }
    return renderMiniCard("Import Source Batch", [
      miniRow("Batch ID", batch.id || "-"),
      miniRow("الملف", batch.sourceFileName || batch.fileName || "-"),
      miniRow("Template", batch.templateId || "-"),
      miniRow("Import Type", batch.type || batch.importType || "-"),
      miniRow("المدينة", batch.city || "-"),
      miniRow("السجل", ImportTypes.registerLabel(batch.register) || batch.register || "-"),
      miniRow("الحالة", batch.status || "-"),
      miniRow("السجلات المحفوظة", String(batch.savedRecordCount || 0))
    ]);
  }

  function renderDashboardHistoryDrawer(user) {
    var history = getCollection("assignmentHistory").filter(function (item) {
      return String(item.dashboardUserId || "") === String(user.dashboardUserId || user.userId || "");
    });
    var terminations = getCollection("terminations").filter(function (item) {
      return String(item.dashboardUserId || "") === String(user.dashboardUserId || user.userId || "");
    });
    return [
      renderSimpleTable("Assignment History", ["Date", "Action", "Previous Rider", "New Rider", "Reason"], history.map(function (item) {
        return [
          formatDate(item.actionDate || item.createdAt),
          item.action || "-",
          item.previousRiderId || "-",
          item.newRiderId || "-",
          item.reason || "-"
        ];
      })),
      renderSimpleTable("Termination History", ["Date", "Type", "Status After", "Reason"], terminations.map(function (item) {
        return [
          formatDate(item.terminationDate || item.createdAt),
          item.terminationType || "-",
          item.statusAfter || "-",
          item.reason || "-"
        ];
      }))
    ].join("");
  }

  function renderDrawerLead(user) {
    return '<div class="ops-note">User ID: <strong class="mono">' + escapeHtml(user.dashboardUserId || user.userId || "-") + '</strong> / ' +
      escapeHtml(user.city || "-") + " / " + escapeHtml(ImportTypes.registerLabel(user.register) || user.register || "-") + "</div>";
  }

  function getDrawerRiderState(user, excludeCurrent, mode) {
    var rows = buildDataModel().riders.filter(function (rider) {
      if (excludeCurrent && String(rider.id || "") === String(user.currentRiderId || "")) {
        return false;
      }
      if (!state.drawerSearch) {
        return true;
      }
      return matchesSearch([
        rider.id,
        rider.displayName,
        rider.primaryIqama,
        (rider.phones || []).join(" ")
      ].join(" "), state.drawerSearch);
    });
    var draft = getDrawerDraft(mode || (excludeCurrent ? "swap" : "assign"));
    var selectId = excludeCurrent ? "opsSwapRiderSelect" : "opsAssignRiderSelect";
    var selectNode = document.getElementById(selectId);
    var selectedId = selectNode ? selectNode.value : (draft.riderId || "");
    var selectedRider = rows.filter(function (rider) {
      return String(rider.id || "") === String(selectedId || "");
    })[0] || null;
    return {
      rows: rows,
      selectedRider: selectedRider
    };
  }

  function renderRiderOptions(rows, includeEmpty, currentRiderId, selectedId) {
    var options = [];
    if (includeEmpty) {
      options.push('<option value="">اختر المندوب الجديد</option>');
    } else {
      options.push('<option value="">اختر المندوب</option>');
    }
    (rows || []).forEach(function (rider) {
      var label = [
        rider.displayName || "Unnamed Rider",
        rider.id || "",
        rider.primaryIqama || ""
      ].filter(Boolean).join(" / ");
      var isDisabled = currentRiderId && String(currentRiderId) === String(rider.id || "");
      options.push('<option value="' + escapeHtml(rider.id || "") + '"' + (isDisabled ? " disabled" : "") + (String(selectedId || "") === String(rider.id || "") ? " selected" : "") + '>' + escapeHtml(label) + "</option>");
    });
    return options.join("");
  }

  function buildRiderWarnings(user, rider, resolverState) {
    var warnings = [];
    var resolved = resolverState && resolverState.resolved ? resolverState.resolved : null;
    if (!rider && !resolved) {
      return warnings;
    }
    var riderCities = unique((rider && rider.cities || []).concat(rider && rider.city || "").concat(resolved && resolved.preferredCity || ""));
    var riderRegisters = unique((rider && rider.registers || []).concat(rider && rider.register || "").concat(resolved && resolved.preferredRegister || ""));
    if (riderCities.length && riderCities.indexOf(user.city) < 0) {
      warnings.push("مدينة المندوب لا تطابق مدينة اليوزر التشغيلي.");
    }
    if (riderRegisters.length && !riderRegisters.some(function (code) { return matchRegister(code, user.register); })) {
      warnings.push("سجل المندوب لا يطابق السجل الحالي لليوزر.");
    }
    if (rider && rider.currentWorkStatus === "under_review") {
      warnings.push("المندوب الحالي تحت المراجعة في Rider Master.");
    }
    if (resolved && resolved.canCreateExternal) {
      warnings.push("سيتم إنشاء External Rider جديد عند تأكيد العملية.");
    }
    warnings = warnings.concat(resolved && resolved.warnings || []).concat(resolved && resolved.issues || []);
    return warnings;
  }

  function renderWarningsBox(warnings) {
    if (!warnings.length) {
      return '<div class="ops-note ops-note--ok">لا توجد تحذيرات ظاهرة قبل الحفظ.</div>';
    }
    return '<div class="ops-note ops-note--warn"><strong>Warnings</strong><ul>' + warnings.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("") + "</ul></div>";
  }

  function submitAssignment(form) {
    var dashboardUserId = valueOf("opsDrawerDashboardUserId");
    var dashboardUser = findDashboardUser(dashboardUserId);
    var draft = syncDraftFromDom("assign");
    var resolverState = getDrawerResolverState("assign", dashboardUser);
    var currentUser = getCurrentUser();
    var rider = findRiderById(draft.riderId);
    try {
      resolverState = ensureInlineExternalIdentity("assign", dashboardUser, resolverState);
      assignmentService.assignRider({
        dashboardUserId: dashboardUserId,
        actualVehicle: draft.actualVehicle,
        appPhone: draft.appPhone,
        firstOnlineDate: draft.firstOnlineDate,
        gasCard: draft.gasCard,
        iban: draft.iban,
        riderId: draft.riderId || resolverState && resolverState.resolved && resolverState.resolved.rider && resolverState.resolved.rider.id || "",
        iqama: draft.iqama || (rider && rider.primaryIqama) || "",
        operationMode: draft.operationMode,
        plateNumber: draft.plateNumber,
        riderPhone: draft.contactPhone,
        riderReceiveDate: draft.receiveDate || draft.date || today(),
        riderName: draft.riderName || (rider && rider.displayName) || "",
        riderSource: resolverState && resolverState.resolved ? resolverState.resolved.riderSource : "",
        startDate: draft.date || today(),
        reason: draft.reason,
        note: draft.reason,
        supervisor: draft.supervisor,
        tools: draft.tools,
        user: currentUser,
        vehicleSerial: draft.vehicleSerial,
        vehicleType: draft.vehicleType,
        organizationContext: getOrganizationContext()
      });
      resetDrawerDraft("assign");
      toast("تم تنفيذ التسكين بنجاح", "success");
      renderPage();
      openPostMutationDetails(dashboardUserId);
    } catch (error) {
      toast(error.message || "تعذر تنفيذ التسكين.", "error");
    }
  }

  function submitSwap(form) {
    var dashboardUserId = valueOf("opsDrawerDashboardUserId");
    var dashboardUser = findDashboardUser(dashboardUserId);
    var draft = syncDraftFromDom("swap");
    var resolverState = getDrawerResolverState("swap", dashboardUser);
    var rider = findRiderById(draft.riderId);
    var currentUser = getCurrentUser();
    try {
      resolverState = ensureInlineExternalIdentity("swap", dashboardUser, resolverState);
      swapService.swapRider({
        dashboardUserId: dashboardUserId,
        actualVehicle: draft.actualVehicle,
        appPhone: draft.appPhone,
        firstOnlineDate: draft.firstOnlineDate,
        gasCard: draft.gasCard,
        iban: draft.iban,
        previousRiderId: dashboardUser && dashboardUser.currentRiderId ? dashboardUser.currentRiderId : "",
        newRiderId: draft.riderId || resolverState && resolverState.resolved && resolverState.resolved.rider && resolverState.resolved.rider.id || "",
        newRiderIqama: draft.iqama || (rider && rider.primaryIqama) || "",
        newRiderName: draft.riderName || (rider && rider.displayName) || "",
        newRiderPhone: draft.contactPhone,
        operationMode: draft.operationMode,
        plateNumber: draft.plateNumber,
        riderSource: resolverState && resolverState.resolved ? resolverState.resolved.riderSource : "",
        riderReceiveDate: draft.receiveDate || draft.date || today(),
        swapDate: draft.date || today(),
        reason: draft.reason,
        note: draft.reason,
        supervisor: draft.supervisor,
        tools: draft.tools,
        user: currentUser,
        vehicleSerial: draft.vehicleSerial,
        vehicleType: draft.vehicleType,
        organizationContext: getOrganizationContext()
      });
      resetDrawerDraft("swap");
      toast("تم تنفيذ التبديل بنجاح", "success");
      renderPage();
      openPostMutationDetails(dashboardUserId);
    } catch (error) {
      toast(error.message || "تعذر تنفيذ التبديل.", "error");
    }
  }

  function submitTermination(form) {
    var dashboardUserId = valueOf("opsDrawerDashboardUserId");
    try {
      terminationService.terminateUser({
        dashboardUserId: dashboardUserId,
        action: valueOf("opsTerminationAction") || "terminate",
        reason: valueOf("opsTerminationReason"),
        terminationDate: valueOf("opsTerminationDate") || today(),
        user: getCurrentUser(),
        organizationContext: getOrganizationContext()
      });
      toast("تم تنفيذ الإجراء بنجاح", "success");
      renderPage();
      openPostMutationDetails(dashboardUserId);
    } catch (error) {
      toast(error.message || "تعذر تنفيذ الإجراء.", "error");
    }
  }

  function openPostMutationDetails(dashboardUserId) {
    var currentRow = findCurrentAssignmentRow(dashboardUserId);
    var currentUser = findDashboardUser(dashboardUserId);
    if (isCurrentAssignmentsTab(state.activeTab) && currentRow) {
      openDrawer("تفاصيل التسكين الحالي", renderCurrentAssignmentDetailsDrawer(currentRow));
      return;
    }
    if (currentUser) {
      openDrawer("تفاصيل اليوزر", renderDetailsDrawer(currentUser));
    }
  }

  function applyNotificationFocus() {
    if (!state.notificationFocus) {
      return;
    }
    var focus = state.notificationFocus;
    window.setTimeout(function () {
      var rowNode = findFocusedRowNode(focus);
      if (rowNode) {
        rowNode.classList.add("ops-row-highlight");
        rowNode.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      if (focus.explicitDrawer && focus.linkedDrawer) {
        var dashboardUserId = rowNode && rowNode.getAttribute("data-dashboard-user-row") || focus.courierId;
        var riderId = rowNode && rowNode.getAttribute("data-rider-id") || "";
        state.notificationFocus = null;
        if (dashboardUserId) {
          handleAction(focus.linkedDrawer, dashboardUserId, riderId);
          return;
        }
      }
      state.notificationFocus = null;
    }, 40);
  }

  function findFocusedRowNode(focus) {
    focus = focus || {};
    var selectors = [];
    if (focus.assignmentId) {
      selectors.push('[data-assignment-row="' + escapeSelectorValue(focus.assignmentId) + '"]');
    }
    if (focus.courierId) {
      selectors.push('[data-dashboard-user-row="' + escapeSelectorValue(focus.courierId) + '"]');
    }
    for (var index = 0; index < selectors.length; index += 1) {
      var node = document.querySelector(selectors[index]);
      if (node) {
        return node;
      }
    }
    return null;
  }

  function findDashboardUser(dashboardUserId) {
    var row = dedupeDashboardUsers(getCollection("dashboardUsers")).filter(function (item) {
      return String(item.dashboardUserId || item.userId || "") === String(dashboardUserId || "");
    })[0] || null;
    if (!row) {
      return null;
    }
    var vehicleAssignment = indexByNormalizedField(getCollection("vehicleAssignments"), "dashboardUserId")[normalizeText(row.dashboardUserId || row.userId)] || null;
    var capacityReview = indexByNormalizedField(getCollection("vehicleCapacityReviews"), "vehicleSerial")[normalizeText(row.vehicleSerial)] || null;
    return decorateDashboardRow(mergeDashboardUserWithFleet(row, vehicleAssignment, capacityReview), {
      assignments: getCollection("assignments"),
      externalRiders: getCollection("externalRiders"),
      hrProfiles: getCollection("hrProfiles"),
      riderOperationalProfiles: getCollection("riderOperationalProfiles"),
      riders: getCollection("riders")
    });
  }

  function findCurrentAssignmentRow(dashboardUserId) {
    if (!CurrentAssignmentsViewModel || typeof CurrentAssignmentsViewModel.findCurrentAssignmentRow !== "function") {
      return null;
    }
    return CurrentAssignmentsViewModel.findCurrentAssignmentRow(buildDataModel().currentAssignmentRows || [], dashboardUserId);
  }

  function renderMiniCard(title, rowsHtml) {
    return '<section class="ops-mini-card"><h4>' + escapeHtml(title) + "</h4><div class=\"ops-mini-list\">" + rowsHtml.join("") + "</div></section>";
  }

  function miniRow(label, value) {
    return '<div class="ops-mini-row"><span>' + escapeHtml(label) + "</span><strong>" + escapeHtml(value || "-") + "</strong></div>";
  }

  function renderSimpleTable(title, headers, rows) {
    return [
      '<section class="ops-drawer-section">',
      "<h4>" + escapeHtml(title) + "</h4>",
      '<div class="table-wrap"><table><thead><tr>',
      headers.map(function (header) { return "<th>" + escapeHtml(header) + "</th>"; }).join(""),
      "</tr></thead><tbody>",
      rows.length ? rows.map(function (cells) {
        return "<tr>" + cells.map(function (cell) {
          return "<td>" + escapeHtml(cell || "-") + "</td>";
        }).join("") + "</tr>";
      }).join("") : '<tr><td colspan="' + headers.length + '">لا توجد بيانات.</td></tr>',
      "</tbody></table></div>",
      "</section>"
    ].join("");
  }

  function detailsField(label, value, ltr, htmlValue) {
    return {
      label: label,
      ltr: !!ltr,
      value: htmlValue ? "" : (value == null || value === "" ? "-" : value),
      valueHtml: htmlValue ? value : ""
    };
  }

  function renderDetailsBadges(values) {
    values = (values || []).filter(Boolean);
    if (!values.length) {
      return '<span class="details-empty">-</span>';
    }
    return '<div class="details-inline-pills">' + values.map(function (value) {
      return renderStatusPill(value);
    }).join("") + "</div>";
  }

  function renderStatusPill(value) {
    var normalized = normalizeText(value).toLowerCase();
    var tone = "";
    if (normalized.indexOf("blocked") >= 0 || normalized.indexOf("excluded") >= 0 || normalized.indexOf("terminate") >= 0 || normalized.indexOf("dismiss") >= 0 || normalized.indexOf("conflict") >= 0 || normalized.indexOf("cancel") >= 0 || normalized.indexOf("error") >= 0 || normalized.indexOf("مقال") >= 0 || normalized.indexOf("مرفوض") >= 0) {
      tone = "red";
    } else if (normalized.indexOf("ok") >= 0 || normalized.indexOf("matched") >= 0 || normalized.indexOf("active") >= 0 || normalized.indexOf("working") >= 0 || normalized.indexOf("assigned") >= 0 || normalized.indexOf("available") >= 0 || normalized.indexOf("جاهز") >= 0 || normalized.indexOf("مسكن") >= 0 || normalized.indexOf("سليم") >= 0 || normalized.indexOf("في الخدمة") >= 0) {
      tone = "";
    } else if (normalized.indexOf("needs") >= 0 || normalized.indexOf("missing") >= 0 || normalized.indexOf("review") >= 0 || normalized.indexOf("warning") >= 0 || normalized.indexOf("full") >= 0 || normalized.indexOf("capacity") >= 0 || normalized.indexOf("maintenance") >= 0 || normalized.indexOf("مراجعة") >= 0 || normalized.indexOf("مختفي") >= 0 || normalized.indexOf("موقف") >= 0 || normalized.indexOf("قيد") >= 0) {
      tone = "gold";
    } else {
      tone = "blue";
    }
    return renderPill(value || "-", tone);
  }

  function renderPill(value, tone) {
    return '<span class="pill' + (tone ? " " + tone : "") + '">' + escapeHtml(value || "-") + "</span>";
  }

  function renderEmptyState(message) {
    return '<div class="card"><span class="eyebrow">Operations</span><h2 class="section-title">لوحة العمليات</h2><div class="empty">' + escapeHtml(message) + "</div></div>";
  }

  function renderOption(value, label, currentValue) {
    return '<option value="' + escapeHtml(value) + '"' + (String(currentValue || "") === String(value || "") ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
  }

  function renderDynamicOptions(rows, fieldName, labelResolver, currentValue) {
    return unique((rows || []).map(function (row) {
      return normalizeText(row && row[fieldName]);
    }).filter(Boolean)).map(function (value) {
      return renderOption(value, labelResolver ? labelResolver(value) : value, currentValue);
    }).join("");
  }

  function isMissingFromLatestImport(row) {
    return !!row.missingFromLatestImport || normalizeText(row.lifecycleStatus) === "missing_from_latest_snapshot";
  }

  function isNeedsAssignment(row) {
    return normalizeText(row.assignmentReadiness) === "ready_for_assignment";
  }

  function isAssigned(row) {
    return normalizeText(row.lifecycleStatus) === "active_assigned" || (!!(row.currentAssignmentId || row.currentRiderId) && !isTerminated(row));
  }

  function isNeedsReview(row) {
    var lifecycleStatus = normalizeText(row.lifecycleStatus);
    return lifecycleStatus === "needs_review" || lifecycleStatus === "pending_review" || normalizeText(row.assignmentReadiness) === "needs_manual_review";
  }

  function isTerminated(row) {
    var lifecycleStatus = normalizeText(row.lifecycleStatus);
    return lifecycleStatus === "dismissed" || normalizeText(row.status).indexOf("terminated") >= 0 || normalizeText(row.jobStatus).indexOf("terminated") >= 0;
  }

  function vehicleLabel(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (normalized === "car") {
      return "سيارة";
    }
    if (normalized === "bike") {
      return "دباب";
    }
    return value || "غير محدد";
  }

  function employmentStatusLabel(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (normalized.indexOf("in service") >= 0 || normalized.indexOf("working") >= 0) {
      return "في الخدمة";
    }
    if (normalized.indexOf("terminated") >= 0 || normalized.indexOf("dismissed") >= 0) {
      return "خارج الخدمة";
    }
    if (normalized.indexOf("pending") >= 0 || normalized.indexOf("review") >= 0) {
      return "قيد المراجعة";
    }
    return value || "-";
  }

  function lifecycleLabel(value) {
    var labels = {
      active_assigned: "مسكن",
      active_unassigned: "نشط بدون تسكين",
      dismissed: "مقال",
      frozen: "مجمد",
      missing_from_latest_snapshot: "مختفي من آخر تحديث",
      needs_review: "يحتاج مراجعة",
      new: "جديد",
      pending_review: "قيد المراجعة",
      ready_for_assignment: "جاهز للتسكين",
      rejected: "مرفوض"
    };
    return labels[value] || value || "-";
  }

  function documentStatusLabel(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (!normalized) {
      return "-";
    }
    if (normalized.indexOf("reject") >= 0) {
      return "مرفوض";
    }
    if (normalized.indexOf("change") >= 0 || normalized.indexOf("update") >= 0) {
      return "تغيير مستند";
    }
    if (normalized.indexOf("missing") >= 0 || normalized.indexOf("expire") >= 0) {
      return "نواقص مستندات";
    }
    if (normalized.indexOf("no change") >= 0 || normalized.indexOf("clear") >= 0) {
      return "سليم";
    }
    return value;
  }

  function operationModeLabel(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (normalized === "salary_tiers") {
      return "شرائح / راتب";
    }
    if (normalized === "per_order") {
      return "بالطلب";
    }
    if (normalized === "external") {
      return "خارجي";
    }
    if (normalized === "replacement") {
      return "بديل";
    }
    return value || "-";
  }

  function assignmentStatusLabel(value) {
    var labels = {
      active: "نشط",
      cancelled: "ملغى",
      ended: "منتهي",
      missing_from_latest_import: "مفقود من آخر تحديث",
      needs_assignment: "يحتاج تسكين",
      replacement: "بديل",
      stopped: "موقوف",
      terminated: "إقالة"
    };
    return labels[value] || value || "-";
  }

  function riderSourceLabel(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (normalized === "hr") {
      return "HR";
    }
    if (normalized === "external") {
      return "External";
    }
    return value || "Unknown";
  }

  function vehicleSourceLabel(value) {
    var normalized = normalizeText(value).toLowerCase();
    if (normalized === "company") {
      return "مركبة شركة";
    }
    if (normalized === "private") {
      return "مركبة خاصة";
    }
    return "غير محدد";
  }

  function issueLabel(issueCode) {
    var labels = {
      assignment_actual_rider_not_found: "الرابط الفعلي غير محلول",
      assignment_duplicate_active_courier: "يوزر مكرر نشط",
      assignment_duplicate_active_rider: "مندوب مكرر نشط",
      assignment_for_dismissed_user: "يوزر مقال",
      assignment_missing_actual_rider: "لا يوجد مندوب فعلي",
      assignment_owner_missing_hr: "المالك غير موجود في HR",
      assignment_pending_review_user: "يوزر تحت مراجعة",
      assignment_register_city_scope_mismatch: "عدم تطابق نطاق",
      assignment_vehicle_mismatch: "عدم تطابق مركبة",
      assignment_without_start_date: "بداية التسكين ناقصة"
    };
    return labels[issueCode] || issueCode || "-";
  }

  function platformLabel(value) {
    return normalizeText(value).toUpperCase() || "-";
  }

  function readinessLabel(value) {
    var labels = {
      already_assigned: "مسكن بالفعل",
      blocked_missing_owner_iqama: "موقف: لا توجد إقامة مالك",
      blocked_missing_required_documents: "موقف: نواقص مستندات",
      blocked_register_city_scope: "موقف: عدم تطابق النطاق",
      dismissed: "مقال",
      missing_from_latest_snapshot: "مختفي من آخر تحديث",
      needs_manual_review: "يحتاج مراجعة يدوية",
      ready_for_assignment: "جاهز للتسكين",
      rejected: "مرفوض",
      under_review: "قيد المراجعة"
    };
    return labels[value] || value || "-";
  }

  function reviewStatusLabel(value) {
    var labels = {
      conflict: "تعارض",
      missing_from_latest_import: "مفقود من آخر تحديث",
      needs_assignment: "يحتاج تسكين",
      needs_review: "يحتاج مراجعة",
      needs_swap: "يحتاج تبديل",
      ok: "سليم",
      terminated: "مقال"
    };
    return labels[value] || value || "-";
  }

  function formatDate(value) {
    var text = normalizeText(value);
    if (!text) {
      return "-";
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      return text.slice(0, 16).replace("T", " ");
    }
    return text;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function valueOf(id) {
    var node = document.getElementById(id);
    return node ? node.value || "" : "";
  }

  function copyText(value) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(value || "");
      return;
    }
    window.prompt("Copy value", value || "");
  }

  function openDrawer(title, bodyHtml) {
    if (UIShell && typeof UIShell.openDrawer === "function") {
      UIShell.openDrawer(title, bodyHtml);
      return;
    }
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
    if (UIShell && typeof UIShell.showToast === "function") {
      UIShell.showToast(message, type);
      return;
    }
    var stack = document.getElementById("uiToastStack");
    if (stack) {
      var stackedToast = document.createElement("div");
      stackedToast.className = "ui-toast " + (type || "info");
      stackedToast.textContent = message;
      stack.appendChild(stackedToast);
      window.setTimeout(function () {
        if (stackedToast.parentNode) {
          stackedToast.parentNode.removeChild(stackedToast);
        }
      }, 2600);
      return;
    }
    var palette = {
      success: { background: "#0b8b52", color: "#ffffff" },
      error: { background: "#a22d2d", color: "#ffffff" },
      info: { background: "#0b2348", color: "#ffffff" }
    };
    var tone = palette[type || "info"] || palette.info;
    var toastNode = document.createElement("div");
    toastNode.textContent = message;
    toastNode.style.position = "fixed";
    toastNode.style.left = "20px";
    toastNode.style.bottom = "20px";
    toastNode.style.zIndex = "var(--ui-layer-toast, 640)";
    toastNode.style.padding = "12px 16px";
    toastNode.style.borderRadius = "14px";
    toastNode.style.background = tone.background;
    toastNode.style.color = tone.color;
    toastNode.style.fontWeight = "800";
    toastNode.style.boxShadow = "0 18px 34px rgba(15,23,42,0.18)";
    document.body.appendChild(toastNode);
    window.setTimeout(function () {
      if (toastNode.parentNode) {
        toastNode.parentNode.removeChild(toastNode);
      }
    }, 2600);
  }

  function injectStyles() {
    if (document.getElementById("opsPrompt5Styles")) {
      return;
    }
    var style = document.createElement("style");
    style.id = "opsPrompt5Styles";
    style.textContent = [
      ".ops-shell{gap:18px;display:grid}",
      ".ops-scope-note{display:flex;flex-direction:column;gap:4px;align-items:flex-end;text-align:left;color:var(--muted)}",
      ".ops-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) 220px 180px;gap:12px;margin-top:4px}",
      ".ops-toolbar--filters{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}",
      ".ops-toolbar--extended{grid-template-columns:repeat(5,minmax(0,1fr))}",
      ".ops-toolbar--assignments{grid-template-columns:repeat(3,minmax(0,1fr))}",
      ".ops-toolbar-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:8px}",
      ".ops-input,.ops-select{width:100%;border:1px solid var(--line);border-radius:14px;padding:11px 14px;background:#fff;font:inherit}",
      ".ops-tabs{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}",
      ".ops-tab{border:1px solid var(--line);background:#fff;border-radius:999px;padding:10px 14px;font:inherit;font-weight:800;color:var(--navy);cursor:pointer}",
      ".ops-tab span{display:inline-flex;min-width:24px;justify-content:center;margin-inline-start:6px;padding:2px 8px;border-radius:999px;background:#eef5ff;color:#0b2348}",
      ".ops-tab.is-active{background:linear-gradient(135deg,#0b2348,#10396f);color:#fff;border-color:#0b2348}",
      ".ops-tab.is-active span{background:rgba(255,255,255,0.16);color:#fff}",
      ".ops-kpis{margin-top:8px}",
      ".ops-actions{display:flex;flex-wrap:wrap;gap:6px}",
      ".ops-cell-stack{display:grid;gap:6px;min-width:190px}",
      ".ops-row-highlight{background:rgba(245,158,11,0.12)!important;outline:2px solid rgba(245,158,11,0.42);outline-offset:-2px}",
      ".ops-inline-badges{display:flex;flex-wrap:wrap;gap:6px}",
      ".ops-inline-note{font-size:12px;color:#8a5c00;line-height:1.45}",
      ".ops-inline-note--danger{color:#a22d2d}",
      ".ops-action-btn,.ops-primary-btn,.ops-danger-btn{border:none;border-radius:12px;padding:8px 12px;font:inherit;font-weight:800;cursor:pointer}",
      ".ops-action-btn{background:#eef5ff;color:#0b2348}",
      ".ops-action-btn.is-disabled{opacity:0.55;cursor:not-allowed}",
      ".ops-primary-btn{background:#0b8b52;color:#fff}",
      ".ops-danger-btn{background:#a22d2d;color:#fff}",
      ".ops-form-stack{display:grid;gap:12px}",
      ".ops-field{display:grid;gap:6px}",
      ".ops-field span{font-weight:800;color:var(--navy)}",
      ".ops-note{padding:12px 14px;border-radius:14px;background:#f6f9fc;color:#334155;border:1px solid var(--line)}",
      ".ops-note--ok{background:#eef7f1;color:#0b8b52}",
      ".ops-note--warn{background:#fff6de;color:#8a5c00}",
      ".ops-note--warn ul{margin:8px 0 0;padding-inline-start:18px}",
      ".ops-drawer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}",
      ".ops-drawer-grid--form{margin-bottom:0}",
      ".ops-resolver-card{display:grid;gap:10px;padding:14px;border:1px solid var(--line);border-radius:16px;background:#fff}",
      ".ops-resolver-card h4{margin:0;color:var(--navy)}",
      ".ops-resolver-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}",
      ".ops-resolver-chip{padding:10px 12px;border-radius:14px;background:#f8fbff;border:1px solid var(--line);display:grid;gap:4px}",
      ".ops-resolver-chip span{font-size:12px;color:var(--muted)}",
      ".ops-mini-card{border:1px solid var(--line);border-radius:16px;padding:14px;background:#fff}",
      ".ops-mini-card h4,.ops-drawer-section h4{margin:0 0 10px;color:var(--navy)}",
      ".ops-mini-list{display:grid;gap:8px}",
      ".ops-mini-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px dashed #dbe5ef;padding-bottom:8px}",
      ".ops-mini-row:last-child{border-bottom:none;padding-bottom:0}",
      ".ops-drawer-section{margin-top:14px}",
      "@media (max-width: 1280px){.ops-toolbar--extended{grid-template-columns:repeat(3,minmax(0,1fr))}.ops-toolbar--assignments{grid-template-columns:repeat(2,minmax(0,1fr))}}",
      "@media (max-width: 980px){.ops-toolbar,.ops-toolbar--extended{grid-template-columns:1fr}.ops-drawer-grid{grid-template-columns:1fr}.ops-resolver-meta{grid-template-columns:1fr}.ops-scope-note{align-items:flex-start;text-align:right}}"
    ].join("");
    document.head.appendChild(style);
  }
})();
