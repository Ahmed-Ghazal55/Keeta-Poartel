(function () {
  "use strict";

  if (window.__keetaUiRedesignLoaded) {
    return;
  }
  window.__keetaUiRedesignLoaded = true;

  var Portal = window.KeetaPortal = window.KeetaPortal || {};
  var UI_STORAGE_KEY = "keeta.operations.portal.ui.redesign";
  var pendingModalConfirm = null;
  var organizationDraft = null;
  var organizationSubscribers = [];
  var SidebarRouting = Portal.SidebarRouting || null;
  var organizationRegisterOptions = [
    { id: "express", code: "EXPRESS", label: "EXPRESS GATE Company", filters: ["Express", "EXPRESS GATE Company"] },
    { id: "albwaba", code: "ALBAWABA", label: "Albwaba", filters: ["Albwaba"] },
    { id: "togary", code: "TOGARY", label: "Togary", filters: ["Togary"] },
    { id: "per_order_fr3pl", code: "PER_ORDER_FR3PL", label: "Per Order / FR 3PL", filters: ["Per Order", "FR 3PL"] }
  ];
  var organizationTree = [
    { id: "jeddah", label: "جدة", registers: organizationRegisterOptions },
    { id: "riyadh", label: "الرياض", registers: organizationRegisterOptions }
  ];
  var organizationWorkModes = [
    { id: "all", label: "كل الأنظمة" },
    { id: "per_order", label: "بالطلب / FR 3PL" },
    { id: "salary_tiers", label: "نظام الشرائح والراتب" }
  ];
  var uiState = loadState();
  var pageLabels = {
    "dashboard": "الملخص العام",
    "import-center": "مركز الاستيراد",
    "data-model": "نموذج البيانات",
    "rider-master": "قاعدة المناديب",
    "operations-shell": "العمليات التشغيلية",
    "monthly-rules-shell": "الشروط الشهرية",
    "performance-shell": "الأداء والصلاحية",
    "hr-shell": "الموارد البشرية",
    "fleet-shell": "المركبات والأسطول",
    "shifts-shell": "توزيع الشفتات",
    "monthly-closing-shell": "الإقفال الشهري",
    "archive-shell": "الأرشيف",
    "reports-shell": "التقارير والتصدير",
    "settings-shell": "الإعدادات",
    "excel": "تحليل الشيتات",
    "validation": "Validation",
    "salary": "Salary",
    "rules": "Rules",
    "shifts": "Shift Prototype",
    "vehicles": "Fleet Prototype",
    "vda": "VDA Prototype",
    "face": "Face Prototype",
    "delivery": "Delivery Prototype",
    "opr": "OPR Prototype",
    "exports": "Export Center"
  };
  var menuGroups = [
    {
      key: "home",
      label: "الصفحة الرئيسية",
      icon: "HM",
      items: [
        { label: "الملخص العام", page: "dashboard", code: "01" }
      ]
    },
    {
      key: "ops",
      label: "إدارة سائقي التوصيل",
      icon: "OP",
      items: [
        { label: "يوزرات الداشبورد", page: "operations-shell", code: "OP1" },
        { label: "اليوزرات التي تعمل", page: "operations-shell", code: "OP2" },
        { label: "المناديب التي تعمل", page: "rider-master", code: "OP3" },
        { label: "التسكين لأول مرة", page: "operations-shell", code: "OP4" },
        { label: "التبديل", page: "operations-shell", code: "OP5" },
        { label: "حالة اليوزر", page: "operations-shell", code: "OP6" },
        { label: "الإقالات", page: "validation", code: "OP7" },
        { label: "سجل العمليات", page: "validation", code: "OP8" }
      ]
    },
    {
      key: "performance",
      label: "الأداء والصلاحية",
      icon: "PF",
      items: [
        { label: "الأداء اليومي", page: "performance-shell", code: "PF1" },
        { label: "الأداء الكلي", page: "performance-shell", code: "PF2" },
        { label: "VDA", page: "vda", code: "PF3" },
        { label: "VDA_kEETA", page: "performance-shell", code: "PF4" },
        { label: "التحقق من الوجه", page: "face", code: "PF5" },
        { label: "تجربة التوصيل", page: "delivery", code: "PF6" },
        { label: "يحتاج متابعة", page: "validation", code: "PF7" }
      ]
    },
    {
      key: "rules",
      label: "الشروط الشهرية",
      icon: "RL",
      items: [
        { label: "شروط الشهر", page: "monthly-rules-shell", code: "RL1" },
        { label: "أيام الحضور الإلزامية", page: "monthly-rules-shell", code: "RL2" },
        { label: "حوافز السيارات", page: "monthly-rules-shell", code: "RL3" },
        { label: "حوافز الدبابات", page: "monthly-rules-shell", code: "RL4" },
        { label: "قواعد ATA والإلغاء", page: "monthly-rules-shell", code: "RL5" }
      ]
    },
    {
      key: "hr",
      label: "الموارد البشرية HR",
      icon: "HR",
      items: [
        { label: "بيانات المناديب", page: "hr-shell", code: "HR1" },
        { label: "مناديب الكفالة", page: "hr-shell", code: "HR2" },
        { label: "المناديب الخارجية", page: "hr-shell", code: "HR3" },
        { label: "أرشيف المناديب", page: "archive-shell", code: "HR4" },
        { label: "الرخص والكروت الصحية", page: "hr-shell", code: "HR5" }
      ]
    },
    {
      key: "fleet",
      label: "المركبات والأسطول",
      icon: "FL",
      items: [
        { label: "Operating Vehicles", page: "fleet-shell", code: "FL1" },
        { label: "المركبات المتاحة", page: "fleet-shell", code: "FL2" },
        { label: "المركبات الممتلئة", page: "fleet-shell", code: "FL3" },
        { label: "تسليم المركبات", page: "fleet-shell", code: "FL4" },
        { label: "مخالفات المركبات", page: "fleet-shell", code: "FL5" },
        { label: "مطابقة المركبة مع اليوزر", page: "fleet-shell", code: "FL6" }
      ]
    },
    {
      key: "shifts",
      label: "توزيع الشفتات",
      icon: "SH",
      items: [
        { label: "إنشاء توزيع", page: "shifts-shell", code: "SH1" },
        { label: "نتائج التوزيع", page: "shifts", code: "SH2" },
        { label: "غير موزعين", page: "shifts", code: "SH3" },
        { label: "أرشيف الشفتات", page: "archive-shell", code: "SH4" }
      ]
    },
    {
      key: "closing",
      label: "الإقفال الشهري والفواتير",
      icon: "MC",
      items: [
        { label: "رفع تقارير الشهر", page: "monthly-closing-shell", code: "MC1" },
        { label: "تحليل الفواتير", page: "monthly-closing", code: "MC2" },
        { label: "مطابقة الشركة والداخلي", page: "monthly-closing", code: "MC3" },
        { label: "التسوية النهائية", page: "monthly-closing-shell", code: "MC4" },
        { label: "أرشيف الشهر", page: "archive-shell", code: "MC5" }
      ]
    },
    {
      key: "reports",
      label: "التقارير والتصدير",
      icon: "RP",
      items: [
        { label: "تقارير التشغيل", page: "reports-shell", code: "RP1" },
        { label: "تقارير الصلاحية", page: "reports-shell", code: "RP2" },
        { label: "تقارير الرواتب", page: "salary", code: "RP3" },
        { label: "تقارير المركبات", page: "reports-shell", code: "RP4" },
        { label: "Export Center", page: "exports", code: "RP5" }
      ]
    },
    {
      key: "settings",
      label: "الإعدادات",
      icon: "ST",
      items: [
        { label: "إعدادات النظام", page: "settings-shell", code: "ST1" },
        { label: "إعدادات السجلات", page: "settings-shell", code: "ST2" },
        { label: "إعدادات المدن", page: "settings-shell", code: "ST3" },
        { label: "إعدادات الاستيراد", page: "settings-shell", code: "ST4" },
        { label: "سجل العمليات", page: "validation", code: "ST5" }
      ]
    }
  ];
  menuGroups = synchronizeMenuRoutes(menuGroups);
  var filterConfigs = {
    "operations-shell": {
      title: "فلاتر يوزرات الداشبورد",
      note: "فلترة تشغيلية سريعة قبل تنفيذ أوامر التسكين، التبديل، أو المراجعة.",
      fields: [
        { name: "userId", label: "رقم اليوزر / معرف السائق", type: "search", placeholder: "1782916129257495" },
        { name: "ownerId", label: "رقم الهوية لصاحب اليوزر", type: "search", placeholder: "هوية أو Iqama" },
        { name: "currentIqama", label: "رقم إقامة المستخدم الحالي", type: "search", placeholder: "2468..." },
        { name: "phone", label: "رقم الهاتف", type: "search", placeholder: "05xxxxxxxx" },
        { name: "city", label: "المدينة", type: "select", options: ["", "جدة", "الرياض"] },
        { name: "register", label: "السجل", type: "select", options: ["", "Express", "Albwaba", "Togary", "Per Order", "FR 3PL"] },
        { name: "vehicle", label: "المركبة", type: "search", placeholder: "CAR-1001 / BIKE-2001" },
        { name: "match", label: "حالة المطابقة", type: "select", options: ["", "مطابق", "اختلاف مدينة", "اختلاف سجل", "يحتاج مراجعة"] },
        { name: "status", label: "حالة اليوزر", type: "select", options: ["", "يعمل", "لا يعمل", "مقيد", "مقال", "يحتاج تسكين"] },
        { name: "vehicleType", label: "نوع المركبة", type: "select", options: ["", "سيارة", "دباب"] },
        { name: "workType", label: "نوع العمل", type: "select", options: ["", "كفالة", "خارجي", "بالطلب", "نظام الشرائح"] },
        { name: "handoverFrom", label: "تاريخ الاستلام من", type: "date" },
        { name: "handoverTo", label: "تاريخ الاستلام إلى", type: "date" },
        { name: "supervisor", label: "المشرف", type: "search", placeholder: "اسم المشرف" }
      ]
    },
    "performance-shell": {
      title: "فلتر الأداء والصلاحية",
      note: "اختر الشهر والمدينة ونوع المركبة ثم راقب الحسابات الصالحة وغير الصالحة.",
      fields: [
        { name: "month", label: "الشهر", type: "month" },
        { name: "city", label: "المدينة", type: "select", options: ["", "جدة", "الرياض"] },
        { name: "register", label: "السجل", type: "select", options: ["", "Express", "Albwaba", "Togary"] },
        { name: "validity", label: "حالة الصلاحية", type: "select", options: ["", "صالح", "غير صالح", "تحت المتابعة"] },
        { name: "vehicleType", label: "نوع المركبة", type: "select", options: ["", "سيارة", "دباب"] },
        { name: "keyword", label: "بحث سريع", type: "search", placeholder: "User ID / Iqama / اسم" }
      ]
    },
    "fleet-shell": {
      title: "فلتر المركبات والأسطول",
      note: "مراجعة السعة والمطابقة والمدينة والسجل قبل أي تبديل للمركبة.",
      fields: [
        { name: "serial", label: "الرقم التسلسلي", type: "search", placeholder: "CAR-1001" },
        { name: "city", label: "المدينة", type: "select", options: ["", "جدة", "الرياض"] },
        { name: "register", label: "السجل", type: "select", options: ["", "CR-JED", "CR-RYD"] },
        { name: "vehicleType", label: "نوع المركبة", type: "select", options: ["", "سيارة", "دباب"] },
        { name: "capacity", label: "حالة السعة", type: "select", options: ["", "متاحة", "ممتلئة", "تحتاج مراجعة"] },
        { name: "keyword", label: "بحث سريع", type: "search", placeholder: "لوحة / Serial / User" }
      ]
    },
    "shifts-shell": {
      title: "فلتر توزيع الشفتات",
      note: "فلتر قبل توليد الخطة أو مراجعة الشفتات غير المغطاة.",
      fields: [
        { name: "city", label: "المدينة", type: "select", options: ["", "جدة", "الرياض"] },
        { name: "register", label: "السجل", type: "select", options: ["", "Express", "Albwaba", "Togary"] },
        { name: "template", label: "قالب الشفتات", type: "select", options: ["", "6 Slots", "5 Slots", "Ramadan"] },
        { name: "coverage", label: "حالة التغطية", type: "select", options: ["", "مكتمل", "نقص", "تجاوز Max"] },
        { name: "keyword", label: "بحث سريع", type: "search", placeholder: "ID / Slot / Supervisor" }
      ]
    },
    "monthly-closing-shell": {
      title: "فلتر الإقفال الشهري",
      note: "فلترة التقرير الشهري قبل المطابقة والتسوية النهائية.",
      fields: [
        { name: "month", label: "الشهر", type: "month" },
        { name: "city", label: "المدينة", type: "select", options: ["", "جدة", "الرياض"] },
        { name: "register", label: "السجل", type: "select", options: ["", "Express", "Albwaba", "Togary"] },
        { name: "status", label: "حالة التسوية", type: "select", options: ["", "Open", "Review", "Closed"] },
        { name: "keyword", label: "بحث سريع", type: "search", placeholder: "Invoice / Rider / Batch" }
      ]
    },
    "reports-shell": {
      title: "فلتر التقارير والتصدير",
      note: "اختيار نطاق التقرير قبل التصدير أو النسخ أو المشاركة.",
      fields: [
        { name: "reportType", label: "نوع التقرير", type: "select", options: ["", "تشغيل", "صلاحية", "رواتب", "مركبات", "أرشيف"] },
        { name: "city", label: "المدينة", type: "select", options: ["", "جدة", "الرياض"] },
        { name: "register", label: "السجل", type: "select", options: ["", "Express", "Albwaba", "Togary"] },
        { name: "format", label: "صيغة التصدير", type: "select", options: ["", "CSV", "JSON", "Markdown"] },
        { name: "keyword", label: "بحث سريع", type: "search", placeholder: "اسم التقرير أو User ID" }
      ]
    }
  };
  var sampleUsers = buildSampleUsers();
  var dashboardData = buildDashboardMetrics(sampleUsers);
  var bootModeState = Portal.BootMode && typeof Portal.BootMode.getState === "function"
    ? Portal.BootMode.getState()
    : { safeMode: false };

  document.body.classList.add("ui-redesign-ready");
  document.body.classList.toggle("boot-safe-mode", !!bootModeState.safeMode);
  injectTopbar();
  normalizeTopbarLayout();
  transformBrandMarks();
  injectSidebarMenu();
  if (!bootModeState.safeMode) {
    injectDashboardSummary();
    injectFilterPanels();
    injectOperationsWorkbench();
    injectPrompt2FoundationPanels();
  }
  injectUiOverlays();
  bindUiEvents();
  initializePrompt2RuntimeBindings();
  syncOrganizationContextUi();
  syncPrompt2Ui();
  if (!bootModeState.safeMode) {
    restoreFilterPanels();
    renderOperationsWorkbench();
    enhanceTables();
    watchDomChanges();
  }
  syncActiveMenu();
  if (!uiState.lastUpdate.value) {
    setLastUpdate("واجهة محدثة");
  } else {
    renderLastUpdate();
  }
  applyLanguage(uiState.language);
  document.body.classList.toggle("sidebar-collapsed", !!uiState.sidebarCollapsed);

  function loadState() {
    var fallback = {
      currentRoute: { code: "01", page: "dashboard", subPage: "" },
      sidebarCollapsed: false,
      sidebarGroups: {},
      sidebarMultiOpen: false,
      filters: {},
      language: "ar",
      organizationContext: createDefaultOrganizationContext(),
      lastUpdate: { label: "آخر تحديث", value: "" }
    };
    try {
      var raw = window.localStorage.getItem(UI_STORAGE_KEY);
      if (!raw) {
        return fallback;
      }
      var parsed = JSON.parse(raw);
      return {
        currentRoute: normalizeRoute(parsed.currentRoute || deriveDefaultRouteForPage(parsed.page || "dashboard")),
        sidebarCollapsed: !!parsed.sidebarCollapsed,
        sidebarGroups: parsed.sidebarGroups || {},
        sidebarMultiOpen: !!parsed.sidebarMultiOpen,
        filters: parsed.filters || {},
        language: parsed.language || "ar",
        organizationContext: normalizeOrganizationContext(parsed.organizationContext || {
          selectedCities: parsed.city ? [parsed.city] : null,
          selectedRegisters: mapLegacyRegisterToCodes(parsed.register),
          selectedDashboards: mapLegacyRegisterToCodes(parsed.register)
        }),
        lastUpdate: parsed.lastUpdate || { label: "آخر تحديث", value: "" }
      };
    } catch (error) {
      return fallback;
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(uiState));
    } catch (error) {
      // Ignore localStorage failures in restricted contexts.
    }
  }

  function synchronizeMenuRoutes(groups) {
    return (groups || []).map(function (group) {
      return mergeObjects({}, group, {
        items: (group.items || []).map(function (item) {
          var mapped = SidebarRouting && typeof SidebarRouting.resolveRoute === "function"
            ? SidebarRouting.resolveRoute(item.code)
            : null;
          return mergeObjects({}, item, mapped || {});
        })
      });
    });
  }

  function normalizeRoute(route) {
    route = route || {};
    return {
      code: route.code || "",
      group: route.group || "",
      page: route.page || "dashboard",
      subPage: route.subPage || ""
    };
  }

  function deriveDefaultRouteForPage(pageKey) {
    var matched = null;
    menuGroups.some(function (group) {
      return (group.items || []).some(function (item) {
        if (item.page === pageKey) {
          matched = item;
          return true;
        }
        return false;
      });
    });
    return normalizeRoute(matched || { code: "", page: pageKey, subPage: "" });
  }

  function isRouteMatch(currentRoute, candidateRoute) {
    currentRoute = normalizeRoute(currentRoute);
    candidateRoute = normalizeRoute(candidateRoute);
    if (SidebarRouting && typeof SidebarRouting.isActiveRoute === "function") {
      return SidebarRouting.isActiveRoute(currentRoute, candidateRoute);
    }
    return currentRoute.page === candidateRoute.page && currentRoute.subPage === candidateRoute.subPage;
  }

  function getPrompt2Runtime() {
    return Portal.Runtime || null;
  }

  function getCurrentDevUser() {
    var runtime = getPrompt2Runtime();
    return runtime && runtime.auth ? runtime.auth.getCurrentUser() : null;
  }

  function getCurrentUserScopeSummary() {
    var runtime = getPrompt2Runtime();
    if (runtime && runtime.auth) {
      return runtime.auth.getScopeSummary(getCurrentDevUser());
    }
    return {
      cities: "كل المدن",
      registers: "كل السجلات",
      roleLabel: "Runtime unavailable"
    };
  }

  function filterRowsByCurrentUserScope(rows) {
    var runtime = getPrompt2Runtime();
    var currentUser = getCurrentDevUser();
    if (!runtime || !Portal.RBAC || !currentUser) {
      return rows;
    }
    return Portal.RBAC.filterRowsByUserScope(currentUser, rows, {
      cityField: "city",
      registerField: "register",
      registerMatcher: function (user, registerValue) {
        if (!user || !registerValue) {
          return false;
        }
        if (user.registerScope === "all") {
          return true;
        }
        return (user.selectedRegisters || []).some(function (registerCode) {
          return normalizeText(registerCode) === normalizeText(registerValue) || matchesRegisterSelection(registerValue, registerCode);
        });
      }
    });
  }

  function getScopedOrganizationContext(context) {
    var runtime = getPrompt2Runtime();
    var currentUser = getCurrentDevUser();
    if (!runtime || !Portal.RBAC || !currentUser) {
      return normalizeOrganizationContext(context);
    }
    return normalizeOrganizationContext(Portal.RBAC.clampOrganizationContextForUser(currentUser, normalizeOrganizationContext(context)));
  }

  function canCurrentUser(permission) {
    var currentUser = getCurrentDevUser();
    if (!permission) {
      return true;
    }
    if (!Portal.RBAC || !currentUser) {
      return false;
    }
    return Portal.RBAC.canPerform(currentUser, permission);
  }

  function getUserActionPermission(action) {
    var permissionMap = {
      "assign": "operations.assign",
      "swap": "operations.swap",
      "stop": "operations.terminate",
      "resign": "operations.terminate",
      "edit-user": "operations.editStatus",
      "edit-rider": "hr.edit",
      "log": "audit.view"
    };
    return permissionMap[action] || "";
  }

  function isUserActionAllowed(action) {
    return canCurrentUser(getUserActionPermission(action));
  }

  function recordAuditEvent(action, entity, entityId, before, after, extra) {
    var runtime = getPrompt2Runtime();
    if (!runtime || !runtime.auditLog) {
      return null;
    }
    var policy = runtime.auditLog.policy || null;
    if (policy && typeof policy.isAllowedEventType === "function" && !policy.isAllowedEventType(action)) {
      return null;
    }
    if (policy && extra && typeof policy.isForbiddenSource === "function" && policy.isForbiddenSource(extra.source || "")) {
      return null;
    }
    var created = runtime.auditLog.record(action, entity, entityId, before, after, getCurrentDevUser(), extra || {});
    if (created) {
      renderAuditLogCard();
    }
    return created;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDateTime(date) {
    try {
      return new Intl.DateTimeFormat("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(date);
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function containsValue(source, query) {
    return normalizeText(source).indexOf(normalizeText(query)) >= 0;
  }

  function uniqueValues(values) {
    var seen = {};
    return (values || []).filter(function (value) {
      var key = String(value == null ? "" : value).trim();
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

  function getAllCityLabels() {
    return organizationTree.map(function (entry) {
      return entry.label;
    });
  }

  function getAllRegisterCodes() {
    return organizationRegisterOptions.map(function (entry) {
      return entry.code;
    });
  }

  function getRegisterOptionByCode(code) {
    return organizationRegisterOptions.filter(function (entry) {
      return entry.code === code;
    })[0] || null;
  }

  function mapLegacyRegisterToCodes(registerValue) {
    if (!registerValue) {
      return null;
    }
    var text = normalizeText(registerValue);
    return organizationRegisterOptions.filter(function (entry) {
      if (normalizeText(entry.code) === text || normalizeText(entry.label) === text) {
        return true;
      }
      return entry.filters.some(function (item) {
        return normalizeText(item) === text;
      });
    }).map(function (entry) {
      return entry.code;
    });
  }

  function createDefaultOrganizationContext() {
    return {
      cityScope: "all",
      selectedCities: getAllCityLabels(),
      selectedRegisters: getAllRegisterCodes(),
      selectedDashboards: getAllRegisterCodes(),
      workMode: "all"
    };
  }

  function cloneOrganizationContext(context) {
    var normalized = normalizeOrganizationContext(context);
    return {
      cityScope: normalized.cityScope,
      selectedCities: normalized.selectedCities.slice(),
      selectedRegisters: normalized.selectedRegisters.slice(),
      selectedDashboards: normalized.selectedDashboards.slice(),
      workMode: normalized.workMode
    };
  }

  function deriveScope(selectedCount, totalCount) {
    if (!selectedCount || selectedCount >= totalCount) {
      return "all";
    }
    return selectedCount === 1 ? "single" : "multi";
  }

  function normalizeOrganizationContext(raw) {
    var defaults = createDefaultOrganizationContext();
    var allowedCities = getAllCityLabels();
    var allowedRegisters = getAllRegisterCodes();
    var selectedCities = uniqueValues(raw && raw.selectedCities ? raw.selectedCities : defaults.selectedCities).filter(function (city) {
      return allowedCities.indexOf(city) >= 0;
    });
    var selectedRegisters = uniqueValues(raw && raw.selectedRegisters ? raw.selectedRegisters : defaults.selectedRegisters).filter(function (code) {
      return allowedRegisters.indexOf(code) >= 0;
    });
    var selectedDashboards = uniqueValues(raw && raw.selectedDashboards ? raw.selectedDashboards : selectedRegisters).filter(function (code) {
      return allowedRegisters.indexOf(code) >= 0;
    });
    var workMode = raw && raw.workMode ? raw.workMode : defaults.workMode;
    if (!selectedCities.length) {
      selectedCities = defaults.selectedCities.slice();
    }
    if (!selectedRegisters.length) {
      selectedRegisters = defaults.selectedRegisters.slice();
    }
    if (!selectedDashboards.length) {
      selectedDashboards = selectedRegisters.slice();
    }
    if (!organizationWorkModes.some(function (mode) { return mode.id === workMode; })) {
      workMode = defaults.workMode;
    }
    return {
      cityScope: deriveScope(selectedCities.length, allowedCities.length),
      selectedCities: selectedCities,
      selectedRegisters: selectedRegisters,
      selectedDashboards: selectedDashboards,
      workMode: workMode
    };
  }

  function getOrganizationContext() {
    return cloneOrganizationContext(uiState.organizationContext);
  }

  function setOrganizationContext(nextContext) {
    uiState.organizationContext = getScopedOrganizationContext(nextContext);
    saveState();
    syncOrganizationContextUi();
    syncPrompt2Ui();
    notifyOrganizationContextChange();
  }

  function subscribeOrganizationContext(listener) {
    if (typeof listener !== "function") {
      return function () {};
    }
    organizationSubscribers.push(listener);
    return function () {
      organizationSubscribers = organizationSubscribers.filter(function (entry) {
        return entry !== listener;
      });
    };
  }

  function notifyOrganizationContextChange() {
    var payload = getOrganizationContext();
    organizationSubscribers.slice().forEach(function (listener) {
      try {
        listener(payload);
      } catch (error) {
        // Ignore subscriber errors to keep the shell responsive.
      }
    });
    if (typeof window.CustomEvent === "function") {
      document.dispatchEvent(new window.CustomEvent("keeta:organization-context-change", {
        detail: payload
      }));
    }
  }

  function getRegisterLabels(codes) {
    var selected = uniqueValues(codes || []);
    if (!selected.length || selected.length >= organizationRegisterOptions.length) {
      return ["كل السجلات"];
    }
    return selected.map(function (code) {
      var option = getRegisterOptionByCode(code);
      return option ? option.label : code;
    });
  }

  function getWorkModeLabel(workMode) {
    var match = organizationWorkModes.filter(function (mode) {
      return mode.id === workMode;
    })[0];
    return match ? match.label : "كل الأنظمة";
  }

  function getOrganizationContextSummary(context) {
    var state = normalizeOrganizationContext(context);
    var registerLabels = getRegisterLabels(state.selectedRegisters);
    var cityLabel = state.cityScope === "all"
      ? "كل المدن"
      : state.selectedCities.length === 1
        ? state.selectedCities[0]
        : state.selectedCities[0] + " +" + (state.selectedCities.length - 1);
    var registerLabel = registerLabels[0];
    if (registerLabels.length > 1 && registerLabels[0] !== "كل السجلات") {
      registerLabel = registerLabels[0] + " +" + (registerLabels.length - 1);
    }
    return {
      cityLabel: cityLabel,
      registerLabel: registerLabel,
      workModeLabel: getWorkModeLabel(state.workMode),
      summaryLine: cityLabel + " / " + registerLabel
    };
  }

  function getRegisterFiltersFromCodes(codes) {
    var filters = [];
    uniqueValues(codes || []).forEach(function (code) {
      var option = getRegisterOptionByCode(code);
      if (!option) {
        return;
      }
      option.filters.forEach(function (filter) {
        if (filters.indexOf(filter) === -1) {
          filters.push(filter);
        }
      });
    });
    return filters;
  }

  function mapUserWorkMode(user) {
    var workType = normalizeText(user && user.workType);
    var register = normalizeText(user && user.register);
    if (workType === normalizeText("بالطلب") || register === normalizeText("per order") || register === normalizeText("fr 3pl")) {
      return "per_order";
    }
    return "salary_tiers";
  }

  function matchesRegisterSelection(userRegister, selectedCode) {
    var option = getRegisterOptionByCode(selectedCode);
    if (!option) {
      return false;
    }
    return option.filters.some(function (entry) {
      return normalizeText(entry) === normalizeText(userRegister);
    });
  }

  function matchesRegisterFilterValue(userRegister, filterValue) {
    if (!filterValue) {
      return true;
    }
    var mappedCodes = mapLegacyRegisterToCodes(filterValue);
    if (mappedCodes && mappedCodes.length) {
      return mappedCodes.some(function (code) {
        return matchesRegisterSelection(userRegister, code);
      });
    }
    return normalizeText(userRegister) === normalizeText(filterValue);
  }

  function matchesOrganizationContext(user, context) {
    var state = normalizeOrganizationContext(context);
    if (state.selectedCities.indexOf(user.city) === -1) {
      return false;
    }
    if (!state.selectedRegisters.some(function (code) {
      return matchesRegisterSelection(user.register, code);
    })) {
      return false;
    }
    if (state.workMode !== "all" && mapUserWorkMode(user) !== state.workMode) {
      return false;
    }
    return true;
  }

  function getOrganizationScopedUsers() {
    return sampleUsers.filter(function (user) {
      return matchesOrganizationContext(user, uiState.organizationContext);
    });
  }

  function getVisibleSampleUsers() {
    return filterRowsByCurrentUserScope(getOrganizationScopedUsers());
  }

  Portal.OrganizationContext = {
    getState: getOrganizationContext,
    setState: setOrganizationContext,
    subscribe: subscribeOrganizationContext
  };

  Portal.UIShell = {
    closeDrawer: closeDrawer,
    closeModal: closeModal,
    enhanceTables: enhanceTables,
    getActivePageKey: getActivePageKey,
    hideLoading: hideLoading,
    isPageActive: isPageActive,
    openPage: openPage,
    openDrawer: openDrawer,
    openModal: openModal,
    showLoading: showLoading,
    showToast: showToast
  };

  function getActivePageNode() {
    return qs(".page.active");
  }

  function getActivePageKey() {
    var activePage = getActivePageNode();
    return activePage ? activePage.id.replace("page-", "") : "";
  }

  function isPageActive(pageKey) {
    var page = byId(String(pageKey || "").indexOf("page-") === 0 ? String(pageKey || "") : "page-" + String(pageKey || ""));
    return !!(page && page.classList && page.classList.contains("active"));
  }

  function triggerUnderlyingPage(pageKey) {
    var originalButton = qs('.nav-btn[data-page="' + pageKey + '"]');
    if (originalButton) {
      originalButton.click();
      return true;
    }
    return false;
  }

  function openPage(pageKey, route) {
    uiState.currentRoute = normalizeRoute(route || deriveDefaultRouteForPage(pageKey));
    saveState();
    dispatchShellRoute(uiState.currentRoute);
    if (triggerUnderlyingPage(pageKey)) {
      syncActiveMenuSoon();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    }
    return false;
  }

  function syncActiveMenuSoon() {
    window.setTimeout(syncActiveMenu, 40);
  }

  function dispatchShellRoute(route) {
    if (typeof document === "undefined" || typeof window === "undefined" || !window.CustomEvent) {
      return;
    }
    document.dispatchEvent(new window.CustomEvent("keeta:shell-route-change", {
      detail: normalizeRoute(route)
    }));
  }

  function injectTopbar() {
    var app = qs(".app");
    if (!app || byId("uiTopbar")) {
      return;
    }
    app.insertAdjacentHTML("beforebegin", [
      '<header class="ui-topbar" id="uiTopbar">',
      '  <div class="ui-topbar__inner">',
      '    <div class="ui-topbar__brand">',
      '      <button type="button" class="ui-topbar__toggle" id="topbarSidebarToggle" aria-label="فتح أو إغلاق القائمة الجانبية"><span></span></button>',
      '      <div class="ui-topbar__logo"><img src="./assets/logo.svg" alt="Al Bawaba logo"></div>',
      '      <div class="ui-topbar__copy">',
      '        <strong>شركة البوابة المقبلة لنقل الطرود والخدمات اللوجستية</strong>',
      '        <span>Keeta Operations Portal</span>',
      "      </div>",
      "    </div>",
      '    <div class="ui-topbar__center">',
      '      <div class="ui-topbar__statusbar">',
      '        <span class="ui-status-pill"><strong id="topbarCurrentPage">الملخص العام</strong></span>',
      '        <span class="ui-status-pill">UI/UX Redesign Shell</span>',
      '        <span class="ui-status-pill">Offline Client-side</span>',
      "      </div>",
      '      <div class="ui-topbar__controls">',
      '        <div class="field">',
      '          <label for="topbarLanguageSelect">اللغة</label>',
      '          <select id="topbarLanguageSelect">',
      '            <option value="ar">العربية</option>',
      '            <option value="en">English</option>',
      "          </select>",
      "        </div>",
      '        <div class="ui-topbar__org">',
      '          <label>الهيكل التنظيمي</label>',
      '          <button type="button" class="ui-org-trigger" id="topbarOrgSelectorBtn">',
      '            <span class="ui-org-trigger__copy">',
      '              <strong id="topbarOrgCities">كل المدن</strong>',
      '              <span id="topbarOrgRegisters">كل السجلات</span>',
      '              <small id="topbarOrgWorkMode">كل الأنظمة</small>',
      "            </span>",
      '            <span class="ui-org-trigger__cta">تغيير الهيكل التنظيمي</span>',
      "          </button>",
      "        </div>",
      '        <div class="ui-topbar__actions">',
      '          <button type="button" class="ui-btn ui-btn--dark" id="topbarRefreshBtn">تحديث البيانات</button>',
      '          <button type="button" class="ui-btn ui-btn--gold" id="topbarImportBtn">استيراد ملف</button>',
      '          <button type="button" class="ui-btn ui-btn--green" id="topbarExportBtn">تصدير</button>',
      "        </div>",
      "      </div>",
      "    </div>",
      '    <div class="ui-topbar__meta topbar-meta-row app-topbar-runtime" id="appTopbarRuntime">',
      '      <div class="topbar-meta-chip topbar-user-chip" id="topbarCurrentUserChip" title="المستخدم الحالي">',
      '        <span class="topbar-chip-label" id="topbarCurrentUserLabel">المستخدم الحالي:</span>',
      '        <strong id="topbarCurrentUserName">--</strong>',
      '        <span class="topbar-user-chip__divider" aria-hidden="true">·</span>',
      '        <span class="topbar-user-chip__scope" id="topbarCurrentUserRole">--</span>',
      "      </div>",
      "    </div>",
      "  </div>",
      "</header>"
    ].join(""));
  }

  function transformBrandMarks() {
    qsa(".brand-mark").forEach(function (mark) {
      if (mark.querySelector("img")) {
        return;
      }
      mark.innerHTML = '<img src="./assets/logo.svg" alt="Al Bawaba logo">';
    });
  }

  function normalizeTopbarLayout() {
    var topbar = byId("uiTopbar");
    if (!topbar) {
      return;
    }
    var inner = qs(".ui-topbar__inner", topbar);
    if (!inner) {
      return;
    }
    var brand = qs(".ui-topbar__brand", inner);
    var runtime = byId("appTopbarRuntime");
    var center = qs(".ui-topbar__center", inner);
    var statusbar = qs(".ui-topbar__statusbar", inner);
    var controls = qs(".ui-topbar__controls", inner);
    var legacyActions = controls ? qs(".ui-topbar__actions", controls) : qs(".ui-topbar__actions", inner);
    var orgBlock = controls ? qs(".ui-topbar__org", controls) : null;
    var languageField = byId("topbarLanguageSelect")
      ? byId("topbarLanguageSelect").closest(".field")
      : null;

    if (!brand || !runtime) {
      return;
    }

    var main = qs(".ui-topbar__main", inner);
    if (!main) {
      main = document.createElement("div");
      main.className = "ui-topbar__main";
    }
    var titleRow = qs(".ui-topbar__title-row", main);
    if (!titleRow) {
      titleRow = document.createElement("div");
      titleRow.className = "ui-topbar__title-row";
    }
    var pageTitle = qs(".ui-topbar__page-title", titleRow);
    if (!pageTitle) {
      pageTitle = document.createElement("div");
      pageTitle.className = "ui-topbar__page-title";
      pageTitle.innerHTML = [
        '<strong id="topbarCurrentPage">الملخص العام</strong>',
        "<span>Keeta Operations Portal</span>"
      ].join("");
    }

    if (statusbar) {
      var currentPage = byId("topbarCurrentPage");
      var legacyPage = qs(".ui-status-pill strong", statusbar);
      if (currentPage && legacyPage && currentPage !== legacyPage) {
        currentPage.textContent = legacyPage.textContent;
        legacyPage.remove();
      }
      Array.prototype.slice.call(statusbar.querySelectorAll(".ui-status-pill")).forEach(function (pill, index) {
        if (index > 0) {
          pill.remove();
        }
      });
      statusbar.remove();
    }

    if (orgBlock) {
      var orgButton = qs("#topbarOrgSelectorBtn", orgBlock);
      if (orgButton) {
        orgButton.classList.add("ui-topbar__scope-chip");
        titleRow.appendChild(orgButton);
      }
      orgBlock.remove();
    } else if (byId("topbarOrgSelectorBtn")) {
      byId("topbarOrgSelectorBtn").classList.add("ui-topbar__scope-chip");
      titleRow.appendChild(byId("topbarOrgSelectorBtn"));
    }

    titleRow.insertAdjacentElement("afterbegin", pageTitle);
    main.appendChild(titleRow);
    main.appendChild(runtime);

    var actions = qs(".ui-topbar__actions", inner);
    if (!actions || actions === legacyActions && legacyActions && legacyActions.parentNode !== inner) {
      actions = document.createElement("div");
      actions.className = "ui-topbar__actions";
    }
    if (legacyActions && legacyActions !== actions) {
      Array.prototype.slice.call(legacyActions.children).forEach(function (child) {
        actions.appendChild(child);
      });
      legacyActions.remove();
    }

    if (languageField) {
      var languageWrapper = document.createElement("label");
      languageWrapper.className = "ui-topbar__lang";
      languageWrapper.setAttribute("for", "topbarLanguageSelect");
      languageWrapper.innerHTML = '<span>اللغة</span>';
      languageWrapper.appendChild(byId("topbarLanguageSelect"));
      actions.insertAdjacentElement("afterbegin", languageWrapper);
      languageField.remove();
    } else if (byId("topbarLanguageSelect") && !byId("topbarLanguageSelect").closest(".ui-topbar__lang")) {
      var compactWrapper = document.createElement("label");
      compactWrapper.className = "ui-topbar__lang";
      compactWrapper.setAttribute("for", "topbarLanguageSelect");
      compactWrapper.innerHTML = '<span>اللغة</span>';
      compactWrapper.appendChild(byId("topbarLanguageSelect"));
      actions.insertAdjacentElement("afterbegin", compactWrapper);
    }

    if (controls) {
      controls.remove();
    }
    if (center) {
      center.remove();
    }

    Array.prototype.slice.call(inner.children).forEach(function (child) {
      if (child !== brand && child !== main && child !== actions) {
        child.remove();
      }
    });
    if (main.parentNode !== inner) {
      inner.appendChild(main);
    }
    if (actions.parentNode !== inner) {
      inner.appendChild(actions);
    }
  }

  function injectSidebarMenu() {
    var sidebar = qs(".sidebar");
    if (!sidebar || qs(".ui-sidebar-nav", sidebar)) {
      return;
    }
    qsa(".sidebar-section", sidebar).forEach(function (section) {
      section.classList.add("legacy-sidebar-section");
    });
    var footerButtons = [
      '<div class="ui-sidebar-footer">',
      '  <button type="button" class="ui-btn ui-btn--ghost" id="uiSidebarCollapseBtn"><span>تصغير / تكبير القائمة</span></button>',
      '  <button type="button" class="ui-btn ui-btn--dark" data-ui-nav="validation"><span>Validation Board</span></button>',
      '  <button type="button" class="ui-btn ui-btn--gold" data-ui-nav="reports-shell"><span>تقارير التشغيل</span></button>',
      "</div>"
    ].join("");
    var html = [
      '<nav class="ui-sidebar-nav" aria-label="Keeta redesign menu">',
      menuGroups.map(function (group) {
        return renderSidebarGroup(group);
      }).join(""),
      footerButtons,
      "</nav>"
    ].join("");
    var note = qs(".sidebar-note", sidebar);
    if (note) {
      note.insertAdjacentHTML("afterend", html);
    } else {
      sidebar.insertAdjacentHTML("beforeend", html);
    }
  }

  function renderSidebarGroup(group) {
    var isOpen = uiState.sidebarGroups[group.key];
    if (typeof isOpen !== "boolean") {
      isOpen = true;
      uiState.sidebarGroups[group.key] = true;
    }
    var isGroupActive = (group.items || []).some(function (item) {
      return isRouteMatch(uiState.currentRoute, item);
    });
    return [
      '<section class="ui-sidebar-group' + (isGroupActive ? " is-active" : "") + '" data-group-key="' + escapeHtml(group.key) + '" data-open="' + (isOpen ? "true" : "false") + '">',
      '  <button type="button" class="ui-sidebar-group-toggle" data-group-toggle="' + escapeHtml(group.key) + '" aria-expanded="' + (isOpen ? "true" : "false") + '">',
      '    <span class="ui-sidebar-group-title">',
      '      <span class="ui-menu-icon">' + escapeHtml(group.icon) + "</span>",
      '      <span class="ui-sidebar-group-label">' + escapeHtml(group.label) + "</span>",
      "    </span>",
      '    <span class="ui-sidebar-chevron" aria-hidden="true"></span>',
      "  </button>",
      '  <div class="ui-sidebar-items">',
      group.items.map(function (item) {
        return [
          '<button type="button" class="ui-side-link" data-ui-nav="' + escapeHtml(item.page) + '" data-ui-route-code="' + escapeHtml(item.code || "") + '" data-ui-subpage="' + escapeHtml(item.subPage || "") + '" title="' + escapeHtml(item.label) + '">',
          "  <span>" + escapeHtml(item.label) + "</span>",
          "  <span>" + escapeHtml(item.code) + "</span>",
          "</button>"
        ].join("");
      }).join(""),
      "  </div>",
      "</section>"
    ].join("");
  }

  function injectDashboardSummary() {
    var page = byId("page-dashboard");
    if (!page || byId("uiDashboardSummary")) {
      return;
    }
    page.insertAdjacentHTML("afterbegin", [
      '<section class="ui-dashboard-summary" id="uiDashboardSummary">',
      '  <div class="ui-dashboard-overview">',
      '    <article class="ui-shell-card ui-shell-card--dark">',
      '      <div class="ui-shell-card__head">',
      '        <div>',
      "          <h3>لوحة ملخص تشبه Keeta Dashboard</h3>",
      "          <p>واجهة متابعة تنفيذية سريعة للمدينة والسجل مع إبقاء محركات V4/V9 كما هي.</p>",
      "        </div>",
      '        <div class="ui-brand-mini"><img src="./assets/logo.svg" alt="Logo"><div><strong>Keeta Ops</strong><p>Operational Snapshot</p></div></div>',
      "      </div>",
      '      <div class="ui-quick-actions">',
      '        <button type="button" class="ui-chip-btn" data-ui-nav="operations-shell">يوزرات الداشبورد</button>',
      '        <button type="button" class="ui-chip-btn" data-ui-nav="performance-shell">الأداء والصلاحية</button>',
      '        <button type="button" class="ui-chip-btn" data-ui-nav="fleet-shell">المركبات</button>',
      '        <button type="button" class="ui-chip-btn" data-ui-nav="monthly-closing-shell">الإقفال الشهري</button>',
      "      </div>",
      "    </article>",
      '    <article class="ui-shell-card">',
      '      <div class="ui-shell-card__head">',
      '        <div><h4>توزيع وتحليل سريع</h4><p>مبني على بيانات الـ sample الموجودة في النظام لعرض شكل اللوحة الجديدة.</p></div>',
      '        <span class="ui-filter-badge">UI Preview</span>',
      "      </div>",
      '      <div class="ui-chart-grid">',
      '        <div><h4 style="margin:0 0 12px">حسب المدينة</h4><div class="ui-distribution-list" id="uiChartCity"></div></div>',
      '        <div><h4 style="margin:0 0 12px">حسب السجل</h4><div class="ui-distribution-list" id="uiChartRegister"></div></div>',
      '        <div><h4 style="margin:0 0 12px">صالح / غير صالح</h4><div class="ui-distribution-list" id="uiChartValidity"></div></div>',
      '        <div><h4 style="margin:0 0 12px">سيارة / دباب</h4><div class="ui-distribution-list" id="uiChartVehicleType"></div></div>',
      "      </div>",
      "    </article>",
      "  </div>",
      '  <div class="ui-summary-strip" id="uiSummaryCards"></div>',
      "</section>"
    ].join(""));
    renderDashboardSummary();
  }

  function renderDashboardSummary() {
    var cardsHost = byId("uiSummaryCards");
    if (!cardsHost) {
      return;
    }
    var dashboardData = buildDashboardMetrics(getVisibleSampleUsers());
    cardsHost.innerHTML = [
      metricCard("إجمالي اليوزرات", dashboardData.totalUsers, "Sample scope"),
      metricCard("يعمل الآن", dashboardData.workingUsers, "Operational status"),
      metricCard("لا يعمل", dashboardData.notWorkingUsers, "Needs review"),
      metricCard("مقيد", dashboardData.restrictedUsers, "Policy / quality"),
      metricCard("تم إقالته", dashboardData.resignedUsers, "Archive handoff"),
      metricCard("سيارات جدة", dashboardData.jeddahCars, "Vehicle split"),
      metricCard("دبابات جدة", dashboardData.jeddahBikes, "Vehicle split"),
      metricCard("سيارات الرياض", dashboardData.riyadhCars, "Vehicle split"),
      metricCard("دبابات الرياض", dashboardData.riyadhBikes, "Vehicle split"),
      metricCard("إجمالي الطلبات", dashboardData.totalOrders, "Sample orders"),
      metricCard("تحقيق التارجت", dashboardData.targetHitRate + "%", "Sample KPI"),
      metricCard("الحسابات غير الصالحة", dashboardData.invalidUsers, "Needs follow-up"),
      metricCard("مشاكل تحتاج متابعة", dashboardData.alerts, "Mismatch / placement")
    ].join("");
    renderDistributionList("uiChartCity", dashboardData.byCity, "gold");
    renderDistributionList("uiChartRegister", dashboardData.byRegister, "blue");
    renderDistributionList("uiChartValidity", dashboardData.byValidity, "green");
    renderDistributionList("uiChartVehicleType", dashboardData.byVehicleType, "gold");
  }

  function metricCard(label, value, note) {
    return [
      '<article class="ui-summary-card">',
      "  <span>" + escapeHtml(label) + "</span>",
      "  <strong>" + escapeHtml(value) + "</strong>",
      "  <small>" + escapeHtml(note) + "</small>",
      "</article>"
    ].join("");
  }

  function renderDistributionList(targetId, entries, colorName) {
    var host = byId(targetId);
    if (!host) {
      return;
    }
    if (!entries.length) {
      host.innerHTML = '<div class="empty">لا توجد بيانات ضمن النطاق الحالي.</div>';
      return;
    }
    var maxValue = 0;
    entries.forEach(function (entry) {
      maxValue = Math.max(maxValue, entry.value);
    });
    host.innerHTML = entries.map(function (entry) {
      var width = maxValue ? Math.max(12, Math.round((entry.value / maxValue) * 100)) : 0;
      return [
        '<div class="ui-distribution-row">',
        "  <label>" + escapeHtml(entry.label) + "</label>",
        '  <div class="ui-bar-track"><span class="ui-bar-fill ' + escapeHtml(colorName || "") + '" style="width:' + width + '%"></span></div>',
        "  <strong>" + escapeHtml(entry.value) + "</strong>",
        "</div>"
      ].join("");
    }).join("");
  }

  function injectFilterPanels() {
    Object.keys(filterConfigs).forEach(function (pageKey) {
      var page = byId("page-" + pageKey);
      if (!page || qs('.ui-filter-panel[data-filter-panel="' + pageKey + '"]', page)) {
        return;
      }
      page.insertAdjacentHTML("afterbegin", renderFilterPanel(pageKey, filterConfigs[pageKey]));
    });
  }

  function renderFilterPanel(pageKey, config) {
    return [
      '<section class="ui-filter-panel" data-filter-panel="' + escapeHtml(pageKey) + '">',
      '  <div class="ui-filter-panel__head">',
      "    <div><h3>" + escapeHtml(config.title) + "</h3><p>" + escapeHtml(config.note) + "</p></div>",
      '    <span class="ui-filter-badge" data-filter-summary="' + escapeHtml(pageKey) + '">بدون فلاتر محفوظة</span>',
      "  </div>",
      '  <div class="ui-filter-scope-note" data-global-scope-note="' + escapeHtml(pageKey) + '"></div>',
      '  <div class="ui-filter-grid">',
      config.fields.map(function (field) {
        return renderField(pageKey, field);
      }).join(""),
      "  </div>",
      '  <div class="ui-filter-actions">',
      '    <button type="button" class="ui-action-btn ui-action-btn--primary" data-filter-action="search">بحث</button>',
      '    <button type="button" class="ui-action-btn ui-action-btn--secondary" data-filter-action="clear">إعادة الإعداد</button>',
      '    <button type="button" class="ui-action-btn ui-action-btn--secondary" data-filter-action="export">تصدير</button>',
      '    <button type="button" class="ui-action-btn ui-action-btn--secondary" data-filter-action="import">استيراد</button>',
      '    <button type="button" class="ui-action-btn ui-action-btn--warning" data-filter-action="save">حفظ الفلتر</button>',
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderField(pageKey, field) {
    var fieldId = "ui-filter-" + pageKey + "-" + field.name;
    if (field.type === "select") {
      return [
        '<div class="field">',
        '  <label for="' + escapeHtml(fieldId) + '">' + escapeHtml(field.label) + "</label>",
        '  <select id="' + escapeHtml(fieldId) + '" data-filter-field="' + escapeHtml(field.name) + '">',
        field.options.map(function (option) {
          return '<option value="' + escapeHtml(option) + '">' + escapeHtml(option || "الكل") + "</option>";
        }).join(""),
        "  </select>",
        "</div>"
      ].join("");
    }
    return [
      '<div class="field">',
      '  <label for="' + escapeHtml(fieldId) + '">' + escapeHtml(field.label) + "</label>",
      '  <input id="' + escapeHtml(fieldId) + '" type="' + escapeHtml(field.type) + '" data-filter-field="' + escapeHtml(field.name) + '" placeholder="' + escapeHtml(field.placeholder || "") + '">',
      "</div>"
    ].join("");
  }

  function injectPrompt2FoundationPanels() {
    var settingsPage = byId("page-settings-shell");
    if (settingsPage && !byId("uiPrompt2AdminGrid")) {
      settingsPage.insertAdjacentHTML("afterbegin", [
        '<section class="ui-admin-grid" id="uiPrompt2AdminGrid">',
        '  <article class="ui-shell-card" id="uiDevLoginCard"></article>',
        '  <article class="ui-shell-card" id="uiAuditLogCard"></article>',
        "</section>"
      ].join(""));
    }

    var dataModelPage = byId("page-data-model");
    if (dataModelPage && !byId("uiPrompt2DataLayerCard")) {
      dataModelPage.insertAdjacentHTML("afterbegin", '<section class="ui-shell-card" id="uiPrompt2DataLayerCard"></section>');
    }
  }

  function renderPrompt2Panels() {
    renderDevLoginCard();
    renderAuditLogCard();
    renderDataLayerCard();
  }

  function renderDevLoginCard() {
    var host = byId("uiDevLoginCard");
    var runtime = getPrompt2Runtime();
    var currentUser = getCurrentDevUser();
    var summary = getCurrentUserScopeSummary();
    if (!host) {
      return;
    }
    if (!runtime || !runtime.auth) {
      host.innerHTML = '<div class="ui-admin-empty">Prompt 2 runtime غير محمل بعد.</div>';
      return;
    }
    host.innerHTML = [
      '<div class="ui-shell-card__head">',
      '  <div><h3>Dev Login</h3><p>تبديل المستخدم الحالي لاختبار الـ RBAC والـ city/register scope بدون Login Production.</p></div>',
      '  <span class="ui-filter-badge">Prompt 2</span>',
      "</div>",
      '<div class="ui-admin-form">',
      '  <div class="field">',
      '    <label for="devLoginUserSelect">المستخدم التجريبي</label>',
      '    <select id="devLoginUserSelect">',
      runtime.auth.getUsers().map(function (user) {
        return '<option value="' + escapeHtml(user.id) + '"' + (currentUser && currentUser.id === user.id ? " selected" : "") + '>' + escapeHtml(user.displayName + " (" + user.username + ")") + "</option>";
      }).join(""),
      "    </select>",
      "  </div>",
      '  <div class="ui-admin-actions">',
      '    <button type="button" class="ui-btn ui-btn--dark" id="devLoginApplyBtn">تبديل المستخدم</button>',
      '    <button type="button" class="ui-btn ui-btn--ghost" id="devLoginLogoutBtn">تسجيل خروج الجلسة</button>',
      "  </div>",
      "</div>",
      '<div class="ui-admin-summary">',
      '  <div class="ui-admin-stat"><small>المستخدم الحالي</small><strong>' + escapeHtml(currentUser ? currentUser.displayName : "بدون جلسة") + '</strong></div>',
      '  <div class="ui-admin-stat"><small>الدور</small><strong>' + escapeHtml(summary.roleLabel) + '</strong></div>',
      '  <div class="ui-admin-stat"><small>نطاق المدن</small><strong>' + escapeHtml(summary.cities) + '</strong></div>',
      '  <div class="ui-admin-stat"><small>نطاق السجلات</small><strong>' + escapeHtml(summary.registers) + '</strong></div>',
      "</div>"
    ].join("");
  }

  function renderAuditLogCard() {
    var host = byId("uiAuditLogCard");
    var runtime = getPrompt2Runtime();
    var events = runtime && runtime.auditLog ? runtime.auditLog.listRecent(10) : [];
    if (!host) {
      return;
    }
    host.innerHTML = [
      '<div class="ui-shell-card__head">',
      '  <div><h3>Audit Log</h3><p>آخر 10 عمليات من التخزين المحلي لمرحلة Prompt 2.</p></div>',
      '  <span class="ui-filter-badge">' + escapeHtml(String(events.length)) + " events</span>",
      "</div>",
      events.length ? (
        '<div class="ui-audit-list">' +
        events.map(function (eventItem) {
          return [
            '<article class="ui-audit-item">',
            '  <strong>' + escapeHtml(eventItem.action || "unknown") + "</strong>",
            '  <span>' + escapeHtml((eventItem.entity || "-") + " / " + (eventItem.entityId || "-")) + "</span>",
            '  <small>' + escapeHtml((eventItem.userId || "guest") + " · " + (eventItem.timestamp || "")) + "</small>",
            "</article>"
          ].join("");
        }).join("") +
        "</div>"
      ) : '<div class="ui-admin-empty">لا توجد أحداث بعد. سيتم ملء السجل مع عمليات التبديل، الاستيراد، والتحديث.</div>'
    ].join("");
  }

  function renderDataLayerCard() {
    var host = byId("uiPrompt2DataLayerCard");
    var runtime = getPrompt2Runtime();
    var adapterInfo = runtime && runtime.dataStore ? runtime.dataStore.getAdapterInfo() : null;
    var currentUser = getCurrentDevUser();
    var summary = getCurrentUserScopeSummary();
    if (!host) {
      return;
    }
    host.innerHTML = [
      '<div class="ui-shell-card__head">',
      '  <div><h3>Prompt 2 Data Layer</h3><p>ملخص سريع لحالة التخزين والـ migrations والـ RBAC runtime.</p></div>',
      '  <span class="ui-filter-badge">Data + RBAC</span>',
      "</div>",
      '<div class="ui-admin-summary">',
      '  <div class="ui-admin-stat"><small>المستخدم الحالي</small><strong>' + escapeHtml(currentUser ? currentUser.displayName : "بدون جلسة") + '</strong></div>',
      '  <div class="ui-admin-stat"><small>الدور</small><strong>' + escapeHtml(summary.roleLabel) + '</strong></div>',
      '  <div class="ui-admin-stat"><small>المدن المسموحة</small><strong>' + escapeHtml(summary.cities) + '</strong></div>',
      '  <div class="ui-admin-stat"><small>السجلات المسموحة</small><strong>' + escapeHtml(summary.registers) + '</strong></div>',
      '  <div class="ui-admin-stat"><small>المخزن الفعّال</small><strong>' + escapeHtml(adapterInfo ? adapterInfo.active : "--") + '</strong></div>',
      '  <div class="ui-admin-stat"><small>Persistent</small><strong>' + escapeHtml(adapterInfo ? String(adapterInfo.persistent) : "--") + '</strong></div>',
      "</div>"
    ].join("");
  }

  function restoreFilterPanels() {
    qsa(".ui-filter-panel").forEach(function (panel) {
      var key = panel.getAttribute("data-filter-panel");
      var saved = uiState.filters[key] || {};
      qsa("[data-filter-field]", panel).forEach(function (field) {
        field.value = saved[field.getAttribute("data-filter-field")] || "";
      });
      updateFilterSummary(key);
    });
  }

  function collectFilterValues(panel) {
    var values = {};
    qsa("[data-filter-field]", panel).forEach(function (field) {
      values[field.getAttribute("data-filter-field")] = field.value || "";
    });
    return values;
  }

  function saveFilterPanel(panel) {
    var key = panel.getAttribute("data-filter-panel");
    uiState.filters[key] = collectFilterValues(panel);
    saveState();
    updateFilterSummary(key);
    showToast("تم حفظ الفلتر لهذا الموديول", "success");
  }

  function clearFilterPanel(panel) {
    var key = panel.getAttribute("data-filter-panel");
    qsa("[data-filter-field]", panel).forEach(function (field) {
      field.value = "";
    });
    uiState.filters[key] = {};
    saveState();
    updateFilterSummary(key);
    if (key === "operations-shell") {
      renderOperationsWorkbench();
    }
    showToast("تمت إعادة ضبط الفلاتر", "info");
  }

  function updateFilterSummary(panelKey) {
    var summary = qs('[data-filter-summary="' + panelKey + '"]');
    if (!summary) {
      return;
    }
    var values = uiState.filters[panelKey] || {};
    var count = 0;
    Object.keys(values).forEach(function (key) {
      if (values[key]) {
        count += 1;
      }
    });
    summary.textContent = count ? "فلاتر محفوظة: " + count : "بدون فلاتر محفوظة";
  }

  function applyFilterPanel(panel) {
    var key = panel.getAttribute("data-filter-panel");
    uiState.filters[key] = collectFilterValues(panel);
    saveState();
    updateFilterSummary(key);
    if (key === "operations-shell") {
      renderOperationsWorkbench();
    }
    showToast("تم تطبيق الفلاتر على الواجهة", "success");
  }

  function injectOperationsWorkbench() {
    if (document.body && document.body.dataset.operationsExtensionMode === "prompt5") {
      return;
    }
    var page = byId("page-operations-shell");
    if (!page || byId("uiOperationsWorkbench")) {
      return;
    }
    var panel = qs('.ui-filter-panel[data-filter-panel="operations-shell"]', page);
    var html = [
      '<section class="ui-shell-card" id="uiOperationsWorkbench">',
      '  <div class="ui-shell-card__head">',
      "    <div><h3>جدول يوزرات الداشبورد</h3><p>جدول shell تفاعلي يعرض شكل Keeta-style للعمليات مع الحفاظ على المحركات الحالية.</p></div>",
      '    <span class="ui-filter-badge">Operations Preview</span>',
      "  </div>",
      '  <div class="ui-inline-kpis" id="uiOperationsKpis"></div>',
      '  <div class="table-wrap">',
      '    <table id="uiOperationsUsersTable">',
      "      <thead>",
      "        <tr>",
      "          <th>معرف السائق / User ID</th>",
      "          <th>نوع تأهيل سائق التوصيل</th>",
      "          <th>الاسم الشخصي</th>",
      "          <th>اسم العائلة</th>",
      "          <th>رقم بطاقة الهوية</th>",
      "          <th>رقم الهاتف</th>",
      "          <th>البريد الإلكتروني</th>",
      "          <th>المركبة</th>",
      "          <th>حالة الوظيفة</th>",
      "          <th>حالة المطابقة</th>",
      "          <th>المدينة</th>",
      "          <th>السجل</th>",
      "          <th>المستخدم الحالي</th>",
      "          <th>رقم إقامة المستخدم الحالي</th>",
      "          <th>تاريخ الاستلام</th>",
      "          <th>تاريخ التسليم</th>",
      "          <th>العمليات</th>",
      "        </tr>",
      "      </thead>",
      '      <tbody id="uiOperationsUsersBody"></tbody>',
      "    </table>",
      "  </div>",
      "</section>"
    ].join("");
    if (panel) {
      panel.insertAdjacentHTML("afterend", html);
    } else {
      page.insertAdjacentHTML("afterbegin", html);
    }
  }

  function renderOperationsWorkbench() {
    if (document.body && document.body.dataset.operationsExtensionMode === "prompt5") {
      return;
    }
    var body = byId("uiOperationsUsersBody");
    var kpis = byId("uiOperationsKpis");
    if (!body || !kpis) {
      return;
    }
    var rows = getFilteredSampleUsers();
    var working = rows.filter(function (row) { return row.jobStatus === "يعمل"; }).length;
    var resigned = rows.filter(function (row) { return row.jobStatus === "مقال"; }).length;
    var placement = rows.filter(function (row) { return row.jobStatus === "يحتاج تسكين"; }).length;
    var mismatch = rows.filter(function (row) { return row.matchStatus !== "مطابق"; }).length;
    kpis.innerHTML = [
      inlineKpi("النتائج الحالية", rows.length),
      inlineKpi("يعمل الآن", working),
      inlineKpi("إقالات", resigned, "bad"),
      inlineKpi("يحتاج تسكين", placement, "warn"),
      inlineKpi("مطابقات تحتاج مراجعة", mismatch, mismatch ? "warn" : "")
    ].join("");
    body.innerHTML = rows.length ? rows.map(renderOperationsRow).join("") : '<tr><td colspan="17"><div class="empty">لا توجد نتائج مطابقة للفلاتر الحالية.</div></td></tr>';
    enhanceTables();
  }

  function inlineKpi(label, value, className) {
    return [
      '<article class="ui-inline-kpi ' + escapeHtml(className || "") + '">',
      "  <span>" + escapeHtml(label) + "</span>",
      "  <strong>" + escapeHtml(value) + "</strong>",
      "</article>"
    ].join("");
  }

  function renderOperationsRow(user) {
    return [
      "<tr>",
      "  <td class=\"mono\">" + escapeHtml(user.userId) + "</td>",
      "  <td>" + escapeHtml(user.qualification) + "</td>",
      "  <td>" + escapeHtml(user.firstName) + "</td>",
      "  <td>" + escapeHtml(user.lastName) + "</td>",
      "  <td>" + escapeHtml(user.idNumber) + "</td>",
      "  <td>" + escapeHtml(user.phone) + "</td>",
      "  <td>" + escapeHtml(user.email) + "</td>",
      "  <td>" + escapeHtml(user.vehicle) + "</td>",
      "  <td>" + renderStatusBadge(user.jobStatus, mapJobStatusClass(user.jobStatus)) + "</td>",
      "  <td>" + renderStatusBadge(user.matchStatus, mapMatchClass(user.matchStatus)) + "</td>",
      "  <td>" + escapeHtml(user.city) + "</td>",
      "  <td>" + escapeHtml(user.register) + "</td>",
      "  <td>" + escapeHtml(user.currentUser) + "</td>",
      "  <td>" + escapeHtml(user.currentIqama) + "</td>",
      "  <td>" + escapeHtml(user.handoverDate) + "</td>",
      "  <td>" + escapeHtml(user.returnDate || "-") + "</td>",
      "  <td>" + renderRowMenu(user) + "</td>",
      "</tr>"
    ].join("");
  }

  function renderStatusBadge(label, className) {
    return '<span class="status-badge ' + escapeHtml(className) + '">' + escapeHtml(label) + "</span>";
  }

  function renderUserActionButton(action, label, userId, className) {
    var permission = getUserActionPermission(action);
    var allowed = permission ? isUserActionAllowed(action) : true;
    return [
      '<button type="button" class="' + escapeHtml(className || "") + (allowed ? "" : " is-disabled") + '" data-user-action="' + escapeHtml(action) + '" data-user-id="' + escapeHtml(userId) + '"' + (allowed ? "" : ' disabled title="صلاحية غير متاحة للمستخدم الحالي"') + '>',
      escapeHtml(label),
      "</button>"
    ].join("");
  }

  function renderRowMenu(user) {
    return [
      '<details class="row-action-menu">',
      "  <summary>العمليات</summary>",
      '  <div class="row-action-list">',
      "    " + renderUserActionButton("details", "عرض التفاصيل", user.userId),
      "    " + renderUserActionButton("edit-user", "تعديل بيانات اليوزر", user.userId),
      "    " + renderUserActionButton("edit-rider", "تعديل بيانات المندوب الحالي", user.userId),
      "    " + renderUserActionButton("assign", "تسكين مندوب", user.userId),
      "    " + renderUserActionButton("swap", "تبديل مندوب", user.userId),
      "    " + renderUserActionButton("stop", "إيقاف بدون بديل", user.userId, "danger"),
      "    " + renderUserActionButton("resign", "نقل إلى الإقالات", user.userId, "danger"),
      "    " + renderUserActionButton("log", "سجل العمليات", user.userId),
      "    " + renderUserActionButton("copy", "نسخ User ID", user.userId),
      "    " + renderUserActionButton("archive", "فتح أرشيف اليوزر", user.userId),
      "  </div>",
      "</details>"
    ].join("");
  }

  function getFilteredSampleUsers() {
    var filters = uiState.filters["operations-shell"] || {};
    return getVisibleSampleUsers().filter(function (user) {
      if (filters.userId && !containsValue(user.userId, filters.userId)) {
        return false;
      }
      if (filters.ownerId && !containsValue(user.idNumber, filters.ownerId)) {
        return false;
      }
      if (filters.currentIqama && !containsValue(user.currentIqama, filters.currentIqama)) {
        return false;
      }
      if (filters.phone && !containsValue(user.phone, filters.phone)) {
        return false;
      }
      if (filters.city && user.city !== filters.city) {
        return false;
      }
      if (filters.register && !matchesRegisterFilterValue(user.register, filters.register)) {
        return false;
      }
      if (filters.vehicle && !containsValue(user.vehicle, filters.vehicle)) {
        return false;
      }
      if (filters.match && user.matchStatus !== filters.match) {
        return false;
      }
      if (filters.status && user.jobStatus !== filters.status) {
        return false;
      }
      if (filters.vehicleType && user.vehicleType !== filters.vehicleType) {
        return false;
      }
      if (filters.workType && user.workType !== filters.workType) {
        return false;
      }
      if (filters.supervisor && !containsValue(user.supervisor, filters.supervisor)) {
        return false;
      }
      if (filters.handoverFrom && user.handoverDate < filters.handoverFrom) {
        return false;
      }
      if (filters.handoverTo && user.handoverDate > filters.handoverTo) {
        return false;
      }
      return true;
    });
  }

  function mapJobStatusClass(status) {
    if (status === "يعمل") {
      return "good";
    }
    if (status === "مقيد" || status === "يحتاج تسكين") {
      return "warn";
    }
    if (status === "مقال") {
      return "bad";
    }
    return "info";
  }

  function mapMatchClass(status) {
    if (status === "مطابق") {
      return "good";
    }
    if (status === "يحتاج مراجعة") {
      return "warn";
    }
    return "bad";
  }

  function injectUiOverlays() {
    if (byId("uiToastStack")) {
      return;
    }
    document.body.insertAdjacentHTML("beforeend", [
      '<div class="ui-toast-stack" id="uiToastStack" aria-live="polite"></div>',
      '<div class="ui-overlay ui-overlay--sidebar" data-overlay-close="sidebar"></div>',
      '<div class="ui-overlay ui-overlay--drawer" data-overlay-close="drawer"></div>',
      '<div class="ui-overlay ui-overlay--modal" data-overlay-close="modal"></div>',
      '<aside class="ui-drawer" id="uiDetailDrawer" aria-hidden="true">',
      '  <div class="ui-drawer__head"><div><strong id="uiDrawerTitle">تفاصيل اليوزر</strong></div><button type="button" class="ui-close-btn" data-close-ui="drawer">×</button></div>',
      '  <div class="ui-drawer__body" id="uiDrawerBody"></div>',
      "</aside>",
      '<div class="ui-modal" id="uiModal" aria-hidden="true">',
      '  <div class="ui-modal__panel" id="uiModalPanel">',
      '    <div class="ui-modal__head"><strong id="uiModalTitle">تأكيد</strong><button type="button" class="ui-close-btn" data-close-ui="modal">×</button></div>',
      '    <div class="ui-modal__body" id="uiModalBody"></div>',
      '    <div class="ui-modal__actions">',
      '      <button type="button" class="ui-btn ui-btn--ghost" data-close-ui="modal">إلغاء</button>',
      '      <button type="button" class="ui-btn ui-btn--dark" id="uiModalConfirmBtn">تأكيد</button>',
      "    </div>",
      "  </div>",
      "</div>",
      '<div class="ui-loading" id="uiLoading">',
      '  <div class="ui-loading__card">',
      '    <div class="ui-loading__spinner"></div>',
      '    <strong style="display:block;margin-bottom:6px">جارٍ تجهيز العملية</strong>',
      '    <div id="uiLoadingText">يرجى الانتظار...</div>',
      "  </div>",
      "</div>"
    ].join(""));
  }

  function bindUiEvents() {
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("change", handleDocumentChange);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeDrawer();
        closeModal();
        closeSidebarOnMobile();
      }
    });

    var confirmBtn = byId("uiModalConfirmBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        var shouldClose = true;
        if (typeof pendingModalConfirm === "function") {
          shouldClose = pendingModalConfirm();
        }
        if (shouldClose !== false) {
          closeModal();
        }
      });
    }

    qsa('input[type="file"]').forEach(function (input) {
      wireFileInput(input);
    });
  }

  function handleDocumentClick(event) {
    var closeTarget = event.target.closest("[data-close-ui]");
    if (closeTarget) {
      var type = closeTarget.getAttribute("data-close-ui");
      if (type === "drawer") {
        closeDrawer();
      }
      if (type === "modal") {
        closeModal();
      }
      return;
    }

    var overlay = event.target.closest("[data-overlay-close]");
    if (overlay) {
      var overlayType = overlay.getAttribute("data-overlay-close");
      if (overlayType === "drawer") {
        closeDrawer();
      } else if (overlayType === "modal") {
        closeModal();
      } else if (overlayType === "sidebar") {
        closeSidebarOnMobile();
      }
      return;
    }

    var groupToggle = event.target.closest("[data-group-toggle]");
    if (groupToggle) {
      toggleSidebarGroup(groupToggle.getAttribute("data-group-toggle"));
      return;
    }

    var pageButton = event.target.closest("[data-ui-nav]");
    if (pageButton) {
      var page = pageButton.getAttribute("data-ui-nav");
      var route = normalizeRoute({
        code: pageButton.getAttribute("data-ui-route-code") || "",
        page: page,
        subPage: pageButton.getAttribute("data-ui-subpage") || ""
      });
      if (openPage(page, route)) {
        if (window.innerWidth <= 1100) {
          closeSidebarOnMobile();
        }
      }
      return;
    }

    var chipButton = event.target.closest(".ui-chip-btn");
    if (chipButton && chipButton.getAttribute("data-ui-nav")) {
      openPage(chipButton.getAttribute("data-ui-nav"), deriveDefaultRouteForPage(chipButton.getAttribute("data-ui-nav")));
      return;
    }

    var organizationAction = event.target.closest("[data-org-action]");
    if (organizationAction && organizationDraft) {
      handleOrganizationAction(organizationAction.getAttribute("data-org-action"));
      return;
    }

    var topbarToggle = event.target.closest("#topbarSidebarToggle");
    if (topbarToggle) {
      toggleSidebar();
      return;
    }

    var topbarOrgSelector = event.target.closest("#topbarOrgSelectorBtn");
    if (topbarOrgSelector) {
      openOrganizationSelector();
      return;
    }

    var sidebarCollapse = event.target.closest("#uiSidebarCollapseBtn");
    if (sidebarCollapse) {
      uiState.sidebarCollapsed = !uiState.sidebarCollapsed;
      document.body.classList.toggle("sidebar-collapsed", uiState.sidebarCollapsed);
      saveState();
      return;
    }

    var topbarRefresh = event.target.closest("#topbarRefreshBtn");
    if (topbarRefresh) {
      var refresh = byId("refreshAllBtn");
      if (refresh) {
        refresh.click();
      }
      setLastUpdate("آخر تحديث تشغيلي");
      showToast("تم تشغيل تحديث البيانات الحالية", "success");
      return;
    }

    var topbarImport = event.target.closest("#topbarImportBtn");
    if (topbarImport) {
      if (!canCurrentUser("imports.create")) {
        showToast("المستخدم الحالي لا يملك صلاحية الاستيراد.", "warning");
        return;
      }
      openPage("import-center");
      var batchInput = byId("importBatchFiles");
      if (batchInput) {
        batchInput.click();
      }
      return;
    }

    var topbarExport = event.target.closest("#topbarExportBtn");
    if (topbarExport) {
      if (!canCurrentUser("reports.export")) {
        showToast("المستخدم الحالي لا يملك صلاحية التصدير.", "warning");
        return;
      }
      openPage("reports-shell");
      window.setTimeout(function () {
        var exportBtn = byId("exportSnapshotBtn");
        if (exportBtn) {
          exportBtn.click();
        }
      }, 120);
      setLastUpdate("آخر تصدير");
      showToast("تم تشغيل التصدير السريع", "success");
      return;
    }

    var applyDevLogin = event.target.closest("#devLoginApplyBtn");
    if (applyDevLogin) {
      var runtime = getPrompt2Runtime();
      if (!runtime || !runtime.auth || !byId("devLoginUserSelect")) {
        showToast("تعذر الوصول إلى Dev Login runtime.", "error");
        return;
      }
      runtime.auth.loginAs(byId("devLoginUserSelect").value);
      syncPrompt2Ui();
      showToast("تم تبديل المستخدم الحالي بنجاح.", "success");
      return;
    }

    var logoutDevLogin = event.target.closest("#devLoginLogoutBtn");
    if (logoutDevLogin) {
      var runtimeForLogout = getPrompt2Runtime();
      if (!runtimeForLogout || !runtimeForLogout.auth) {
        showToast("تعذر إنهاء جلسة الاختبار الحالية.", "error");
        return;
      }
      runtimeForLogout.auth.logout();
      syncPrompt2Ui();
      showToast("تم تسجيل خروج جلسة Dev Login.", "info");
      return;
    }

    var filterAction = event.target.closest("[data-filter-action]");
    if (filterAction) {
      var panel = filterAction.closest("[data-filter-panel]");
      if (!panel) {
        return;
      }
      var action = filterAction.getAttribute("data-filter-action");
      if (action === "search") {
        applyFilterPanel(panel);
      } else if (action === "save") {
        saveFilterPanel(panel);
      } else if (action === "clear") {
        clearFilterPanel(panel);
      } else if (action === "export") {
        var table = panel.parentElement.querySelector(".table-wrap table");
        if (table) {
          exportTableCsv(table);
        } else {
          showToast("لا يوجد جدول مباشر مرتبط بهذا الفلتر بعد", "warning");
        }
      } else if (action === "import") {
        openPage("import-center");
        var importInput = byId("importBatchFiles");
        if (importInput) {
          importInput.click();
        }
      }
      return;
    }

    var userAction = event.target.closest("[data-user-action]");
    if (userAction) {
      if (userAction.disabled) {
        return;
      }
      handleUserAction(userAction.getAttribute("data-user-action"), userAction.getAttribute("data-user-id"));
      return;
    }

    var tableColumnsButton = event.target.closest("[data-table-columns-toggle]");
    if (tableColumnsButton) {
      var menu = tableColumnsButton.closest(".table-ui-columns");
      if (menu) {
        menu.classList.toggle("is-open");
      }
      return;
    }

    if (!event.target.closest(".table-ui-columns")) {
      qsa(".table-ui-columns.is-open").forEach(function (menu) {
        menu.classList.remove("is-open");
      });
    }
  }

  function handleDocumentChange(event) {
    var target = event.target;
    if (target.matches("#topbarLanguageSelect")) {
      uiState.language = target.value;
      saveState();
      applyLanguage(target.value);
      showToast("تم حفظ اختيار اللغة للـ shell الجديد", "info");
      return;
    }
    if (!organizationDraft) {
      return;
    }
    if (target.matches("[data-org-city]")) {
      if (updateOrganizationDraftSelection("selectedCities", target.value, target.checked, "يجب اختيار مدينة واحدة على الأقل.")) {
        refreshOrganizationSelectorModal();
      }
      return;
    }
    if (target.matches("[data-org-register]")) {
      var parentCity = target.getAttribute("data-org-city-parent");
      if (target.checked && parentCity && organizationDraft.selectedCities.indexOf(parentCity) === -1) {
        organizationDraft.selectedCities.push(parentCity);
      }
      if (updateOrganizationDraftSelection("selectedRegisters", target.value, target.checked, "يجب اختيار سجل واحد على الأقل.")) {
        organizationDraft.selectedDashboards = organizationDraft.selectedRegisters.slice();
        refreshOrganizationSelectorModal();
      }
      return;
    }
    if (target.matches('input[name="orgWorkMode"]')) {
      organizationDraft.workMode = target.value;
      refreshOrganizationSelectorModal();
      return;
    }
  }

  function applyLanguage(language) {
    document.documentElement.lang = language === "en" ? "en" : "ar";
    if (byId("topbarLanguageSelect")) {
      byId("topbarLanguageSelect").value = language;
    }
  }

  function updateOrganizationDraftSelection(key, value, checked, emptyMessage) {
    var current = uniqueValues(organizationDraft[key] || []);
    var next = current.slice();
    var index = next.indexOf(value);
    if (checked && index === -1) {
      next.push(value);
    }
    if (!checked && index >= 0) {
      if (next.length === 1) {
        showToast(emptyMessage, "warning");
        return false;
      }
      next.splice(index, 1);
    }
    organizationDraft[key] = next;
    organizationDraft = normalizeOrganizationContext(organizationDraft);
    return true;
  }

  function handleOrganizationAction(action) {
    if (!organizationDraft) {
      return;
    }
    if (action === "all-cities") {
      organizationDraft.selectedCities = getAllCityLabels();
    }
    if (action === "all-registers") {
      organizationDraft.selectedRegisters = getAllRegisterCodes();
      organizationDraft.selectedDashboards = getAllRegisterCodes();
    }
    if (action === "reset-context") {
      organizationDraft = createDefaultOrganizationContext();
    }
    organizationDraft = normalizeOrganizationContext(organizationDraft);
    refreshOrganizationSelectorModal();
  }

  function syncOrganizationContextUi() {
    var summary = getOrganizationContextSummary(uiState.organizationContext);
    if (byId("topbarOrgCities")) {
      byId("topbarOrgCities").textContent = "المدينة: " + summary.cityLabel;
    }
    if (byId("topbarOrgRegisters")) {
      byId("topbarOrgRegisters").textContent = "السجل: " + summary.registerLabel;
    }
    if (byId("topbarOrgWorkMode")) {
      byId("topbarOrgWorkMode").textContent = "نظام العمل: " + summary.workModeLabel;
    }
    qsa("[data-global-scope-note]").forEach(function (note) {
      note.textContent = "النطاق العام الافتراضي: " + summary.cityLabel + " / " + summary.registerLabel + " / " + summary.workModeLabel;
    });
    renderDashboardSummary();
    renderOperationsWorkbench();
  }

  function initializePrompt2RuntimeBindings() {
    var runtime = getPrompt2Runtime();
    if (!runtime || !runtime.auth || runtime.__uiBindingsReady) {
      return;
    }
    runtime.__uiBindingsReady = true;
    runtime.auth.subscribe(function () {
      syncPrompt2Ui();
    });
  }

  function syncPrompt2Ui() {
    applyCurrentUserScopeToState();
    syncCurrentUserDisplay();
    syncTopbarActionPermissions();
    if (bootModeState.safeMode) {
      return;
    }
    renderPrompt2Panels();
    renderOperationsWorkbench();
  }

  function applyCurrentUserScopeToState() {
    var scopedContext = getScopedOrganizationContext(uiState.organizationContext);
    var previous = JSON.stringify(uiState.organizationContext || {});
    var next = JSON.stringify(scopedContext || {});
    if (previous !== next) {
      uiState.organizationContext = scopedContext;
      saveState();
      syncOrganizationContextUi();
    }
  }

  function syncCurrentUserDisplay() {
    var currentUser = getCurrentDevUser();
    var summary = getCurrentUserScopeSummary();
    if (byId("topbarCurrentUserName")) {
      byId("topbarCurrentUserName").textContent = currentUser ? currentUser.displayName : "بدون جلسة";
    }
    if (byId("topbarCurrentUserRole")) {
      byId("topbarCurrentUserRole").textContent = summary.cities || "بدون نطاق";
    }
    if (byId("topbarCurrentUserChip")) {
      byId("topbarCurrentUserChip").title = [
        currentUser ? currentUser.displayName : "بدون جلسة",
        summary.roleLabel,
        summary.cities
      ].filter(Boolean).join(" · ");
    }
  }

  function syncTopbarActionPermissions() {
    if (byId("topbarImportBtn")) {
      byId("topbarImportBtn").disabled = !canCurrentUser("imports.create");
    }
    if (byId("topbarExportBtn")) {
      byId("topbarExportBtn").disabled = !canCurrentUser("reports.export");
    }
  }

  function openOrganizationSelector() {
    organizationDraft = getScopedOrganizationContext(uiState.organizationContext);
    openModal({
      title: "اختر الهيكل التنظيمي",
      body: renderOrganizationSelectorBody(),
      confirmLabel: "اعتماد الهيكل",
      panelClass: "ui-modal__panel--wide",
      onConfirm: function () {
        if (!organizationDraft.selectedCities.length || !organizationDraft.selectedRegisters.length) {
          showToast("أكمل اختيار المدن والسجلات قبل الاعتماد.", "warning");
          return false;
        }
        setOrganizationContext(organizationDraft);
        showToast("تم تحديث الفلتر التنظيمي العام لكل الصفحات.", "success");
        organizationDraft = null;
        return true;
      }
    });
  }

  function refreshOrganizationSelectorModal() {
    if (!organizationDraft || !byId("uiModalBody")) {
      return;
    }
    byId("uiModalBody").innerHTML = renderOrganizationSelectorBody();
  }

  function renderOrganizationSelectorBody() {
    var state = normalizeOrganizationContext(organizationDraft || uiState.organizationContext);
    var summary = getOrganizationContextSummary(state);
    var registerLabels = getRegisterLabels(state.selectedRegisters);
    return [
      '<section class="ui-org-selector">',
      '  <div class="ui-org-selector__lead">',
      '    <div>',
      '      <h3>كل المدن</h3>',
      '      <p>اختر مدينة واحدة أو عدة مدن، ثم حدد السجلات أو الداشبورد المناسبة داخل نفس الشجرة. كل صفحة ستستخدم هذا الاختيار كفلتر عام افتراضي.</p>',
      "    </div>",
      '    <div class="ui-org-quick-actions">',
      '      <button type="button" class="ui-btn ui-btn--ghost" data-org-action="all-cities">كل المدن</button>',
      '      <button type="button" class="ui-btn ui-btn--ghost" data-org-action="all-registers">كل السجلات</button>',
      '      <button type="button" class="ui-btn ui-btn--gold" data-org-action="reset-context">إعادة الضبط</button>',
      "    </div>",
      "  </div>",
      '  <div class="ui-org-selector__layout">',
      '    <section class="ui-org-panel">',
      '      <div class="ui-org-tree-root">',
      '        <strong>All Cities &gt; City &gt; Register/Dashboard &gt; Work Mode</strong>',
      '        <span>القائمة الجانبية تبقى للموديولات فقط، بينما هذا المحدد يضبط المدينة والسجل كنطاق تشغيلي موحد.</span>',
      "      </div>",
      '      <div class="ui-org-city-grid">',
      organizationTree.map(function (city) {
        return renderOrganizationCityCard(city, state);
      }).join(""),
      "      </div>",
      "    </section>",
      '    <aside class="ui-org-panel ui-org-panel--summary">',
      '      <div class="ui-org-summary-card">',
      '        <small>المدينة</small>',
      '        <strong>' + escapeHtml(summary.cityLabel) + "</strong>",
      '        <small>السجل</small>',
      '        <strong>' + escapeHtml(summary.registerLabel) + "</strong>",
      '        <small>نظام العمل</small>',
      '        <strong>' + escapeHtml(summary.workModeLabel) + "</strong>",
      "      </div>",
      '      <div class="ui-org-summary-card">',
      '        <small>السجلات المختارة</small>',
      '        <div class="ui-org-summary-chips">' + renderSelectionChips(registerLabels) + "</div>",
      "      </div>",
      '      <div class="ui-org-summary-card">',
      '        <small>نظام العمل</small>',
      '        <div class="ui-org-workmode-list">',
      organizationWorkModes.map(function (mode) {
        return [
          '<label class="ui-org-check ui-org-check--mode' + (state.workMode === mode.id ? " is-selected" : "") + '">',
          '  <input type="radio" name="orgWorkMode" value="' + escapeHtml(mode.id) + '"' + (state.workMode === mode.id ? " checked" : "") + '>',
          '  <span>' + escapeHtml(mode.label) + "</span>",
          "</label>"
        ].join("");
      }).join(""),
      "        </div>",
      "      </div>",
      "    </aside>",
      "  </div>",
      "</section>"
    ].join("");
  }

  function renderSelectionChips(items) {
    return (items || []).map(function (item) {
      return '<span class="ui-filter-badge">' + escapeHtml(item) + "</span>";
    }).join("");
  }

  function renderOrganizationCityCard(city, state) {
    var currentUser = getCurrentDevUser();
    var isAllowed = !currentUser || !Portal.RBAC ? true : Portal.RBAC.canAccessCity(currentUser, city.label);
    var isSelected = state.selectedCities.indexOf(city.label) >= 0;
    return [
      '<article class="ui-org-city-card' + (isSelected ? " is-selected" : "") + (isAllowed ? "" : " is-locked") + '">',
      '  <label class="ui-org-check ui-org-check--city' + (isAllowed ? "" : " is-disabled") + '">',
      '    <input type="checkbox" data-org-city="' + escapeHtml(city.label) + '" value="' + escapeHtml(city.label) + '"' + (isSelected ? " checked" : "") + (isAllowed ? "" : " disabled") + '>',
      '    <span>' + escapeHtml(city.label) + "</span>",
      '    <small>' + escapeHtml(city.registers.length) + " سجلات" + (isAllowed ? "" : " · خارج النطاق") + "</small>",
      "  </label>",
      '  <div class="ui-org-register-list">',
      city.registers.map(function (registerOption) {
        return renderOrganizationRegisterOption(city.label, registerOption, state);
      }).join(""),
      "  </div>",
      "</article>"
    ].join("");
  }

  function renderOrganizationRegisterOption(cityLabel, registerOption, state) {
    var currentUser = getCurrentDevUser();
    var isAllowed = !currentUser || !Portal.RBAC ? true : Portal.RBAC.canAccessRegister(currentUser, registerOption.code);
    var isSelected = state.selectedRegisters.indexOf(registerOption.code) >= 0;
    return [
      '<label class="ui-org-check ui-org-check--sub' + (isSelected ? " is-selected" : "") + (isAllowed ? "" : " is-disabled") + '">',
      '  <input type="checkbox" data-org-register="' + escapeHtml(registerOption.code) + '" data-org-city-parent="' + escapeHtml(cityLabel) + '" value="' + escapeHtml(registerOption.code) + '"' + (isSelected ? " checked" : "") + (isAllowed ? "" : " disabled") + '>',
      '  <span>' + escapeHtml(registerOption.label) + "</span>",
      '  <small>' + escapeHtml(registerOption.code) + "</small>",
      "</label>"
    ].join("");
  }

  function renderLastUpdate() {
    var value = byId("topbarLastUpdate");
    var label = byId("topbarLastUpdateLabel");
    if (value) {
      value.textContent = uiState.lastUpdate.value || "--";
    }
    if (label) {
      label.textContent = uiState.lastUpdate.label || "آخر تحديث";
    }
  }

  function setLastUpdate(label) {
    uiState.lastUpdate = {
      label: label || "آخر تحديث",
      value: formatDateTime(new Date())
    };
    renderLastUpdate();
    saveState();
  }

  function toggleSidebar() {
    if (window.innerWidth <= 1100) {
      document.body.classList.toggle("sidebar-open");
    } else {
      uiState.sidebarCollapsed = !uiState.sidebarCollapsed;
      document.body.classList.toggle("sidebar-collapsed", uiState.sidebarCollapsed);
      saveState();
    }
  }

  function closeSidebarOnMobile() {
    document.body.classList.remove("sidebar-open");
  }

  function toggleSidebarGroup(groupKey) {
    var group = qs('[data-group-key="' + groupKey + '"]');
    if (!group) {
      return;
    }
    uiState.sidebarGroups = SidebarRouting && typeof SidebarRouting.toggleGroupState === "function"
      ? SidebarRouting.toggleGroupState(uiState.sidebarGroups, groupKey, uiState.sidebarMultiOpen)
      : fallbackToggleGroupState(uiState.sidebarGroups, groupKey);
    qsa(".ui-sidebar-group").forEach(function (node) {
      var nodeKey = node.getAttribute("data-group-key");
      var isOpen = !!uiState.sidebarGroups[nodeKey];
      node.setAttribute("data-open", isOpen ? "true" : "false");
      var button = qs("[data-group-toggle]", node);
      if (button) {
        button.setAttribute("aria-expanded", isOpen ? "true" : "false");
      }
    });
    saveState();
  }

  function syncActiveMenu() {
    var activePage = qs(".page.active");
    var activeKey = activePage ? activePage.id.replace("page-", "") : "dashboard";
    if (!uiState.currentRoute || uiState.currentRoute.page !== activeKey) {
      uiState.currentRoute = normalizeRoute(deriveDefaultRouteForPage(activeKey));
      saveState();
    }
    qsa("[data-ui-nav]").forEach(function (button) {
      button.classList.toggle("active", isRouteMatch(uiState.currentRoute, {
        code: button.getAttribute("data-ui-route-code") || "",
        page: button.getAttribute("data-ui-nav") || "",
        subPage: button.getAttribute("data-ui-subpage") || ""
      }));
    });
    qsa(".ui-sidebar-group").forEach(function (groupNode) {
      var groupKey = groupNode.getAttribute("data-group-key");
      var groupDef = menuGroups.filter(function (item) {
        return item.key === groupKey;
      })[0];
      var isActive = !!(groupDef && (groupDef.items || []).some(function (item) {
        return isRouteMatch(uiState.currentRoute, item);
      }));
      groupNode.classList.toggle("is-active", isActive);
    });
    var pageLabel = byId("topbarCurrentPage");
    if (pageLabel) {
      pageLabel.textContent = pageLabels[activeKey] || "الملخص العام";
    }
  }

  function fallbackToggleGroupState(currentState, groupKey) {
    var next = {};
    Object.keys(currentState || {}).forEach(function (key) {
      next[key] = false;
    });
    next[groupKey] = !(currentState && currentState[groupKey]);
    return next;
  }

  function showToast(message, type) {
    var stack = byId("uiToastStack");
    if (!stack) {
      return;
    }
    var toast = document.createElement("div");
    toast.className = "ui-toast " + (type || "info");
    toast.textContent = message;
    stack.appendChild(toast);
    window.setTimeout(function () {
      toast.remove();
    }, 3200);
  }

  function showLoading(message) {
    document.body.classList.add("ui-loading");
    if (byId("uiLoadingText")) {
      byId("uiLoadingText").textContent = message || "يرجى الانتظار...";
    }
  }

  function hideLoading() {
    document.body.classList.remove("ui-loading");
  }

  function openDrawer(title, bodyHtml) {
    if (byId("uiDrawerTitle")) {
      byId("uiDrawerTitle").textContent = title;
    }
    if (byId("uiDrawerBody")) {
      byId("uiDrawerBody").innerHTML = bodyHtml;
    }
    document.body.classList.add("ui-drawer-open");
  }

  function closeDrawer() {
    document.body.classList.remove("ui-drawer-open");
  }

  function openModal(options) {
    pendingModalConfirm = options.onConfirm || null;
    var panel = byId("uiModalPanel");
    if (panel) {
      panel.className = "ui-modal__panel" + (options.panelClass ? " " + options.panelClass : "");
    }
    if (byId("uiModalTitle")) {
      byId("uiModalTitle").textContent = options.title || "تأكيد";
    }
    if (byId("uiModalBody")) {
      byId("uiModalBody").innerHTML = options.body || "";
    }
    if (byId("uiModalConfirmBtn")) {
      byId("uiModalConfirmBtn").textContent = options.confirmLabel || "تأكيد";
    }
    document.body.classList.add("ui-modal-open");
  }

  function closeModal() {
    document.body.classList.remove("ui-modal-open");
    pendingModalConfirm = null;
    organizationDraft = null;
    if (byId("uiModalPanel")) {
      byId("uiModalPanel").className = "ui-modal__panel";
    }
  }

  function handleUserAction(action, userId) {
    var user = sampleUsers.filter(function (item) {
      return item.userId === userId;
    })[0];
    if (!user) {
      showToast("تعذر العثور على بيانات هذا اليوزر", "error");
      return;
    }

    var actionPermission = getUserActionPermission(action);
    if (actionPermission && !canCurrentUser(actionPermission)) {
      showToast("المستخدم الحالي لا يملك صلاحية " + action, "warning");
      return;
    }

    if (action === "details") {
      openDrawer("تفاصيل " + user.userId, renderUserDetails(user));
      return;
    }

    if (action === "edit-user" || action === "edit-rider") {
      openModal({
        title: action === "edit-user" ? "تعديل بيانات اليوزر" : "تعديل بيانات المندوب الحالي",
        body: renderEditForm(user, action),
        confirmLabel: "حفظ التعديل",
        onConfirm: function () {
          showToast("تم حفظ التعديل شكليًا في واجهة الـ shell", "success");
          setLastUpdate("آخر تعديل");
        }
      });
      return;
    }

    if (action === "assign") {
      openModal({
        title: "تسكين مندوب",
        body: "<p>سيتم هنا لاحقًا ربط صفحة التسكين على قاعدة البيانات الفعلية مع الحفاظ على الشكل الحالي.</p>",
        confirmLabel: "تأكيد التسكين",
        onConfirm: function () {
          showToast("تمت محاكاة التسكين بنجاح", "success");
        }
      });
      return;
    }

    if (action === "swap" || action === "stop" || action === "resign") {
      var labels = {
        "swap": "تبديل المندوب",
        "stop": "إيقاف بدون بديل",
        "resign": "نقل إلى الإقالات"
      };
      openModal({
        title: labels[action],
        body: "<p>هل تريد تأكيد العملية على اليوزر <strong>" + escapeHtml(user.userId) + "</strong>؟ هذه خطوة UI فقط ولن تغيّر المحرك الحالي.</p>",
        confirmLabel: "تأكيد",
        onConfirm: function () {
          showToast("تم تنفيذ " + labels[action] + " في واجهة المعاينة", "success");
        }
      });
      return;
    }

    if (action === "log") {
      var auditEntries = getPrompt2Runtime() && getPrompt2Runtime().auditLog ? getPrompt2Runtime().auditLog.listRecent(10).filter(function (entry) {
        return entry.entityId === user.userId;
      }) : [];
      openDrawer("سجل العمليات", [
        "<div class=\"list\">",
        auditEntries.length ? auditEntries.map(function (entry) {
          return "<div class=\"list-item\"><span>" + escapeHtml(entry.action) + "</span><span>" + escapeHtml(entry.timestamp) + "</span></div>";
        }).join("") : "<div class=\"list-item\"><span>لا توجد أحداث مرتبطة بهذا اليوزر بعد</span><span>Prompt 2</span></div>",
        "</div>"
      ].join(""));
      return;
    }

    if (action === "copy") {
      copyText(user.userId).then(function () {
        showToast("تم نسخ User ID", "success");
      }).catch(function () {
        showToast("تعذر نسخ الـ User ID", "error");
      });
      return;
    }

    if (action === "archive") {
      openPage("archive-shell");
      showToast("تم فتح أرشيف اليوزر", "info");
    }
  }

  function renderUserDetails(user) {
    return [
      "<dl>",
      "<div><dt>User ID</dt><dd class=\"mono\">" + escapeHtml(user.userId) + "</dd></div>",
      "<div><dt>الاسم</dt><dd>" + escapeHtml(user.firstName + " " + user.lastName) + "</dd></div>",
      "<div><dt>نوع التأهيل</dt><dd>" + escapeHtml(user.qualification) + "</dd></div>",
      "<div><dt>الهوية</dt><dd>" + escapeHtml(user.idNumber) + "</dd></div>",
      "<div><dt>رقم الهاتف</dt><dd>" + escapeHtml(user.phone) + "</dd></div>",
      "<div><dt>البريد الإلكتروني</dt><dd>" + escapeHtml(user.email) + "</dd></div>",
      "<div><dt>المدينة / السجل</dt><dd>" + escapeHtml(user.city + " / " + user.register) + "</dd></div>",
      "<div><dt>المركبة</dt><dd>" + escapeHtml(user.vehicle + " - " + user.vehicleType) + "</dd></div>",
      "<div><dt>حالة اليوزر</dt><dd>" + escapeHtml(user.jobStatus) + "</dd></div>",
      "<div><dt>حالة المطابقة</dt><dd>" + escapeHtml(user.matchStatus) + "</dd></div>",
      "<div><dt>المستخدم الحالي</dt><dd>" + escapeHtml(user.currentUser) + " / " + escapeHtml(user.currentIqama) + "</dd></div>",
      "<div><dt>نوع العمل</dt><dd>" + escapeHtml(user.workType) + "</dd></div>",
      "<div><dt>المشرف</dt><dd>" + escapeHtml(user.supervisor) + "</dd></div>",
      "</dl>"
    ].join("");
  }

  function renderEditForm(user, action) {
    return [
      '<div class="ui-modal__form">',
      '  <div class="field"><label>User ID</label><input value="' + escapeHtml(user.userId) + '" readonly></div>',
      '  <div class="field"><label>الاسم</label><input value="' + escapeHtml(user.firstName + " " + user.lastName) + '"></div>',
      '  <div class="field"><label>رقم الهاتف</label><input value="' + escapeHtml(user.phone) + '"></div>',
      '  <div class="field"><label>السجل</label><input value="' + escapeHtml(user.register) + '"></div>',
      '  <div class="field"><label>المركبة</label><input value="' + escapeHtml(user.vehicle) + '"></div>',
      '  <div class="field"><label>الملاحظات</label><input value="' + escapeHtml(action === "edit-user" ? "تعديل بيانات اليوزر" : "تعديل بيانات المندوب") + '"></div>',
      "</div>"
    ].join("");
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    return Promise.resolve();
  }

  function wireFileInput(input) {
    if (!input || input.dataset.uiLoaderBound === "1") {
      return;
    }
    input.dataset.uiLoaderBound = "1";
    input.addEventListener("change", function () {
      if (!input.files || !input.files.length) {
        return;
      }
      var selectedFile = input.files[0];
      showLoading("جارٍ تجهيز الملف: " + input.files[0].name);
      window.setTimeout(function () {
        hideLoading();
        setLastUpdate("آخر استيراد");
        showToast("تم اختيار الملف " + input.files[0].name, "success");
      }, 950);
    });
  }

  function buildSampleUsers() {
    return [
      {
        userId: "1782916129257495",
        qualification: "Car - External",
        firstName: "Ahmed",
        lastName: "Salem",
        idNumber: "2356987412",
        phone: "0501122334",
        email: "ahmed.salem@ops.local",
        vehicle: "CAR-1001",
        jobStatus: "يعمل",
        matchStatus: "مطابق",
        city: "جدة",
        register: "Express",
        currentUser: "محمد فيصل",
        currentIqama: "2456987412",
        handoverDate: "2026-07-01",
        returnDate: "",
        vehicleType: "سيارة",
        workType: "خارجي",
        supervisor: "مشرف جدة",
        valid: true,
        orders: 138
      },
      {
        userId: "1782831407480165",
        qualification: "Bike - Sponsor",
        firstName: "Bader",
        lastName: "Ali",
        idNumber: "2356987413",
        phone: "0502233445",
        email: "bader.ali@ops.local",
        vehicle: "BIKE-2003",
        jobStatus: "يعمل",
        matchStatus: "مطابق",
        city: "جدة",
        register: "Albwaba",
        currentUser: "فهد ناصر",
        currentIqama: "2456987413",
        handoverDate: "2026-07-02",
        returnDate: "",
        vehicleType: "دباب",
        workType: "كفالة",
        supervisor: "مشرف جدة",
        valid: true,
        orders: 162
      },
      {
        userId: "1782939100001222",
        qualification: "Car - Per Order",
        firstName: "Faisal",
        lastName: "Omar",
        idNumber: "2356987414",
        phone: "0503344556",
        email: "faisal.omar@ops.local",
        vehicle: "CAR-1004",
        jobStatus: "لا يعمل",
        matchStatus: "اختلاف مدينة",
        city: "الرياض",
        register: "Express",
        currentUser: "سالم علي",
        currentIqama: "2456987414",
        handoverDate: "2026-06-29",
        returnDate: "2026-07-06",
        vehicleType: "سيارة",
        workType: "بالطلب",
        supervisor: "مشرف الرياض",
        valid: false,
        orders: 88
      },
      {
        userId: "1782944100100455",
        qualification: "Bike - External",
        firstName: "Khaled",
        lastName: "Nasser",
        idNumber: "2356987415",
        phone: "0504455667",
        email: "khaled.nasser@ops.local",
        vehicle: "BIKE-2001",
        jobStatus: "مقيد",
        matchStatus: "يحتاج مراجعة",
        city: "الرياض",
        register: "Togary",
        currentUser: "تركي محمد",
        currentIqama: "2456987415",
        handoverDate: "2026-07-03",
        returnDate: "",
        vehicleType: "دباب",
        workType: "خارجي",
        supervisor: "مشرف الرياض",
        valid: false,
        orders: 74
      },
      {
        userId: "1782999000008844",
        qualification: "Car - Sponsor",
        firstName: "Mazen",
        lastName: "Saad",
        idNumber: "2356987416",
        phone: "0505566778",
        email: "mazen.saad@ops.local",
        vehicle: "CAR-1002",
        jobStatus: "مقال",
        matchStatus: "اختلاف سجل",
        city: "جدة",
        register: "FR 3PL",
        currentUser: "خالد وليد",
        currentIqama: "2456987416",
        handoverDate: "2026-06-24",
        returnDate: "2026-07-04",
        vehicleType: "سيارة",
        workType: "نظام الشرائح",
        supervisor: "مشرف جدة",
        valid: false,
        orders: 44
      },
      {
        userId: "1782888000011122",
        qualification: "Bike - First Placement",
        firstName: "Nawaf",
        lastName: "Adel",
        idNumber: "2356987417",
        phone: "0506677889",
        email: "nawaf.adel@ops.local",
        vehicle: "BIKE-2004",
        jobStatus: "يحتاج تسكين",
        matchStatus: "يحتاج مراجعة",
        city: "الرياض",
        register: "Per Order",
        currentUser: "لا يوجد",
        currentIqama: "-",
        handoverDate: "2026-07-07",
        returnDate: "",
        vehicleType: "دباب",
        workType: "بالطلب",
        supervisor: "مشرف الرياض",
        valid: true,
        orders: 0
      },
      {
        userId: "1782777000019191",
        qualification: "Car - Sponsor",
        firstName: "Saleh",
        lastName: "Sami",
        idNumber: "2356987418",
        phone: "0507788990",
        email: "saleh.sami@ops.local",
        vehicle: "CAR-1005",
        jobStatus: "يعمل",
        matchStatus: "مطابق",
        city: "جدة",
        register: "Express",
        currentUser: "يوسف أحمد",
        currentIqama: "2456987418",
        handoverDate: "2026-07-05",
        returnDate: "",
        vehicleType: "سيارة",
        workType: "كفالة",
        supervisor: "مشرف جدة",
        valid: true,
        orders: 121
      },
      {
        userId: "1782666000042424",
        qualification: "Bike - External",
        firstName: "Yousef",
        lastName: "Tariq",
        idNumber: "2356987419",
        phone: "0508899001",
        email: "yousef.tariq@ops.local",
        vehicle: "BIKE-2010",
        jobStatus: "يعمل",
        matchStatus: "مطابق",
        city: "الرياض",
        register: "Albwaba",
        currentUser: "ماجد سعد",
        currentIqama: "2456987419",
        handoverDate: "2026-07-06",
        returnDate: "",
        vehicleType: "دباب",
        workType: "خارجي",
        supervisor: "مشرف الرياض",
        valid: true,
        orders: 147
      }
    ];
  }

  function buildDashboardMetrics(rows) {
    function countBy(field, filter) {
      return rows.filter(function (row) {
        return row[field] === filter;
      }).length;
    }
    function groupBy(field) {
      var map = {};
      rows.forEach(function (row) {
        var key = row[field];
        map[key] = (map[key] || 0) + 1;
      });
      return Object.keys(map).map(function (key) {
        return { label: key, value: map[key] };
      });
    }
    var totalOrders = rows.reduce(function (sum, row) {
      return sum + row.orders;
    }, 0);
    var validUsers = rows.filter(function (row) {
      return row.valid;
    }).length;
    var invalidUsers = rows.length - validUsers;
    var alerts = rows.filter(function (row) {
      return row.matchStatus !== "مطابق" || row.jobStatus === "يحتاج تسكين" || row.jobStatus === "مقيد";
    }).length;
    return {
      totalUsers: rows.length,
      workingUsers: countBy("jobStatus", "يعمل"),
      notWorkingUsers: countBy("jobStatus", "لا يعمل"),
      restrictedUsers: countBy("jobStatus", "مقيد"),
      resignedUsers: countBy("jobStatus", "مقال"),
      jeddahCars: rows.filter(function (row) { return row.city === "جدة" && row.vehicleType === "سيارة"; }).length,
      jeddahBikes: rows.filter(function (row) { return row.city === "جدة" && row.vehicleType === "دباب"; }).length,
      riyadhCars: rows.filter(function (row) { return row.city === "الرياض" && row.vehicleType === "سيارة"; }).length,
      riyadhBikes: rows.filter(function (row) { return row.city === "الرياض" && row.vehicleType === "دباب"; }).length,
      totalOrders: totalOrders,
      invalidUsers: invalidUsers,
      alerts: alerts,
      targetHitRate: rows.length ? Math.round((validUsers / rows.length) * 100) : 0,
      byCity: groupBy("city"),
      byRegister: groupBy("register"),
      byValidity: [
        { label: "صالح", value: validUsers },
        { label: "غير صالح", value: invalidUsers }
      ],
      byVehicleType: groupBy("vehicleType")
    };
  }

  function enhanceTables(root) {
    qsa(".table-wrap table", root).forEach(function (table) {
      var headerRow = getTableHeaderRow(table);
      if (table.dataset.uiEnhanced === "1" || !headerRow || !table.tBodies.length || !table.tBodies[0]) {
        return;
      }
      table.dataset.uiEnhanced = "1";
      var wrap = table.closest(".table-wrap");
      if (!wrap) {
        return;
      }
      var toolBar = document.createElement("div");
      toolBar.className = "table-ui-bar";
      toolBar.innerHTML = [
        '<div class="table-ui-bar__left">',
        '  <div class="table-ui-search"><input type="search" placeholder="بحث داخل الجدول"></div>',
        '  <span class="table-ui-bar__count">0 نتيجة</span>',
        "</div>",
        '<div class="table-ui-bar__right">',
        '  <select data-table-size><option value="25">25</option><option value="50">50</option><option value="100" selected>100</option><option value="200">200</option></select>',
        '  <div class="table-ui-columns"><button type="button" class="ui-btn ui-btn--ghost" data-table-columns-toggle>الأعمدة</button><div class="table-ui-columns-menu"></div></div>',
        '  <button type="button" class="ui-btn ui-btn--ghost" data-table-export>تصدير CSV</button>',
        '  <div class="table-ui-pagination"></div>',
        "</div>"
      ].join("");
      wrap.parentNode.insertBefore(toolBar, wrap);
      var state = {
        search: "",
        page: 1,
        size: 100,
        hiddenColumns: {}
      };
      var searchTimer = null;
      var searchInput = qs("input", qs(".table-ui-search", toolBar));
      var countLabel = qs(".table-ui-bar__count", toolBar);
      var sizeSelect = qs("[data-table-size]", toolBar);
      var pagination = qs(".table-ui-pagination", toolBar);
      var columnMenu = qs(".table-ui-columns-menu", toolBar);

      Array.prototype.slice.call(headerRow.cells).forEach(function (cell, index) {
        var header = String(cell.textContent || "").trim() || "Column " + (index + 1);
        var label = document.createElement("label");
        label.innerHTML = '<input type="checkbox" checked data-column-index="' + index + '"> <span>' + escapeHtml(header) + "</span>";
        columnMenu.appendChild(label);
      });

      function refresh() {
        var rows = Array.prototype.slice.call(table.tBodies[0].rows);
        var filtered = rows.filter(function (row) {
          if (!state.search) {
            return true;
          }
          var text = String(row.textContent || "").replace(/\s+/g, " ").toLowerCase();
          return text.indexOf(state.search) >= 0;
        });
        var totalPages = Math.max(1, Math.ceil(filtered.length / state.size));
        if (state.page > totalPages) {
          state.page = totalPages;
        }
        var start = (state.page - 1) * state.size;
        var end = start + state.size;
        rows.forEach(function (row) {
          row.style.display = "none";
        });
        filtered.slice(start, end).forEach(function (row) {
          row.style.display = "";
        });
        applyColumnVisibility(rows);
        countLabel.textContent = filtered.length + " نتيجة";
        renderPagination(filtered.length, totalPages);
      }

      function applyColumnVisibility(rows) {
        var liveHeaderRow = getTableHeaderRow(table);
        if (!liveHeaderRow) {
          return;
        }
        var allRows = [liveHeaderRow].concat(rows);
        allRows.forEach(function (row) {
          Array.prototype.slice.call(row.cells).forEach(function (cell, index) {
            cell.style.display = state.hiddenColumns[index] ? "none" : "";
          });
        });
      }

      function renderPagination(totalRows, totalPages) {
        pagination.innerHTML = "";
        if (totalRows <= state.size) {
          return;
        }
        var pages = buildPaginationWindow(totalPages, state.page);
        pages.forEach(function (pageIndex) {
          if (pageIndex === "...") {
            var spacer = document.createElement("span");
            spacer.className = "table-ui-pagination__spacer";
            spacer.textContent = "...";
            pagination.appendChild(spacer);
            return;
          }
          var button = document.createElement("button");
          button.type = "button";
          button.textContent = String(pageIndex);
          button.className = pageIndex === state.page ? "active" : "";
          button.addEventListener("click", function () {
            state.page = pageIndex;
            refresh();
          });
          pagination.appendChild(button);
        });
      }

      searchInput.addEventListener("input", function () {
        if (searchTimer) {
          window.clearTimeout(searchTimer);
        }
        searchTimer = window.setTimeout(function () {
          state.search = normalizeText(searchInput.value);
          state.page = 1;
          refresh();
        }, 140);
      });
      sizeSelect.addEventListener("change", function () {
        state.size = Number(sizeSelect.value) || 100;
        state.page = 1;
        refresh();
      });
      columnMenu.addEventListener("change", function (event) {
        var checkbox = event.target;
        if (!checkbox.matches("[data-column-index]")) {
          return;
        }
        state.hiddenColumns[checkbox.getAttribute("data-column-index")] = !checkbox.checked;
        refresh();
      });
      qs("[data-table-export]", toolBar).addEventListener("click", function () {
        exportTableCsv(table);
      });

      var observer = new MutationObserver(function () {
        refresh();
      });
      observer.observe(table.tBodies[0], { childList: true, subtree: true, characterData: true });
      refresh();
    });
  }

  function buildPaginationWindow(totalPages, currentPage) {
    if (totalPages <= 7) {
      return sequence(1, totalPages);
    }
    var pages = [1];
    var start = Math.max(2, currentPage - 1);
    var end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) {
      pages.push("...");
    }
    sequence(start, end).forEach(function (pageIndex) {
      pages.push(pageIndex);
    });
    if (end < totalPages - 1) {
      pages.push("...");
    }
    pages.push(totalPages);
    return pages;
  }

  function sequence(start, end) {
    var values = [];
    for (var index = start; index <= end; index += 1) {
      values.push(index);
    }
    return values;
  }

  function exportTableCsv(table) {
    var headerRow = getTableHeaderRow(table);
    if (!headerRow || !table.tBodies.length || !table.tBodies[0]) {
      showToast("لا يمكن تصدير هذا الجدول قبل اكتمال أعمدته.", "warning");
      return;
    }
    var visibleHeaderCells = Array.prototype.slice.call(headerRow.cells).filter(function (cell) {
      return cell.style.display !== "none";
    });
    var headers = visibleHeaderCells.map(function (cell) {
      return toCsvValue(cell.textContent);
    });
    var rows = Array.prototype.slice.call(table.tBodies[0].rows).filter(function (row) {
      return row.style.display !== "none";
    }).map(function (row) {
      return Array.prototype.slice.call(row.cells).filter(function (cell) {
        return cell.style.display !== "none";
      }).map(function (cell) {
        return toCsvValue(cell.textContent);
      }).join(",");
    });
    var csv = [headers.join(",")].concat(rows).join("\n");
    downloadText("table_export.csv", "\uFEFF" + csv, "text/csv;charset=utf-8");
    showToast("تم تصدير CSV للجدول الحالي", "success");
  }

  function getTableHeaderRow(table) {
    if (!table || !table.tHead || !table.tHead.rows || !table.tHead.rows.length) {
      return null;
    }
    return table.tHead.rows[0];
  }

  function toCsvValue(value) {
    var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function downloadText(filename, content, mimeType) {
    var blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function watchDomChanges() {
    if (window.__keetaDomWatchInitialized) {
      return;
    }
    window.__keetaDomWatchInitialized = true;
    var timer = null;
    var root = qs(".content-shell") || document.body;
    var observer = new MutationObserver(function () {
      if (timer) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(function () {
        var activePage = getActivePageNode();
        enhanceTables(activePage || root);
        qsa('input[type="file"]').forEach(function (input) {
          wireFileInput(input);
        });
        syncActiveMenu();
      }, 140);
    });
    observer.observe(root, { childList: true, subtree: true });
    window.__keetaDomWatchObserver = observer;
  }
})();
