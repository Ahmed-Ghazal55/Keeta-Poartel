(function () {
  "use strict";

  const Portal = window.KeetaPortal;
  if (!Portal) {
    return;
  }

  const STORAGE_KEY = "keeta.operations.portal.v4";

  const state = {
    salaryInput: Portal.SalaryEngine.createDefaultInput(),
    salaryResult: null,
    shiftInput: Portal.ShiftEngine.createDefaultInput(),
    shiftPlan: null,
    shiftRiderText: "",
    shiftRiderParse: Portal.DataEngine.parseRiderIds(""),
    vehicleText: {
      operating: Portal.SampleData.operatingVehiclesCsv,
      updates: Portal.SampleData.updateVehiclesCsv,
      branches: Portal.SampleData.updateBranchesCsv,
      riders: Portal.SampleData.ridersCsv,
    },
    vehicleAnalysis: null,
    excelWorkbookFile: null,
    excelReview: {
      workbookName: Portal.Config.referenceAvailability.workbookName,
      sheets: [],
      formulas: [],
      warnings: [
        {
          source: "excel",
          severity: "info",
          code: "upload_reference_workbook",
          message: Portal.Config.referenceAvailability.note,
          suggestion: "ارفع ملف Excel من هذه الصفحة لمراجعة الأوراق والمعادلات من داخل المتصفح.",
        },
      ],
      translatedFunctions: Portal.ExcelEngine.getTranslatedFunctions([]),
    },
    validation: null,
    testResults: Portal.TestEngine.runAll(),
    search: {
      shiftAssignments: "",
      shiftUnassigned: "",
      vehicleAssignments: "",
      vehicleConflicts: "",
      validation: "",
      excelFormulas: "",
    },
    lastPage: "dashboard",
  };

  const phaseOneBlueprint = {
    sourceFiles: 4,
    analysisReports: 6,
    shellPages: 15,
    completedPrompts: 2,
    pendingPrompts: 9,
  };

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

  function formatSar(value) {
    return (Number(value) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " ريال";
  }

  function formatPct(value) {
    return (Number(value) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }) + "%";
  }

  function severityLabel(severity) {
    const map = { high: "High", medium: "Medium", low: "Low", info: "Info" };
    return map[severity] || severity || "Info";
  }

  function severityPillClass(severity) {
    if (severity === "high") {
      return "pill red";
    }
    if (severity === "medium") {
      return "pill gold";
    }
    if (severity === "info") {
      return "pill blue";
    }
    return "pill";
  }

  function createMessageCard(item) {
    return (
      '<div class="note">' +
      "<strong>" + escapeHtml(item.message) + "</strong><br>" +
      '<span class="muted">' + escapeHtml(item.suggestion || "") + "</span>" +
      "</div>"
    );
  }

  function renderEmptyRow(colspan, message) {
    return '<tr><td colspan="' + colspan + '"><div class="empty">' + escapeHtml(message) + "</div></td></tr>";
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return Promise.resolve();
  }

  function downloadText(filename, content, mimeType) {
    const isCsv = /\.csv$/i.test(filename) || String(mimeType || "").toLowerCase().indexOf("text/csv") >= 0;
    const finalContent = isCsv && String(content).charCodeAt(0) !== 0xFEFF
      ? "\uFEFF" + content
      : content;
    const blob = new Blob([finalContent], { type: mimeType || "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function rowMatchesSearch(values, searchValue) {
    if (!searchValue) {
      return true;
    }
    const haystack = values.join(" ").toLowerCase();
    return haystack.indexOf(searchValue.toLowerCase()) >= 0;
  }

  function safeParseStoredState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function persistState() {
    try {
      const payload = {
        page: state.lastPage,
        salaryInput: collectSalaryInput(),
        shift: {
          templateKey: byId("shiftTemplate").value,
          strategy: byId("shiftStrategy").value,
          riderCount: byId("shiftRiderCount").value,
          shiftsPerRider: byId("shiftBundleSize").value,
          shifts: collectShiftRows(),
          riderText: byId("shiftRiderIdsPaste").value,
        },
        vehicle: {
          settings: collectVehicleSettings(),
          operating: byId("operatingVehiclesText").value,
          updates: byId("updateVehiclesText").value,
          branches: byId("updateBranchesText").value,
          riders: byId("ridersText").value,
        },
        search: {
          shiftAssignments: byId("shiftAssignmentsSearch").value,
          shiftUnassigned: byId("shiftUnassignedSearch").value,
          vehicleAssignments: byId("vehicleAssignmentsSearch").value,
          vehicleConflicts: byId("vehicleConflictsSearch").value,
          validation: byId("validationSearch").value,
          excelFormulas: byId("excelFormulaSearch").value,
        },
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Ignore storage failures in local file contexts.
    }
  }

  function setPage(pageKey) {
    state.lastPage = pageKey;
    document.querySelectorAll(".page").forEach(function (page) {
      page.classList.toggle("active", page.id === "page-" + pageKey);
    });
    document.querySelectorAll(".nav-btn").forEach(function (button) {
      button.classList.toggle("active", button.dataset.page === pageKey);
    });
    persistState();
  }

  function collectSalaryInput() {
    return {
      vehicleType: byId("salaryVehicleType").value,
      vehicleSource: byId("salaryVehicleSource").value,
      monthDays: byId("salaryMonthDays").value,
      orders: byId("salaryOrders").value,
      workDays: byId("salaryWorkDays").value,
      vehicleDays: byId("salaryVehicleDays").value,
      validDays: byId("salaryValidDays").value,
      validOverride: byId("salaryValidOverride").value,
      experienceLevel: byId("salaryExperienceLevel").value,
      baseFare: byId("salaryBaseFare").value,
      kmRate: byId("salaryKmRate").value,
      carKm: byId("salaryCarKm").value,
      bikeKm: byId("salaryBikeKm").value,
      companyHousing: byId("salaryCompanyHousing").value === "yes",
      housingDays: byId("salaryHousingDays").value,
      loans: byId("salaryLoans").value,
      otherDeductions: byId("salaryOtherDeductions").value,
    };
  }

  function applySalaryInput(input) {
    byId("salaryVehicleType").value = input.vehicleType;
    byId("salaryVehicleSource").value = input.vehicleSource;
    byId("salaryMonthDays").value = input.monthDays;
    byId("salaryOrders").value = input.orders;
    byId("salaryWorkDays").value = input.workDays;
    byId("salaryVehicleDays").value = input.vehicleDays;
    byId("salaryValidDays").value = input.validDays;
    byId("salaryValidOverride").value = input.validOverride;
    byId("salaryExperienceLevel").value = input.experienceLevel;
    byId("salaryBaseFare").value = input.baseFare;
    byId("salaryKmRate").value = input.kmRate;
    byId("salaryCarKm").value = input.carKm;
    byId("salaryBikeKm").value = input.bikeKm;
    byId("salaryCompanyHousing").value = input.companyHousing ? "yes" : "no";
    byId("salaryHousingDays").value = input.housingDays;
    byId("salaryLoans").value = input.loans;
    byId("salaryOtherDeductions").value = input.otherDeductions;
  }

  function getSalaryScenario(name) {
    const input = Portal.SalaryEngine.createDefaultInput();
    if (name === "bike") {
      input.vehicleType = "bike";
    }
    if (name === "invalid") {
      input.orders = 300;
      input.validDays = 5;
      input.validOverride = "auto";
    }
    if (name === "midMonth") {
      input.workDays = 17;
      input.vehicleDays = 17;
    }
    return input;
  }

  function renderSalary() {
    const result = state.salaryResult;
    byId("salaryNetPay").textContent = formatSar(result.netPay);
    const badge = byId("salaryBadge");
    badge.className = result.isValid ? "pill" : "pill red";
    badge.textContent = result.statusLabel;

    byId("salaryKpis").innerHTML = [
      { label: "إجمالي عائد الطلبات", value: formatSar(result.deliveryRevenue), className: "kpi good" },
      { label: "حافز الصلاحية", value: formatSar(result.validityIncentive), className: "kpi" },
      { label: "حافز التجربة", value: formatSar(result.experienceIncentive), className: "kpi" },
      { label: "إجمالي الخصومات", value: formatSar(result.totalDeductions), className: "kpi bad" },
    ].map(function (item) {
      return '<div class="' + item.className + '"><b>' + item.label + "</b><strong>" + item.value + "</strong></div>";
    }).join("");

    const breakdownRows = [
      ["عائد الطلب الواحد", formatSar(result.perOrderRevenue)],
      ["متوسط الكيلومترات", result.averageKm + " كم"],
      ["عمولة الشركة", formatSar(result.commission)],
      ["إيجار المركبة", formatSar(result.rent)],
      ["السكن", formatSar(result.housing)],
      ["السلف", formatSar(result.loans)],
      ["خصومات أخرى", formatSar(result.otherDeductions)],
      ["إجمالي الحوافز", formatSar(result.totalIncentives)],
      ["صافي اليوم", formatSar(result.dailyNet)],
    ];
    byId("salaryBreakdownBody").innerHTML = breakdownRows.map(function (row) {
      return "<tr><td>" + escapeHtml(row[0]) + "</td><td>" + escapeHtml(row[1]) + "</td></tr>";
    }).join("");

    byId("salaryValidations").innerHTML = result.validations.length
      ? result.validations.map(createMessageCard).join("")
      : '<div class="empty">لا توجد ملاحظات تحقق حالياً.</div>';
  }

  function runSalary() {
    state.salaryInput = collectSalaryInput();
    state.salaryResult = Portal.SalaryEngine.calculate(state.salaryInput);
    renderSalary();
    refreshDerivedViews();
    persistState();
  }

  function renderRules() {
    const validityTables = ["car", "bike"].map(function (vehicleType) {
      const title = vehicleType === "car" ? "السيارة" : "الدباب";
      const rows = Portal.Config.salary.validityTiers[vehicleType].map(function (tier, index, all) {
        let range = tier.minOrders + "+";
        if (tier.tier === "E") {
          range = "< " + Portal.Config.salary.minimumOrders[vehicleType];
        } else if (index > 0) {
          range = tier.minOrders + " - " + (all[index - 1].minOrders - 1);
        }
        return "<tr><td>" + tier.tier + "</td><td>" + escapeHtml(range) + "</td><td>" + escapeHtml(formatSar(tier.incentive)) + "</td></tr>";
      }).join("");
      return (
        '<div class="surface" style="margin-bottom:12px">' +
        "<h3>" + title + "</h3>" +
        '<div class="table-wrap"><table><thead><tr><th>الفئة</th><th>الطلبات</th><th>الحافز</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div></div>"
      );
    }).join("");
    byId("rulesValidityTable").innerHTML = validityTables;

    const experienceRows = ["A", "B", "C"].map(function (tier) {
      const labelMap = { A: "أعلى 30%", B: "الـ 55% التالية", C: "الـ 15% الأخيرة" };
      return (
        "<tr><td>" + tier + "</td><td>" + labelMap[tier] + "</td><td>" +
        formatSar(Portal.Config.salary.experienceLevels.car[tier]) +
        "</td><td>" + formatSar(Portal.Config.salary.experienceLevels.bike[tier]) + "</td></tr>"
      );
    }).join("");
    byId("rulesExperienceTable").innerHTML =
      '<table><thead><tr><th>المستوى</th><th>ترتيب المدينة</th><th>سيارة</th><th>دباب</th></tr></thead><tbody>' +
      experienceRows + "</tbody></table>";

    byId("rulesFormulaList").innerHTML = [
      "عائد الطلب = سعر الطلب + (متوسط الكيلومترات × سعر الكيلو).",
      "إجمالي عائد الطلبات = عدد الطلبات × عائد الطلب.",
      "العمولة = 2500 ÷ أيام الشهر × أيام العمل الفعلية.",
      "إيجار السيارة = 1800 ÷ أيام الشهر × أيام وجود السيارة.",
      "إيجار الدباب = 800 ÷ أيام الشهر × أيام وجود الدباب.",
      "السكن = 200 ÷ أيام الشهر × أيام السكن.",
      "الصافي = عائد الطلبات + حافز الصلاحية + حافز التجربة - جميع الخصومات.",
    ].map(function (item) {
      return '<div class="note">' + escapeHtml(item) + "</div>";
    }).join("");

    byId("rulesVehicleList").innerHTML = [
      "Operating Vehicles هو مصدر الحقيقة للمركبات التشغيلية.",
      "Vehicle Serial هو المفتاح الأساسي للمطابقة والدمج.",
      "لا يتم قبول المركبات غير التشغيلية أو المسحوبة أو التالفة أو في الصيانة.",
      "السيارة حدها 2 يوزر والدباب 3 يوزرات مع قابلية التعديل من الإعدادات.",
      "يمنع خلط جدة والرياض أو خلط السجل إلا عند وجود اتفاقية مباشرة معتمدة.",
      "الأولوية لتثبيت المندوب على مركبته الحالية إن كانت مطابقة وصحيحة.",
      "إذا وُجد تعارض بين البيانات، يتم إظهار warning صريح بدل التخمين.",
    ].map(function (item) {
      return '<div class="note">' + escapeHtml(item) + "</div>";
    }).join("");
  }

  function collectShiftRows() {
    return state.shiftInput.shifts.map(function (shift, index) {
      return {
        code: shift.code,
        label: shift.label,
        time: shift.time,
        target: byId("shiftTarget_" + index).value,
        max: byId("shiftMax_" + index).value,
      };
    });
  }

  function applyShiftTemplate(templateKey) {
    const template = Portal.ShiftEngine.getTemplate(templateKey);
    state.shiftInput.templateKey = templateKey;
    state.shiftInput.shifts = template;
    if (!state.shiftInput.shiftsPerRider || state.shiftInput.shiftsPerRider > template.length) {
      state.shiftInput.shiftsPerRider = Math.min(3, template.length);
    }
    renderShiftConfigRows();
    persistState();
  }

  function renderShiftConfigRows() {
    byId("shiftConfigBody").innerHTML = state.shiftInput.shifts.map(function (shift, index) {
      return (
        "<tr>" +
        "<td>" + escapeHtml(shift.label) + "</td>" +
        "<td>" + escapeHtml(shift.time) + "</td>" +
        '<td><input id="shiftTarget_' + index + '" type="number" min="0" value="' + escapeHtml(shift.target) + '"></td>' +
        '<td><input id="shiftMax_' + index + '" type="number" min="0" value="' + escapeHtml(shift.max) + '"></td>' +
        "</tr>"
      );
    }).join("");
  }

  function renderShiftRiderStatus(parsed) {
    const status = byId("shiftRiderStatus");
    if (!parsed || !parsed.ids.length) {
      status.className = "status-box warn";
      status.innerHTML = "لم يتم تحميل أيديهات بعد. سيستخدم النظام <b>Rider 1 / Rider 2</b> إذا تم التوزيع الآن.";
      return;
    }
    status.className = "status-box good";
    status.innerHTML =
      "تمت قراءة <b>" + parsed.uniqueCount + "</b> أيدي فريدة" +
      (parsed.duplicateCount ? " مع استبعاد <b>" + parsed.duplicateCount + "</b> تكرارات" : "") +
      (parsed.ignoredCount ? " وتجاهل <b>" + parsed.ignoredCount + "</b> قيم غير صالحة أو Header" : "") + ".";
  }

  function syncShiftRiderIds(updateCount) {
    state.shiftRiderText = byId("shiftRiderIdsPaste").value;
    state.shiftRiderParse = Portal.DataEngine.parseRiderIds(state.shiftRiderText);
    if (updateCount !== false && state.shiftRiderParse.ids.length) {
      byId("shiftRiderCount").value = state.shiftRiderParse.ids.length;
    }
    renderShiftRiderStatus(state.shiftRiderParse);
    persistState();
    return state.shiftRiderParse;
  }

  async function loadShiftRiderFile(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    byId("shiftRiderIdsPaste").value = await file.text();
    syncShiftRiderIds(true);
  }

  function clearShiftRiderIds() {
    byId("shiftRiderIdsPaste").value = "";
    byId("shiftRiderIdsFile").value = "";
    state.shiftRiderText = "";
    state.shiftRiderParse = Portal.DataEngine.parseRiderIds("");
    renderShiftRiderStatus(state.shiftRiderParse);
    persistState();
  }

  function collectShiftInput() {
    const parsed = syncShiftRiderIds(false);
    const shifts = collectShiftRows();
    return {
      templateKey: byId("shiftTemplate").value,
      riderCount: byId("shiftRiderCount").value,
      riderIds: parsed.ids,
      shiftsPerRider: byId("shiftBundleSize").value,
      strategy: byId("shiftStrategy").value,
      shifts: shifts,
    };
  }

  function renderShift() {
    const result = state.shiftPlan;
    const assignmentsSearch = byId("shiftAssignmentsSearch").value.trim();
    const unassignedSearch = byId("shiftUnassignedSearch").value.trim();

    byId("shiftKpis").innerHTML = [
      { label: "إجمالي الأيديهات", value: result.totalInputRiders, className: "kpi" },
      { label: "عدد الموزعين", value: result.rows.length, className: "kpi good" },
      { label: "غير موزعين", value: result.unassigned.length, className: "kpi " + (result.unassigned.length ? "warn" : "good") },
      { label: "إجمالي Target", value: result.totalTarget, className: "kpi" },
      { label: "إجمالي Assigned", value: result.totalAssigned, className: "kpi good" },
      { label: "Coverage", value: formatPct(result.coveragePct || 0), className: "kpi " + (result.totalDeficit ? "warn" : "good") },
    ].map(function (item) {
      return '<div class="' + item.className + '"><b>' + item.label + "</b><strong>" + item.value + "</strong></div>";
    }).join("");

    byId("shiftCoverageBody").innerHTML = result.shiftStats.map(function (stat) {
      return (
        "<tr>" +
        "<td>" + escapeHtml(stat.label) + "<br><span class='muted'>" + escapeHtml(stat.time) + "</span></td>" +
        "<td>" + stat.target + "</td>" +
        "<td>" + stat.assigned + "</td>" +
        "<td>" + stat.max + "</td>" +
        "<td>" + formatPct(stat.coverage) + "</td>" +
        "<td class='" + (stat.deficit ? "warn-text" : "good-text") + "'>" + stat.deficit + "</td>" +
        "<td>" + stat.surplus + "</td>" +
        "</tr>"
      );
    }).join("");

    const assignmentRows = result.rows.filter(function (row) {
      return rowMatchesSearch(
        [row.riderId, row.shift_1, row.shift_2, row.shift_3, row.shiftsText, row.combinationType],
        assignmentsSearch
      );
    });
    byId("shiftAssignmentsBody").innerHTML = assignmentRows.length
      ? assignmentRows.map(function (row) {
          return (
            "<tr>" +
            "<td>" + escapeHtml(row.riderId) + "</td>" +
            "<td>" + escapeHtml(row.shift_1) + "</td>" +
            "<td>" + escapeHtml(row.shift_2) + "</td>" +
            "<td>" + escapeHtml(row.shift_3) + "</td>" +
            "<td>" + escapeHtml(row.shiftsText) + "</td>" +
            "<td>" + escapeHtml(row.combinationType) + "</td>" +
            "</tr>"
          );
        }).join("")
      : renderEmptyRow(6, "لا توجد نتائج مطابقة للبحث الحالي.");

    const unassignedRows = result.unassigned.filter(function (row) {
      return rowMatchesSearch([row.riderId, row.reason], unassignedSearch);
    });
    byId("shiftUnassignedBody").innerHTML = unassignedRows.length
      ? unassignedRows.map(function (row) {
          return "<tr><td>" + escapeHtml(row.riderId) + "</td><td>" + escapeHtml(row.reason) + "</td></tr>";
        }).join("")
      : renderEmptyRow(2, result.unassigned.length ? "لا توجد نتائج مطابقة للبحث الحالي." : "لا يوجد غير موزعين.");

    byId("shiftWarnings").innerHTML = result.warnings.length
      ? result.warnings.map(createMessageCard).join("")
      : '<div class="empty">لا توجد تحذيرات إضافية في التوزيع الحالي.</div>';
  }

  function runShift() {
    state.shiftInput = collectShiftInput();
    state.shiftPlan = Portal.ShiftEngine.plan(state.shiftInput);
    renderShift();
    refreshDerivedViews();
    persistState();
  }

  function resetShift() {
    state.shiftInput = Portal.ShiftEngine.createDefaultInput();
    byId("shiftTemplate").value = state.shiftInput.templateKey;
    byId("shiftStrategy").value = state.shiftInput.strategy;
    byId("shiftRiderCount").value = state.shiftInput.riderCount;
    byId("shiftBundleSize").value = state.shiftInput.shiftsPerRider;
    state.shiftInput.shifts = Portal.ShiftEngine.getTemplate(state.shiftInput.templateKey);
    renderShiftConfigRows();
    clearShiftRiderIds();
    byId("shiftAssignmentsSearch").value = "";
    byId("shiftUnassignedSearch").value = "";
    runShift();
  }

  function buildShiftAssignmentsCsv() {
    return Portal.Utils.toCsv(state.shiftPlan.rows, [
      { key: "riderId", label: "user_id" },
      { key: "shift_1", label: "shift_1" },
      { key: "shift_2", label: "shift_2" },
      { key: "shift_3", label: "shift_3" },
      { key: "shiftsText", label: "shifts_text" },
      { key: "combinationType", label: "combination_type" },
    ]);
  }

  function buildShiftSummaryCsv() {
    return Portal.Utils.toCsv(state.shiftPlan.shiftStats, [
      { key: "label", label: "shift" },
      { key: "time", label: "time" },
      { key: "target", label: "target" },
      { key: "assigned", label: "assigned" },
      { key: "max", label: "max" },
      { key: "deficit", label: "deficit" },
      { key: "surplus", label: "surplus" },
      { key: "coverage", label: "coverage_pct" },
    ]);
  }

  function exportShiftCsv() {
    if (!state.shiftPlan) {
      return;
    }
    downloadText("shift_assignments.csv", buildShiftAssignmentsCsv(), "text/csv;charset=utf-8");
  }

  function exportShiftSummaryCsv() {
    if (!state.shiftPlan) {
      return;
    }
    downloadText("shift_summary.csv", buildShiftSummaryCsv(), "text/csv;charset=utf-8");
  }

  function copyShiftResults() {
    if (!state.shiftPlan) {
      return;
    }
    const lines = [
      "Shift Summary",
      "Assigned riders: " + state.shiftPlan.rows.length,
      "Unassigned riders: " + state.shiftPlan.unassigned.length,
      "",
      buildShiftAssignmentsCsv(),
    ];
    copyText(lines.join("\n"));
  }

  async function readFileAsText(file) {
    return file.text();
  }

  async function readFileAsArrayBuffer(file) {
    return file.arrayBuffer();
  }

  async function convertFileToCsvText(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) {
      return { csvText: await readFileAsText(file), meta: file.name + " · CSV" };
    }
    if ((name.endsWith(".xlsx") || name.endsWith(".xls")) && window.XLSX) {
      const buffer = await readFileAsArrayBuffer(file);
      const workbook = window.XLSX.read(buffer, { type: "array", cellFormula: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return {
        csvText: window.XLSX.utils.sheet_to_csv(sheet),
        workbook: workbook,
        meta: file.name + " · " + sheetName,
      };
    }
    throw new Error("صيغة الملف غير مدعومة أو مكتبة XLSX غير متاحة.");
  }

  function collectVehicleSettings() {
    return {
      carCapacity: Number(byId("vehicleCarCapacity").value) || 2,
      bikeCapacity: Number(byId("vehicleBikeCapacity").value) || 3,
      dashboardRule: byId("vehicleDashboardRule").value,
      strictCity: byId("vehicleStrictCity").checked,
      strictRegister: byId("vehicleStrictRegister").checked,
    };
  }

  function applyVehicleSettings(settings) {
    byId("vehicleCarCapacity").value = settings.carCapacity;
    byId("vehicleBikeCapacity").value = settings.bikeCapacity;
    byId("vehicleDashboardRule").value = settings.dashboardRule;
    byId("vehicleStrictCity").checked = !!settings.strictCity;
    byId("vehicleStrictRegister").checked = !!settings.strictRegister;
  }

  function loadVehicleSamples() {
    byId("operatingVehiclesText").value = Portal.SampleData.operatingVehiclesCsv;
    byId("updateVehiclesText").value = Portal.SampleData.updateVehiclesCsv;
    byId("updateBranchesText").value = Portal.SampleData.updateBranchesCsv;
    byId("ridersText").value = Portal.SampleData.ridersCsv;
    byId("operatingVehiclesMeta").textContent = "Sample loaded from local project";
    byId("updateVehiclesMeta").textContent = "Sample loaded from local project";
    byId("updateBranchesMeta").textContent = "Sample loaded from local project";
    byId("ridersMeta").textContent = "Sample loaded from local project";
  }

  function renderVehicle() {
    const result = state.vehicleAnalysis;
    const assignmentsSearch = byId("vehicleAssignmentsSearch").value.trim();
    const conflictsSearch = byId("vehicleConflictsSearch").value.trim();

    byId("vehicleKpis").innerHTML = [
      { label: "Rows Riders", value: result.counts.riders, className: "kpi" },
      { label: "Valid Assignments", value: result.validAssignments.length, className: "kpi good" },
      { label: "Available Vehicles", value: result.availableVehicles.length, className: "kpi" },
      { label: "Full Vehicles", value: result.fullVehicles.length, className: "kpi " + (result.fullVehicles.length ? "warn" : "good") },
      { label: "Open Conflicts", value: result.conflicts.length, className: "kpi " + (result.conflicts.length ? "bad" : "good") },
      { label: "Excluded Vehicles", value: result.excludedVehicles.length, className: "kpi" },
    ].map(function (item) {
      return '<div class="' + item.className + '"><b>' + item.label + "</b><strong>" + item.value + "</strong></div>";
    }).join("");

    const assignmentRows = result.validAssignments.filter(function (item) {
      return rowMatchesSearch(
        [item.riderId, item.riderName, item.vehicleSerial, item.city, item.register, item.notes],
        assignmentsSearch
      );
    });
    byId("vehicleAssignmentsBody").innerHTML = assignmentRows.length
      ? assignmentRows.map(function (item) {
          return (
            "<tr>" +
            "<td>" + escapeHtml(item.riderId || item.riderName) + "</td>" +
            "<td>" + escapeHtml(item.riderName || "") + "</td>" +
            "<td>" + escapeHtml(item.vehicleSerial) + "</td>" +
            "<td>" + escapeHtml(item.city) + "</td>" +
            "<td>" + escapeHtml(item.register) + "</td>" +
            "<td>" + item.occupancy + " / " + item.capacityLimit + "</td>" +
            "<td>" + escapeHtml(item.notes) + "</td>" +
            "</tr>"
          );
        }).join("")
      : renderEmptyRow(7, "لا توجد نتائج مطابقة للبحث الحالي.");

    const unassignedRows = result.unassignedRiders.filter(function (item) {
      return rowMatchesSearch([item.riderId, item.riderName, item.code, item.reason], conflictsSearch);
    });
    byId("vehicleUnassignedBody").innerHTML = unassignedRows.length
      ? unassignedRows.map(function (item) {
          return (
            "<tr>" +
            "<td>" + escapeHtml(item.riderId || item.riderName) + "</td>" +
            "<td>" + escapeHtml(item.code) + "</td>" +
            "<td>" + escapeHtml(item.reason) + "</td>" +
            "<td>" + escapeHtml(item.suggestion) + "</td>" +
            "</tr>"
          );
        }).join("")
      : renderEmptyRow(4, result.unassignedRiders.length ? "لا توجد نتائج مطابقة للبحث الحالي." : "لا يوجد مستخدمون غير موزعين.");

    const utilizationRows = result.vehicleUtilization.filter(function (item) {
      return rowMatchesSearch([item.vehicleSerial, item.city, item.register, item.assignedRiders.join(" ")], conflictsSearch);
    });
    byId("vehicleUtilizationBody").innerHTML = utilizationRows.length
      ? utilizationRows.map(function (item) {
          return (
            "<tr>" +
            "<td>" + escapeHtml(item.vehicleSerial) + "</td>" +
            "<td>" + escapeHtml(item.vehicleType) + "</td>" +
            "<td>" + escapeHtml(item.city) + "</td>" +
            "<td>" + escapeHtml(item.register) + "</td>" +
            "<td>" + item.occupancy + " / " + item.capacityLimit + "</td>" +
            "<td>" + item.availableSlots + "</td>" +
            "<td>" + escapeHtml(item.assignedRiders.join(" | ")) + "</td>" +
            "</tr>"
          );
        }).join("")
      : renderEmptyRow(7, "لا توجد مركبات مطابقة للبحث الحالي.");

    byId("vehicleConflictsBody").innerHTML = result.conflicts.length
      ? result.conflicts.filter(function (item) {
          return rowMatchesSearch([item.riderId, item.riderName, item.code, item.message, item.suggestion], conflictsSearch);
        }).map(function (item) {
          return (
            "<tr>" +
            "<td>" + escapeHtml(item.riderId || item.riderName) + "</td>" +
            "<td>" + escapeHtml(item.code) + "</td>" +
            "<td>" + escapeHtml(item.message) + "</td>" +
            "<td>" + escapeHtml(item.suggestion) + "</td>" +
            "</tr>"
          );
        }).join("")
      : renderEmptyRow(4, "لا توجد Conflicts غير محلولة.");

    const warnings = result.warnings.slice();
    if (result.orphanUpdates.length) {
      warnings.push({
        message: "صفوف Update Vehicles غير المطابقة: " + result.orphanUpdates.map(function (item) { return item.serial; }).join(", "),
        suggestion: "تحقق من وجود هذه المركبات داخل Operating Vehicles أو صحّح السيريال.",
      });
    }
    if (result.excludedVehicles.length) {
      warnings.push({
        message: "المركبات المستبعدة: " + result.excludedVehicles.map(function (item) { return item.serial + " (" + item.rawStatus + ")"; }).join(", "),
        suggestion: "تم استبعادها تلقائيًا من التوزيع.",
      });
    }
    byId("vehicleWarnings").innerHTML = warnings.length
      ? warnings.map(createMessageCard).join("")
      : '<div class="empty">لا توجد تحذيرات إضافية في البيانات الحالية.</div>';
  }

  function runVehicleAnalysis() {
    state.vehicleText = {
      operating: byId("operatingVehiclesText").value,
      updates: byId("updateVehiclesText").value,
      branches: byId("updateBranchesText").value,
      riders: byId("ridersText").value,
    };
    state.vehicleAnalysis = Portal.VehicleEngine.assignVehicles({
      operatingRows: Portal.DataEngine.parseCsvRows(state.vehicleText.operating),
      updateRows: Portal.DataEngine.parseCsvRows(state.vehicleText.updates),
      branchRows: Portal.DataEngine.parseCsvRows(state.vehicleText.branches),
      riderRows: Portal.DataEngine.parseCsvRows(state.vehicleText.riders),
      settings: collectVehicleSettings(),
    });
    renderVehicle();
    refreshDerivedViews();
    persistState();
  }

  function resetVehiclePage() {
    applyVehicleSettings(Portal.VehicleEngine.createDefaultSettings());
    loadVehicleSamples();
    byId("vehicleAssignmentsSearch").value = "";
    byId("vehicleConflictsSearch").value = "";
    runVehicleAnalysis();
  }

  function renderTestRows(targetId) {
    byId(targetId).innerHTML = state.testResults.results.map(function (result) {
      return (
        "<tr>" +
        "<td>" + escapeHtml(result.name) + "</td>" +
        "<td><span class='" + (result.passed ? "pill" : "pill red") + "'>" + (result.passed ? "PASS" : "FAIL") + "</span></td>" +
        "<td>" + escapeHtml(result.details) + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function renderExcel() {
    const review = state.excelReview;
    byId("excelStatus").textContent = review.warnings.length
      ? review.warnings[0].message
      : "تم تحليل المصنف بنجاح.";

    byId("excelSheetsBody").innerHTML = review.sheets.length
      ? review.sheets.map(function (sheet) {
          return (
            "<tr>" +
            "<td>" + escapeHtml(sheet.sheet) + "</td>" +
            "<td>" + escapeHtml(sheet.range) + "</td>" +
            "<td>" + sheet.rowCount + "</td>" +
            "<td>" + sheet.columnCount + "</td>" +
            "<td>" + sheet.formulaCount + "</td>" +
            "</tr>"
          );
        }).join("")
      : renderEmptyRow(5, "لم يتم تحميل Workbook بعد.");

    const formulaSearch = byId("excelFormulaSearch").value.trim();
    const formulaRows = review.formulas.filter(function (formula) {
      return rowMatchesSearch([formula.sheet, formula.cell, formula.formula, formula.value], formulaSearch);
    }).slice(0, 120);
    byId("excelFormulasBody").innerHTML = formulaRows.length
      ? formulaRows.map(function (formula) {
          return (
            "<tr>" +
            "<td>" + escapeHtml(formula.sheet) + "</td>" +
            "<td>" + escapeHtml(formula.cell) + "</td>" +
            "<td>" + escapeHtml(formula.formula) + "</td>" +
            "<td>" + escapeHtml(String(formula.value)) + "</td>" +
            "</tr>"
          );
        }).join("")
      : renderEmptyRow(4, review.formulas.length ? "لا توجد معادلات مطابقة للبحث الحالي." : "لا توجد معادلات مكتشفة حالياً.");

    byId("excelFunctionsBody").innerHTML = (review.translatedFunctions || []).map(function (item) {
      return (
        "<tr>" +
        "<td>" + escapeHtml(item.name) + "</td>" +
        "<td>" + escapeHtml(item.source) + "</td>" +
        "<td>" + escapeHtml(item.description) + "</td>" +
        "</tr>"
      );
    }).join("");

    byId("excelWarnings").innerHTML = review.warnings.length
      ? review.warnings.map(createMessageCard).join("")
      : '<div class="empty">لا توجد تحذيرات حالياً.</div>';
  }

  function buildOperationsSummary() {
    const validationSummary = state.validation ? state.validation.summary : { total: 0, high: 0 };
    return [
      "المرحلة الحالية أنهت مخرجات Prompt 0 الأساسية وتركز الآن على مواءمة Prompt 1 بصيغة shell واضحة قبل تشغيل منطق البيانات الفعلي.",
      "تم اعتماد " + phaseOneBlueprint.sourceFiles + " ملفات مصدر رئيسية و" + phaseOneBlueprint.analysisReports + " مخرجات تحليل/تنفيذ داخل docs لتثبيت فهم المشروع وربطه بخارطة الطريق.",
      "خط التنفيذ التالي هو Prompt 2: Data Model + Storage + Import Registry، ثم Prompt 3 لتشغيل Rider Master وOperations State على نفس النموذج.",
      "صفحات الأداء والمركبات والشفتات والإقفال موجودة الآن كـ shell أو prototype مرجعي، مع وجود " + validationSummary.total + " ملاحظات متابعة حالية منها " + validationSummary.high + " عالية الأولوية.",
    ].join(" ");
  }

  function renderHero() {
    const validationSummary = state.validation ? state.validation.summary : { total: 0 };
    byId("heroKpis").innerHTML = [
      { label: "Source Workbooks", value: phaseOneBlueprint.sourceFiles },
      { label: "Prompt 0 Outputs", value: phaseOneBlueprint.analysisReports },
      { label: "Prompt 1 Shell Pages", value: phaseOneBlueprint.shellPages },
      { label: "Open Prototype Issues", value: validationSummary.total || 0 },
    ].map(function (item) {
      return '<div class="hero-kpi"><b>' + item.label + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");
  }

  function renderOverview() {
    byId("overviewKpis").innerHTML = [
      { label: "Primary Source Files", value: phaseOneBlueprint.sourceFiles, className: "kpi good" },
      { label: "Completed Prompts", value: phaseOneBlueprint.completedPrompts, className: "kpi good" },
      { label: "Shell Pages", value: phaseOneBlueprint.shellPages, className: "kpi good" },
      { label: "Pending Prompts", value: phaseOneBlueprint.pendingPrompts, className: "kpi warn" },
    ].map(function (item) {
      return '<div class="' + item.className + '"><b>' + item.label + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");

    byId("readinessCards").innerHTML = [
      { label: "Current State Review", value: "Completed" },
      { label: "Sheet Deep Analysis", value: "Completed" },
      { label: "Formula Logic Map", value: "Completed" },
      { label: "Conditional Rules Map", value: "Completed" },
      { label: "Data Model Proposal", value: "Ready for Prompt 2" },
      { label: "Implementation Sequence", value: "Aligned to roadmap" },
    ].map(function (item) {
      return '<div class="metric"><b>' + item.label + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");

    byId("workspaceNotice").textContent =
      "تم توجيه الواجهة لهذه المرحلة لتخدم الهيكل العام والتحليل المعماري أولًا. ملاحظة مرجعية: " +
      Portal.Config.referenceAvailability.note;
    byId("overviewNarrative").textContent = buildOperationsSummary();
    renderTestRows("dashboardTestsBody");
  }

  function renderValidation() {
    const validation = state.validation;
    const validationSearch = byId("validationSearch").value.trim();
    const shiftPlan = state.shiftPlan || { shiftStats: [], totalInputRiders: 0, rows: [], unassigned: [] };
    const vehicleAnalysis = state.vehicleAnalysis || {
      cityMismatch: [],
      registerMismatch: [],
      excludedVehicles: [],
      capacityViolations: [],
    };
    const salaryWarnings = state.salaryResult ? state.salaryResult.validations.length : 0;

    byId("validationKpis").innerHTML = [
      { label: "Total", value: validation.summary.total, className: "kpi" },
      { label: "High", value: validation.summary.high, className: "kpi bad" },
      { label: "Medium", value: validation.summary.medium, className: "kpi warn" },
      { label: "Low / Info", value: (validation.summary.low || 0) + (validation.summary.info || 0), className: "kpi" },
    ].map(function (item) {
      return '<div class="' + item.className + '"><b>' + item.label + "</b><strong>" + item.value + "</strong></div>";
    }).join("");

    byId("validationOpsKpis").innerHTML = [
      { label: "عدد الأيديهات", value: shiftPlan.totalInputRiders || 0, className: "kpi" },
      { label: "عدد الموزعين", value: shiftPlan.rows.length || 0, className: "kpi good" },
      { label: "غير الموزعين", value: shiftPlan.unassigned.length || 0, className: "kpi " + ((shiftPlan.unassigned.length || 0) ? "warn" : "good") },
      { label: "أخطاء Max", value: shiftPlan.shiftStats.filter(function (stat) { return !stat.withinMax; }).length, className: "kpi" },
      { label: "أخطاء المدينة", value: vehicleAnalysis.cityMismatch.length || 0, className: "kpi" },
      { label: "أخطاء السجل", value: vehicleAnalysis.registerMismatch.length || 0, className: "kpi" },
      { label: "المركبات المستبعدة", value: vehicleAnalysis.excludedVehicles.length || 0, className: "kpi" },
      { label: "تحذيرات الحوافز", value: salaryWarnings, className: "kpi" },
    ].map(function (item) {
      return '<div class="' + item.className + '"><b>' + item.label + "</b><strong>" + item.value + "</strong></div>";
    }).join("");

    const issues = validation.issues.filter(function (issue) {
      return rowMatchesSearch([issue.source, issue.severity, issue.message, issue.suggestion], validationSearch);
    });
    byId("validationBody").innerHTML = issues.length
      ? issues.map(function (issue) {
          return (
            "<tr>" +
            "<td>" + escapeHtml(issue.source || "") + "</td>" +
            "<td><span class='" + severityPillClass(issue.severity) + "'>" + severityLabel(issue.severity) + "</span></td>" +
            "<td>" + escapeHtml(issue.message) + "</td>" +
            "<td>" + escapeHtml(issue.suggestion || "") + "</td>" +
            "</tr>"
          );
        }).join("")
      : renderEmptyRow(4, validation.issues.length ? "لا توجد نتائج مطابقة للبحث الحالي." : "لا توجد Issues حالياً.");

    renderTestRows("testBody");
  }

  function renderExportCenter() {
    byId("exportOverview").textContent = buildOperationsSummary();
    byId("exportSummaryList").innerHTML = [
      "Salary: " + (state.salaryResult ? formatSar(state.salaryResult.netPay) : "غير محسوب"),
      "Shift Assignments: " + (state.shiftPlan ? state.shiftPlan.rows.length : 0),
      "Shift Unassigned: " + (state.shiftPlan ? state.shiftPlan.unassigned.length : 0),
      "Vehicles: " + (state.vehicleAnalysis ? state.vehicleAnalysis.validAssignments.length + " valid / " + state.vehicleAnalysis.conflicts.length + " conflicts" : "غير محلل"),
      "Validation: " + (state.validation ? state.validation.summary.total + " issues" : "غير محدث"),
    ].map(function (item) {
      return '<div class="note">' + escapeHtml(item) + "</div>";
    }).join("");
  }

  function refreshDerivedViews() {
    state.validation = Portal.ValidationEngine.buildUnifiedIssues({
      salaryResult: state.salaryResult,
      shiftPlan: state.shiftPlan,
      vehicleAnalysis: state.vehicleAnalysis,
      excelReview: state.excelReview,
      testResults: state.testResults,
    });
    renderHero();
    renderOverview();
    renderValidation();
    renderExportCenter();
  }

  function exportSalaryCsv() {
    if (!state.salaryResult) {
      return;
    }
    downloadText(
      "salary_breakdown.csv",
      Portal.Utils.toCsv([
        { item: "Net Pay", value: state.salaryResult.netPay },
        { item: "Per Order Revenue", value: state.salaryResult.perOrderRevenue },
        { item: "Delivery Revenue", value: state.salaryResult.deliveryRevenue },
        { item: "Validity Incentive", value: state.salaryResult.validityIncentive },
        { item: "Experience Incentive", value: state.salaryResult.experienceIncentive },
        { item: "Commission", value: state.salaryResult.commission },
        { item: "Rent", value: state.salaryResult.rent },
        { item: "Housing", value: state.salaryResult.housing },
        { item: "Total Deductions", value: state.salaryResult.totalDeductions },
      ], [
        { key: "item", label: "Item" },
        { key: "value", label: "Value" },
      ]),
      "text/csv;charset=utf-8"
    );
  }

  function exportVehicleAssignmentsCsv() {
    if (!state.vehicleAnalysis) {
      return;
    }
    downloadText(
      "vehicle_assignments.csv",
      Portal.Utils.toCsv(state.vehicleAnalysis.validAssignments, [
        { key: "riderId", label: "Rider ID" },
        { key: "riderName", label: "Rider Name" },
        { key: "vehicleSerial", label: "Vehicle Serial" },
        { key: "vehicleType", label: "Vehicle Type" },
        { key: "city", label: "City" },
        { key: "register", label: "Register" },
        { key: "occupancy", label: "Occupancy" },
        { key: "capacityLimit", label: "Capacity Limit" },
        { key: "notes", label: "Notes" },
      ]),
      "text/csv;charset=utf-8"
    );
  }

  function exportVehicleIssuesCsv() {
    if (!state.vehicleAnalysis) {
      return;
    }
    downloadText(
      "vehicle_issues.csv",
      Portal.Utils.toCsv(state.vehicleAnalysis.unassignedRiders, [
        { key: "riderId", label: "Rider ID" },
        { key: "riderName", label: "Rider Name" },
        { key: "code", label: "Code" },
        { key: "reason", label: "Reason" },
        { key: "suggestion", label: "Suggestion" },
      ]),
      "text/csv;charset=utf-8"
    );
  }

  function exportVehicleUtilizationCsv() {
    if (!state.vehicleAnalysis) {
      return;
    }
    downloadText(
      "vehicle_utilization.csv",
      Portal.Utils.toCsv(state.vehicleAnalysis.vehicleUtilization, [
        { key: "vehicleSerial", label: "vehicle_serial" },
        { key: "vehicleType", label: "vehicle_type" },
        { key: "city", label: "city" },
        { key: "register", label: "register" },
        { key: "occupancy", label: "occupancy" },
        { key: "capacityLimit", label: "capacity_limit" },
        { key: "availableSlots", label: "available_slots" },
        { key: "assignedRiders", label: "assigned_riders" },
      ]),
      "text/csv;charset=utf-8"
    );
  }

  function exportValidationCsv() {
    if (!state.validation) {
      return;
    }
    downloadText(
      "validation_issues.csv",
      Portal.Utils.toCsv(state.validation.issues, [
        { key: "source", label: "Source" },
        { key: "severity", label: "Severity" },
        { key: "message", label: "Message" },
        { key: "suggestion", label: "Suggestion" },
      ]),
      "text/csv;charset=utf-8"
    );
  }

  function exportTestsCsv() {
    downloadText(
      "portal_tests.csv",
      Portal.Utils.toCsv(state.testResults.results, [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "passed", label: "Passed" },
        { key: "details", label: "Details" },
      ]),
      "text/csv;charset=utf-8"
    );
  }

  function exportWorkbookReport() {
    downloadText("excel_conversion_report.md", Portal.ExcelEngine.buildConversionReport(state.excelReview), "text/markdown;charset=utf-8");
  }

  function exportSnapshotJson() {
    downloadText(
      "keeta_operations_snapshot.json",
      JSON.stringify({
        salaryResult: state.salaryResult,
        shiftPlan: state.shiftPlan,
        vehicleAnalysis: state.vehicleAnalysis,
        excelReview: state.excelReview,
        validation: state.validation,
        tests: state.testResults,
      }, null, 2),
      "application/json;charset=utf-8"
    );
  }

  async function analyzeExcelWorkbook() {
    if (!state.excelWorkbookFile) {
      state.excelReview = {
        workbookName: Portal.Config.referenceAvailability.workbookName,
        sheets: [],
        formulas: [],
        warnings: [
          {
            source: "excel",
            severity: "medium",
            code: "no_file_selected",
            message: "لم يتم اختيار ملف Excel بعد.",
            suggestion: "اختر ملف XLSX أو XLS ثم اضغط تحليل الملف.",
          },
        ],
        translatedFunctions: Portal.ExcelEngine.getTranslatedFunctions([]),
      };
      renderExcel();
      refreshDerivedViews();
      return;
    }

    const buffer = await readFileAsArrayBuffer(state.excelWorkbookFile);
    const workbook = window.XLSX.read(buffer, { type: "array", cellFormula: true });
    state.excelReview = Portal.ExcelEngine.summarizeWorkbook(workbook);
    renderExcel();
    refreshDerivedViews();
  }

  function bindFileUpload(inputId, textareaId, metaId) {
    byId(inputId).addEventListener("change", async function (event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }
      try {
        const converted = await convertFileToCsvText(file);
        byId(textareaId).value = converted.csvText;
        byId(metaId).textContent = converted.meta;
        runVehicleAnalysis();
      } catch (error) {
        byId(metaId).textContent = error.message;
      }
    });
  }

  function restoreState() {
    const saved = safeParseStoredState();
    if (!saved) {
      renderShiftRiderStatus(state.shiftRiderParse);
      return;
    }

    if (saved.salaryInput) {
      state.salaryInput = Object.assign(Portal.SalaryEngine.createDefaultInput(), saved.salaryInput);
      applySalaryInput(state.salaryInput);
    }

    if (saved.shift) {
      state.shiftInput = Portal.ShiftEngine.createDefaultInput();
      state.shiftInput.templateKey = saved.shift.templateKey || state.shiftInput.templateKey;
      state.shiftInput.strategy = saved.shift.strategy || state.shiftInput.strategy;
      state.shiftInput.riderCount = Number(saved.shift.riderCount) || state.shiftInput.riderCount;
      state.shiftInput.shiftsPerRider = Number(saved.shift.shiftsPerRider) || state.shiftInput.shiftsPerRider;
      state.shiftInput.shifts = Array.isArray(saved.shift.shifts) && saved.shift.shifts.length
        ? saved.shift.shifts
        : Portal.ShiftEngine.getTemplate(state.shiftInput.templateKey);
      byId("shiftTemplate").value = state.shiftInput.templateKey;
      byId("shiftStrategy").value = state.shiftInput.strategy;
      byId("shiftRiderCount").value = state.shiftInput.riderCount;
      byId("shiftBundleSize").value = state.shiftInput.shiftsPerRider;
      renderShiftConfigRows();
      state.shiftRiderText = saved.shift.riderText || "";
      byId("shiftRiderIdsPaste").value = state.shiftRiderText;
      state.shiftRiderParse = Portal.DataEngine.parseRiderIds(state.shiftRiderText);
    }

    if (saved.vehicle) {
      applyVehicleSettings(Object.assign(Portal.VehicleEngine.createDefaultSettings(), saved.vehicle.settings || {}));
      byId("operatingVehiclesText").value = saved.vehicle.operating || state.vehicleText.operating;
      byId("updateVehiclesText").value = saved.vehicle.updates || state.vehicleText.updates;
      byId("updateBranchesText").value = saved.vehicle.branches || state.vehicleText.branches;
      byId("ridersText").value = saved.vehicle.riders || state.vehicleText.riders;
    }

    if (saved.search) {
      byId("shiftAssignmentsSearch").value = saved.search.shiftAssignments || "";
      byId("shiftUnassignedSearch").value = saved.search.shiftUnassigned || "";
      byId("vehicleAssignmentsSearch").value = saved.search.vehicleAssignments || "";
      byId("vehicleConflictsSearch").value = saved.search.vehicleConflicts || "";
      byId("validationSearch").value = saved.search.validation || "";
      byId("excelFormulaSearch").value = saved.search.excelFormulas || "";
    }

    state.lastPage = saved.page || state.lastPage;
    renderShiftRiderStatus(state.shiftRiderParse);
  }

  function bindEvents() {
    document.querySelectorAll(".nav-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        setPage(button.dataset.page);
      });
    });

    document.querySelectorAll("[data-page-target]").forEach(function (button) {
      button.addEventListener("click", function () {
        setPage(button.dataset.pageTarget);
      });
    });

    byId("salaryCalculateBtn").addEventListener("click", runSalary);
    byId("salaryResetBtn").addEventListener("click", function () {
      applySalaryInput(Portal.SalaryEngine.createDefaultInput());
      runSalary();
    });
    byId("salaryCopyBtn").addEventListener("click", function () {
      copyText(buildOperationsSummary() + "\nSalary: " + formatSar(state.salaryResult.netPay));
    });
    byId("salaryExportBtn").addEventListener("click", exportSalaryCsv);
    byId("salaryScenarioCarBtn").addEventListener("click", function () {
      applySalaryInput(getSalaryScenario("car"));
      runSalary();
    });
    byId("salaryScenarioBikeBtn").addEventListener("click", function () {
      applySalaryInput(getSalaryScenario("bike"));
      runSalary();
    });
    byId("salaryScenarioInvalidBtn").addEventListener("click", function () {
      applySalaryInput(getSalaryScenario("invalid"));
      runSalary();
    });
    byId("salaryScenarioMidMonthBtn").addEventListener("click", function () {
      applySalaryInput(getSalaryScenario("midMonth"));
      runSalary();
    });

    byId("shiftTemplate").addEventListener("change", function () {
      applyShiftTemplate(byId("shiftTemplate").value);
    });
    byId("shiftLoadTemplateBtn").addEventListener("click", function () {
      applyShiftTemplate(byId("shiftTemplate").value);
    });
    byId("shiftSyncIdsBtn").addEventListener("click", function () {
      syncShiftRiderIds(true);
    });
    byId("shiftClearIdsBtn").addEventListener("click", clearShiftRiderIds);
    byId("shiftRiderIdsFile").addEventListener("change", loadShiftRiderFile);
    byId("shiftGenerateBtn").addEventListener("click", runShift);
    byId("shiftResetBtn").addEventListener("click", resetShift);
    byId("shiftExportBtn").addEventListener("click", exportShiftCsv);
    byId("shiftExportSummaryBtn").addEventListener("click", exportShiftSummaryCsv);
    byId("shiftCopyBtn").addEventListener("click", copyShiftResults);

    byId("vehicleLoadSamplesBtn").addEventListener("click", function () {
      loadVehicleSamples();
      runVehicleAnalysis();
    });
    byId("vehicleAnalyzeBtn").addEventListener("click", runVehicleAnalysis);
    byId("vehicleResetBtn").addEventListener("click", resetVehiclePage);
    byId("vehicleCopyBtn").addEventListener("click", function () {
      copyText(buildOperationsSummary());
    });
    byId("vehicleExportAssignmentsBtn").addEventListener("click", exportVehicleAssignmentsCsv);
    byId("vehicleExportIssuesBtn").addEventListener("click", exportVehicleIssuesCsv);
    byId("vehicleExportUtilizationBtn").addEventListener("click", exportVehicleUtilizationCsv);

    bindFileUpload("operatingVehiclesFile", "operatingVehiclesText", "operatingVehiclesMeta");
    bindFileUpload("updateVehiclesFile", "updateVehiclesText", "updateVehiclesMeta");
    bindFileUpload("updateBranchesFile", "updateBranchesText", "updateBranchesMeta");
    bindFileUpload("ridersFile", "ridersText", "ridersMeta");

    byId("rerunTestsBtn").addEventListener("click", function () {
      state.testResults = Portal.TestEngine.runAll();
      refreshDerivedViews();
    });
    byId("refreshValidationBtn").addEventListener("click", refreshDerivedViews);

    byId("refreshAllBtn").addEventListener("click", function () {
      runSalary();
      runShift();
      runVehicleAnalysis();
      renderExcel();
      refreshDerivedViews();
    });

    byId("copyOperationsSummaryBtnDashboard").addEventListener("click", function () {
      copyText(buildOperationsSummary());
    });
    byId("copyOperationsSummaryBtn").addEventListener("click", function () {
      copyText(buildOperationsSummary());
    });

    byId("exportSalaryBtn").addEventListener("click", exportSalaryCsv);
    byId("exportShiftBtn").addEventListener("click", exportShiftCsv);
    byId("exportShiftSummaryBtn").addEventListener("click", exportShiftSummaryCsv);
    byId("exportVehicleBtn").addEventListener("click", exportVehicleAssignmentsCsv);
    byId("exportVehicleIssuesBtn").addEventListener("click", exportVehicleIssuesCsv);
    byId("exportVehicleUtilBtn").addEventListener("click", exportVehicleUtilizationCsv);
    byId("exportValidationBtn").addEventListener("click", exportValidationCsv);
    byId("exportTestsBtn").addEventListener("click", exportTestsCsv);
    byId("exportWorkbookBtn").addEventListener("click", exportWorkbookReport);
    byId("exportSnapshotBtn").addEventListener("click", exportSnapshotJson);

    byId("excelWorkbookInput").addEventListener("change", function (event) {
      state.excelWorkbookFile = event.target.files[0] || null;
    });
    byId("excelAnalyzeBtn").addEventListener("click", analyzeExcelWorkbook);
    byId("excelExportReportBtn").addEventListener("click", exportWorkbookReport);

    [
      "shiftAssignmentsSearch",
      "shiftUnassignedSearch",
      "vehicleAssignmentsSearch",
      "vehicleConflictsSearch",
      "validationSearch",
      "excelFormulaSearch",
    ].forEach(function (id) {
      byId(id).addEventListener("input", function () {
        if (id.indexOf("shift") === 0 && state.shiftPlan) {
          renderShift();
        } else if (id.indexOf("vehicle") === 0 && state.vehicleAnalysis) {
          renderVehicle();
        } else if (id.indexOf("validation") === 0 && state.validation) {
          renderValidation();
        } else if (id.indexOf("excel") === 0) {
          renderExcel();
        }
        persistState();
      });
    });

    document.querySelectorAll("input, select, textarea").forEach(function (field) {
      if (field.type === "file") {
        return;
      }
      field.addEventListener("change", persistState);
      field.addEventListener("input", function () {
        if (field.id === "shiftRiderIdsPaste") {
          state.shiftRiderText = field.value;
        }
        persistState();
      });
    });
  }

  function seedDefaults() {
    applySalaryInput(state.salaryInput);
    byId("shiftTemplate").value = state.shiftInput.templateKey;
    byId("shiftStrategy").value = state.shiftInput.strategy;
    byId("shiftRiderCount").value = state.shiftInput.riderCount;
    byId("shiftBundleSize").value = state.shiftInput.shiftsPerRider;
    renderShiftConfigRows();
    applyVehicleSettings(Portal.VehicleEngine.createDefaultSettings());
    loadVehicleSamples();
    renderShiftRiderStatus(state.shiftRiderParse);
  }

  function boot() {
    seedDefaults();
    restoreState();
    bindEvents();
    renderRules();
    runSalary();
    runShift();
    runVehicleAnalysis();
    renderExcel();
    refreshDerivedViews();
    setPage(state.lastPage);
  }

  boot();
})();
