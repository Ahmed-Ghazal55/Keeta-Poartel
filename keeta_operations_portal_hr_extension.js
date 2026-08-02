(function () {
  "use strict";

  var Portal = window.KeetaPortal;
  if (!Portal || !Portal.Runtime || !Portal.RBAC || !Portal.ImportTypes) {
    return;
  }

  var ImportTypes = Portal.ImportTypes;
  var RBAC = Portal.RBAC;
  var ActionDropdown = Portal.ActionDropdown || null;
  var DetailsDrawer = Portal.DetailsDrawer || null;
  var HrComputedFieldsService = Portal.HrComputedFieldsService || null;
  var HrViewModel = Portal.HrViewModel || null;
  var PageRenderController = Portal.PageRenderController || null;
  var riderResolverFacade = Portal.Runtime.riderResolverFacade || null;
  var bootModeState = Portal.BootMode && typeof Portal.BootMode.getState === "function"
    ? Portal.BootMode.getState()
    : { safeMode: false };
  var actionDropdownController = ActionDropdown && typeof ActionDropdown.createGlobalController === "function"
    ? ActionDropdown.createGlobalController(document)
    : null;
  var state = {
    archiveQuery: "",
    archiveType: "all",
    hrCity: "all",
    hrDocumentStatus: "all",
    hrEmployment: "all",
    hrKafalaStatus: "all",
    hrNationality: "all",
    hrQuery: "",
    hrRegister: "all",
    hrStatus: "all",
    hrTab: "hr_master",
    resolverIqama: "",
    riderPlatform: "all",
    riderQuery: "",
    riderStatus: "all"
  };
  var pageController = PageRenderController && typeof PageRenderController.createPageRenderController === "function"
    ? PageRenderController.createPageRenderController({
        debounceMs: 110,
        onRender: renderAll,
        pageIds: ["hr-shell", "rider-master"]
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
    renderAll();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getRuntime() {
    return Portal.Runtime || {};
  }

  function getCurrentUser() {
    var runtime = getRuntime();
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
    var runtime = getRuntime();
    return runtime.dataStore && typeof runtime.dataStore.getAll === "function"
      ? runtime.dataStore.getAll(entityName)
      : [];
  }

  function getCollectionSafe(entityName) {
    try {
      return getCollection(entityName);
    } catch (_error) {
      return [];
    }
  }

  function normalizeText(value) {
    return ImportTypes.normalizeText(value);
  }

  function normalizeRegister(value) {
    return ImportTypes.normalizeRegisterCode(value) || normalizeText(value);
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
    });
  }

  function toArray(value) {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }
    return value ? [value] : [];
  }

  function cityValues(record) {
    return unique(toArray(record && record.cities).concat(toArray(record && record.city)));
  }

  function registerValues(record) {
    return unique(toArray(record && record.registers).concat(toArray(record && record.register)).map(normalizeRegister).filter(Boolean));
  }

  function matchesRegisterList(recordRegisters, selectedRegisters) {
    if (!selectedRegisters.length) {
      return true;
    }
    return recordRegisters.some(function (recordRegister) {
      return selectedRegisters.some(function (selectedRegister) {
        return normalizeRegister(selectedRegister) === normalizeRegister(recordRegister) ||
          ImportTypes.matchUserRegisterScope(selectedRegister, recordRegister) ||
          ImportTypes.matchUserRegisterScope(recordRegister, selectedRegister);
      });
    });
  }

  function matchesScope(record, selectedCities, selectedRegisters, workMode) {
    var cities = cityValues(record);
    var registers = registerValues(record);
    if (selectedCities.length && cities.length && !cities.some(function (city) { return selectedCities.indexOf(city) >= 0; })) {
      return false;
    }
    if (selectedRegisters.length && registers.length && !matchesRegisterList(registers, selectedRegisters)) {
      return false;
    }
    if (workMode && workMode !== "all" && record && record.workMode && normalizeText(record.workMode) !== workMode) {
      return false;
    }
    return true;
  }

  function filterByVisibility(rows) {
    var user = getCurrentUser();
    var context = getOrganizationContext();
    var selectedCities = context.cityScope === "all" ? [] : (context.selectedCities || []).slice();
    var selectedRegisters = context.registerScope === "all" ? [] : (context.selectedRegisters || []).slice();
    return (rows || []).filter(function (record) {
      if (!matchesScope(record, selectedCities, selectedRegisters, context.workMode || "all")) {
        return false;
      }
      if (!user) {
        return true;
      }
      return matchesScope(record, user.cityScope === "all" ? [] : (user.selectedCities || []), user.registerScope === "all" ? [] : (user.selectedRegisters || []), "all");
    });
  }

  function buildScopedData() {
    var hrProfiles = filterByVisibility(getCollection("hrProfiles"));
    var riders = filterByVisibility(getCollection("riders"));
    var externalRiders = filterByVisibility(getCollection("externalRiders"));
    var riderOperationalProfiles = filterByVisibility(getCollection("riderOperationalProfiles")).filter(function (profile) {
      return matchesScope({
        city: profile.preferredCity || "",
        register: profile.preferredRegister || ""
      }, [], [], getOrganizationContext().workMode || "all");
    });
    var riderVehicleUsageHistory = filterByVisibility(getCollection("riderVehicleUsageHistory")).filter(function (item) {
      return matchesScope({
        city: item.city || "",
        register: item.vehicleRegister || item.register || ""
      }, [], [], "all");
    });
    var riderIds = riders.reduce(function (memo, rider) {
      memo[rider.id] = true;
      return memo;
    }, {});
    var identities = getCollection("riderIdentities").filter(function (identity) {
      return riderIds[identity.riderId] || (!identity.riderId && matchesScope(identity, [], [], "all"));
    });
    var platformAccounts = filterByVisibility(getCollection("riderPlatformAccounts")).filter(function (account) {
      return !account.riderId || riderIds[account.riderId] || matchesScope(account, [], [], getOrganizationContext().workMode || "all");
    });
    var archiveEvents = filterByVisibility(getCollection("riderArchiveEvents")).filter(function (eventItem) {
      return !eventItem.riderId || riderIds[eventItem.riderId] || matchesScope(eventItem, [], [], "all");
    });
    var auditLogs = filterByVisibility(getCollection("auditLogs"));
    return {
      archiveEvents: archiveEvents,
      auditLogs: auditLogs,
      externalRiders: externalRiders,
      hrProfiles: hrProfiles,
      identities: identities,
      platformAccounts: platformAccounts,
      riderOperationalProfiles: riderOperationalProfiles,
      riderVehicleUsageHistory: riderVehicleUsageHistory,
      riders: riders
    };
  }

  function getResolverViewModel() {
    if (!riderResolverFacade || typeof riderResolverFacade.resolveRiderByIqama !== "function") {
      return null;
    }
    if (!normalizeText(state.resolverIqama)) {
      return null;
    }
    try {
      return riderResolverFacade.resolveRiderByIqama(state.resolverIqama, {
        allowCreateExternal: true
      });
    } catch (_error) {
      return null;
    }
  }

  function resolverSourceTone(source) {
    var normalized = normalizeText(source);
    if (normalized === "hr") {
      return "green";
    }
    if (normalized === "external") {
      return "blue";
    }
    return "warn";
  }

  function resolverSourceLabel(model) {
    var source = normalizeText(model && model.riderSource);
    if (source === "hr") {
      return "HR / Sponsorship";
    }
    if (source === "external") {
      return "External";
    }
    if (model && model.canCreateExternal) {
      return "New External";
    }
    return "Unknown";
  }

  function renderResolverBadge(model) {
    if (!model) {
      return '<span class="pill">Waiting for iqama</span>';
    }
    return renderPills([resolverSourceLabel(model)], resolverSourceTone(model.riderSource));
  }

  function renderResolverIssueList(items, tone) {
    if (!items || !items.length) {
      return '<div class="note">No visible warnings for the current lookup.</div>';
    }
    return '<div class="note' + (tone ? " " + tone : "") + '"><ul class="resolver-list">' + items.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("") + "</ul></div>";
  }

  function renderResolverIdentityCard(model) {
    if (!model) {
      return '<div class="surface"><h3>Identity</h3><div class="empty">Enter an iqama then use Search to inspect HR or External rider identity.</div></div>';
    }
    var readOnly = normalizeText(model.riderSource) === "hr";
    var identityRecord = model.externalRider || model.hrProfile || {};
    return [
      '<div class="surface">',
      '  <h3>Identity Card</h3>',
      '  <div class="filter-row resolver-meta-row">',
      '    <div class="status-box"><strong>Source</strong><br>' + renderResolverBadge(model) + '</div>',
      '    <div class="status-box"><strong>Iqama</strong><br><span class="mono">' + escapeHtml(model.iqama || "-") + "</span></div>",
      "  </div>",
      '  <form id="externalRiderIdentityForm" class="mini-stack">',
      '    <input type="hidden" id="resolverIdentityMode" value="' + escapeHtml(readOnly ? "readonly" : (model.externalRider ? "update" : "create")) + '">',
      '    <label class="ops-field"><span>Full Name</span><input id="resolverFullName" type="text" value="' + escapeHtml(model.fullName || identityRecord.fullName || identityRecord.fullNameArabic || identityRecord.fullNameEnglish || "") + '"' + (readOnly ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>Nationality</span><input id="resolverNationality" type="text" value="' + escapeHtml(model.nationality || identityRecord.nationality || "") + '"' + (readOnly ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>Contact Phone</span><input id="resolverContactPhone" type="text" value="' + escapeHtml(model.contactPhone || identityRecord.contactPhone || identityRecord.phone || "") + '"' + (readOnly ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>App Phone</span><input id="resolverAppPhone" type="text" value="' + escapeHtml(model.appPhone || identityRecord.appPhone || "") + '"' + (readOnly ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>Sponsor / Register</span><input id="resolverSponsorRegister" type="text" value="' + escapeHtml(model.sponsorRegister || identityRecord.register || identityRecord.registerName || identityRecord.sponsorCompany || "") + '" readonly></label>',
      '    <label class="ops-field"><span>Status</span><input id="resolverIdentityStatus" type="text" value="' + escapeHtml(model.hrStatus || model.externalStatus || identityRecord.status || "") + '" readonly></label>',
      readOnly
        ? '<div class="note">HR riders are read-only here. Update shared operational fields below without creating an External duplicate.</div>'
        : '<div class="actions"><button type="submit" class="btn primary">' + escapeHtml(model.externalRider ? "Update External Rider" : "Create External Rider") + "</button></div>",
      "  </form>",
      "</div>"
    ].join("");
  }

  function renderOperationalProfileCard(model) {
    if (!model) {
      return '<div class="surface"><h3>Operational Profile</h3><div class="empty">Operational profile becomes editable after resolving an HR or External rider.</div></div>';
    }
    var profile = model.operationalProfile || {};
    var disabled = !model.canEditOperationalProfile;
    return [
      '<div class="surface">',
      '  <h3>Operational Profile</h3>',
      '  <form id="resolverOperationalProfileForm" class="mini-stack">',
      '    <label class="ops-field"><span>Contact Phone</span><input id="resolverProfileContactPhone" type="text" value="' + escapeHtml(model.contactPhone || profile.contactPhone || "") + '"' + (disabled ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>App Phone</span><input id="resolverProfileAppPhone" type="text" value="' + escapeHtml(model.appPhone || profile.appPhone || "") + '"' + (disabled ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>IBAN</span><input id="resolverProfileIban" type="text" value="' + escapeHtml(model.iban || profile.iban || "") + '"' + (disabled ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>Gas Card</span><input id="resolverProfileGasCard" type="text" value="' + escapeHtml(model.gasCard || profile.gasCard || "") + '"' + (disabled ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>Tools</span><input id="resolverProfileTools" type="text" value="' + escapeHtml(model.tools || profile.tools || "") + '"' + (disabled ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>Preferred City</span><input id="resolverProfilePreferredCity" type="text" value="' + escapeHtml(model.preferredCity || profile.preferredCity || "") + '"' + (disabled ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>Preferred Register</span><input id="resolverProfilePreferredRegister" type="text" value="' + escapeHtml(model.preferredRegister || profile.preferredRegister || "") + '"' + (disabled ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>Preferred Platform</span><input id="resolverProfilePreferredPlatform" type="text" value="' + escapeHtml(profile.preferredPlatform || "") + '"' + (disabled ? " readonly" : "") + "></label>",
      '    <label class="ops-field"><span>Notes</span><textarea id="resolverProfileNotes" rows="3"' + (disabled ? " readonly" : "") + ">" + escapeHtml(profile.notes || "") + "</textarea></label>",
      disabled
        ? '<div class="note">Create or resolve the rider identity before saving operational profile data.</div>'
        : '<div class="actions"><button type="submit" class="btn primary">Save Operational Profile</button></div>',
      "  </form>",
      "</div>"
    ].join("");
  }

  function renderCurrentLinksCard(model) {
    if (!model) {
      return '<div class="surface"><h3>Current Links</h3><div class="empty">No rider lookup is active.</div></div>';
    }
    var assignment = model.currentAssignment || {};
    var vehicleUsage = model.currentVehicleUsage || {};
    return [
      '<div class="surface">',
      '  <h3>Current Links</h3>',
      '  <div class="status-box"><strong>Current User</strong><br>' + escapeHtml(model.currentUserSummary || "-") + "</div>",
      '  <div class="status-box"><strong>Current Assignment</strong><br>' + escapeHtml(assignment.id || assignment.assignmentId || "-") + "</div>",
      '  <div class="status-box"><strong>Vehicle Summary</strong><br>' + escapeHtml(model.currentVehicleSummary || "-") + "</div>",
      '  <div class="status-box"><strong>Vehicle Usage Status</strong><br>' + escapeHtml(vehicleUsage.status || (vehicleUsage.active ? "active" : "-")) + "</div>",
      '  <div class="status-box"><strong>Latest Active Period</strong><br>' + escapeHtml([(vehicleUsage.startDate || "-"), (vehicleUsage.endDate || "active")].join(" → ")) + "</div>",
      '  <div class="status-box"><strong>Vehicle Source</strong><br>' + escapeHtml(vehicleUsage.vehicleSource || vehicleUsage.vehicleType || "-") + "</div>",
      "  </div>"
    ].join("");
  }

  function renderExternalRidersTable(scoped) {
    var rows = scoped.externalRiders.filter(function (item) {
      var text = [
        item.fullName,
        item.iqama,
        item.contactPhone,
        item.appPhone,
        item.city,
        item.register
      ].join(" ");
      return !state.riderQuery || text.toLowerCase().indexOf(state.riderQuery.toLowerCase()) >= 0;
    });
    return [
      '<div class="surface">',
      '  <div class="filter-row">',
      '    <div class="status-box"><strong>External Riders</strong><br>' + escapeHtml(String(scoped.externalRiders.length)) + "</div>",
      '    <div class="actions"><button type="button" class="btn secondary" data-hr-import-route="external_riders_import">Import External Riders</button></div>',
      "  </div>",
      '  <div class="table-wrap" style="margin-top:12px">',
      "    <table>",
      "      <thead><tr><th>Iqama</th><th>Name</th><th>Contact</th><th>App Phone</th><th>City</th><th>Register</th><th>Actions</th></tr></thead>",
      '      <tbody>' + (rows.length ? rows.map(function (item) {
        return "<tr>" +
          '<td class="mono">' + escapeHtml(item.iqama || "-") + "</td>" +
          "<td>" + escapeHtml(item.fullName || "-") + "</td>" +
          '<td class="mono">' + escapeHtml(item.contactPhone || "-") + "</td>" +
          '<td class="mono">' + escapeHtml(item.appPhone || "-") + "</td>" +
          "<td>" + escapeHtml(item.city || "-") + "</td>" +
          "<td>" + escapeHtml(item.register || "-") + "</td>" +
          '<td><button type="button" class="btn light rider-resolver-load" data-rider-iqama="' + escapeHtml(item.iqama || "") + '">Resolve</button></td>' +
          "</tr>";
      }).join("") : '<tr><td colspan="7"><div class="empty">No external riders match the current query.</div></td></tr>') + "</tbody>",
      "    </table>",
      "  </div>",
      "</div>"
    ].join("");
  }

  function groupBy(list, key) {
    return (list || []).reduce(function (memo, item) {
      var value = item && item[key] ? item[key] : "";
      memo[value] = memo[value] || [];
      memo[value].push(item);
      return memo;
    }, {});
  }

  function indexBy(list, key) {
    return (list || []).reduce(function (memo, item) {
      if (item && item[key]) {
        memo[item[key]] = item;
      }
      return memo;
    }, {});
  }

  function isExpired(value) {
    var text = normalizeText(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) && text < new Date().toISOString().slice(0, 10);
  }

  function statusLabel(value) {
    var map = {
      active: "Active",
      exited: "Exited",
      inactive: "Inactive",
      never_worked: "Never Worked",
      not_started: "Not Started",
      not_working: "Not Working",
      previously_worked: "Previously Worked",
      under_review: "Under Review",
      working: "Working"
    };
    return map[value] || (value || "Unknown");
  }

  function employmentLabel(value) {
    var map = {
      freelancer: "External",
      sponsorship: "Sponsorship",
      unknown: "Unknown"
    };
    return map[value] || (value || "Unknown");
  }

  function renderKpis(items) {
    return '<div class="kpi-grid">' + items.map(function (item) {
      return '<div class="kpi' + (item.className ? " " + item.className : "") + '">' +
        "<b>" + escapeHtml(item.label) + "</b>" +
        "<strong>" + escapeHtml(String(item.value)) + "</strong>" +
        "</div>";
    }).join("") + "</div>";
  }

  function renderPills(values, tone) {
    if (!values || !values.length) {
      return '<span class="pill">-</span>';
    }
    return values.map(function (value) {
      return '<span class="pill' + (tone ? " " + tone : "") + '">' + escapeHtml(value) + "</span>";
    }).join(" ");
  }

  function renderEmptyState(title, body) {
    return '<div class="card">' +
      '<span class="eyebrow">Prompt 4</span>' +
      '<h2 class="section-title">' + escapeHtml(title) + "</h2>" +
      '<div class="empty">' + escapeHtml(body) + "</div>" +
      "</div>";
  }

  function renderActionDropdownCell(actionId, entityId, label, fallbackLabel, contextData) {
    if (ActionDropdown && typeof ActionDropdown.renderActionDropdown === "function") {
      return ActionDropdown.renderActionDropdown({
        dropdownId: "hr_" + escapeHtml(actionId + "_" + (entityId || "row")),
        label: "العمليات",
        contextData: mergeObjects({ module: "hr" }, contextData || {}),
        actions: [
          {
            actionId: actionId,
            label: label
          }
        ]
      });
    }
    if (contextData && contextData["hr-profile-id"]) {
      return '<button class="btn light hr-profile-detail" data-hr-profile-id="' + escapeHtml(contextData["hr-profile-id"]) + '">' + escapeHtml(fallbackLabel || "Details") + "</button>";
    }
    return '<button class="btn light rider-detail-btn" data-rider-id="' + escapeHtml((contextData && contextData["rider-id"]) || entityId || "") + '">' + escapeHtml(fallbackLabel || "Details") + "</button>";
  }

  function countMatching(list, predicate) {
    return (list || []).filter(predicate).length;
  }

  function mergeObjects(target) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
      Object.keys(source || {}).forEach(function (key) {
        target[key] = source[key];
      });
    });
    return target;
  }

  function getHrTemplateColumns() {
    if (Portal.ImportTemplateRegistry && typeof Portal.ImportTemplateRegistry.getTemplate === "function") {
      var templateDefinition = Portal.ImportTemplateRegistry.getTemplate("hr_master");
      if (templateDefinition && Array.isArray(templateDefinition.displayColumns) && templateDefinition.displayColumns.length) {
        return templateDefinition.displayColumns.slice();
      }
    }
    return [
      { fieldName: "sequence", header: "تسلسل" },
      { fieldName: "employeeNumber", header: "الرقم الوظيفى" },
      { fieldName: "iqama", header: "رقم الهوية" },
      { fieldName: "fullName", header: "الاسم" },
      { fieldName: "startDate", header: "تاريخ التعيين" },
      { fieldName: "nationality", header: "الجنسية" },
      { fieldName: "professionAtIqama", header: "المهنه بالاقامه" },
      { fieldName: "jobTitle", header: "المسمي الوظيفي" },
      { fieldName: "branch", header: "الفرع" },
      { fieldName: "residencyExpiry", header: "تاريخ انتهاء الاقامة" },
      { fieldName: "residencyStatus", header: "الصلاحية" },
      { fieldName: "sponsorId", header: "هوية صاحب العمل" },
      { fieldName: "registerName", header: "اسم السجل" },
      { fieldName: "licenseType", header: "نوع الرخصة" },
      { fieldName: "licenseTypeSecondary", header: "نوع الرخصة" },
      { fieldName: "kafalaStatus", header: "حالة الكفالة" },
      { fieldName: "riderStatus", header: "حالة المندوب" },
      { fieldName: "notes", header: "الملاحظات" },
      { fieldName: "licenseState", header: "حاله الرخصه" },
      { fieldName: "driverCardSummary", header: "بطاقة السائق" },
      { fieldName: "workApplicationsSummary", header: "تطبيق العمل" },
      { fieldName: "keetaCityRegister", header: "مدينة و سجل ايدي كيتا" },
      { fieldName: "keetaId", header: "ايدي كيتا" },
      { fieldName: "hungerId", header: "ايدي هنقر" },
      { fieldName: "amazonId", header: "ايدي امازون" },
      { fieldName: "ninjaId", header: "ايدي نينجا" },
      { fieldName: "jahezId", header: "ايدي جاهز" },
      { fieldName: "chefzId", header: "ايدي شفز" }
    ];
  }

  function buildHrComputedDataSources(scoped) {
    return {
      dashboardUsers: filterByVisibility(getCollectionSafe("dashboardUsers")),
      driverCards: filterByVisibility(getCollectionSafe("driverCards")),
      riderPlatformAccounts: (scoped && scoped.platformAccounts || []).slice(),
      riders: (scoped && scoped.riders || []).slice()
    };
  }

  function buildHrFallbackRow(hrProfile) {
    hrProfile = hrProfile || {};
    return {
      sequence: normalizeText(hrProfile.sequence || hrProfile.rowNumber),
      employeeNumber: normalizeText(hrProfile.employeeId),
      iqama: normalizeText(hrProfile.iqama),
      fullName: normalizeText(hrProfile.fullNameArabic || hrProfile.fullNameEnglish),
      startDate: normalizeText(hrProfile.startDate),
      nationality: normalizeText(hrProfile.nationality),
      professionAtIqama: normalizeText(hrProfile.professionAtIqama),
      jobTitle: normalizeText(hrProfile.jobTitle),
      branch: normalizeText(hrProfile.branch || hrProfile.city),
      residencyExpiry: normalizeText(hrProfile.residencyExpiry || hrProfile.licenseExpiry),
      residencyStatus: normalizeText(hrProfile.residencyStatus),
      sponsorId: normalizeText(hrProfile.sponsorId),
      registerName: normalizeText(hrProfile.registerName || hrProfile.register || hrProfile.sponsorCompany),
      licenseType: normalizeText(hrProfile.licenseType),
      licenseTypeSecondary: normalizeText(hrProfile.licenseTypeSecondary || hrProfile.licenseType),
      kafalaStatus: normalizeText(hrProfile.kafalaStatus || hrProfile.employmentType),
      riderStatus: normalizeText(hrProfile.hrStatus),
      notes: normalizeText(hrProfile.notes),
      licenseState: normalizeText(hrProfile.licenseState),
      driverCardSummary: normalizeText(hrProfile.driverCardSummary) || "لم يتم اصدار بطاقة سائق بعد",
      workApplicationsSummary: normalizeText(hrProfile.workApplication) || "لا توجد بيانات تطبيقات",
      keetaCityRegister: normalizeText(hrProfile.keetaCityRegister) || "لا يوجد ايدي",
      keetaId: normalizeText(hrProfile.keetaId) || "لا يوجد ايدي",
      hungerId: normalizeText(hrProfile.hungerId) || "لا يوجد ايدي",
      amazonId: normalizeText(hrProfile.amazonId) || "لا يوجد ايدي",
      ninjaId: normalizeText(hrProfile.ninjaId) || "لا يوجد ايدي",
      jahezId: normalizeText(hrProfile.jahezId) || "لا يوجد ايدي",
      chefzId: normalizeText(hrProfile.chefzId) || "لا يوجد ايدي"
    };
  }

  function buildHrDisplayRow(profile, scoped) {
    var dataSources = buildHrComputedDataSources(scoped);
    if (HrComputedFieldsService && typeof HrComputedFieldsService.computeHrDisplayRow === "function") {
      return HrComputedFieldsService.computeHrDisplayRow(profile, dataSources);
    }
    return buildHrFallbackRow(profile);
  }

  function buildHrDisplayRows(scoped) {
    return (scoped && scoped.hrProfiles || []).map(function (profile) {
      var displayRow = buildHrDisplayRow(profile, scoped);
      var fullText = Object.keys(displayRow || {}).map(function (key) {
        return normalizeText(displayRow[key]);
      }).join(" ");
      return mergeObjects({}, displayRow, {
        __employmentType: normalizeText(profile.employmentType),
        __fullText: fullText,
        __hrStatus: normalizeText(profile.hrStatus),
        __profileId: profile.id
      });
    });
  }

  function isHrMonoField(fieldName) {
    return [
      "employeeNumber",
      "iqama",
      "startDate",
      "residencyExpiry",
      "sponsorId",
      "keetaId",
      "hungerId",
      "amazonId",
      "ninjaId",
      "jahezId",
      "chefzId"
    ].indexOf(fieldName) >= 0;
  }

  function renderHrCell(fieldName, value) {
    var text = String(value == null || value === "" ? "-" : value);
    var content = escapeHtml(text).replace(/\n/g, "<br>");
    return "<td" + (isHrMonoField(fieldName) ? ' class="mono"' : "") + ">" + content + "</td>";
  }

  function renderHrProfileSummary(profile, scoped) {
    var row = buildHrDisplayRow(profile, scoped);
    return '<div class="list">' +
      '<div class="list-item"><span>تاريخ التعيين</span><strong>' + escapeHtml(row.startDate || "-") + "</strong></div>" +
      '<div class="list-item"><span>الفرع / السجل</span><strong>' + escapeHtml([row.branch || "-", row.registerName || "-"].join(" / ")) + "</strong></div>" +
      '<div class="list-item"><span>بطاقة السائق</span><strong>' + escapeHtml(row.driverCardSummary || "-") + "</strong></div>" +
      '<div class="list-item"><span>تطبيقات العمل</span><strong>' + escapeHtml(row.workApplicationsSummary || "-") + "</strong></div>" +
      '<div class="list-item"><span>Keeta City/Register</span><strong>' + escapeHtml(row.keetaCityRegister || "-") + "</strong></div>" +
      '<div class="list-item"><span>Keeta / Hunger / Amazon</span><strong>' + escapeHtml([row.keetaId || "-", row.hungerId || "-", row.amazonId || "-"].join(" | ")) + "</strong></div>" +
      '<div class="list-item"><span>Ninja / Jahez / Chefz</span><strong>' + escapeHtml([row.ninjaId || "-", row.jahezId || "-", row.chefzId || "-"].join(" | ")) + "</strong></div>" +
      "</div>";
  }

  function normalizeHrTabRoute(subPage) {
    if (HrViewModel && typeof HrViewModel.normalizeHrRoute === "function") {
      return HrViewModel.normalizeHrRoute(subPage);
    }
    var key = normalizeText(subPage).toLowerCase();
    var map = {
      documents: "documents",
      "hr-archive": "hr_archive",
      hr_archive: "hr_archive",
      "hr-master": "hr_master",
      hr_master: "hr_master",
      inactive: "inactive_hr_riders",
      kafala: "kafala_status",
      kafala_status: "kafala_status",
      "kafala-status": "kafala_status"
    };
    return map[key] || "hr_master";
  }

  function buildHrCleanupRows(scoped) {
    if (!HrViewModel || typeof HrViewModel.buildHrRows !== "function") {
      return [];
    }
    return HrViewModel.buildHrRows({
      assignmentHistory: getCollectionSafe("assignmentHistory"),
      assignments: getCollectionSafe("assignments"),
      dashboardUsers: getCollectionSafe("dashboardUsers"),
      hrProfiles: scoped.hrProfiles,
      riderOperationalProfiles: scoped.riderOperationalProfiles,
      terminations: getCollectionSafe("terminations")
    });
  }

  function buildHrFilterOptions(rows, fieldName) {
    return unique((rows || []).map(function (row) {
      return normalizeText(row && row[fieldName]);
    }).filter(Boolean)).sort();
  }

  function renderHrTabButtons(activeTab, rows) {
    var tabs = HrViewModel && typeof HrViewModel.listHrTabs === "function"
      ? HrViewModel.listHrTabs()
      : [];
    return '<div class="ops-tabs" style="margin-top:16px">' + tabs.map(function (tab) {
      var count = HrViewModel && typeof HrViewModel.filterHrRows === "function"
        ? HrViewModel.filterHrRows(rows, {}, tab.key).length
        : rows.length;
      return '<button type="button" class="ops-tab' + (activeTab === tab.key ? " is-active" : "") + '" data-hr-tab="' + escapeHtml(tab.key) + '">' +
        escapeHtml(tab.label) + ' <span>' + escapeHtml(String(count)) + "</span></button>";
    }).join("") + "</div>";
  }

  function renderHrSelect(id, currentValue, options, labelForAll) {
    return '<select id="' + escapeHtml(id) + '">' +
      '<option value="all">' + escapeHtml(labelForAll) + "</option>" +
      (options || []).map(function (value) {
        return '<option value="' + escapeHtml(value) + '"' + (value === currentValue ? " selected" : "") + ">" + escapeHtml(value) + "</option>";
      }).join("") +
      "</select>";
  }

  function renderHrStatusPill(value, tone) {
    return '<span class="pill' + (tone ? " " + tone : "") + '">' + escapeHtml(value || "-") + "</span>";
  }

  function renderHrLinkedSummary(row) {
    return [
      renderHrStatusPill(String(row.linkedDashboardUserCount || 0) + " users", row.linkedDashboardUserCount ? "blue" : ""),
      renderHrStatusPill(String(row.currentActualAssignmentCount || 0) + " actual", row.currentActualAssignmentCount ? "" : "gold")
    ].join(" ");
  }

  function renderHrPage(scoped) {
    var section = byId("page-hr-shell");
    var user = getCurrentUser();
    if (!section) {
      return;
    }
    if (user && !RBAC.canPerform(user, "hr.view")) {
      section.innerHTML = renderEmptyState("HR Master", "You do not have permission to view HR master data in the current session.");
      return;
    }

    var allRows = buildHrCleanupRows(scoped);
    var activeTab = normalizeHrTabRoute(state.hrTab);
    var rows = HrViewModel && typeof HrViewModel.filterHrRows === "function"
      ? HrViewModel.filterHrRows(allRows, {
          city: state.hrCity,
          documentStatus: state.hrDocumentStatus,
          employmentStatus: state.hrStatus,
          kafalaStatus: state.hrKafalaStatus,
          nationality: state.hrNationality,
          query: state.hrQuery,
          register: state.hrRegister
        }, activeTab)
      : [];
    var kpis = HrViewModel && typeof HrViewModel.buildHrKpis === "function"
      ? HrViewModel.buildHrKpis(rows)
      : {
          active: 0,
          currentlyWorking: 0,
          inactive: 0,
          linkedDashboardUsers: 0,
          missingDocuments: 0,
          needsReview: 0,
          offKafala: 0,
          onKafala: 0,
          totalHrRiders: 0
        };

    if (!allRows.length) {
      section.innerHTML = renderEmptyState("HR Master", "No HR profiles are stored yet. Import البوابة المقبلة.xlsx from Import Center to build the master data.");
      return;
    }

    var cityOptions = buildHrFilterOptions(allRows, "city");
    var registerOptions = buildHrFilterOptions(allRows, "register");
    var nationalityOptions = buildHrFilterOptions(allRows, "nationality");

    section.innerHTML = [
      '<div class="card">',
      '  <span class="eyebrow">Prompt 8.11</span>',
      '  <h2 class="section-title">HR Support Module</h2>',
      '  <div class="note">HR riders remain separate from external riders and from the actual rider currently working on a dashboard user. Use the tabs below to review company riders, document health, and archive-linked records without creating any mutations.</div>',
      renderKpis([
        { label: "إجمالي HR Riders", value: kpis.totalHrRiders },
        { label: "نشط", value: kpis.active, className: "good" },
        { label: "غير نشط", value: kpis.inactive, className: kpis.inactive ? "warn" : "" },
        { label: "على الكفالة", value: kpis.onKafala, className: "good" },
        { label: "خارج الكفالة", value: kpis.offKafala, className: kpis.offKafala ? "warn" : "" },
        { label: "مستندات ناقصة", value: kpis.missingDocuments, className: kpis.missingDocuments ? "bad" : "" },
        { label: "مرتبط بيوزر داشبورد", value: kpis.linkedDashboardUsers },
        { label: "يعمل فعليًا الآن", value: kpis.currentlyWorking, className: kpis.currentlyWorking ? "good" : "" },
        { label: "يحتاج مراجعة", value: kpis.needsReview, className: kpis.needsReview ? "warn" : "" }
      ]),
      renderHrTabButtons(activeTab, allRows),
      '  <div class="filter-row" style="margin-top:12px">',
      '    <div class="search-box"><input id="hrMasterSearch" type="search" placeholder="Search by name / iqama / mobile / dashboard user" value="' + escapeHtml(state.hrQuery) + '"></div>',
      renderHrSelect("hrMasterStatusFilter", state.hrStatus, ["active", "inactive", "exited", "under_review"], "All Employment Statuses"),
      renderHrSelect("hrMasterRegisterFilter", state.hrRegister, registerOptions, "All Registers"),
      renderHrSelect("hrMasterCityFilter", state.hrCity, cityOptions, "All Cities"),
      '  </div>',
      '  <div class="filter-row">',
      renderHrSelect("hrMasterKafalaFilter", state.hrKafalaStatus, ["on_kafala", "off_kafala", "unknown"], "All Kafala States"),
      renderHrSelect("hrMasterNationalityFilter", state.hrNationality, nationalityOptions, "All Nationalities"),
      renderHrSelect("hrMasterDocumentFilter", state.hrDocumentStatus, ["complete", "review", "missing", "expired"], "All Document Statuses"),
      '    <div class="status-box">Visible rows: ' + escapeHtml(String(rows.length)) + "</div>",
      "  </div>",
      '  <div class="table-wrap" style="margin-top:12px">',
      "    <table>",
      "      <thead><tr><th>Name</th><th>Iqama</th><th>Mobile</th><th>City</th><th>Register</th><th>Status</th><th>Kafala</th><th>Documents</th><th>Links</th><th>Warnings</th><th>Actions</th></tr></thead>",
      '      <tbody>' + (rows.length ? rows.map(function (row) {
        return "<tr>" +
          "<td>" + escapeHtml(row.name || "-") + "</td>" +
          '<td class="mono">' + escapeHtml(row.iqama || "-") + "</td>" +
          '<td class="mono">' + escapeHtml(row.mobile || "-") + "</td>" +
          "<td>" + escapeHtml(row.city || "-") + "</td>" +
          "<td>" + escapeHtml(row.registerName || row.register || "-") + "</td>" +
          "<td>" + renderHrStatusPill(statusLabel(row.employmentStatus), row.isActive ? "green" : "gold") + "</td>" +
          "<td>" + renderHrStatusPill(row.kafalaStatus, row.isOnKafala ? "green" : "gold") + "</td>" +
          "<td>" + renderHrStatusPill(row.documentStatus, row.isDocumentMissing ? "red" : (row.documentStatus === "review" ? "gold" : "blue")) + "</td>" +
          "<td>" + renderHrLinkedSummary(row) + "</td>" +
          "<td>" + renderPills((row.warningCodes || []).slice(0, 3), row.warningCodes && row.warningCodes.length ? "gold" : "") + "</td>" +
          '<td>' + renderActionDropdownCell("hr_profile", row.profileId, "عرض الملف", "عرض الملف", { "hr-profile-id": row.profileId }) + '</td>' +
          "</tr>";
      }).join("") : '<tr><td colspan="11"><div class="empty">No HR rows match the current filters.</div></td></tr>') + "</tbody>",
      "    </table>",
      "  </div>",
      "</div>"
    ].join("");
    if (Portal.UIShell && typeof Portal.UIShell.enhanceTables === "function") {
      Portal.UIShell.enhanceTables(section);
    }

    byId("hrMasterStatusFilter").value = state.hrStatus;
    byId("hrMasterRegisterFilter").value = state.hrRegister;
    byId("hrMasterCityFilter").value = state.hrCity;
    byId("hrMasterKafalaFilter").value = state.hrKafalaStatus;
    byId("hrMasterNationalityFilter").value = state.hrNationality;
    byId("hrMasterDocumentFilter").value = state.hrDocumentStatus;
  }

  function renderRiderPage(scoped) {
    var section = byId("page-rider-master");
    var user = getCurrentUser();
    var resolverModel = getResolverViewModel();
    if (!section) {
      return;
    }
    if (user && !RBAC.canPerform(user, "operations.view")) {
      section.innerHTML = renderEmptyState("Rider Master", "You do not have permission to view Rider Master in the current session.");
      return;
    }
    var accountsByRider = groupBy(scoped.platformAccounts, "riderId");
    var rows = scoped.riders.filter(function (rider) {
      var matchesQuery = !state.riderQuery || [
        rider.id,
        rider.displayName,
        rider.primaryIqama,
        (rider.phones || []).join(" "),
        (rider.cities || []).join(" "),
        (rider.registers || []).join(" ")
      ].join(" ").toLowerCase().indexOf(state.riderQuery.toLowerCase()) >= 0;
      var matchesStatus = state.riderStatus === "all" || rider.currentWorkStatus === state.riderStatus;
      var matchesPlatform = state.riderPlatform === "all" || (rider.platforms || []).indexOf(state.riderPlatform) >= 0;
      return matchesQuery && matchesStatus && matchesPlatform;
    });

    if (!scoped.riders.length) {
      section.innerHTML = renderEmptyState("Rider Master", "No riders are stored yet. Save an HR workbook import first to generate Rider Master, identities, accounts, and archive events.");
      return;
    }

    section.innerHTML = [
      '<div class="card">',
      '  <span class="eyebrow">Prompt 4</span>',
      '  <h2 class="section-title">Rider Master</h2>',
      '  <div class="note">Every rider is a unified operational identity. One iqama can link to multiple platforms and user IDs without collapsing unrelated riders by name only.</div>',
      renderKpis([
        { label: "Total Riders", value: scoped.riders.length },
        { label: "Working", value: countMatching(scoped.riders, function (item) { return item.currentWorkStatus === "working"; }), className: "good" },
        { label: "Not Working", value: countMatching(scoped.riders, function (item) { return item.currentWorkStatus === "not_working"; }) },
        { label: "Previously Worked", value: countMatching(scoped.riders, function (item) { return item.currentWorkStatus === "previously_worked"; }) },
        { label: "Never Worked", value: countMatching(scoped.riders, function (item) { return item.currentWorkStatus === "never_worked"; }) },
        { label: "Sponsorship", value: countMatching(scoped.riders, function (item) { return item.employmentType === "sponsorship"; }) },
        { label: "External", value: countMatching(scoped.riders, function (item) { return item.employmentType === "freelancer"; }) },
        { label: "Multi Platform", value: countMatching(scoped.riders, function (item) { return (item.platforms || []).length > 1; }), className: "warn" }
      ]),
      '  <div class="surface" style="margin-top:16px">',
      '    <div class="filter-row">',
      '      <div><h3 style="margin:0;color:var(--navy)">Rider Resolver</h3><div class="note" style="margin-top:8px">Search by iqama. HR riders stay read-only in identity, External riders can be edited, and unknown riders can be created safely as External only.</div></div>',
      '      <div class="actions"><button type="button" class="btn secondary" data-hr-import-route="external_riders_import">Import External Riders</button></div>',
      "    </div>",
      '    <form id="riderResolverSearchForm" class="filter-row" style="margin-top:12px">',
      '      <div class="search-box"><input id="riderResolverIqama" type="search" placeholder="Search by iqama" value="' + escapeHtml(state.resolverIqama) + '"></div>',
      '      <button type="submit" class="btn primary">Search / Verify</button>',
      '      <div class="status-box"><strong>Result</strong><br>' + renderResolverBadge(resolverModel) + "</div>",
      "    </form>",
      renderResolverIssueList((resolverModel && resolverModel.warnings || []).concat(resolverModel && resolverModel.issues || []), resolverModel && resolverModel.issues && resolverModel.issues.length ? "warn" : ""),
      '    <div class="grid grid-2" style="margin-top:12px">',
      renderResolverIdentityCard(resolverModel),
      renderOperationalProfileCard(resolverModel),
      renderCurrentLinksCard(resolverModel),
      renderExternalRidersTable(scoped),
      "    </div>",
      "  </div>",
      '  <div class="filter-row" style="margin-top:12px">',
      '    <div class="search-box"><input id="riderMasterSearch" type="search" placeholder="Search by rider, iqama, phone, register" value="' + escapeHtml(state.riderQuery) + '"></div>',
      '    <select id="riderMasterStatusFilter"><option value="all">All Work Statuses</option><option value="working">Working</option><option value="not_working">Not Working</option><option value="previously_worked">Previously Worked</option><option value="never_worked">Never Worked</option><option value="under_review">Under Review</option></select>',
      "  </div>",
      '  <div class="filter-row">',
      '    <select id="riderMasterPlatformFilter"><option value="all">All Platforms</option><option value="keeta">Keeta</option><option value="ninja">Ninja</option><option value="jahez">Jahez</option><option value="chefz">Chefz</option><option value="amazon">Amazon</option><option value="hungerstation">HungerStation</option></select>',
      '    <div class="status-box">Visible riders: ' + escapeHtml(String(rows.length)) + "</div>",
      "  </div>",
      '  <div class="table-wrap" style="margin-top:12px">',
      "    <table>",
      "      <thead><tr><th>Rider ID</th><th>Name</th><th>Primary Iqama</th><th>Phones</th><th>Cities</th><th>Registers</th><th>Platforms</th><th>Accounts</th><th>Work Status</th><th>Risk Flags</th><th>Actions</th></tr></thead>",
      '      <tbody>' + (rows.length ? rows.map(function (rider) {
        var accountCount = (accountsByRider[rider.id] || []).length;
        return "<tr>" +
          "<td class=\"mono\">" + escapeHtml(rider.id) + "</td>" +
          "<td>" + escapeHtml(rider.displayName || "-") + "</td>" +
          "<td class=\"mono\">" + escapeHtml(rider.primaryIqama || "-") + "</td>" +
          "<td class=\"mono\">" + escapeHtml((rider.phones || []).join(" / ") || "-") + "</td>" +
          "<td>" + escapeHtml((rider.cities || []).join(" / ") || "-") + "</td>" +
          "<td>" + escapeHtml((rider.registers || []).join(" / ") || "-") + "</td>" +
          "<td>" + renderPills((rider.platforms || []).map(String), "blue") + "</td>" +
          "<td>" + escapeHtml(String(accountCount)) + "</td>" +
          "<td>" + escapeHtml(statusLabel(rider.currentWorkStatus)) + "</td>" +
          "<td>" + renderPills((rider.riskFlags || []).slice(0, 3), "red") + "</td>" +
          '<td>' + renderActionDropdownCell("rider", rider.id, "عرض المندوب", "عرض المندوب", { "rider-id": rider.id }) + '</td>' +
          "</tr>";
      }).join("") : '<tr><td colspan="11"><div class="empty">No riders match the current filters.</div></td></tr>') + "</tbody>",
      "    </table>",
      "  </div>",
      "</div>"
    ].join("");
    if (Portal.UIShell && typeof Portal.UIShell.enhanceTables === "function") {
      Portal.UIShell.enhanceTables(section);
    }

    byId("riderMasterStatusFilter").value = state.riderStatus;
    byId("riderMasterPlatformFilter").value = state.riderPlatform;
  }

  function renderArchivePage(scoped) {
    var section = byId("page-archive-shell");
    var user = getCurrentUser();
    if (!section) {
      return;
    }
    if (user && !RBAC.canPerform(user, "archive.view")) {
      section.innerHTML = renderEmptyState("Archive", "You do not have permission to view rider archive data in the current session.");
      return;
    }
    var ridersById = indexBy(scoped.riders, "id");
    var conflictRows = scoped.auditLogs.filter(function (item) {
      return item.action === "rider_conflict_detected";
    });
    var rows = scoped.archiveEvents.filter(function (eventItem) {
      var rider = ridersById[eventItem.riderId] || {};
      var matchesQuery = !state.archiveQuery || [
        eventItem.riderId,
        eventItem.eventType,
        eventItem.note,
        rider.displayName
      ].join(" ").toLowerCase().indexOf(state.archiveQuery.toLowerCase()) >= 0;
      var matchesType = state.archiveType === "all" || eventItem.eventType === state.archiveType;
      return matchesQuery && matchesType;
    });

    if (!scoped.archiveEvents.length) {
      section.innerHTML = renderEmptyState("Archive", "No rider archive events are available yet. They are generated automatically when HR workbook imports are saved.");
      return;
    }

    section.innerHTML = [
      '<div class="grid grid-2">',
      '  <div class="card">',
      '    <span class="eyebrow">Prompt 4</span>',
      '    <h2 class="section-title">Rider Archive Timeline</h2>',
      renderKpis([
        { label: "Total Events", value: scoped.archiveEvents.length },
        { label: "Imported", value: countMatching(scoped.archiveEvents, function (item) { return item.eventType === "imported"; }) },
        { label: "Status Changes", value: countMatching(scoped.archiveEvents, function (item) { return item.eventType === "status_changed"; }) },
        { label: "License Updates", value: countMatching(scoped.archiveEvents, function (item) { return item.eventType === "license_updated"; }) },
        { label: "Health Card Updates", value: countMatching(scoped.archiveEvents, function (item) { return item.eventType === "health_card_updated"; }) },
        { label: "Conflicts Logged", value: conflictRows.length, className: "bad" },
        { label: "Distinct Riders", value: unique(scoped.archiveEvents.map(function (item) { return item.riderId; })).length },
        { label: "Visible Rows", value: rows.length }
      ]),
      '    <div class="filter-row" style="margin-top:12px">',
      '      <div class="search-box"><input id="archiveSearch" type="search" placeholder="Search by rider, event, note" value="' + escapeHtml(state.archiveQuery) + '"></div>',
      '      <select id="archiveTypeFilter"><option value="all">All Event Types</option><option value="imported">Imported</option><option value="status_changed">Status Changed</option><option value="license_updated">License Updated</option><option value="health_card_updated">Health Card Updated</option></select>',
      "    </div>",
      '    <div class="table-wrap" style="margin-top:12px">',
      "      <table>",
      "        <thead><tr><th>Date</th><th>Event</th><th>Rider</th><th>City</th><th>Register</th><th>Platform</th><th>Note</th><th>Actions</th></tr></thead>",
      '        <tbody>' + (rows.length ? rows.map(function (eventItem) {
        var rider = ridersById[eventItem.riderId] || {};
        return "<tr>" +
          "<td class=\"mono\">" + escapeHtml(eventItem.eventDate || "") + "</td>" +
          "<td>" + escapeHtml(eventItem.eventType || "-") + "</td>" +
          "<td>" + escapeHtml(rider.displayName || eventItem.riderId || "-") + "</td>" +
          "<td>" + escapeHtml(eventItem.city || "-") + "</td>" +
          "<td>" + escapeHtml(eventItem.register || "-") + "</td>" +
          "<td>" + escapeHtml(eventItem.platform || "-") + "</td>" +
          "<td>" + escapeHtml(eventItem.note || "-") + "</td>" +
          '<td>' + renderActionDropdownCell("archive_rider", eventItem.riderId || "", "عرض الأرشيف", "عرض الأرشيف", { "rider-id": eventItem.riderId || "" }) + '</td>' +
          "</tr>";
      }).join("") : '<tr><td colspan="8"><div class="empty">No archive rows match the current filters.</div></td></tr>') + "</tbody>",
      "      </table>",
      "    </div>",
      "  </div>",
      '  <div class="card">',
      '    <span class="eyebrow">Conflicts</span>',
      '    <h2 class="section-title">Recent Matching Conflicts</h2>',
      (conflictRows.length
        ? '<div class="table-wrap"><table><thead><tr><th>Time</th><th>City</th><th>Register</th><th>Note</th></tr></thead><tbody>' +
          conflictRows.slice(0, 20).map(function (item) {
            return "<tr>" +
              "<td class=\"mono\">" + escapeHtml((item.timestamp || "").slice(0, 19)) + "</td>" +
              "<td>" + escapeHtml(item.city || "-") + "</td>" +
              "<td>" + escapeHtml(item.register || "-") + "</td>" +
              "<td>" + escapeHtml(item.note || "-") + "</td>" +
              "</tr>";
          }).join("") +
          "</tbody></table></div>"
        : '<div class="empty">No matching conflicts were logged for the current scope.</div>'),
      "  </div>",
      "</div>"
    ].join("");

    byId("archiveTypeFilter").value = state.archiveType;
  }

  function openDrawer(title, html) {
    var titleNode = byId("uiDrawerTitle");
    var bodyNode = byId("uiDrawerBody");
    var drawer = byId("uiDetailDrawer");
    if (titleNode) {
      titleNode.textContent = title;
    }
    if (bodyNode) {
      bodyNode.innerHTML = html;
    }
    if (drawer) {
      drawer.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("ui-drawer-open");
  }

  function hrDetailField(label, value, ltr) {
    return {
      label: label,
      ltr: !!ltr,
      value: value == null || value === "" ? "-" : String(value)
    };
  }

  function buildDrawerTable(headers, rows, monoFirst) {
    return [
      '<div class="table-wrap"><table><thead><tr>',
      (headers || []).map(function (header) {
        return "<th>" + escapeHtml(header) + "</th>";
      }).join(""),
      "</tr></thead><tbody>",
      (rows || []).length ? (rows || []).map(function (cells) {
        return "<tr>" + cells.map(function (cell, index) {
          return '<td' + (monoFirst && index === 0 ? ' class="mono"' : "") + ">" + escapeHtml(cell == null ? "-" : String(cell)) + "</td>";
        }).join("") + "</tr>";
      }).join("") : '<tr><td colspan="' + String((headers || []).length || 1) + '"><div class="empty">No rows available.</div></td></tr>',
      "</tbody></table></div>"
    ].join("");
    if (Portal.UIShell && typeof Portal.UIShell.enhanceTables === "function") {
      Portal.UIShell.enhanceTables(section);
    }
  }

  function buildDrawerHtml(riderId) {
    var scoped = buildScopedData();
    var ridersById = indexBy(scoped.riders, "id");
    var rider = ridersById[riderId];
    if (!rider) {
      return '<div class="empty">Rider details are unavailable in the current scope.</div>';
    }
    var hrProfile = (scoped.hrProfiles || []).filter(function (item) {
      return item.id === rider.hrProfileId;
    })[0] || null;
    var identities = scoped.identities.filter(function (item) {
      return item.riderId === riderId;
    });
    var accounts = scoped.platformAccounts.filter(function (item) {
      return item.riderId === riderId;
    });
    var events = scoped.archiveEvents.filter(function (item) {
      return item.riderId === riderId;
    }).sort(function (left, right) {
      return String(right.eventDate || "").localeCompare(String(left.eventDate || ""));
    });

    if (DetailsDrawer && typeof DetailsDrawer.renderDetailsDrawer === "function") {
      return DetailsDrawer.renderDetailsDrawer({
        summary: {
          title: rider.displayName || rider.id,
          subtitle: [rider.primaryIqama || "-", statusLabel(rider.currentWorkStatus), employmentLabel(rider.employmentType)].join(" • "),
          badges: [
            { label: statusLabel(rider.currentWorkStatus), tone: rider.currentWorkStatus === "working" ? "success" : "warning" },
            { label: employmentLabel(rider.employmentType), tone: rider.employmentType === "sponsorship" ? "success" : "warning" },
            { label: String(accounts.length) + " accounts", tone: accounts.length ? "success" : "warning" }
          ]
        },
        sections: [
          {
            title: "بيانات المندوب",
            fields: [
              hrDetailField("Rider ID", rider.id || "-", true),
              hrDetailField("Primary Iqama", rider.primaryIqama || "-", true),
              hrDetailField("الاسم", rider.displayName || "-"),
              hrDetailField("المدن", (rider.cities || []).join(" | ")),
              hrDetailField("السجلات", (rider.registers || []).join(" | ")),
              hrDetailField("المنصات", (rider.platforms || []).join(" | ")),
              hrDetailField("الهواتف", (rider.phones || []).join(" | "), true),
              hrDetailField("Risk Flags", (rider.riskFlags || []).join(" | "))
            ]
          },
          {
            title: "HR Profile",
            contentHtml: hrProfile
              ? renderHrProfileSummary(hrProfile, scoped)
              : '<div class="empty">No linked HR profile.</div>'
          },
          {
            title: "Identities",
            contentHtml: identities.length
              ? buildDrawerTable(["Type", "Value", "Platform", "Confidence"], identities.map(function (item) {
                  return [
                    item.identityType || "-",
                    item.value || item.normalizedValue || "-",
                    item.platform || "-",
                    String(item.confidence || "-")
                  ];
                }), true)
              : '<div class="empty">No identities stored.</div>'
          },
          {
            title: "Platform Accounts",
            contentHtml: accounts.length
              ? buildDrawerTable(["Platform", "User ID", "City", "Register", "Status", "Mode"], accounts.map(function (item) {
                  return [
                    item.platform || "-",
                    item.userId || item.dashboardUserId || "-",
                    item.city || "-",
                    item.register || "-",
                    statusLabel(item.accountStatus),
                    item.workMode || "-"
                  ];
                }), true)
              : '<div class="empty">No linked platform accounts.</div>'
          },
          {
            title: "Archive Timeline",
            contentHtml: events.length
              ? buildDrawerTable(["Date", "Event", "Note"], events.slice(0, 25).map(function (item) {
                  return [item.eventDate || "-", item.eventType || "-", item.note || "-"];
                }), true)
              : '<div class="empty">No archive events stored.</div>'
          }
        ]
      });
    }

    return [
      '<div class="mini-stack">',
      '  <div class="status-box good"><strong>' + escapeHtml(rider.displayName || rider.id) + '</strong><br>Iqama: ' + escapeHtml(rider.primaryIqama || "-") + ' | Work Status: ' + escapeHtml(statusLabel(rider.currentWorkStatus)) + " | Employment: " + escapeHtml(employmentLabel(rider.employmentType)) + "</div>",
      '  <div class="surface"><h3>HR Profile</h3>' + (hrProfile
        ? renderHrProfileSummary(hrProfile, scoped)
        : '<div class="empty">No linked HR profile.</div>') + "</div>",
      '  <div class="surface"><h3>Identities</h3>' + (identities.length
        ? '<div class="table-wrap"><table><thead><tr><th>Type</th><th>Value</th><th>Platform</th><th>Confidence</th></tr></thead><tbody>' +
            identities.map(function (item) {
              return "<tr><td>" + escapeHtml(item.identityType) + "</td><td class=\"mono\">" + escapeHtml(item.value || item.normalizedValue) + "</td><td>" + escapeHtml(item.platform || "-") + "</td><td>" + escapeHtml(String(item.confidence || "")) + "</td></tr>";
            }).join("") +
          "</tbody></table></div>"
        : '<div class="empty">No identities stored.</div>') + "</div>",
      '  <div class="surface"><h3>Platform Accounts</h3>' + (accounts.length
        ? '<div class="table-wrap"><table><thead><tr><th>Platform</th><th>User ID</th><th>City</th><th>Register</th><th>Status</th><th>Mode</th></tr></thead><tbody>' +
            accounts.map(function (item) {
              return "<tr><td>" + escapeHtml(item.platform) + "</td><td class=\"mono\">" + escapeHtml(item.userId || item.dashboardUserId || "-") + "</td><td>" + escapeHtml(item.city || "-") + "</td><td>" + escapeHtml(item.register || "-") + "</td><td>" + escapeHtml(statusLabel(item.accountStatus)) + "</td><td>" + escapeHtml(item.workMode || "-") + "</td></tr>";
            }).join("") +
          "</tbody></table></div>"
        : '<div class="empty">No linked platform accounts.</div>') + "</div>",
      '  <div class="surface"><h3>Archive Timeline</h3>' + (events.length
        ? '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Event</th><th>Note</th></tr></thead><tbody>' +
            events.slice(0, 25).map(function (item) {
              return "<tr><td class=\"mono\">" + escapeHtml(item.eventDate || "-") + "</td><td>" + escapeHtml(item.eventType || "-") + "</td><td>" + escapeHtml(item.note || "-") + "</td></tr>";
            }).join("") +
          "</tbody></table></div>"
        : '<div class="empty">No archive events stored.</div>') + "</div>",
      '  <div class="surface"><h3>Operations Placeholder</h3><div class="actions"><button class="btn light" disabled>Open Operations</button><button class="btn light" disabled>Open Accounts</button><button class="btn light" disabled>Open Archive</button></div></div>',
      "</div>"
    ].join("");
  }

  function openHrProfileDrawer(profileId) {
    var scoped = buildScopedData();
    var profile = indexBy(scoped.hrProfiles, "id")[profileId];
    if (!profile) {
      return;
    }
    var linkedRider = scoped.riders.filter(function (rider) {
      return rider.hrProfileId === profileId;
    })[0];
    if (!linkedRider && DetailsDrawer && typeof DetailsDrawer.renderDetailsDrawer === "function") {
      openDrawer(profile.fullNameArabic || profile.fullNameEnglish || "HR Profile", DetailsDrawer.renderDetailsDrawer({
        summary: {
          title: profile.fullNameArabic || profile.fullNameEnglish || "HR Profile",
          subtitle: [profile.iqama || "-", statusLabel(profile.hrStatus), employmentLabel(profile.employmentType || "unknown")].join(" • "),
          badges: [
            { label: statusLabel(profile.hrStatus), tone: profile.hrStatus === "active" ? "success" : "warning" }
          ]
        },
        sections: [
          {
            title: "ملف الموارد البشرية",
            contentHtml: renderHrProfileSummary(profile, scoped)
          },
          {
            title: "ملاحظات",
            fields: [
              hrDetailField("Linked Rider", "No linked rider yet. This HR profile will appear in Rider Master after a matching rider identity is created.")
            ]
          }
        ]
      }));
      return;
    }
    openDrawer(profile.fullNameArabic || profile.fullNameEnglish || "HR Profile", linkedRider
      ? buildDrawerHtml(linkedRider.id)
      : '<div class="mini-stack"><div class="status-box"><strong>' + escapeHtml(profile.fullNameArabic || profile.fullNameEnglish || "HR Profile") + '</strong><br>Iqama: ' + escapeHtml(profile.iqama || "-") + " | Status: " + escapeHtml(statusLabel(profile.hrStatus)) + '</div><div class="surface"><h3>HR Summary</h3>' + renderHrProfileSummary(profile, scoped) + '</div><div class="surface"><h3>Notes</h3><div class="empty">No linked rider yet. This HR profile will appear in Rider Master after a matching rider identity is created.</div></div></div>');
  }

  function focusHrProfile(focus, options) {
    focus = focus || {};
    options = options || {};
    var scoped = buildScopedData();
    var rows = buildHrCleanupRows(scoped);
    var row = HrViewModel && typeof HrViewModel.findHrRow === "function"
      ? HrViewModel.findHrRow(rows, focus)
      : null;
    if (!row) {
      openDrawer("HR Warning", '<div class="empty">No HR profile was found for iqama ' + escapeHtml(focus.iqama || focus.ownerIqama || focus.actualRiderIqama || "-") + " in the current scope.</div>");
      return {
        found: false,
        mode: "missing_hr_profile"
      };
    }
    state.hrTab = normalizeHrTabRoute(options.subPage || "hr_master");
    state.hrQuery = row.iqama || row.name || "";
    var page = byId("page-hr-shell");
    if (page) {
      page.setAttribute("data-hr-focused-iqama", row.iqama || "");
      page.setAttribute("data-hr-focus-mode", "hr_profile");
    }
    if (Portal.UIShell && typeof Portal.UIShell.openPage === "function") {
      Portal.UIShell.openPage("hr-shell", {
        code: options.code || "HR1",
        page: "hr-shell",
        subPage: state.hrTab
      });
    }
    scheduleRender("hr-focus", 0);
    window.setTimeout(function () {
      openHrProfileDrawer(row.profileId || "");
    }, 80);
    return {
      found: true,
      mode: "hr_profile",
      row: row
    };
  }

  function focusExternalRider(focus) {
    focus = focus || {};
    state.resolverIqama = normalizeText(focus.iqama || focus.actualRiderIqama || focus.ownerIqama);
    state.riderQuery = state.resolverIqama || normalizeText(focus.query || "");
    var page = byId("page-rider-master");
    if (page) {
      page.setAttribute("data-hr-focused-iqama", state.resolverIqama);
      page.setAttribute("data-hr-focus-mode", "external_rider");
    }
    if (Portal.UIShell && typeof Portal.UIShell.openPage === "function") {
      Portal.UIShell.openPage("rider-master", {
        code: "HR3",
        page: "rider-master",
        subPage: "external_riders"
      });
    }
    scheduleRender("external-focus", 0);
    return {
      found: !!state.resolverIqama,
      mode: "external_rider",
      iqama: state.resolverIqama
    };
  }

  Portal.HrEntryPoint = Portal.HrEntryPoint || {};
  Portal.HrEntryPoint.focusProfile = focusHrProfile;
  Portal.HrEntryPoint.focusExternalRider = focusExternalRider;

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

  function loadResolverIqama(iqama) {
    state.resolverIqama = normalizeText(iqama);
    scheduleRender("resolver", 0);
  }

  function buildResolverMutationContext() {
    return {
      organizationContext: getOrganizationContext(),
      source: "rider_resolver_ui",
      user: getCurrentUser()
    };
  }

  function saveExternalRiderIdentity(mode) {
    if (!riderResolverFacade || !state.resolverIqama) {
      throw new Error("Rider resolver is not available.");
    }
    var context = getOrganizationContext();
    var payload = {
      appPhone: byId("resolverAppPhone") ? byId("resolverAppPhone").value : "",
      contactPhone: byId("resolverContactPhone") ? byId("resolverContactPhone").value : "",
      fullName: byId("resolverFullName") ? byId("resolverFullName").value : "",
      iqama: state.resolverIqama,
      nationality: byId("resolverNationality") ? byId("resolverNationality").value : "",
      preferredCity: byId("resolverProfilePreferredCity")
        ? byId("resolverProfilePreferredCity").value
        : (context.selectedCities && context.selectedCities.length === 1 ? context.selectedCities[0] : ""),
      preferredRegister: byId("resolverProfilePreferredRegister")
        ? byId("resolverProfilePreferredRegister").value
        : (context.selectedRegisters && context.selectedRegisters.length === 1 ? context.selectedRegisters[0] : "")
    };
    var resolved = mode === "update"
      ? riderResolverFacade.updateExternalRider(state.resolverIqama, payload, buildResolverMutationContext())
      : riderResolverFacade.createExternalRider(payload, buildResolverMutationContext());
    if (resolved) {
      state.resolverIqama = resolved.iqama || state.resolverIqama;
    }
  }

  function saveOperationalProfile() {
    if (!riderResolverFacade || !state.resolverIqama) {
      throw new Error("Rider resolver is not available.");
    }
    var payload = {
      appPhone: byId("resolverProfileAppPhone") ? byId("resolverProfileAppPhone").value : "",
      contactPhone: byId("resolverProfileContactPhone") ? byId("resolverProfileContactPhone").value : "",
      gasCard: byId("resolverProfileGasCard") ? byId("resolverProfileGasCard").value : "",
      iban: byId("resolverProfileIban") ? byId("resolverProfileIban").value : "",
      iqama: state.resolverIqama,
      notes: byId("resolverProfileNotes") ? byId("resolverProfileNotes").value : "",
      preferredCity: byId("resolverProfilePreferredCity") ? byId("resolverProfilePreferredCity").value : "",
      preferredPlatform: byId("resolverProfilePreferredPlatform") ? byId("resolverProfilePreferredPlatform").value : "",
      preferredRegister: byId("resolverProfilePreferredRegister") ? byId("resolverProfilePreferredRegister").value : "",
      tools: byId("resolverProfileTools") ? byId("resolverProfileTools").value : ""
    };
    var resolved = riderResolverFacade.upsertRiderOperationalProfile(payload, buildResolverMutationContext());
    if (resolved) {
      state.resolverIqama = resolved.iqama || state.resolverIqama;
    }
  }

  function syncStateFromInputs() {
    state.hrCity = byId("hrMasterCityFilter") ? byId("hrMasterCityFilter").value : state.hrCity;
    state.hrDocumentStatus = byId("hrMasterDocumentFilter") ? byId("hrMasterDocumentFilter").value : state.hrDocumentStatus;
    state.hrQuery = byId("hrMasterSearch") ? byId("hrMasterSearch").value.trim() : state.hrQuery;
    state.hrKafalaStatus = byId("hrMasterKafalaFilter") ? byId("hrMasterKafalaFilter").value : state.hrKafalaStatus;
    state.hrNationality = byId("hrMasterNationalityFilter") ? byId("hrMasterNationalityFilter").value : state.hrNationality;
    state.hrRegister = byId("hrMasterRegisterFilter") ? byId("hrMasterRegisterFilter").value : state.hrRegister;
    state.hrStatus = byId("hrMasterStatusFilter") ? byId("hrMasterStatusFilter").value : state.hrStatus;
    state.resolverIqama = byId("riderResolverIqama") ? byId("riderResolverIqama").value.trim() : state.resolverIqama;
    state.riderQuery = byId("riderMasterSearch") ? byId("riderMasterSearch").value.trim() : state.riderQuery;
    state.riderStatus = byId("riderMasterStatusFilter") ? byId("riderMasterStatusFilter").value : state.riderStatus;
    state.riderPlatform = byId("riderMasterPlatformFilter") ? byId("riderMasterPlatformFilter").value : state.riderPlatform;
    state.archiveQuery = byId("archiveSearch") ? byId("archiveSearch").value.trim() : state.archiveQuery;
    state.archiveType = byId("archiveTypeFilter") ? byId("archiveTypeFilter").value : state.archiveType;
  }

  function renderAll() {
    syncStateFromInputs();
    var scoped = buildScopedData();
    if (isPageActive("hr-shell")) {
      renderHrPage(scoped);
    }
    if (isPageActive("rider-master")) {
      renderRiderPage(scoped);
    }
  }

  function isPageActive(pageKey) {
    if (Portal.UIShell && typeof Portal.UIShell.isPageActive === "function") {
      return Portal.UIShell.isPageActive(pageKey);
    }
    var page = byId(String(pageKey || "").indexOf("page-") === 0 ? String(pageKey || "") : "page-" + String(pageKey || ""));
    return !!(page && page.classList && page.classList.contains("active"));
  }

  function patchDataStoreNotifications() {
    var runtime = getRuntime();
    var dataStore = runtime.dataStore;
    if (!dataStore || dataStore.__prompt4Patched) {
      return;
    }
    ["remove", "save", "upsert"].forEach(function (methodName) {
      if (typeof dataStore[methodName] !== "function") {
        return;
      }
      var original = dataStore[methodName];
      dataStore[methodName] = function () {
        var result = original.apply(dataStore, arguments);
        window.dispatchEvent(new CustomEvent("keeta:data-changed", {
          detail: {
            entity: arguments[0] || "",
            method: methodName
          }
        }));
        return result;
      };
    });
    dataStore.__prompt4Patched = true;
  }

  function handleDocumentInput(event) {
    if (!event.target) {
      return;
    }
    if ([
      "archiveSearch",
      "archiveTypeFilter",
      "hrMasterCityFilter",
      "hrMasterDocumentFilter",
      "hrMasterKafalaFilter",
      "hrMasterNationalityFilter",
      "hrMasterRegisterFilter",
      "hrMasterSearch",
      "hrMasterStatusFilter",
      "riderResolverIqama",
      "riderMasterPlatformFilter",
      "riderMasterSearch",
      "riderMasterStatusFilter"
    ].indexOf(event.target.id) >= 0) {
      scheduleRender(event.target.id.indexOf("Search") >= 0 ? "search" : "filter", event.target.id.indexOf("Search") >= 0 ? 140 : 80);
    }
  }

  function handleDocumentClick(event) {
    var importButton = event.target.closest("[data-hr-import-route]");
    if (importButton) {
      openImportRoute(importButton.getAttribute("data-hr-import-route") || "");
      return;
    }
    var resolverLoadButton = event.target.closest(".rider-resolver-load");
    if (resolverLoadButton) {
      loadResolverIqama(resolverLoadButton.getAttribute("data-rider-iqama") || "");
      return;
    }
    var riderButton = event.target.closest(".rider-detail-btn, .archive-rider-btn");
    if (riderButton) {
      openDrawer("Rider Details", buildDrawerHtml(riderButton.getAttribute("data-rider-id") || ""));
      return;
    }
    var hrButton = event.target.closest(".hr-profile-detail");
    if (hrButton) {
      openHrProfileDrawer(hrButton.getAttribute("data-hr-profile-id") || "");
      return;
    }
    var hrTabButton = event.target.closest("[data-hr-tab]");
    if (hrTabButton) {
      state.hrTab = normalizeHrTabRoute(hrTabButton.getAttribute("data-hr-tab") || "");
      if (Portal.UIShell && typeof Portal.UIShell.openPage === "function") {
        Portal.UIShell.openPage("hr-shell", {
          code: "HR1",
          page: "hr-shell",
          subPage: state.hrTab
        });
      }
      scheduleRender("hr-tab", 0);
    }
  }

  function handleHrRouteChange(route) {
    route = route || {};
    if (String(route.page || "") === "hr-shell") {
      state.hrTab = normalizeHrTabRoute(route.subPage);
      return;
    }
    if (String(route.page || "") === "archive-shell") {
      state.hrTab = "hr_archive";
    }
  }

  function handleActionDropdownSelection(event) {
    var detail = event && event.detail ? event.detail : {};
    var dataset = detail.dataset || {};
    if (dataset.module !== "hr") {
      return;
    }
    if (detail.actionId === "hr_profile") {
      openHrProfileDrawer(dataset.hrProfileId || "");
      return;
    }
    if (detail.actionId === "rider" || detail.actionId === "archive_rider") {
      openDrawer("Rider Details", buildDrawerHtml(dataset.riderId || ""));
    }
  }

  function handleDocumentSubmit(event) {
    if (!event.target) {
      return;
    }
    if (event.target.id === "riderResolverSearchForm") {
      event.preventDefault();
      state.resolverIqama = byId("riderResolverIqama") ? byId("riderResolverIqama").value.trim() : state.resolverIqama;
      scheduleRender("resolver-search", 0);
      return;
    }
    if (event.target.id === "externalRiderIdentityForm") {
      event.preventDefault();
      try {
        saveExternalRiderIdentity(byId("resolverIdentityMode") ? byId("resolverIdentityMode").value : "create");
        if (Portal.UIShell && typeof Portal.UIShell.showToast === "function") {
          Portal.UIShell.showToast("External rider identity saved.", "success");
        }
        scheduleRender("resolver-save", 40);
      } catch (error) {
        if (Portal.UIShell && typeof Portal.UIShell.showToast === "function") {
          Portal.UIShell.showToast(error.message || "Unable to save external rider identity.", "error");
        }
      }
      return;
    }
    if (event.target.id === "resolverOperationalProfileForm") {
      event.preventDefault();
      try {
        saveOperationalProfile();
        if (Portal.UIShell && typeof Portal.UIShell.showToast === "function") {
          Portal.UIShell.showToast("Operational profile saved.", "success");
        }
        scheduleRender("resolver-profile-save", 40);
      } catch (error) {
        if (Portal.UIShell && typeof Portal.UIShell.showToast === "function") {
          Portal.UIShell.showToast(error.message || "Unable to save rider operational profile.", "error");
        }
      }
    }
  }

  function injectResolverStyles() {
    if (byId("prompt86ResolverStyles")) {
      return;
    }
    var style = document.createElement("style");
    style.id = "prompt86ResolverStyles";
    style.textContent = [
      ".resolver-list{margin:0;padding-inline-start:18px;display:grid;gap:4px}",
      ".resolver-meta-row{align-items:stretch}",
      ".surface textarea,.surface input{width:100%;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:#fff;font:inherit}",
      ".surface .ops-field{display:grid;gap:6px}",
      ".surface .ops-field span{font-weight:700;color:var(--navy)}",
      ".surface h3{margin:0 0 12px;color:var(--navy)}"
    ].join("");
    document.head.appendChild(style);
  }

  function boot() {
    patchDataStoreNotifications();
    injectResolverStyles();
    handleHrRouteChange({ page: "hr-shell", subPage: state.hrTab });
    document.addEventListener("input", handleDocumentInput);
    document.addEventListener("change", handleDocumentInput);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("submit", handleDocumentSubmit);
    document.addEventListener("keeta:action-dropdown-select", handleActionDropdownSelection);
    window.addEventListener("keeta:data-changed", function () {
      scheduleRender("data", 120);
    });
    document.addEventListener("keeta:shell-route-change", function (event) {
      handleHrRouteChange(event && event.detail ? event.detail : {});
      scheduleRender("route", 40);
    });
    if (Portal.OrganizationContext && typeof Portal.OrganizationContext.subscribe === "function") {
      Portal.OrganizationContext.subscribe(function () {
        scheduleRender("organization", 80);
      });
    }
    if (getRuntime().auth && typeof getRuntime().auth.subscribe === "function") {
      getRuntime().auth.subscribe(function () {
        scheduleRender("auth", 80);
      });
    }
    scheduleRender("init", 40);
  }

  boot();
})();
