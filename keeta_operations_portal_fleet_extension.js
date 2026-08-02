(function () {
  "use strict";

  var Portal = window.KeetaPortal;
  if (!Portal || !Portal.Runtime || !Portal.ImportTypes || !Portal.RBAC) {
    return;
  }

  var ImportTypes = Portal.ImportTypes;
  var RBAC = Portal.RBAC;
  var UIShell = Portal.UIShell || {};
  var ActionDropdown = Portal.ActionDropdown || null;
  var DetailsDrawer = Portal.DetailsDrawer || null;
  var FleetViewModel = Portal.FleetViewModel || null;
  var PageRenderController = Portal.PageRenderController || null;
  var FleetRebuildPolicy = Portal.FleetRebuildPolicy || null;
  var bootModeState = Portal.BootMode && typeof Portal.BootMode.getState === "function"
    ? Portal.BootMode.getState()
    : { safeMode: false };
  var actionDropdownController = ActionDropdown && typeof ActionDropdown.createGlobalController === "function"
    ? ActionDropdown.createGlobalController(document)
    : null;
  var state = {
    activeTab: "operating_vehicles",
    capacityStatus: "all",
    ownershipType: "all",
    search: "",
    status: "all",
    vehicleType: "all"
  };
  var pageController = PageRenderController && typeof PageRenderController.createPageRenderController === "function"
    ? PageRenderController.createPageRenderController({
        debounceMs: 100,
        onRender: renderPage,
        pageId: "fleet-shell"
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

  var operatingHeaders = [
    "رقم اللوحة",
    "نوع التسجيل",
    "الماركة",
    "الطراز",
    "OPC",
    "الرقم التسلسلي",
    "السجل",
    "Brand Name",
    "السجلات المتاحه للاستخدام",
    "current bounding accounts",
    "used by how name partner",
    "Current branch",
    "Current City",
    "Targeted Branch",
    "In how many city is it used?",
    "Vehicle Type",
    "City & Pranch",
    "Accounts registered on the vehicle",
    "Iqama 1",
    "Iqama 2",
    "Iqama 3",
    "Iqama 4",
    "Vehicle movement status"
  ];

  var movementHeaders = [
    "الفرع",
    "اللوحة الجديدة",
    "نوع تم",
    "نوع التسجيل الجديد",
    "الماركة",
    "الطراز",
    "سنة الصنع",
    "الرقم التسلسلي",
    "رقم الهيكل",
    "اللون الأساسي",
    "اسم المفوض",
    "رقم الجوال بالتفويض",
    "تاريخ بداية التفويض",
    "تاريخ نهاية التفويض",
    "الحالة",
    "الحالة",
    "D",
    "رقم إقامة المفوض",
    "رقم اقامة المستخدم",
    "الإسم",
    "رقم جوال المستخدم",
    "نوع الرخصة",
    "نوع المندوب",
    "تطبيق العمل",
    "رقم الأيدي",
    "تاريخ الإستلام",
    "ملاحظات"
  ];

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

  function normalizeText(value) {
    return ImportTypes.normalizeText(value);
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

  function matchesContext(record, context) {
    context = context || getOrganizationContext();
    var city = normalizeText(record && (record.currentCity || record.city));
    var register = normalizeText(record && (record.register || record.targetedBranch));
    if (context.cityScope !== "all" && context.selectedCities && context.selectedCities.length && city && context.selectedCities.indexOf(city) < 0) {
      return false;
    }
    if (context.registerScope !== "all" && context.selectedRegisters && context.selectedRegisters.length && register) {
      var matched = context.selectedRegisters.some(function (selectedRegister) {
        return normalizeText(selectedRegister) === register ||
          ImportTypes.matchUserRegisterScope(selectedRegister, register) ||
          ImportTypes.matchUserRegisterScope(register, selectedRegister);
      });
      if (!matched) {
        return false;
      }
    }
    return true;
  }

  function matchesUserScope(record, user) {
    if (!user) {
      return true;
    }
    var city = normalizeText(record && (record.currentCity || record.city));
    var register = normalizeText(record && (record.register || record.targetedBranch));
    if (city && typeof RBAC.canAccessCity === "function" && !RBAC.canAccessCity(user, city)) {
      return false;
    }
    if (register && typeof RBAC.canAccessRegister === "function" && !RBAC.canAccessRegister(user, register)) {
      return false;
    }
    return true;
  }

  function matchesStateFilters(record) {
    var haystack = [
      record.vehicleSerial,
      record.plateNumber,
      record.currentCity,
      record.currentBranch,
      record.targetedBranch,
      record.register,
      record.usedByPartnerName,
      record.actualUserName,
      record.actualUserIqama
    ].join(" ").toLowerCase();
    if (state.search && haystack.indexOf(state.search.toLowerCase()) < 0) {
      return false;
    }
    if (state.vehicleType !== "all" && normalizeText(record.vehicleType).toLowerCase() !== state.vehicleType) {
      return false;
    }
    if (state.status !== "all") {
      var recordStatus = normalizeText(record.status || record.movementStatus || record.reviewStatus || record.matchStatus).toLowerCase();
      if (recordStatus.indexOf(state.status) < 0) {
        return false;
      }
    }
    if (state.ownershipType !== "all") {
      var ownershipType = normalizeText(record.ownershipType || record.vehicleCompanyStatus || record.companyStatus).toLowerCase();
      if (ownershipType !== state.ownershipType) {
        return false;
      }
    }
    if (state.capacityStatus !== "all") {
      var capacityStatus = normalizeText(record.capacityStatus || record.reviewStatus).toLowerCase();
      if (capacityStatus.indexOf(state.capacityStatus) < 0) {
        return false;
      }
    }
    return true;
  }

  function renderPill(text, tone) {
    return '<span class="pill' + (tone ? " " + tone : "") + '">' + escapeHtml(text || "-") + "</span>";
  }

  function showToast(message, type) {
    if (UIShell.showToast) {
      UIShell.showToast(message, type);
      return;
    }
    window.alert(message);
  }

  function openDrawer(title, bodyHtml) {
    if (UIShell.openDrawer) {
      UIShell.openDrawer(title, bodyHtml);
      return;
    }
    window.alert(title);
  }

  function openConfirmModal(options) {
    if (UIShell.openModal) {
      UIShell.openModal(options);
      return;
    }
    if (window.confirm(options.title || "Confirm")) {
      if (typeof options.onConfirm === "function") {
        options.onConfirm();
      }
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return Promise.resolve();
  }

  function downloadJson(filename, payload) {
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function indexBy(rows, fieldName) {
    return (rows || []).reduce(function (memo, item) {
      var key = normalizeText(item && item[fieldName]);
      if (key) {
        memo[key] = item;
      }
      return memo;
    }, {});
  }

  function groupBy(rows, fieldName) {
    return (rows || []).reduce(function (memo, item) {
      var key = normalizeText(item && item[fieldName]);
      if (!key) {
        return memo;
      }
      memo[key] = memo[key] || [];
      memo[key].push(item);
      return memo;
    }, {});
  }

  function buildModel() {
    var runtime = getRuntime();
    var user = getCurrentUser();
    var context = getOrganizationContext();

    var vehicles = getCollection("vehicles").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user) && matchesStateFilters(item);
    });
    var allVehicles = getCollection("vehicles").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var movementEvents = getCollection("vehicleMovementEvents").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user) && matchesStateFilters(item);
    }).sort(function (left, right) {
      return String(right.eventDate || "").localeCompare(String(left.eventDate || ""));
    });
    var capacityReviews = getCollection("vehicleCapacityReviews").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var complianceIssues = getCollection("vehicleComplianceIssues").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var vehicleAssignments = getCollection("vehicleAssignments").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var riderVehicleUsageHistory = getCollection("riderVehicleUsageHistory").filter(function (item) {
      return matchesContext({
        city: item.city || item.currentCity || "",
        register: item.vehicleRegister || item.register || ""
      }, context) && matchesUserScope({
        city: item.city || item.currentCity || "",
        register: item.vehicleRegister || item.register || ""
      }, user) && matchesStateFilters(item);
    });
    var dashboardUsers = getCollection("dashboardUsers").filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var assignments = getCollection("assignments").filter(function (item) {
      return matchesContext({
        city: item.city || "",
        register: item.register || ""
      }, context) && matchesUserScope({
        city: item.city || "",
        register: item.register || ""
      }, user);
    });
    var auditLogs = getCollection("auditLogs").filter(function (item) {
      return /vehicle/i.test(item.entity || "") || /vehicle_/i.test(item.action || "");
    }).filter(function (item) {
      return matchesContext(item, context) && matchesUserScope(item, user);
    });
    var fleetRows = FleetViewModel && typeof FleetViewModel.buildFleetRows === "function"
      ? FleetViewModel.buildFleetRows({
          assignments: assignments,
          dashboardUsers: dashboardUsers,
          riderVehicleUsageHistory: riderVehicleUsageHistory,
          vehicleAssignments: vehicleAssignments,
          vehicleCapacityReviews: capacityReviews,
          vehicleComplianceIssues: complianceIssues,
          vehicleMovementEvents: movementEvents,
          vehicles: allVehicles
        })
      : [];

    var capacityBySerial = indexBy(capacityReviews, "vehicleSerial");
    var issuesBySerial = groupBy(complianceIssues, "vehicleSerial");
    var assignmentsBySerial = groupBy(vehicleAssignments, "vehicleSerial");
    var usersBySerial = groupBy(dashboardUsers, "vehicleSerial");
    var movementBySerial = groupBy(movementEvents, "vehicleSerial");

    return {
      auditLogs: auditLogs,
      capacityReviews: capacityReviews,
      capacityBySerial: capacityBySerial,
      complianceIssues: complianceIssues,
      context: context,
      dashboardUsers: dashboardUsers,
      issuesBySerial: issuesBySerial,
      movementBySerial: movementBySerial,
      movementEvents: movementEvents,
      riderVehicleUsageHistory: riderVehicleUsageHistory,
      user: user,
      vehicleAssignments: vehicleAssignments,
      assignmentsBySerial: assignmentsBySerial,
      fleetRows: fleetRows,
      usersBySerial: usersBySerial,
      vehicles: vehicles,
      allVehicles: allVehicles
    };
  }

  function tabCounts(model) {
    return {
      operating: model.allVehicles.length,
      available: model.capacityReviews.filter(function (item) { return item.reviewStatus === "available"; }).length,
      full: model.capacityReviews.filter(function (item) { return item.reviewStatus === "full" || item.reviewStatus === "over_capacity"; }).length,
      movement: model.movementEvents.length,
      issues: model.complianceIssues.length,
      matching: model.vehicleAssignments.length,
      handover: model.movementEvents.filter(function (item) { return item.eventType === "handed_over" || item.eventType === "received"; }).length,
      history: model.auditLogs.length
    };
  }

  function renderPage() {
    var page = byId("page-fleet-shell");
    var model = buildModel();
    if (!page) {
      return;
    }
    if (model.user && !RBAC.canPerform(model.user, "fleet.view")) {
      page.innerHTML = renderEmptyState("Fleet Module", "You do not have permission to view fleet data in the current session.");
      return;
    }

    var counts = tabCounts(model);
    page.innerHTML = [
      '<div class="card">',
      '  <span class="eyebrow">Prompt 8</span>',
      '  <h2 class="section-title">Fleet / Vehicle Module</h2>',
      renderKpis([
        { label: "Operating Vehicles", value: counts.operating },
        { label: "Available", value: counts.available, className: "good" },
        { label: "Full / Over Capacity", value: counts.full, className: "warn" },
        { label: "Open Issues", value: counts.issues, className: counts.issues ? "bad" : "good" },
        { label: "Movement Events", value: counts.movement },
        { label: "Vehicle Matches", value: counts.matching }
      ]),
      renderTabs(counts),
      renderFilters(),
      renderActiveTab(model),
      "</div>"
    ].join("");
    if (UIShell && typeof UIShell.enhanceTables === "function") {
      UIShell.enhanceTables(page);
    }
    bindControls();
  }

  function renderEmptyState(title, body) {
    return '<div class="card"><span class="eyebrow">Prompt 8</span><h2 class="section-title">' + escapeHtml(title) + '</h2><div class="empty">' + escapeHtml(body) + "</div></div>";
  }

  function renderKpis(items) {
    return '<div class="kpi-grid">' + items.map(function (item) {
      return '<div class="kpi' + (item.className ? " " + item.className : "") + '"><b>' + escapeHtml(item.label) + '</b><strong>' + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("") + "</div>";
  }

  function renderTabs(counts) {
    var tabs = [
      ["operating", "Operating Vehicles"],
      ["available", "المركبات المتاحة"],
      ["full", "المركبات الممتلئة"],
      ["movement", "المركبات والحركة"],
      ["issues", "مخالفات المركبات"],
      ["matching", "مطابقة المركبات مع اليوزرات"],
      ["handover", "تسليم المركبات"],
      ["history", "سجل المركبات"]
    ];
    return '<div class="ops-tabs" style="margin-top:16px">' + tabs.map(function (item) {
      return '<button type="button" class="ops-tab' + (state.activeTab === item[0] ? " is-active" : "") + '" data-fleet-tab="' + item[0] + '">' +
        escapeHtml(item[1]) + ' <span>' + escapeHtml(String(counts[item[0]] || 0)) + "</span></button>";
    }).join("") + "</div>";
  }

  function renderFilters() {
    return [
      '<div class="filter-row" style="margin-top:16px">',
      '  <div class="search-box"><input id="fleetSearchInput" type="search" placeholder="Search serial / plate / city / user" value="' + escapeHtml(state.search) + '"></div>',
      '  <select id="fleetVehicleTypeFilter">',
      renderOption("all", "All Vehicle Types", state.vehicleType),
      renderOption("car", "Car", state.vehicleType),
      renderOption("bike", "Bike", state.vehicleType),
      renderOption("unknown", "Unknown", state.vehicleType),
      "  </select>",
      '  <select id="fleetStatusFilter">',
      renderOption("all", "All Statuses", state.status),
      renderOption("available", "Available", state.status),
      renderOption("under_review", "Under Review", state.status),
      renderOption("blocked", "Blocked", state.status),
      renderOption("full", "Full", state.status),
      renderOption("maintenance", "Maintenance", state.status),
      "  </select>",
      "</div>"
    ].join("");
  }

  function renderOption(value, label, selected) {
    return '<option value="' + escapeHtml(value) + '"' + (value === selected ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
  }

  function renderActiveTab(model) {
    if (state.activeTab === "movement") {
      return renderMovementTable(model.movementEvents);
    }
    if (state.activeTab === "issues") {
      return renderIssuesTable(model.complianceIssues);
    }
    if (state.activeTab === "matching") {
      return renderMatchingTable(model.vehicleAssignments);
    }
    if (state.activeTab === "handover") {
      return renderMovementTable(model.movementEvents.filter(function (item) {
        return item.eventType === "handed_over" || item.eventType === "received";
      }));
    }
    if (state.activeTab === "history") {
      return renderHistoryTable(model.auditLogs);
    }

    var rows = model.vehicles.slice();
    if (state.activeTab === "available") {
      rows = rows.filter(function (vehicle) {
        var review = model.capacityBySerial[normalizeText(vehicle.vehicleSerial)];
        return review && review.reviewStatus === "available";
      });
    } else if (state.activeTab === "full") {
      rows = rows.filter(function (vehicle) {
        var review = model.capacityBySerial[normalizeText(vehicle.vehicleSerial)];
        return review && (review.reviewStatus === "full" || review.reviewStatus === "over_capacity");
      });
    }
    return renderOperatingTable(rows, model);
  }

  function renderOperatingTable(rows, model) {
    if (!rows.length) {
      return '<div class="empty" style="margin-top:16px">No vehicles match the current fleet filters.</div>';
    }
    return [
      '<div class="table-wrap" style="margin-top:16px">',
      "  <table>",
      "    <thead><tr>",
      operatingHeaders.map(function (header) { return "<th>" + escapeHtml(header) + "</th>"; }).join(""),
      "      <th>Actions</th>",
      "    </tr></thead>",
      "    <tbody>",
      rows.map(function (vehicle) {
        return renderOperatingRow(vehicle, model);
      }).join(""),
      "    </tbody>",
      "  </table>",
      "</div>"
    ].join("");
  }

  function renderOperatingRow(vehicle, model) {
    var review = model.capacityBySerial[normalizeText(vehicle.vehicleSerial)] || null;
    var warnings = review ? review.warnings || [] : [];
    return [
      "<tr>",
      "<td>" + escapeHtml(vehicle.plateNumber || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.registrationType || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.brand || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.model || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.opc || "-") + "</td>",
      '<td class="mono">' + escapeHtml(vehicle.vehicleSerial || "-") + "</td>",
      "<td>" + escapeHtml(ImportTypes.registerLabel(vehicle.register) || vehicle.register || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.brandName || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.availableRegistersText || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.currentBoundingAccounts || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.usedByPartnerName || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.currentBranch || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.currentCity || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.targetedBranch || "-") + "</td>",
      "<td>" + escapeHtml(String(vehicle.usedInCityCount == null ? "-" : vehicle.usedInCityCount)) + "</td>",
      "<td>" + renderPill(vehicle.vehicleType || "-", "blue") + "</td>",
      "<td>" + escapeHtml(vehicle.cityAndBranch || "-") + "</td>",
      "<td>" + escapeHtml(vehicle.accountsRegisteredOnVehicle || "-") + "</td>",
      "<td class=\"mono\">" + escapeHtml(vehicle.iqama1 || "-") + "</td>",
      "<td class=\"mono\">" + escapeHtml(vehicle.iqama2 || "-") + "</td>",
      "<td class=\"mono\">" + escapeHtml(vehicle.iqama3 || "-") + "</td>",
      "<td class=\"mono\">" + escapeHtml(vehicle.iqama4 || "-") + "</td>",
      "<td>" + renderPill(vehicle.movementStatus || "-", warnings.length ? "gold" : "") + "</td>",
      "<td>" + renderVehicleActions(vehicle) + "</td>",
      "</tr>"
    ].join("");
  }

  function renderMovementTable(rows) {
    if (!rows.length) {
      return '<div class="empty" style="margin-top:16px">No movement events match the current fleet filters.</div>';
    }
    return [
      '<div class="table-wrap" style="margin-top:16px">',
      "  <table>",
      "    <thead><tr>",
      movementHeaders.map(function (header) { return "<th>" + escapeHtml(header) + "</th>"; }).join(""),
      "    </tr></thead>",
      "    <tbody>",
      rows.map(function (eventItem) {
        return [
          "<tr>",
          "<td>" + escapeHtml(eventItem.branch || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.plateNumber || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.eventType || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.registrationType || eventItem.transportType || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.brand || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.model || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.manufactureYear || "-") + "</td>",
          '<td class="mono">' + escapeHtml(eventItem.vehicleSerial || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.chassisNumber || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.primaryColor || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.delegatedPersonName || "-") + "</td>",
          '<td class="mono">' + escapeHtml(eventItem.delegatedPhone || eventItem.currentUserPhone || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.authorizationStartDate || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.authorizationEndDate || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.status || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.secondaryStatus || eventItem.status || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.movementFlagD || "-") + "</td>",
          '<td class="mono">' + escapeHtml(eventItem.delegatedIqama || "-") + "</td>",
          '<td class="mono">' + escapeHtml(eventItem.currentUserIqama || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.currentUserName || "-") + "</td>",
          '<td class="mono">' + escapeHtml(eventItem.currentUserPhone || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.licenseType || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.riderType || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.platform || "-") + "</td>",
          '<td class="mono">' + escapeHtml(eventItem.dashboardUserId || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.eventDate || "-") + "</td>",
          "<td>" + escapeHtml(eventItem.notes || "-") + "</td>",
          "</tr>"
        ].join("");
      }).join(""),
      "    </tbody>",
      "  </table>",
      "</div>"
    ].join("");
  }

  function renderIssuesTable(rows) {
    if (!rows.length) {
      return '<div class="empty" style="margin-top:16px">No open vehicle issues in the current scope.</div>';
    }
    return [
      '<div class="table-wrap" style="margin-top:16px"><table><thead><tr>',
      "<th>Vehicle Serial</th><th>Issue</th><th>Severity</th><th>Blocking</th><th>Dashboard User</th><th>City</th><th>Register</th>",
      "</tr></thead><tbody>",
      rows.map(function (issue) {
        return "<tr>" +
          '<td class="mono">' + escapeHtml(issue.vehicleSerial || "-") + "</td>" +
          "<td>" + escapeHtml(issue.message || issue.issueType || "-") + "</td>" +
          "<td>" + renderPill(issue.severity || "-", issue.severity === "high" ? "red" : "gold") + "</td>" +
          "<td>" + renderPill(issue.blocking ? "Blocking" : "Review", issue.blocking ? "red" : "gold") + "</td>" +
          '<td class="mono">' + escapeHtml(issue.dashboardUserId || "-") + "</td>" +
          "<td>" + escapeHtml(issue.city || "-") + "</td>" +
          "<td>" + escapeHtml(ImportTypes.registerLabel(issue.register) || issue.register || "-") + "</td>" +
          "</tr>";
      }).join(""),
      "</tbody></table></div>"
    ].join("");
  }

  function renderMatchingTable(rows) {
    if (!rows.length) {
      return '<div class="empty" style="margin-top:16px">No vehicle matching rows are available yet.</div>';
    }
    return [
      '<div class="table-wrap" style="margin-top:16px"><table><thead><tr>',
      "<th>User ID</th><th>Registered Vehicle On Dashboard</th><th>Actual Used Vehicle</th><th>Match Status</th><th>Capacity</th><th>Warnings</th><th>Blocking Issues</th>",
      "</tr></thead><tbody>",
      rows.map(function (row) {
        return "<tr>" +
          '<td class="mono">' + escapeHtml(row.dashboardUserId || "-") + "</td>" +
          "<td>" + renderVehicleSummary(row.registeredVehicleOnDashboard, row.registeredVehicleSerial) + "</td>" +
          "<td>" + renderVehicleSummary(row.actualUsedVehicle, row.actualUsedVehicleSerial) + "</td>" +
          "<td>" + renderPill(row.matchStatus || "-", row.matchStatus === "blocked" ? "red" : (row.matchStatus === "warning" ? "gold" : "blue")) + "</td>" +
          "<td>" + renderPill(row.capacityStatus || "-", row.capacityStatus === "full" || row.capacityStatus === "over_capacity" ? "gold" : "") + "</td>" +
          "<td>" + escapeHtml((row.warnings || []).join(", ") || "-") + "</td>" +
          "<td>" + escapeHtml((row.blockingIssues || []).join(", ") || "-") + "</td>" +
          "</tr>";
      }).join(""),
      "</tbody></table></div>"
    ].join("");
  }

  function renderHistoryTable(rows) {
    if (!rows.length) {
      return '<div class="empty" style="margin-top:16px">No fleet audit rows are available in the current scope.</div>';
    }
    return [
      '<div class="table-wrap" style="margin-top:16px"><table><thead><tr>',
      "<th>Time</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>City</th><th>Register</th><th>Note</th>",
      "</tr></thead><tbody>",
      rows.slice().sort(function (left, right) {
        return String(right.timestamp || "").localeCompare(String(left.timestamp || ""));
      }).map(function (item) {
        return "<tr>" +
          "<td>" + escapeHtml(String(item.timestamp || "").slice(0, 19).replace("T", " ")) + "</td>" +
          "<td>" + escapeHtml(item.action || "-") + "</td>" +
          "<td>" + escapeHtml(item.entity || "-") + "</td>" +
          '<td class="mono">' + escapeHtml(item.entityId || "-") + "</td>" +
          "<td>" + escapeHtml(item.city || "-") + "</td>" +
          "<td>" + escapeHtml(ImportTypes.registerLabel(item.register) || item.register || "-") + "</td>" +
          "<td>" + escapeHtml(item.note || "-") + "</td>" +
          "</tr>";
      }).join(""),
      "</tbody></table></div>"
    ].join("");
  }

  function renderVehicleSummary(vehicle, fallbackSerial) {
    var serial = vehicle && vehicle.vehicleSerial ? vehicle.vehicleSerial : fallbackSerial;
    if (!serial) {
      return renderPill("serial_missing", "gold");
    }
    var label = serial;
    if (vehicle && vehicle.plateNumber) {
      label += " / " + vehicle.plateNumber;
    }
    return escapeHtml(label);
  }

  function renderVehicleActions(vehicle) {
    if (ActionDropdown && typeof ActionDropdown.renderActionDropdown === "function") {
      return ActionDropdown.renderActionDropdown({
        dropdownId: "fleet_" + escapeHtml(vehicle.id || vehicle.vehicleSerial || "row"),
        label: "العمليات",
        contextData: {
          module: "fleet",
          "vehicle-id": vehicle.id || ""
        },
        actions: buildVehicleActions(vehicle)
      });
    }
    return [
      '<div class="ops-actions">',
      actionButton("details", "View Details", vehicle.id),
      actionButton("linked", "View Linked Users", vehicle.id),
      actionButton("movement", "View Movement History", vehicle.id),
      actionButton("capacity", "View Capacity Review", vehicle.id),
      actionButton("issues", "View Issues", vehicle.id),
      actionButton("review", "Mark Under Review", vehicle.id),
      actionButton("exclude", "Mark Excluded", vehicle.id),
      actionButton("export", "Export Vehicle Report", vehicle.id),
      actionButton("copy", "Copy Serial", vehicle.id),
      "</div>"
    ].join("");
  }

  function buildVehicleActions(vehicle) {
    var user = getCurrentUser();
    return [
      dropdownAction("details", "عرض التفاصيل", !user || RBAC.canPerform(user, "fleet.view"), "", false),
      dropdownAction("linked", "اليوزرات المرتبطة", !user || RBAC.canPerform(user, "fleet.view"), "", false),
      dropdownAction("movement", "سجل الحركة", !user || RBAC.canPerform(user, "fleet.view"), "", false),
      dropdownAction("capacity", "مراجعة السعة", !user || RBAC.canPerform(user, "fleet.view"), "", false),
      dropdownAction("issues", "المخالفات", !user || RBAC.canPerform(user, "fleet.view"), "", false),
      dropdownAction("review", "تحت المراجعة", !user || RBAC.canPerform(user, "fleet.reviewIssues"), "يحتاج صلاحية fleet.reviewIssues", false),
      dropdownAction("exclude", "استبعاد المركبة", !user || RBAC.canPerform(user, "fleet.exclude"), "يحتاج صلاحية fleet.exclude", true),
      dropdownAction("export", "تصدير تقرير المركبة", !user || RBAC.canPerform(user, "fleet.export"), "يحتاج صلاحية fleet.export", false),
      dropdownAction("copy", "نسخ الرقم التسلسلي", true, "", false)
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

  function actionButton(action, label, vehicleId) {
    return '<button type="button" class="ops-action-btn" data-fleet-action="' + escapeHtml(action) + '" data-vehicle-id="' + escapeHtml(vehicleId) + '">' + escapeHtml(label) + "</button>";
  }

  function vehicleById(vehicleId) {
    return getCollection("vehicles").filter(function (item) {
      return String(item.id) === String(vehicleId);
    })[0] || null;
  }

  function showVehicleDetails(vehicle) {
    openDrawer("Vehicle Details", renderVehicleDetailsDrawer(vehicle));
  }

  function showLinkedUsers(vehicle) {
    var users = getCollection("dashboardUsers").filter(function (item) {
      return normalizeText(item.vehicleSerial) === normalizeText(vehicle.vehicleSerial);
    });
    openDrawer("Linked Users", renderLinkedUsersDrawer(vehicle, users));
  }

  function showMovementHistory(vehicle) {
    var rows = getCollection("vehicleMovementEvents").filter(function (item) {
      return normalizeText(item.vehicleSerial) === normalizeText(vehicle.vehicleSerial);
    }).sort(function (left, right) {
      return String(right.eventDate || "").localeCompare(String(left.eventDate || ""));
    });
    openDrawer("Movement History", rows.length ? renderMovementTable(rows) : '<div class="empty">No movement history found for this vehicle.</div>');
  }

  function showCapacityReview(vehicle) {
    var review = getCollection("vehicleCapacityReviews").filter(function (item) {
      return normalizeText(item.vehicleSerial) === normalizeText(vehicle.vehicleSerial);
    })[0];
    openDrawer("Capacity Review", renderCapacityReviewDrawer(vehicle, review));
  }

  function showVehicleIssues(vehicle) {
    var rows = getCollection("vehicleComplianceIssues").filter(function (item) {
      return normalizeText(item.vehicleSerial) === normalizeText(vehicle.vehicleSerial);
    });
    openDrawer("Vehicle Issues", rows.length ? renderIssuesTable(rows) : '<div class="empty">No compliance issues were generated for this vehicle.</div>');
  }

  function card(label, value) {
    return '<div class="import-issue import-issue--info"><strong>' + escapeHtml(label) + '</strong><div>' + escapeHtml(String(value == null ? "-" : value)) + "</div></div>";
  }

  function renderVehicleDetailsDrawer(vehicle) {
    if (!DetailsDrawer || typeof DetailsDrawer.renderDetailsDrawer !== "function") {
      return [
        '<div class="import-issues">',
        card("Vehicle Serial", vehicle.vehicleSerial),
        card("Plate", vehicle.plateNumber),
        card("Current City", vehicle.currentCity || vehicle.city),
        card("Current Branch", vehicle.currentBranch),
        card("Targeted Branch", vehicle.targetedBranch),
        card("Transport Type", vehicle.transportType || vehicle.registrationType),
        card("Vehicle Type", vehicle.vehicleType),
        card("Movement Status", vehicle.movementStatus),
        card("Accounts", vehicle.accountsRegisteredOnVehicle || "-"),
        "</div>"
      ].join("");
    }
    return DetailsDrawer.renderDetailsDrawer({
      summary: {
        title: vehicle.vehicleSerial || vehicle.id || "-",
        subtitle: [vehicle.currentCity || vehicle.city || "-", vehicle.currentBranch || vehicle.targetedBranch || "-", vehicle.plateNumber || "-"].join(" • "),
        badges: [
          { label: vehicle.vehicleType || "unknown", tone: "success" },
          { label: vehicle.movementStatus || vehicle.status || "unknown", tone: /blocked|excluded|maintenance/i.test(String(vehicle.movementStatus || vehicle.status || "")) ? "danger" : "warning" }
        ]
      },
      sections: [
        {
          title: "بيانات المركبة",
          fields: [
            drawerField("Vehicle Serial", vehicle.vehicleSerial || "-", true),
            drawerField("Plate", vehicle.plateNumber || "-", true),
            drawerField("Current City", vehicle.currentCity || vehicle.city || "-"),
            drawerField("Current Branch", vehicle.currentBranch || "-"),
            drawerField("Targeted Branch", vehicle.targetedBranch || "-"),
            drawerField("Transport Type", vehicle.transportType || vehicle.registrationType || "-"),
            drawerField("Vehicle Type", vehicle.vehicleType || "-"),
            drawerField("Movement Status", vehicle.movementStatus || vehicle.status || "-")
          ]
        },
        {
          title: "التشغيل والربط",
          fields: [
            drawerField("Registered Accounts", vehicle.currentBoundingAccounts || "-"),
            drawerField("Used By", vehicle.usedByPartnerName || "-"),
            drawerField("Accounts", vehicle.accountsRegisteredOnVehicle || "-"),
            drawerField("Iqama 1", vehicle.iqama1 || "-", true),
            drawerField("Iqama 2", vehicle.iqama2 || "-", true),
            drawerField("Iqama 3", vehicle.iqama3 || "-", true),
            drawerField("Iqama 4", vehicle.iqama4 || "-", true)
          ]
        }
      ]
    });
  }

  function renderLinkedUsersDrawer(vehicle, users) {
    if (!DetailsDrawer || typeof DetailsDrawer.renderDetailsDrawer !== "function") {
      return users.length ? [
        '<div class="table-wrap"><table><thead><tr><th>User ID</th><th>Name</th><th>Iqama</th><th>City</th><th>Register</th></tr></thead><tbody>',
        users.map(function (item) {
          return "<tr>" +
            '<td class="mono">' + escapeHtml(item.dashboardUserId || item.userId || "-") + "</td>" +
            "<td>" + escapeHtml(item.fullName || item.currentRiderName || "-") + "</td>" +
            '<td class="mono">' + escapeHtml(item.ownerIqama || item.currentRiderIqama || "-") + "</td>" +
            "<td>" + escapeHtml(item.city || "-") + "</td>" +
            "<td>" + escapeHtml(ImportTypes.registerLabel(item.register) || item.register || "-") + "</td>" +
            "</tr>";
        }).join(""),
        "</tbody></table></div>"
      ].join("") : '<div class="empty">No dashboard users are linked to this vehicle.</div>';
    }
    return DetailsDrawer.renderDetailsDrawer({
      summary: {
        title: vehicle.vehicleSerial || vehicle.id || "-",
        subtitle: "Linked dashboard users",
        badges: [
          { label: String(users.length) + " linked users", tone: users.length ? "success" : "warning" }
        ]
      },
      sections: [
        {
          title: "Linked Users",
          contentHtml: users.length ? [
            '<div class="table-wrap"><table><thead><tr><th>User ID</th><th>Name</th><th>Iqama</th><th>City</th><th>Register</th></tr></thead><tbody>',
            users.map(function (item) {
              return "<tr>" +
                '<td class="mono">' + escapeHtml(item.dashboardUserId || item.userId || "-") + "</td>" +
                "<td>" + escapeHtml(item.fullName || item.currentRiderName || "-") + "</td>" +
                '<td class="mono">' + escapeHtml(item.ownerIqama || item.currentRiderIqama || "-") + "</td>" +
                "<td>" + escapeHtml(item.city || "-") + "</td>" +
                "<td>" + escapeHtml(ImportTypes.registerLabel(item.register) || item.register || "-") + "</td>" +
                "</tr>";
            }).join(""),
            "</tbody></table></div>"
          ].join("") : '<div class="empty">No dashboard users are linked to this vehicle.</div>'
        }
      ]
    });
  }

  function renderCapacityReviewDrawer(vehicle, review) {
    if (!DetailsDrawer || typeof DetailsDrawer.renderDetailsDrawer !== "function") {
      return review ? [
        '<div class="import-issues">',
        card("Review Status", review.reviewStatus),
        card("Assigned Count", review.assignedCount),
        card("Capacity Max", review.capacityMax),
        card("Remaining Capacity", review.remainingCapacity),
        card("Assigned Dashboard Users", (review.assignedDashboardUserIds || []).join(", ")),
        card("Assigned Iqamas", (review.assignedIqamas || []).join(", ")),
        card("Warnings", (review.warnings || []).join(", ") || "-"),
        card("Blocking Issues", (review.blockingIssues || []).join(", ") || "-"),
        "</div>"
      ].join("") : '<div class="empty">No capacity review was generated yet for this vehicle.</div>';
    }
    return DetailsDrawer.renderDetailsDrawer({
      summary: {
        title: vehicle.vehicleSerial || vehicle.id || "-",
        subtitle: "Capacity review snapshot",
        badges: [
          { label: review ? (review.reviewStatus || "available") : "no_review", tone: review && /full|over|blocked/i.test(String(review.reviewStatus || "")) ? "danger" : "warning" }
        ]
      },
      sections: [
        {
          title: "Capacity Review",
          fields: review ? [
            drawerField("Review Status", review.reviewStatus || "-"),
            drawerField("Assigned Count", review.assignedCount || 0),
            drawerField("Capacity Max", review.capacityMax || 0),
            drawerField("Remaining Capacity", review.remainingCapacity || 0),
            drawerField("Assigned Dashboard Users", (review.assignedDashboardUserIds || []).join(" | ")),
            drawerField("Assigned Iqamas", (review.assignedIqamas || []).join(" | "), true),
            drawerField("Warnings", (review.warnings || []).join(" | ")),
            drawerField("Blocking Issues", (review.blockingIssues || []).join(" | "))
          ] : [
            drawerField("Status", "No capacity review was generated yet for this vehicle.")
          ]
        }
      ]
    });
  }

  function drawerField(label, value, ltr) {
    return {
      label: label,
      ltr: !!ltr,
      value: value == null || value === "" ? "-" : String(value)
    };
  }

  function handleFleetAction(action, vehicleId) {
    var runtime = getRuntime();
    var vehicle = vehicleById(vehicleId);
    if (!vehicle) {
      showToast("Vehicle not found.", "error");
      return;
    }
    if (action === "details") {
      showVehicleDetails(vehicle);
      return;
    }
    if (action === "linked") {
      showLinkedUsers(vehicle);
      return;
    }
    if (action === "movement") {
      showMovementHistory(vehicle);
      return;
    }
    if (action === "capacity") {
      showCapacityReview(vehicle);
      return;
    }
    if (action === "issues") {
      showVehicleIssues(vehicle);
      return;
    }
    if (action === "copy") {
      copyText(vehicle.vehicleSerial || "").then(function () {
        showToast("Vehicle serial copied.", "success");
      });
      return;
    }
    if (action === "export") {
      try {
        var exportPayload = runtime.fleetIntegration.exportVehicleReport(vehicle.id, getCurrentUser());
        downloadJson("vehicle-report-" + (vehicle.vehicleSerial || vehicle.id) + ".json", exportPayload);
        showToast("Vehicle report exported.", "success");
      } catch (error) {
        showToast(error.message || "Unable to export vehicle report.", "error");
      }
      return;
    }
    if (action === "review") {
      openNoteModal("Mark Vehicle Under Review", "Review note", function (note) {
        try {
          runtime.fleetIntegration.markVehicleUnderReview({
            note: note,
            user: getCurrentUser(),
            vehicleId: vehicle.id
          });
          ensureDerivedCollections("manual_refresh", true);
          showToast("Vehicle marked under review.", "success");
          renderPage();
        } catch (error) {
          showToast(error.message || "Unable to mark the vehicle under review.", "error");
        }
      });
      return;
    }
    if (action === "exclude") {
      openNoteModal("Mark Vehicle Excluded", "Exclusion reason", function (note) {
        try {
          runtime.fleetIntegration.excludeVehicle({
            reason: note || "excluded",
            user: getCurrentUser(),
            vehicleId: vehicle.id
          });
          ensureDerivedCollections("manual_refresh", true);
          showToast("Vehicle excluded.", "success");
          renderPage();
        } catch (error) {
          showToast(error.message || "Unable to exclude this vehicle.", "error");
        }
      });
    }
  }

  function openNoteModal(title, placeholder, onConfirm) {
    var inputId = "fleetModalNoteInput";
    openConfirmModal({
      title: title,
      confirmLabel: "Confirm",
      body: '<div class="field"><label>' + escapeHtml(placeholder) + '</label><textarea id="' + inputId + '" rows="4" placeholder="' + escapeHtml(placeholder) + '"></textarea></div>',
      onConfirm: function () {
        var node = byId(inputId);
        onConfirm(node ? node.value : "");
      }
    });
  }

  function normalizeFleetRoute(subPage) {
    var key = normalizeText(subPage).toLowerCase();
    var map = {
      "operating-vehicles": "operating",
      operating: "operating",
      "available-vehicles": "available",
      available: "available",
      "full-vehicles": "full",
      full: "full",
      "vehicle-handover": "handover",
      handover: "handover",
      "vehicle-issues": "issues",
      issues: "issues",
      "vehicle-user-matching": "matching",
      matching: "matching"
    };
    return map[key] || "operating";
  }

  function handleFleetRouteChange(event) {
    var route = event && event.detail ? event.detail : {};
    if (String(route.page || "") !== "fleet-shell") {
      return;
    }
    state.activeTab = normalizeFleetRoute(route.subPage);
    if (route.code === "FL2") {
      state.status = "available";
      state.activeTab = "operating_vehicles";
    } else if (route.code === "FL3") {
      state.capacityStatus = "full";
      state.activeTab = "capacity_review";
    } else if (route.code === "FL5") {
      state.activeTab = "exceptions";
    } else if (route.code === "FL6") {
      state.activeTab = "vehicle_assignments";
    }
    scheduleRender("route", 40);
  }

  function handleActionDropdownSelection(event) {
    var detail = event && event.detail ? event.detail : {};
    var dataset = detail.dataset || {};
    if (dataset.module !== "fleet") {
      return;
    }
    handleFleetAction(detail.actionId, dataset.vehicleId);
  }

  function normalizeFleetRoute(subPage) {
    if (FleetViewModel && typeof FleetViewModel.normalizeFleetRoute === "function") {
      return FleetViewModel.normalizeFleetRoute(subPage);
    }
    return normalizeText(subPage) || "operating_vehicles";
  }

  function getFleetFilters() {
    return {
      capacityStatus: state.capacityStatus,
      ownershipType: state.ownershipType,
      query: state.search,
      vehicleStatus: state.status,
      vehicleType: state.vehicleType
    };
  }

  function filteredFleetRowsForTab(model, tabKey) {
    if (!FleetViewModel || typeof FleetViewModel.filterFleetRows !== "function") {
      return [];
    }
    return FleetViewModel.filterFleetRows(model.fleetRows || [], getFleetFilters(), normalizeFleetRoute(tabKey));
  }

  function filterRecordsByFleetRows(records, fleetRows, fieldName) {
    var serialSet = {};
    (fleetRows || []).forEach(function (row) {
      var key = normalizeText(row && row.vehicleSerial);
      if (key) {
        serialSet[key] = true;
      }
    });
    return (records || []).filter(function (record) {
      return !!serialSet[normalizeText(record && record[fieldName || "vehicleSerial"])];
    });
  }

  function tabCounts(model) {
    var counts = {};
    var tabs = FleetViewModel && typeof FleetViewModel.listFleetTabs === "function"
      ? FleetViewModel.listFleetTabs()
      : [];
    tabs.forEach(function (tab) {
      counts[tab.key] = FleetViewModel && typeof FleetViewModel.filterFleetRows === "function"
        ? FleetViewModel.filterFleetRows(model.fleetRows || [], {}, tab.key).length
        : 0;
    });
    return counts;
  }

  function renderEmptyState(title, body) {
    return '<div class="card"><span class="eyebrow">Prompt 8.11</span><h2 class="section-title">' + escapeHtml(title) + '</h2><div class="empty">' + escapeHtml(body) + "</div></div>";
  }

  function renderKpis(items) {
    return '<div class="kpi-grid">' + items.map(function (item) {
      return '<div class="kpi' + (item.className ? " " + item.className : "") + '"><b>' + escapeHtml(item.label) + '</b><strong>' + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("") + "</div>";
  }

  function renderTabs(counts) {
    var tabs = FleetViewModel && typeof FleetViewModel.listFleetTabs === "function"
      ? FleetViewModel.listFleetTabs()
      : [];
    return '<div class="ops-tabs" style="margin-top:16px">' + tabs.map(function (item) {
      return '<button type="button" class="ops-tab' + (state.activeTab === item.key ? " is-active" : "") + '" data-fleet-tab="' + escapeHtml(item.key) + '">' +
        escapeHtml(item.label) + ' <span>' + escapeHtml(String(counts[item.key] || 0)) + "</span></button>";
    }).join("") + "</div>";
  }

  function renderFilters() {
    return [
      '<div class="filter-row" style="margin-top:16px">',
      '  <div class="search-box"><input id="fleetSearchInput" type="search" placeholder="Search serial / plate / city / user" value="' + escapeHtml(state.search) + '"></div>',
      '  <select id="fleetVehicleTypeFilter">',
      renderOption("all", "All Vehicle Types", state.vehicleType),
      renderOption("car", "Car", state.vehicleType),
      renderOption("bike", "Bike", state.vehicleType),
      renderOption("unknown", "Unknown", state.vehicleType),
      "  </select>",
      '  <select id="fleetStatusFilter">',
      renderOption("all", "All Statuses", state.status),
      renderOption("available", "Available", state.status),
      renderOption("under_review", "Under Review", state.status),
      renderOption("blocked", "Blocked", state.status),
      renderOption("full", "Full", state.status),
      renderOption("maintenance", "Maintenance", state.status),
      "  </select>",
      '  <select id="fleetOwnershipFilter">',
      renderOption("all", "All Ownership", state.ownershipType),
      renderOption("company", "Company", state.ownershipType),
      renderOption("private", "Private", state.ownershipType),
      renderOption("unknown", "Unknown", state.ownershipType),
      "  </select>",
      '  <select id="fleetCapacityFilter">',
      renderOption("all", "All Capacity Status", state.capacityStatus),
      renderOption("available", "Available", state.capacityStatus),
      renderOption("in_use", "In Use", state.capacityStatus),
      renderOption("full", "Full", state.capacityStatus),
      renderOption("over_capacity", "Over Capacity", state.capacityStatus),
      "  </select>",
      "</div>"
    ].join("");
  }

  function renderOption(value, label, selected) {
    return '<option value="' + escapeHtml(value) + '"' + (value === selected ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
  }

  function renderCapacityReviewTable(rows) {
    if (!rows.length) {
      return '<div class="empty" style="margin-top:16px">No capacity review rows match the current scope.</div>';
    }
    return [
      '<div class="table-wrap" style="margin-top:16px"><table><thead><tr>',
      "<th>Vehicle Serial</th><th>Plate</th><th>Register</th><th>City</th><th>Ownership</th><th>Capacity Status</th><th>Review</th><th>Registered Users</th><th>Actual Riders</th><th>Warnings</th><th>Actions</th>",
      "</tr></thead><tbody>",
      rows.map(function (row) {
        return "<tr>" +
          '<td class="mono">' + escapeHtml(row.vehicleSerial || "-") + "</td>" +
          "<td>" + escapeHtml(row.plateNumber || "-") + "</td>" +
          "<td>" + escapeHtml(ImportTypes.registerLabel(row.register) || row.register || "-") + "</td>" +
          "<td>" + escapeHtml(row.city || "-") + "</td>" +
          "<td>" + renderPill(row.ownershipType || "-", row.ownershipType === "private" ? "gold" : "blue") + "</td>" +
          "<td>" + renderPill(row.capacityStatus || "-", row.capacityStatus === "over_capacity" ? "red" : (row.capacityStatus === "full" ? "gold" : "")) + "</td>" +
          "<td>" + renderPill(row.capacityReview && row.capacityReview.reviewStatus || "-", "blue") + "</td>" +
          "<td>" + escapeHtml(String(row.registeredDashboardUserCount || 0)) + "</td>" +
          "<td>" + escapeHtml(String(row.currentActualAssignmentCount || row.currentUsageCount || 0)) + "</td>" +
          "<td>" + escapeHtml((row.warnings || []).join(", ") || "-") + "</td>" +
          "<td>" + renderVehicleActions(row.rawVehicle || { id: row.vehicleId, vehicleSerial: row.vehicleSerial }) + "</td>" +
          "</tr>";
      }).join(""),
      "</tbody></table></div>"
    ].join("");
  }

  function renderVehicleUsageHistoryTable(rows, fleetRows) {
    var filteredRows = filterRecordsByFleetRows(rows || [], fleetRows || [], "vehicleSerial");
    if (!filteredRows.length) {
      return '<div class="empty" style="margin-top:16px">No rider vehicle usage history rows match the current scope.</div>';
    }
    return [
      '<div class="table-wrap" style="margin-top:16px"><table><thead><tr>',
      "<th>Vehicle Serial</th><th>Rider Iqama</th><th>Dashboard User</th><th>City</th><th>Register</th><th>Start</th><th>End</th><th>Status</th><th>Notes</th>",
      "</tr></thead><tbody>",
      filteredRows.map(function (item) {
        return "<tr>" +
          '<td class="mono">' + escapeHtml(item.vehicleSerial || "-") + "</td>" +
          '<td class="mono">' + escapeHtml(item.riderIqama || item.actualRiderIqama || "-") + "</td>" +
          '<td class="mono">' + escapeHtml(item.dashboardUserId || "-") + "</td>" +
          "<td>" + escapeHtml(item.city || "-") + "</td>" +
          "<td>" + escapeHtml(ImportTypes.registerLabel(item.vehicleRegister || item.register) || item.vehicleRegister || item.register || "-") + "</td>" +
          "<td>" + escapeHtml(item.usageStartDate || item.startDate || "-") + "</td>" +
          "<td>" + escapeHtml(item.usageEndDate || item.endDate || "-") + "</td>" +
          "<td>" + renderPill(item.status || (item.usageEndDate ? "ended" : "active"), item.usageEndDate ? "gold" : "blue") + "</td>" +
          "<td>" + escapeHtml(item.notes || "-") + "</td>" +
          "</tr>";
      }).join(""),
      "</tbody></table></div>"
    ].join("");
  }

  function renderActiveTab(model) {
    var activeTab = normalizeFleetRoute(state.activeTab);
    var fleetRows = filteredFleetRowsForTab(model, activeTab);
    if (activeTab === "vehicle_usage_history") {
      return renderVehicleUsageHistoryTable(model.riderVehicleUsageHistory, fleetRows);
    }
    if (activeTab === "exceptions") {
      return renderIssuesTable(filterRecordsByFleetRows(model.complianceIssues, fleetRows, "vehicleSerial"));
    }
    if (activeTab === "vehicle_assignments") {
      return renderMatchingTable(filterRecordsByFleetRows(model.vehicleAssignments, fleetRows, "vehicleSerial"));
    }
    if (activeTab === "capacity_review") {
      return renderCapacityReviewTable(fleetRows);
    }
    if (activeTab === "maintenance_or_excluded") {
      return renderOperatingTable(filterRecordsByFleetRows(model.allVehicles, fleetRows, "vehicleSerial"), model);
    }
    return renderOperatingTable(filterRecordsByFleetRows(model.allVehicles, fleetRows, "vehicleSerial"), model);
  }

  function renderPage() {
    var page = byId("page-fleet-shell");
    var model = buildModel();
    if (!page) {
      return;
    }
    if (model.user && !RBAC.canPerform(model.user, "fleet.view")) {
      page.innerHTML = renderEmptyState("Fleet Module", "You do not have permission to view fleet data in the current session.");
      return;
    }

    var filteredScopeRows = filteredFleetRowsForTab(model, "operating_vehicles");
    var counts = tabCounts(model);
    var kpis = FleetViewModel && typeof FleetViewModel.buildFleetKpis === "function"
      ? FleetViewModel.buildFleetKpis(filteredScopeRows)
      : {
          active: 0,
          bikes: 0,
          cars: 0,
          companyVehicles: 0,
          excluded: 0,
          maintenance: 0,
          needsReview: 0,
          overCapacity: 0,
          privateVehicles: 0,
          totalVehicles: 0
        };
    page.innerHTML = [
      '<div class="card">',
      '  <span class="eyebrow">Prompt 8.11</span>',
      '  <h2 class="section-title">Fleet Support Module</h2>',
      '  <div class="note">Vehicle serial stays the primary identity. Registered dashboard vehicle and actual used vehicle remain separate, and read-only review links never create mutations or audit rows.</div>',
      renderKpis([
        { label: "إجمالي المركبات", value: kpis.totalVehicles },
        { label: "سيارات", value: kpis.cars },
        { label: "دبابات", value: kpis.bikes },
        { label: "نشط", value: kpis.active, className: "good" },
        { label: "مستبعد", value: kpis.excluded, className: kpis.excluded ? "warn" : "" },
        { label: "صيانة", value: kpis.maintenance, className: kpis.maintenance ? "warn" : "" },
        { label: "مركبة شركة", value: kpis.companyVehicles },
        { label: "مركبة خاصة", value: kpis.privateVehicles },
        { label: "تجاوز السعة", value: kpis.overCapacity, className: kpis.overCapacity ? "bad" : "" },
        { label: "يحتاج مراجعة", value: kpis.needsReview, className: kpis.needsReview ? "warn" : "" }
      ]),
      renderTabs(counts),
      renderFilters(),
      renderActiveTab(model),
      "</div>"
    ].join("");
    if (UIShell && typeof UIShell.enhanceTables === "function") {
      UIShell.enhanceTables(page);
    }
    bindControls();
  }

  function focusFleetVehicle(focus, options) {
    focus = focus || {};
    options = options || {};
    var model = buildModel();
    var row = FleetViewModel && typeof FleetViewModel.findFleetRow === "function"
      ? FleetViewModel.findFleetRow(model.fleetRows || [], focus)
      : null;
    if (!row) {
      if (focus.vehicleType && !focus.vehicleSerial && !focus.plateNumber) {
        openDrawer("Actual Vehicle Summary", '<div class="empty">The current assignment references a ' + escapeHtml(focus.vehicleType) + ' vehicle but no fleet serial or plate is stored for direct focus.</div>');
        return {
          found: false,
          mode: "private_vehicle_summary"
        };
      }
      openDrawer("Fleet Warning", '<div class="empty">No fleet vehicle was found for serial ' + escapeHtml(focus.vehicleSerial || "-") + ' or plate ' + escapeHtml(focus.plateNumber || "-") + " in the current scope.</div>");
      return {
        found: false,
        mode: "missing_vehicle"
      };
    }
    state.activeTab = normalizeFleetRoute(options.subPage || "operating_vehicles");
    state.search = row.vehicleSerial || row.plateNumber || "";
    var page = byId("page-fleet-shell");
    if (page) {
      page.setAttribute("data-fleet-focused-serial", row.vehicleSerial || "");
      page.setAttribute("data-fleet-focused-plate", row.plateNumber || "");
      page.setAttribute("data-fleet-focused-rider-iqama", focus.actualRiderIqama || focus.riderIqama || "");
      page.setAttribute("data-fleet-focus-mode", state.activeTab === "vehicle_usage_history" ? "usage_history" : "vehicle");
    }
    if (options.resetFilters !== false) {
      state.status = "all";
      state.ownershipType = "all";
      state.capacityStatus = "all";
      state.vehicleType = "all";
    }
    if (Portal.UIShell && typeof Portal.UIShell.openPage === "function") {
      Portal.UIShell.openPage("fleet-shell", {
        code: options.code || "FL1",
        page: "fleet-shell",
        subPage: state.activeTab
      });
    }
    scheduleRender("fleet-focus", 0);
    if (options.openDrawer !== false) {
      window.setTimeout(function () {
        handleFleetAction(options.drawerAction || "details", row.vehicleId || row.id);
      }, 80);
    }
    return {
      found: true,
      mode: "vehicle",
      row: row
    };
  }

  function focusFleetUsageHistory(focus) {
    return focusFleetVehicle(focus, {
      code: "FL4",
      drawerAction: "movement",
      openDrawer: false,
      resetFilters: true,
      subPage: "vehicle_usage_history"
    });
  }

  Portal.FleetEntryPoint = Portal.FleetEntryPoint || {};
  Portal.FleetEntryPoint.focusVehicle = focusFleetVehicle;
  Portal.FleetEntryPoint.focusVehicleUsageHistory = focusFleetUsageHistory;

  function bindControls() {
    var page = byId("page-fleet-shell");
    if (!page) {
      return;
    }
    var searchInput = byId("fleetSearchInput");
    var capacityFilter = byId("fleetCapacityFilter");
    var ownershipFilter = byId("fleetOwnershipFilter");
    var vehicleTypeFilter = byId("fleetVehicleTypeFilter");
    var statusFilter = byId("fleetStatusFilter");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.search = searchInput.value || "";
        scheduleRender("search", 140);
      });
    }
    if (vehicleTypeFilter) {
      vehicleTypeFilter.addEventListener("change", function () {
        state.vehicleType = vehicleTypeFilter.value || "all";
        scheduleRender("filter", 80);
      });
    }
    if (statusFilter) {
      statusFilter.addEventListener("change", function () {
        state.status = statusFilter.value || "all";
        scheduleRender("filter", 80);
      });
    }
    if (ownershipFilter) {
      ownershipFilter.addEventListener("change", function () {
        state.ownershipType = ownershipFilter.value || "all";
        scheduleRender("filter", 80);
      });
    }
    if (capacityFilter) {
      capacityFilter.addEventListener("change", function () {
        state.capacityStatus = capacityFilter.value || "all";
        scheduleRender("filter", 80);
      });
    }
    page.querySelectorAll("[data-fleet-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.activeTab = normalizeFleetRoute(button.getAttribute("data-fleet-tab") || "operating_vehicles");
        scheduleRender("tab", 0);
      });
    });
    page.querySelectorAll("[data-fleet-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        handleFleetAction(button.getAttribute("data-fleet-action"), button.getAttribute("data-vehicle-id"));
      });
    });
  }

  document.addEventListener("keeta:action-dropdown-select", handleActionDropdownSelection);
  document.addEventListener("keeta:shell-route-change", handleFleetRouteChange);
  document.addEventListener("keeta:organization-context-change", function () {
    scheduleRender("organization", 80);
  });
  window.addEventListener("keeta:data-changed", function (event) {
    var detail = event && event.detail ? event.detail : {};
    var entityName = String(detail.entity || "");
    var sharedState = window.__keetaRuntimeUiStateShared || {};
    var sourceEntities = FleetRebuildPolicy && Array.isArray(FleetRebuildPolicy.SOURCE_ENTITIES)
      ? FleetRebuildPolicy.SOURCE_ENTITIES
      : ["vehicles", "dashboardUsers", "assignments", "vehicleMovementEvents"];
    var derivedEntities = FleetRebuildPolicy && Array.isArray(FleetRebuildPolicy.DERIVED_ENTITIES)
      ? FleetRebuildPolicy.DERIVED_ENTITIES
      : ["vehicleAssignments", "vehicleCapacityReviews", "vehicleComplianceIssues"];
    if (sharedState.fleetDerivedRebuildInFlight) {
      return;
    }
    if (!entityName || sourceEntities.indexOf(entityName) >= 0) {
      ensureDerivedCollections("data");
    }
    if (!entityName || sourceEntities.indexOf(entityName) >= 0 || derivedEntities.indexOf(entityName) >= 0) {
      scheduleRender("data", 120);
    }
  });
  document.addEventListener("DOMContentLoaded", function () {
    ensureDerivedCollections("dom");
    scheduleRender("dom", 40);
  });
  window.setTimeout(function () {
    ensureDerivedCollections("startup");
    scheduleRender("startup", 40);
  }, 0);

  function ensureDerivedCollections(reason, force) {
    var runtime = getRuntime();
    if (!runtime || !runtime.fleetIntegration || typeof runtime.fleetIntegration.rebuildDerivedCollections !== "function") {
      return false;
    }
    var snapshot = {
      assignments: getCollection("assignments"),
      dashboardUsers: getCollection("dashboardUsers"),
      vehicleAssignments: getCollection("vehicleAssignments"),
      vehicleCapacityReviews: getCollection("vehicleCapacityReviews"),
      vehicleComplianceIssues: getCollection("vehicleComplianceIssues"),
      vehicleMovementEvents: getCollection("vehicleMovementEvents"),
      vehicles: getCollection("vehicles")
    };
    var nextHash = FleetRebuildPolicy && typeof FleetRebuildPolicy.createFleetSourceHash === "function"
      ? FleetRebuildPolicy.createFleetSourceHash(snapshot)
      : JSON.stringify({
          dashboardUsers: snapshot.dashboardUsers.length,
          vehicles: snapshot.vehicles.length
        });
    var hasDerivedCollections = FleetRebuildPolicy && typeof FleetRebuildPolicy.hasDerivedCollections === "function"
      ? FleetRebuildPolicy.hasDerivedCollections(snapshot)
      : (!!snapshot.vehicleAssignments.length && !!snapshot.vehicleCapacityReviews.length);
    var sharedState = window.__keetaRuntimeUiStateShared || {};
    var shouldRebuild = FleetRebuildPolicy && typeof FleetRebuildPolicy.shouldRebuildFleetDerived === "function"
      ? FleetRebuildPolicy.shouldRebuildFleetDerived({
          force: !!force,
          hasDerivedCollections: hasDerivedCollections,
          lastHash: sharedState.lastFleetDerivedHash || "",
          nextHash: nextHash
        })
      : (!!force || !hasDerivedCollections);
    if (!shouldRebuild) {
      return false;
    }
    sharedState.fleetDerivedRebuildInFlight = true;
    sharedState.lastFleetDerivedHash = nextHash;
    window.__keetaRuntimeUiStateShared = sharedState;
    try {
      runtime.fleetIntegration.rebuildDerivedCollections({
        reason: reason || "fleet_extension",
        user: getCurrentUser()
      });
      if (runtime.dataStore && typeof runtime.dataStore.setMeta === "function") {
        runtime.dataStore.setMeta("fleet:lastDerivedSourceHash", nextHash);
      }
    } finally {
      sharedState.fleetDerivedRebuildInFlight = false;
      window.__keetaRuntimeUiStateShared = sharedState;
    }
    return true;
  }
})();
