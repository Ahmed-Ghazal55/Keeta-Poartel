(function () {
  "use strict";

  var Portal = window.KeetaPortal;
  var V6 = window.KeetaV6 || {};
  if (!Portal || !window.XLSX || !V6.MonthlyClosingEngine || !Portal.ImportTypes || !Portal.CsvReader || !Portal.WorkbookReader || !Portal.ImportPreviewLib) {
    return;
  }

  var CsvReader = Portal.CsvReader;
  var FormulaEngine = V6.FormulaEngine;
  var ImportPreviewLib = Portal.ImportPreviewLib;
  var ImportTypes = Portal.ImportTypes;
  var MonthlyClosingEngine = V6.MonthlyClosingEngine;
  var VdaEngine = V6.VdaEngine;
  var FaceVerificationEngine = V6.FaceVerificationEngine;
  var DeliveryExperienceEngine = V6.DeliveryExperienceEngine;
  var OprEngine = V6.OprEngine;
  var WorkbookReader = Portal.WorkbookReader;
  var STORAGE_KEY = "keeta.operations.portal.v9";

  var state = {
    importItems: [],
    importHistory: [],
    importSummary: null,
    selectedImportId: "",
    monthly: {
      city: "جدة",
      month: "",
      startDate: "",
      endDate: "",
      finalReportsDate: "",
      status: "Open",
      validationWarnings: [],
      companyPartners: [],
      companyCouriers: [],
      internal: null,
      comparison: null,
      settlement: null,
      archive: null,
      face: null,
      vdaSummary: null,
      deliveryRows: [],
      reopenLog: [],
    },
    opr: {
      rows: [],
      indexes: null,
      query: "",
      previewRows: [],
    },
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function getRuntime() {
    return Portal.Runtime || null;
  }

  function getImportBatchService() {
    var runtime = getRuntime();
    return runtime && runtime.importBatchService ? runtime.importBatchService : null;
  }

  function getCurrentUser() {
    var runtime = getRuntime();
    return runtime && runtime.auth && typeof runtime.auth.getCurrentUser === "function"
      ? runtime.auth.getCurrentUser()
      : null;
  }

  function getOrganizationDefaults() {
    var organization = Portal.OrganizationContext && typeof Portal.OrganizationContext.getState === "function"
      ? Portal.OrganizationContext.getState()
      : null;
    var selectedCity = byId("importCity") ? byId("importCity").value : "";
    var selectedRegister = "";
    if (organization && organization.selectedCities && organization.selectedCities.length === 1) {
      selectedCity = organization.selectedCities[0];
    }
    if (organization && organization.selectedRegisters && organization.selectedRegisters.length === 1) {
      selectedRegister = organization.selectedRegisters[0];
    }
    return {
      city: selectedCity || "",
      register: selectedRegister || "",
      month: byId("monthlyMonth") ? byId("monthlyMonth").value : ""
    };
  }

  function showImportToast(message, type) {
    var palette = {
      success: { background: "#0b8b52", color: "#ffffff" },
      warning: { background: "#f0b533", color: "#101820" },
      error: { background: "#aa2e25", color: "#ffffff" },
      info: { background: "#0b2348", color: "#ffffff" }
    };
    var colors = palette[type || "info"] || palette.info;
    var toast = document.createElement("div");
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.left = "20px";
    toast.style.bottom = "20px";
    toast.style.zIndex = "9999";
    toast.style.padding = "12px 16px";
    toast.style.borderRadius = "14px";
    toast.style.background = colors.background;
    toast.style.color = colors.color;
    toast.style.boxShadow = "0 18px 34px rgba(15, 23, 42, 0.18)";
    toast.style.fontWeight = "800";
    document.body.appendChild(toast);
    window.setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 2600);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cleanText(value) {
    return FormulaEngine.normalizeText(value);
  }

  function normalizeHeader(value) {
    return FormulaEngine.normalizeHeader(value);
  }

  function normalizeCity(value) {
    var text = normalizeHeader(value);
    if (text.indexOf("jedd") >= 0 || text.indexOf("جدة") >= 0) {
      return "جدة";
    }
    if (text.indexOf("riyadh") >= 0 || text.indexOf("رياض") >= 0) {
      return "الرياض";
    }
    return cleanText(value);
  }

  function formatNumber(value, digits) {
    return (Number(value) || 0).toLocaleString("en-US", {
      minimumFractionDigits: digits || 0,
      maximumFractionDigits: digits == null ? 2 : digits,
    });
  }

  function formatSar(value) {
    return formatNumber(value, 2) + " ريال";
  }

  function formatPct(value) {
    var numeric = Number(value) || 0;
    if (numeric > 0 && numeric <= 1) {
      numeric = numeric * 100;
    }
    return formatNumber(numeric, 1) + "%";
  }

  function toDateInputValue(date) {
    return [
      String(date.getFullYear()),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function monthToDateRange(monthValue) {
    var text = cleanText(monthValue);
    if (!/^\d{4}-\d{2}$/.test(text)) {
      return null;
    }
    var parts = text.split("-");
    var start = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    var end = new Date(Number(parts[0]), Number(parts[1]), 0);
    return { start: start, end: end };
  }

  function monthFromFileContext(context) {
    return cleanText(context && context.month);
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (event) {
        resolve(event.target.result);
      };
      reader.onerror = function () {
        reject(reader.error || new Error("تعذر قراءة الملف."));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (event) {
        resolve(String(event.target.result || ""));
      };
      reader.onerror = function () {
        reject(reader.error || new Error("تعذر قراءة الملف."));
      };
      reader.readAsText(file, "utf-8");
    });
  }

  function getFirstSheetRows(workbook) {
    if (!workbook || !workbook.SheetNames || !workbook.SheetNames.length) {
      return [];
    }
    var firstSheetName = workbook.SheetNames[0];
    return window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
      header: 1,
      defval: "",
      raw: true,
    });
  }

  function getWorkbookHeaders(workbook) {
    var rows = getFirstSheetRows(workbook);
    return rows[0] || [];
  }

  function toCsv(rows) {
    if (Portal.Utils && typeof Portal.Utils.toCsv === "function" && rows && rows.length) {
      return Portal.Utils.toCsv(rows, Object.keys(rows[0]).map(function (key) {
        return { key: key, label: key };
      }));
    }

    if (!rows || !rows.length) {
      return "";
    }

    var headers = Object.keys(rows[0]);
    var escapeCell = function (value) {
      var text = String(value == null ? "" : value);
      if (text.indexOf('"') >= 0) {
        text = text.replace(/"/g, '""');
      }
      if (/[,"\n]/.test(text)) {
        return '"' + text + '"';
      }
      return text;
    };

    return [headers.join(",")].concat(
      rows.map(function (row) {
        return headers.map(function (header) {
          return escapeCell(row[header]);
        }).join(",");
      })
    ).join("\n");
  }

  function downloadText(filename, content, mimeType) {
    var isCsv = /\.csv$/i.test(filename) || String(mimeType || "").toLowerCase().indexOf("text/csv") >= 0;
    var finalContent = isCsv && String(content).charCodeAt(0) !== 0xFEFF ? "\uFEFF" + content : content;
    var blob = new Blob([finalContent], { type: mimeType || "text/plain;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function buildStatusBox(html, className) {
    return '<div class="status-box' + (className ? " " + className : "") + '">' + html + "</div>";
  }

  function createMessageCard(item) {
    return (
      '<div class="note">' +
      "<strong>" + escapeHtml(item.message || "") + "</strong><br>" +
      '<span class="muted">' + escapeHtml(item.suggestion || "") + "</span>" +
      "</div>"
    );
  }

  function renderEmptyRow(colspan, message) {
    return '<tr><td colspan="' + colspan + '"><div class="empty">' + escapeHtml(message) + "</div></td></tr>";
  }

  function rowMatchesSearch(values, query) {
    if (!query) {
      return true;
    }
    return values.join(" ").toLowerCase().indexOf(String(query).toLowerCase()) >= 0;
  }

  function safePersist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        monthly: {
          city: byId("monthlyCity").value,
          month: byId("monthlyMonth").value,
          startDate: byId("monthlyStartDate").value,
          endDate: byId("monthlyEndDate").value,
          finalReportsDate: byId("monthlyFinalReportsDate").value,
          status: state.monthly.status,
          reopenLog: state.monthly.reopenLog,
        },
        importCity: byId("importCity").value,
        salaryBridge: {
          source: byId("salaryDataSource").value,
          city: byId("salaryMonthlyCity").value,
          month: byId("salaryMonthlyMonth").value,
          search: byId("salaryMonthlySearch").value,
        },
      }));
    } catch (_error) {
      // Ignore localStorage failures in local-file mode.
    }
  }

  function restoreState() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (_error) {
      raw = null;
    }

    var now = new Date();
    var defaultMonth = [
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0"),
    ].join("-");
    var defaultRange = monthToDateRange(defaultMonth);
    var defaultFinal = new Date(defaultRange.end.getTime());
    defaultFinal.setDate(defaultFinal.getDate() + 1);

    byId("monthlyMonth").value = defaultMonth;
    byId("monthlyStartDate").value = toDateInputValue(defaultRange.start);
    byId("monthlyEndDate").value = toDateInputValue(defaultRange.end);
    byId("monthlyFinalReportsDate").value = toDateInputValue(defaultFinal);
    byId("salaryMonthlyMonth").value = defaultMonth;

    if (!raw) {
      state.monthly.month = defaultMonth;
      state.monthly.startDate = byId("monthlyStartDate").value;
      state.monthly.endDate = byId("monthlyEndDate").value;
      state.monthly.finalReportsDate = byId("monthlyFinalReportsDate").value;
      return;
    }

    try {
      var parsed = JSON.parse(raw);
      if (parsed.monthly) {
        byId("monthlyCity").value = parsed.monthly.city || byId("monthlyCity").value;
        byId("monthlyMonth").value = parsed.monthly.month || byId("monthlyMonth").value;
        if (parsed.monthly.startDate) {
          byId("monthlyStartDate").value = parsed.monthly.startDate;
        }
        if (parsed.monthly.endDate) {
          byId("monthlyEndDate").value = parsed.monthly.endDate;
        }
        if (parsed.monthly.finalReportsDate) {
          byId("monthlyFinalReportsDate").value = parsed.monthly.finalReportsDate;
        }
        state.monthly.status = parsed.monthly.status || "Open";
        state.monthly.reopenLog = parsed.monthly.reopenLog || [];
      }
      if (parsed.importCity) {
        byId("importCity").value = parsed.importCity;
      }
      if (parsed.salaryBridge) {
        byId("salaryDataSource").value = parsed.salaryBridge.source || "manual";
        byId("salaryMonthlyCity").value = parsed.salaryBridge.city || byId("salaryMonthlyCity").value;
        byId("salaryMonthlyMonth").value = parsed.salaryBridge.month || byId("salaryMonthlyMonth").value;
        byId("salaryMonthlySearch").value = parsed.salaryBridge.search || "";
      }
    } catch (_error) {
      // Ignore corrupted saved state.
    }

    state.monthly.city = byId("monthlyCity").value;
    state.monthly.month = byId("monthlyMonth").value;
    state.monthly.startDate = byId("monthlyStartDate").value;
    state.monthly.endDate = byId("monthlyEndDate").value;
    state.monthly.finalReportsDate = byId("monthlyFinalReportsDate").value;
  }

  async function parseImportFile(file) {
    var extension = file.name.toLowerCase().split(".").pop();
    var item = {
      id: file.name + "::" + file.size,
      fileName: file.name,
      rawFile: file,
      extension: extension,
      type: "unknown",
      city: "",
      month: "",
      register: "",
      workbook: null,
      rows: [],
      workbookSheets: [],
      headers: [],
      rowCount: 0,
      warnings: [],
      meta: "",
    };

    if (extension === "xlsx" || extension === "xls" || extension === "xlsm") {
      var buffer = await readFileAsArrayBuffer(file);
      item.workbook = window.XLSX.read(buffer, { type: "array", cellFormula: true });
      item.workbookSheets = item.workbook.SheetNames.slice();
      var firstRows = getFirstSheetRows(item.workbook);
      item.headers = firstRows[0] || [];
      item.rowCount = Math.max(0, firstRows.length - 1);
      var detection = MonthlyClosingEngine.detectMonthlyFileType(file.name, item.workbookSheets, item.headers);
      item.type = detection.type;
      item.city = normalizeCity(detection.city);
      item.month = detection.month;
      item.register = detection.register;
      item.meta = item.workbookSheets.length + " sheets";
    } else if (extension === "csv" || extension === "txt") {
      var text = await readFileAsText(file);
      item.rows = Portal.DataEngine.parseCsvRows(text);
      item.headers = item.rows.length ? Object.keys(item.rows[0]) : [];
      item.rowCount = item.rows.length;
      if (/per order/i.test(file.name)) {
        item.type = "opr_per_order_csv";
      } else if (/opr/i.test(file.name)) {
        item.type = "opr_csv";
      } else if (/vda/i.test(file.name)) {
        item.type = "vda_csv";
      } else if (/بيانات المناديب/i.test(file.name)) {
        item.type = "rider_master_csv";
      } else if (/مراجعة الحالة/i.test(file.name)) {
        item.type = "status_review_csv";
      }
      item.city = normalizeCity(file.name);
      item.meta = item.rowCount + " rows";
    } else if (extension === "json") {
      var jsonText = await readFileAsText(file);
      var parsed = JSON.parse(jsonText);
      item.rows = Array.isArray(parsed) ? parsed : [];
      item.headers = item.rows.length ? Object.keys(item.rows[0]) : Object.keys(parsed || {});
      item.rowCount = item.rows.length;
      item.type = "json";
      item.meta = item.rowCount + " rows";
    } else if (extension === "zip") {
      item.type = "zip_reference";
      item.warnings.push({
        message: "تم التعرف على ZIP كمرجع فقط.",
        suggestion: "ارفع الملفات الداخلية مباشرة إذا أردت التحليل الفعلي من المتصفح.",
      });
      item.meta = "ZIP reference";
    }

    if (!item.city && item.type.indexOf("company_") === 0) {
      item.city = "جدة";
    }
    if (!item.month && item.type === "face_recognition" && /jun/i.test(file.name)) {
      item.month = "2026-06";
    }
    if (!item.month && item.type === "internal_settlement") {
      item.month = "2026-05";
    }

    return item;
  }

  async function parseImportFilePrompt3(file) {
    var extension = "." + file.name.toLowerCase().split(".").pop();
    var analysis = {
      extension: extension,
      fileName: file.name,
      rowCount: 0,
      size: file.size
    };
    var importBatchService = getImportBatchService();
    if (!importBatchService) {
      throw new Error("Prompt 3 import service is unavailable.");
    }

    if (extension === ".xlsx" || extension === ".xls" || extension === ".xlsm") {
      var buffer = await readFileAsArrayBuffer(file);
      analysis.workbook = window.XLSX.read(buffer, { type: "array", cellFormula: true });
      analysis.workbookSummary = WorkbookReader.readWorkbook(analysis.workbook, {
        extension: extension,
        fileName: file.name
      });
      analysis.rowCount = analysis.workbookSummary.totalRowCount;
    } else if (extension === ".csv" || extension === ".txt") {
      var text = await readFileAsText(file);
      analysis.tableSummary = CsvReader.readDelimitedText(file.name, text, {});
      analysis.rowCount = analysis.tableSummary.rowCount;
    } else if (extension === ".json") {
      var jsonText = await readFileAsText(file);
      analysis.tableSummary = CsvReader.readJsonText(file.name, jsonText, {});
      analysis.rowCount = analysis.tableSummary.rowCount;
    }

    return decorateImportItem(importBatchService.createPreviewBatch({
      analysis: analysis,
      defaults: getOrganizationDefaults(),
      size: file.size,
      user: getCurrentUser()
    }), file);
  }

  function decorateImportItem(item, rawFile) {
    var analysis = item.analysis || {};
    item.rawFile = rawFile || item.rawFile || null;
    item.fileName = item.sourceFileName || item.fileName || analysis.fileName || "";
    item.workbook = analysis.workbook || null;
    item.rows = analysis.tableSummary ? analysis.tableSummary.rows : (analysis.workbookSummary ? analysis.workbookSummary.bestRows : []);
    item.workbookSheets = analysis.workbookSummary ? analysis.workbookSummary.sheetNames.slice() : [];
    item.headers = item.headers || (analysis.tableSummary ? analysis.tableSummary.headers : (analysis.workbookSummary ? analysis.workbookSummary.allHeaders : []));
    item.preview = item.preview || ImportPreviewLib.buildImportPreview(item, {});
    item.warningCards = buildImportWarnings(item);
    item.warnings = item.warningCards;
    item.meta = item.meta || (item.workbookSheets.length
      ? (item.workbookSheets.length + " sheets / " + item.rowCount + " rows")
      : (item.rowCount + " rows"));
    return item;
  }

  function buildImportWarnings(item) {
    var cards = [];
    (item.validation && item.validation.issues ? item.validation.issues : []).forEach(function (issue) {
      cards.push({
        code: issue.code,
        message: issue.message,
        severity: issue.severity,
        suggestion: issue.suggestion || ""
      });
    });
    (item.warnings || []).forEach(function (warning) {
      if (typeof warning === "string") {
        cards.push(warningCardForCode(warning));
      } else if (warning && warning.message) {
        cards.push(warning);
      }
    });
    return cards;
  }

  function warningCardForCode(code) {
    var map = {
      ambiguous_type_detection: {
        code: code,
        severity: "medium",
        message: "تم اكتشاف أكثر من نوع محتمل للملف.",
        suggestion: "راجع نوع الملف يدويًا قبل الحفظ."
      },
      city_not_detected: {
        code: code,
        severity: "medium",
        message: "تعذر تحديد المدينة تلقائيًا.",
        suggestion: "اختر المدينة يدويًا من المعاينة."
      },
      register_not_detected: {
        code: code,
        severity: "medium",
        message: "تعذر تحديد السجل أو الداشبورد تلقائيًا.",
        suggestion: "اختر السجل يدويًا من المعاينة."
      },
      month_not_detected: {
        code: code,
        severity: "medium",
        message: "تعذر تحديد الشهر تلقائيًا.",
        suggestion: "حدد الشهر يدويًا قبل الحفظ."
      },
      zip_reference_only: {
        code: code,
        severity: "high",
        message: "ملف ZIP يُسجل كمرجع فقط في هذه المرحلة.",
        suggestion: "ارفع الملفات الداخلية مباشرة حتى يمكن قراءتها وحفظها."
      }
    };
    return map[code] || {
      code: code,
      severity: "low",
      message: code,
      suggestion: ""
    };
  }

  async function loadImportFiles(files) {
    if (!files || !files.length) {
      return [];
    }
    var loaded = [];
    for (var index = 0; index < files.length; index += 1) {
      loaded.push(await parseImportFilePrompt3(files[index]));
    }

    var map = new Map(state.importItems.map(function (item) {
      return [item.id, item];
    }));
    loaded.forEach(function (item) {
      map.set(item.id, item);
    });
    state.importItems = Array.from(map.values());
    state.selectedImportId = loaded.length ? loaded[0].id : state.selectedImportId;
    state.importSummary = summarizeImportItems(state.importItems);
    safePersist();
    renderAll();
    return loaded;
  }

  function summarizeImportItems(items) {
    var summary = {
      totalFiles: items.length,
      workbooks: items.filter(function (item) { return item.workbook; }).length,
      monthlyFiles: items.filter(function (item) { return item.type && item.type !== "unknown"; }).length,
      autoDetected: items.filter(function (item) { return item.confidenceState === "auto_detected"; }).length,
      needsReview: items.filter(function (item) { return item.confidenceState === "needs_review"; }).length,
      warnings: items.reduce(function (sum, item) { return sum + (item.warningCards || item.warnings || []).length; }, 0),
      saved: items.filter(function (item) { return item.status === "saved"; }).length,
      rejected: items.filter(function (item) { return item.status === "rejected"; }).length,
      byType: {},
      byCity: {},
    };

    items.forEach(function (item) {
      summary.byType[item.type] = (summary.byType[item.type] || 0) + 1;
      if (item.city) {
        summary.byCity[item.city] = (summary.byCity[item.city] || 0) + 1;
      }
    });

    return summary;
  }

  function importTypeMatches(item, wantedType) {
    var aliases = {
      company_invoice: ["company_invoice", "company_invoice_workbook"],
      internal_settlement: ["internal_settlement", "internal_settlement_workbook"],
      face_recognition: ["face_recognition", "face_verification_workbook", "face_verification_csv"],
      company_vda: ["company_vda", "vda_workbook", "vda_csv", "vda_keeta_workbook", "vda_keeta_csv"]
    };
    return (aliases[wantedType] || [wantedType]).indexOf(item.type) >= 0;
  }

  function getImportedMonthlyItems() {
    return state.importItems.filter(function (item) {
      return item.status !== "rejected" && item.status !== "failed" && (
        importTypeMatches(item, "company_invoice") ||
        importTypeMatches(item, "internal_settlement") ||
        importTypeMatches(item, "face_recognition") ||
        importTypeMatches(item, "company_vda")
      );
    });
  }

  function getSelectedImportItem() {
    return state.importItems.filter(function (item) {
      return item.id === state.selectedImportId;
    })[0] || state.importItems[0] || null;
  }

  function replaceImportItem(nextItem) {
    var replaced = false;
    state.importItems = state.importItems.map(function (item) {
      if (item.id === nextItem.id) {
        replaced = true;
        return nextItem;
      }
      return item;
    });
    if (!replaced) {
      state.importItems.push(nextItem);
    }
    state.selectedImportId = nextItem.id;
    state.importSummary = summarizeImportItems(state.importItems);
  }

  function collectMonthlySettings() {
    state.monthly.city = byId("monthlyCity").value;
    state.monthly.month = byId("monthlyMonth").value;
    state.monthly.startDate = byId("monthlyStartDate").value;
    state.monthly.endDate = byId("monthlyEndDate").value;
    state.monthly.finalReportsDate = byId("monthlyFinalReportsDate").value;
  }

  function findMonthlyItem(type, register) {
    var candidates = getImportedMonthlyItems().filter(function (item) {
      return importTypeMatches(item, type);
    });
    if (!register) {
      return candidates[0] || null;
    }
    return candidates.find(function (item) {
      return normalizeHeader(item.register) === normalizeHeader(register);
    }) || candidates[0] || null;
  }

  function buildCompanyInvoiceContext(item) {
    if (!item || !item.workbook) {
      return { partners: [], couriers: [] };
    }
    var partnerSheetName = item.workbook.SheetNames.find(function (sheetName) {
      return normalizeHeader(sheetName).indexOf(normalizeHeader("تفاصيل الشركاء")) >= 0;
    });
    var courierSheetName = item.workbook.SheetNames.find(function (sheetName) {
      return normalizeHeader(sheetName).indexOf(normalizeHeader("تفاصيل سائق التوصيل")) >= 0;
    });
    return {
      partners: MonthlyClosingEngine.normalizeCompanyPartnerInvoice(
        window.XLSX.utils.sheet_to_json(item.workbook.Sheets[partnerSheetName], { defval: "", raw: true })
      ),
      couriers: MonthlyClosingEngine.normalizeCompanyCourierInvoice(
        window.XLSX.utils.sheet_to_json(item.workbook.Sheets[courierSheetName], { defval: "", raw: true })
      ),
    };
  }

  function filterRowsByCity(rows, selectedCity, fieldName) {
    return (rows || []).filter(function (row) {
      var rowCity = normalizeCity(row[fieldName || "city"] || row["المدينة"] || "");
      return !selectedCity || !rowCity || rowCity === selectedCity;
    });
  }

  function prepareMonthlyContext() {
    collectMonthlySettings();
    var selectedCity = state.monthly.city;
    var selectedMonth = state.monthly.month;

    var expressCompanyItem = findMonthlyItem("company_invoice", "Express");
    var albwabaCompanyItem = findMonthlyItem("company_invoice", "Albwaba");
    var internalItem = findMonthlyItem("internal_settlement");
    var faceItems = getImportedMonthlyItems().filter(function (item) {
      return importTypeMatches(item, "face_recognition");
    });
    var companyVdaItems = getImportedMonthlyItems().filter(function (item) {
      return importTypeMatches(item, "company_vda");
    });

    var expressCompany = buildCompanyInvoiceContext(expressCompanyItem);
    var albwabaCompany = buildCompanyInvoiceContext(albwabaCompanyItem);
    var companyPartners = expressCompany.partners.concat(albwabaCompany.partners);
    var companyCouriers = expressCompany.couriers.concat(albwabaCompany.couriers);

    var internal = internalItem && internalItem.workbook
      ? MonthlyClosingEngine.normalizeInternalSettlementWorkbook(internalItem.workbook, window.XLSX)
      : null;

    var faceReports = faceItems.map(function (item) {
      return {
        fileName: item.fileName,
        payload: MonthlyClosingEngine.normalizeFaceRecognitionWorkbook(item.workbook, window.XLSX),
      };
    }).sort(function (left, right) {
      return left.fileName.localeCompare(right.fileName);
    });

    var companyVdaRows = [];
    companyVdaItems.forEach(function (item) {
      var sheetName = item.workbook && item.workbook.SheetNames[0];
      if (!sheetName) {
        return;
      }
      var rows = window.XLSX.utils.sheet_to_json(item.workbook.Sheets[sheetName], { defval: "", raw: true });
      companyVdaRows = companyVdaRows.concat(MonthlyClosingEngine.normalizeCompanyDailyVdaRows(rows));
    });

    companyPartners = filterRowsByCity(companyPartners, selectedCity, "city");
    companyCouriers = filterRowsByCity(companyCouriers, selectedCity, "city");
    if (internal) {
      internal.shortVda = filterRowsByCity(internal.shortVda, selectedCity, "city");
      internal.deliveryExperience = filterRowsByCity(internal.deliveryExperience, selectedCity, "city");
      internal.express = filterRowsByCity(internal.express, selectedCity, "city");
      internal.albwaba = filterRowsByCity(internal.albwaba, selectedCity, "city");
      internal.fr3pl = filterRowsByCity(internal.fr3pl, selectedCity, "city");
    }

    var internalMatchRows = internal ? internal.express.concat(internal.albwaba) : [];
    var comparison = MonthlyClosingEngine.matchCompanyVsInternal(companyCouriers, internalMatchRows);

    var vdaInput = internal && internal.vda && internal.vda.length ? internal.vda : companyVdaRows;
    var vdaSummary = vdaInput.length
      ? VdaEngine.summarizeVda(vdaInput, {
          reportDate: FormulaEngine.parseDateLike(state.monthly.endDate) || new Date(),
        })
      : { items: [], summary: { total: 0, valid: 0, invalid: 0 } };

    var endFace = faceReports.length ? faceReports[faceReports.length - 1].payload : null;
    var faceRows = endFace ? FaceVerificationEngine.summarizeByRider(
      endFace.courierSummary.map(function (row) {
        return {
          riderId: row.riderId,
          date: selectedMonth + "-end",
          result: row.result,
          triggered: true,
        };
      }),
      { deductionPerFailedDay: 25 }
    ) : [];

    var deliveryRows = internal && internal.deliveryExperience
      ? DeliveryExperienceEngine.buildExperienceRows(
          internal.deliveryExperience.map(function (row) {
            return {
              riderId: row.riderId,
              city: row.city || selectedCity,
              vehicleType: row.vehicle,
              onTimeRate: row.onTimeRate > 1 ? row.onTimeRate / 100 : row.onTimeRate,
              orders: row.orders,
              isValid: true,
              validityStatus: row.currentClassification,
              fullName: row.fullName,
              register: row.register,
            };
          })
        )
      : [];

    var monthRange = monthToDateRange(selectedMonth);
    var context = {
      city: selectedCity,
      month: selectedMonth,
      monthDays: monthRange ? monthRange.end.getDate() : 31,
      companyPartners: companyPartners,
      companyCouriers: companyCouriers,
      internal: internal,
      faceReports: faceReports,
      companyVdaRows: companyVdaRows,
      comparison: comparison,
      status: "Analyzed",
      finalAvailableDate: state.monthly.finalReportsDate,
      today: new Date(),
      vdaSummary: vdaSummary,
      faceSummary: faceRows,
      deliveryRows: deliveryRows,
    };

    context.settlement = MonthlyClosingEngine.buildFinalMonthlySettlement(context);
    context.validationWarnings = MonthlyClosingEngine.validateMonthlyClosing(context);
    context.archive = MonthlyClosingEngine.buildMonthlyArchive(context);
    return context;
  }

  async function handleAnalyzeImportCenter() {
    var files = Array.from(byId("importBatchFiles").files || []);
    if (!files.length) {
      state.importSummary = summarizeImportItems(state.importItems);
      renderAll();
      return;
    }
    try {
      await loadImportFiles(files);
      byId("importBatchFiles").value = "";
      showImportToast("تم تحليل الملفات وإعداد المعاينة قبل الحفظ.", "success");
    } catch (error) {
      showImportToast(error && error.message ? error.message : "تعذر تحليل الملفات الحالية.", "error");
    }
  }

  async function handleAnalyzeMonthlyClosing() {
    var supplementalFiles = Array.from(byId("monthlySupplementalFiles").files || []);
    if (supplementalFiles.length) {
      await loadImportFiles(supplementalFiles);
      byId("monthlySupplementalFiles").value = "";
    }

    var context = prepareMonthlyContext();
    state.monthly.status = "Analyzed";
    state.monthly.companyPartners = context.companyPartners;
    state.monthly.companyCouriers = context.companyCouriers;
    state.monthly.internal = context.internal;
    state.monthly.comparison = context.comparison;
    state.monthly.settlement = context.settlement;
    state.monthly.validationWarnings = context.validationWarnings;
    state.monthly.archive = context.archive;
    state.monthly.face = context.faceSummary;
    state.monthly.vdaSummary = context.vdaSummary;
    state.monthly.deliveryRows = context.deliveryRows;
    safePersist();
    renderAll();
  }

  function handleCompareMonthly() {
    if (!state.monthly.comparison) {
      state.monthly.validationWarnings = state.monthly.validationWarnings.concat([
        {
          message: "ابدأ بتحليل التقارير أولاً.",
          suggestion: "اضغط Analyze Uploaded Reports لبناء المقارنة.",
        },
      ]);
      renderAll();
      return;
    }
    state.monthly.status = "Matched";
    safePersist();
    renderAll();
  }

  function handleBuildSettlement() {
    if (!state.monthly.settlement || !state.monthly.settlement.rows.length) {
      state.monthly.validationWarnings = state.monthly.validationWarnings.concat([
        {
          message: "تعذر بناء Settlement نهائي.",
          suggestion: "تحقق من رفع فواتير الشركة وملف التسوية الداخلي أولاً.",
        },
      ]);
      renderAll();
      return;
    }
    state.monthly.status = "Settlement Built";
    safePersist();
    renderAll();
  }

  function handleCreateArchive() {
    if (!state.monthly.archive) {
      return;
    }
    state.monthly.status = "Closed";
    safePersist();
    renderAll();
  }

  function handleLockMonth() {
    if (!state.monthly.settlement || !state.monthly.settlement.rows.length) {
      state.monthly.validationWarnings = state.monthly.validationWarnings.concat([
        {
          message: "لا يمكن Lock قبل بناء Settlement.",
          suggestion: "ابنِ التسوية النهائية أولاً.",
        },
      ]);
      renderAll();
      return;
    }
    state.monthly.status = "Locked";
    safePersist();
    renderAll();
  }

  function handleReopenMonth() {
    var reason = window.prompt("سبب إعادة فتح الشهر:");
    if (!reason) {
      return;
    }
    state.monthly.status = "Reopened";
    state.monthly.reopenLog.push({
      at: new Date().toLocaleString("en-US"),
      reason: reason,
    });
    safePersist();
    renderAll();
  }

  function exportMonthlyBundle(mode) {
    if (!state.monthly.settlement) {
      return;
    }
    var context = {
      city: state.monthly.city,
      month: state.monthly.month,
      status: state.monthly.status,
      companyCouriers: state.monthly.companyCouriers,
      comparison: state.monthly.comparison,
      settlement: state.monthly.settlement,
      validationWarnings: state.monthly.validationWarnings,
    };
    var files = MonthlyClosingEngine.exportMonthlyReports(context);
    if (mode === "settlement") {
      files = files.filter(function (file) { return file.fileName.indexOf("settlement") >= 0; });
    } else if (mode === "matching") {
      files = files.filter(function (file) { return file.fileName.indexOf("matching") >= 0; });
    } else if (mode === "summary") {
      files = files.filter(function (file) { return file.fileName.indexOf("summary") >= 0; });
    }
    files.forEach(function (file) {
      downloadText(file.fileName, file.content, file.mimeType);
    });
  }

  function renderDashboardV9() {
    var settlementSummary = state.monthly.settlement ? state.monthly.settlement.summary : { total: 0, totalOrders: 0, totalNet: 0, valid: 0, invalid: 0 };
    byId("dashboardV9Kpis").innerHTML = [
      { label: "Month Status", value: state.monthly.status },
      { label: "Settlement Rows", value: settlementSummary.total || 0 },
      { label: "Monthly Orders", value: formatNumber(settlementSummary.totalOrders || 0, 0) },
      { label: "Monthly Net", value: formatSar(settlementSummary.totalNet || 0) },
    ].map(function (item) {
      return '<div class="kpi"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");

    byId("dashboardMonthWarnings").innerHTML = state.monthly.validationWarnings.length
      ? state.monthly.validationWarnings.map(createMessageCard).join("")
      : '<div class="empty">لا توجد تنبيهات شهرية حالياً.</div>';

    byId("dashboardImportBody").innerHTML = state.importItems.length
      ? state.importItems.slice(-8).reverse().map(function (item) {
          return "<tr>" +
            "<td>" + escapeHtml(item.fileName) + "</td>" +
            "<td>" + escapeHtml(item.type) + "</td>" +
            "<td>" + escapeHtml(item.city || "-") + "</td>" +
            "<td>" + escapeHtml(item.month || "-") + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(4, "لم يتم رفع ملفات جديدة بعد.");
  }

  function renderImportCenter() {
    var summary = state.importSummary || summarizeImportItems(state.importItems);
    byId("importKpis").innerHTML = [
      { label: "Files", value: summary.totalFiles || 0 },
      { label: "Workbooks", value: summary.workbooks || 0 },
      { label: "Detected", value: summary.monthlyFiles || 0 },
      { label: "Warnings", value: summary.warnings || 0 },
    ].map(function (item) {
      return '<div class="kpi"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");

    var importWarnings = [];
    state.importItems.forEach(function (item) {
      item.warnings.forEach(function (warning) {
        importWarnings.push({
          message: item.fileName + ": " + warning.message,
          suggestion: warning.suggestion || "",
        });
      });
    });
    byId("importWarnings").innerHTML = importWarnings.length
      ? importWarnings.map(createMessageCard).join("")
      : '<div class="empty">لا توجد تحذيرات في الدفعة الحالية.</div>';

    byId("importBody").innerHTML = state.importItems.length
      ? state.importItems.map(function (item) {
          return "<tr>" +
            "<td>" + escapeHtml(item.fileName) + "</td>" +
            "<td>" + escapeHtml(item.type) + "</td>" +
            "<td>" + escapeHtml(item.register || "-") + "</td>" +
            "<td>" + escapeHtml(item.city || "-") + "</td>" +
            "<td>" + escapeHtml(item.month || "-") + "</td>" +
            "<td>" + escapeHtml(item.meta || (item.rowCount + " rows")) + "</td>" +
            "<td>" + escapeHtml(item.warnings.map(function (warning) { return warning.message; }).join(" | ") || "جاهز") + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(7, "لم يتم رفع ملفات بعد.");
  }

  function getImportHistory() {
    var runtime = getRuntime();
    if (runtime && runtime.importRegistry && typeof runtime.importRegistry.listRecent === "function") {
      return runtime.importRegistry.listRecent(20);
    }
    return [];
  }

  function getManualMappingFromForm() {
    return {
      fileType: byId("importManualType") ? byId("importManualType").value : "",
      city: byId("importManualCity") ? byId("importManualCity").value : "",
      register: byId("importManualRegister") ? byId("importManualRegister").value : "",
      month: byId("importManualMonth") ? byId("importManualMonth").value : "",
      targetEntity: byId("importManualTargetEntity") ? byId("importManualTargetEntity").value : ""
    };
  }

  function populateImportFormOptions(selectedItem) {
    var runtime = getRuntime();
    var types = runtime && runtime.importRegistry && typeof runtime.importRegistry.listTypes === "function"
      ? runtime.importRegistry.listTypes()
      : ImportTypes.IMPORT_TYPES;
    var entities = runtime && runtime.importRegistry && typeof runtime.importRegistry.getSupportedTargetEntities === "function"
      ? runtime.importRegistry.getSupportedTargetEntities()
      : ImportTypes.getSupportedTargetEntities();
    var registers = ImportTypes.REGISTER_DEFINITIONS.filter(function (item) {
      return ["MULTI", "UNKNOWN"].indexOf(item.code) < 0;
    });

    byId("importManualType").innerHTML = types.map(function (item) {
      return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.label + " (" + item.id + ")") + "</option>";
    }).join("");
    byId("importManualTargetEntity").innerHTML = ['<option value="">غير محدد</option>'].concat(entities.map(function (entityName) {
      return '<option value="' + escapeHtml(entityName) + '">' + escapeHtml(entityName) + "</option>";
    })).join("");
    byId("importManualRegister").innerHTML = ['<option value="">غير محدد</option>'].concat(registers.map(function (registerItem) {
      return '<option value="' + escapeHtml(registerItem.code) + '">' + escapeHtml(registerItem.label + " (" + registerItem.code + ")") + "</option>";
    })).join("");

    if (selectedItem) {
      byId("importManualType").value = selectedItem.type || "unknown";
      byId("importManualTargetEntity").value = selectedItem.targetEntity || "";
      byId("importManualCity").value = selectedItem.city || "";
      byId("importManualRegister").value = selectedItem.register || "";
      byId("importManualMonth").value = selectedItem.month || "";
      byId("importSelectedFileName").value = selectedItem.fileName || "";
    }
  }

  async function refreshSelectedImportPreview(useManualMapping) {
    var selectedItem = getSelectedImportItem();
    var importBatchService = getImportBatchService();
    if (!selectedItem || !importBatchService) {
      return;
    }
    var updated = importBatchService.createPreviewBatch({
      id: selectedItem.id,
      analysis: selectedItem.analysis,
      defaults: getOrganizationDefaults(),
      manualMapping: useManualMapping ? getManualMappingFromForm() : {},
      size: selectedItem.size || (selectedItem.rawFile ? selectedItem.rawFile.size : 0),
      user: getCurrentUser()
    });
    replaceImportItem(decorateImportItem(updated, selectedItem.rawFile));
    renderAll();
  }

  async function saveSelectedImport() {
    var selectedItem = getSelectedImportItem();
    var importBatchService = getImportBatchService();
    if (!selectedItem || !importBatchService) {
      return;
    }
    try {
      var saved = importBatchService.saveImportBatch({
        id: selectedItem.id,
        analysis: selectedItem.analysis,
        defaults: getOrganizationDefaults(),
        manualMapping: getManualMappingFromForm(),
        size: selectedItem.size || (selectedItem.rawFile ? selectedItem.rawFile.size : 0),
        user: getCurrentUser(),
        note: "Saved from Import Center"
      });
      replaceImportItem(decorateImportItem(saved, selectedItem.rawFile));
      renderAll();
      showImportToast("تم حفظ Batch الاستيراد بنجاح.", "success");
    } catch (error) {
      showImportToast(error && error.message ? error.message : "تعذر حفظ Batch الاستيراد.", "error");
    }
  }

  async function rejectSelectedImport() {
    var selectedItem = getSelectedImportItem();
    var importBatchService = getImportBatchService();
    if (!selectedItem || !importBatchService) {
      return;
    }
    try {
      var rejected = importBatchService.rejectImportBatch({
        id: selectedItem.id,
        analysis: selectedItem.analysis,
        defaults: getOrganizationDefaults(),
        manualMapping: getManualMappingFromForm(),
        size: selectedItem.size || (selectedItem.rawFile ? selectedItem.rawFile.size : 0),
        user: getCurrentUser(),
        note: "Rejected from Import Center"
      });
      replaceImportItem(decorateImportItem(rejected, selectedItem.rawFile));
      renderAll();
      showImportToast("تم رفض الملف الحالي من دورة الاستيراد.", "warning");
    } catch (error) {
      showImportToast(error && error.message ? error.message : "تعذر رفض الملف الحالي.", "error");
    }
  }

  function exportSelectedImportDetection() {
    var selectedItem = getSelectedImportItem();
    if (!selectedItem) {
      return;
    }
    var report = ImportPreviewLib.buildDetectionReport(selectedItem);
    downloadText(
      "detection-report-" + (selectedItem.fileName || "import").replace(/[^\w.-]+/g, "_") + ".json",
      JSON.stringify(report, null, 2),
      "application/json;charset=utf-8"
    );
    showImportToast("تم تصدير تقرير الاكتشاف الحالي.", "info");
  }

  function renderImportHistory() {
    state.importHistory = getImportHistory();
    byId("importHistoryBody").innerHTML = state.importHistory.length
      ? state.importHistory.slice(0, 15).map(function (item) {
          return "<tr>" +
            "<td>" + escapeHtml(item.updatedAt || item.createdAt || "-") + "</td>" +
            "<td>" + escapeHtml(item.sourceFileName || item.sourceFile || "-") + "</td>" +
            "<td>" + escapeHtml(item.fileType || item.importType || item.type || "-") + "</td>" +
            "<td>" + escapeHtml(item.status || "-") + "</td>" +
            "<td>" + escapeHtml(item.targetEntity || "-") + "</td>" +
            "<td>" + escapeHtml((item.city || "-") + " / " + (item.register || "-")) + "</td>" +
            "<td>" + escapeHtml(String(item.savedRecordCount || 0)) + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(7, "لا توجد Batch history مسجلة بعد.");
  }

  function renderSelectedImportPreview() {
    var selectedItem = getSelectedImportItem();
    populateImportFormOptions(selectedItem);
    if (!selectedItem) {
      byId("importPreviewEmpty").style.display = "";
      byId("importPreviewPanel").style.display = "none";
      return;
    }

    byId("importPreviewEmpty").style.display = "none";
    byId("importPreviewPanel").style.display = "";
    byId("importPreviewMeta").innerHTML = [
      { label: "Detected Type", value: selectedItem.type || "-" },
      { label: "Confidence", value: String(Math.round((Number(selectedItem.confidence) || 0) * 100)) + "%" },
      { label: "Target Entity", value: selectedItem.targetEntity || "-" },
      { label: "Rows", value: String(selectedItem.rowCount || 0) }
    ].map(function (item) {
      return '<div class="note"><strong>' + escapeHtml(item.label) + '</strong><br><span class="muted">' + escapeHtml(item.value) + "</span></div>";
    }).join("");

    byId("importPreviewIssues").innerHTML = (selectedItem.warningCards || []).length
      ? selectedItem.warningCards.map(createMessageCard).join("")
      : '<div class="empty">لا توجد تحذيرات على الملف المحدد حاليًا.</div>';

    var previewHeaders = selectedItem.preview && selectedItem.preview.previewHeaders ? selectedItem.preview.previewHeaders : [];
    var previewRows = selectedItem.preview && selectedItem.preview.previewRows ? selectedItem.preview.previewRows : [];
    byId("importPreviewHead").innerHTML = previewHeaders.length
      ? "<tr>" + previewHeaders.map(function (header) {
          return "<th>" + escapeHtml(header) + "</th>";
        }).join("") + "</tr>"
      : "<tr><th>Preview</th></tr>";
    byId("importPreviewBody").innerHTML = previewRows.length
      ? previewRows.map(function (row) {
          return "<tr>" + previewHeaders.map(function (header) {
            return "<td>" + escapeHtml(row[header]) + "</td>";
          }).join("") + "</tr>";
        }).join("")
      : renderEmptyRow(Math.max(previewHeaders.length, 1), "لا توجد صفوف متاحة للمعاينة.");
  }

  function renderImportCenterPrompt3() {
    var summary = state.importSummary || summarizeImportItems(state.importItems);
    byId("importKpis").innerHTML = [
      { label: "Files", value: summary.totalFiles || 0 },
      { label: "Auto Detect", value: summary.autoDetected || 0 },
      { label: "Needs Review", value: summary.needsReview || 0 },
      { label: "Warnings", value: summary.warnings || 0 },
    ].map(function (item) {
      return '<div class="kpi"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");

    var importWarnings = [];
    state.importItems.forEach(function (item) {
      (item.warningCards || item.warnings || []).forEach(function (warning) {
        importWarnings.push({
          message: item.fileName + ": " + warning.message,
          suggestion: warning.suggestion || "",
        });
      });
    });
    byId("importWarnings").innerHTML = importWarnings.length
      ? importWarnings.map(createMessageCard).join("")
      : '<div class="empty">Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ­Ø°ÙŠØ±Ø§Øª ÙÙŠ Ø§Ù„Ø¯ÙØ¹Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©.</div>';

    byId("importBody").innerHTML = state.importItems.length
      ? state.importItems.map(function (item) {
          var isSelected = item.id === (getSelectedImportItem() && getSelectedImportItem().id);
          return "<tr>" +
            '<td' + (isSelected ? ' style="font-weight:800"' : "") + ">" + escapeHtml(item.fileName) + "</td>" +
            "<td>" + escapeHtml(item.type) + "</td>" +
            "<td><span class=\"pill\">" + escapeHtml(item.status || "preview") + "</span></td>" +
            "<td>" + escapeHtml(item.register || item.detectedRegister || "-") + "</td>" +
            "<td>" + escapeHtml(item.city || item.detectedCity || "-") + "</td>" +
            "<td>" + escapeHtml(item.month || item.detectedMonth || "-") + "</td>" +
            "<td>" + escapeHtml(item.meta || (item.rowCount + " rows")) + "</td>" +
            "<td>" + escapeHtml(String(Math.round((Number(item.confidence) || 0) * 100)) + "%") + "</td>" +
            '<td><button class="btn light import-select-btn" data-import-select="' + escapeHtml(item.id) + '">Preview</button></td>' +
          "</tr>";
        }).join("")
      : renderEmptyRow(9, "Ù„Ù… ÙŠØªÙ… Ø±ÙØ¹ Ù…Ù„ÙØ§Øª Ø¨Ø¹Ø¯.");

    renderSelectedImportPreview();
    renderImportHistory();
  }

  function renderVdaPage() {
    var summary = state.monthly.vdaSummary || { items: [], summary: { total: 0, valid: 0, invalid: 0 } };
    byId("vdaStatus").innerHTML = state.monthly.vdaSummary && state.monthly.vdaSummary.items.length
      ? "تم تحليل " + summary.summary.total + " سجل صلاحية."
      : "لا توجد نتائج VDA حالياً. استخدم مركز الاستيراد أو حلّل الإقفال الشهري.";
    byId("vdaKpis").innerHTML = [
      { label: "Total", value: summary.summary.total || 0, className: "kpi" },
      { label: "Valid", value: summary.summary.valid || 0, className: "kpi good" },
      { label: "Invalid", value: summary.summary.invalid || 0, className: "kpi bad" },
      {
        label: "Avg Delivered",
        value: summary.items && summary.items.length
          ? formatNumber(summary.items.reduce(function (sum, item) { return sum + (item.deliveredTasks || 0); }, 0) / summary.items.length, 1)
          : 0,
        className: "kpi",
      },
    ].map(function (item) {
      return '<div class="' + item.className + '"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");

    var query = byId("vdaSearch").value.trim();
    var items = summary.items.filter(function (item) {
      return rowMatchesSearch([item.riderId, item.vehicleType, item.finalStatus, item.actionNeeded], query);
    });
    byId("vdaBody").innerHTML = items.length
      ? items.map(function (item) {
          return "<tr>" +
            "<td>" + escapeHtml(item.riderId) + "</td>" +
            "<td>" + escapeHtml(item.register || "-") + "</td>" +
            "<td>" + escapeHtml(item.vehicleType || "-") + "</td>" +
            "<td>" + escapeHtml(String(item.validDays || 0)) + "</td>" +
            "<td>" + escapeHtml(String(item.deliveredTasks || 0)) + "</td>" +
            "<td>" + escapeHtml(String(item.currentTarget || 0)) + "</td>" +
            "<td>" + escapeHtml(item.finalStatus || "-") + "</td>" +
            "<td>" + escapeHtml((item.reasons || []).join(" | ") || item.actionNeeded || "None") + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(8, "لا توجد نتائج VDA مطابقة.");
  }

  function renderFacePage() {
    var items = state.monthly.face || [];
    byId("faceStatus").innerHTML = items.length
      ? "تم تحليل " + items.length + " حساب من تقارير التحقق من الوجه."
      : "لا توجد نتائج Face Verification حالياً.";
    var totals = items.reduce(function (acc, item) {
      acc.triggered += item.summary.triggeredDays || 0;
      acc.passed += item.summary.passedDays || 0;
      acc.failed += item.summary.failedDays || 0;
      return acc;
    }, { triggered: 0, passed: 0, failed: 0 });
    byId("faceKpis").innerHTML = [
      { label: "Triggered", value: totals.triggered, className: "kpi" },
      { label: "Passed", value: totals.passed, className: "kpi good" },
      { label: "Failed", value: totals.failed, className: "kpi bad" },
      { label: "Pass Rate", value: totals.triggered ? formatPct(totals.passed / totals.triggered) : "0%", className: "kpi" },
    ].map(function (item) {
      return '<div class="' + item.className + '"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");

    var query = byId("faceSearch").value.trim();
    var filtered = items.filter(function (item) {
      return rowMatchesSearch([item.riderId, item.summary.passRate, item.summary.failedDays], query);
    });
    byId("faceBody").innerHTML = filtered.length
      ? filtered.map(function (item) {
          return "<tr>" +
            "<td>" + escapeHtml(item.riderId) + "</td>" +
            "<td>" + escapeHtml(item.summary.firstOnlineDay ? item.summary.firstOnlineDay.toLocaleDateString("en-US") : "-") + "</td>" +
            "<td>" + escapeHtml(String(item.summary.triggeredDays || 0)) + "</td>" +
            "<td>" + escapeHtml(String(item.summary.passedDays || 0)) + "</td>" +
            "<td>" + escapeHtml(formatPct(item.summary.passRate || 0)) + "</td>" +
            "<td>" + escapeHtml(item.summary.isAboveThreshold ? "Pass" : "Fail") + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(6, "لا توجد نتائج Face Verification مطابقة.");
  }

  function renderDeliveryPage() {
    var rows = state.monthly.deliveryRows || [];
    byId("deliveryStatus").innerHTML = rows.length
      ? "تم تجهيز " + rows.length + " صف لتجربة التوصيل."
      : "لا توجد بيانات تجربة توصيل حالياً.";
    byId("deliveryKpis").innerHTML = [
      { label: "Rows", value: rows.length, className: "kpi" },
      { label: "Level A", value: rows.filter(function (item) { return item.level === "A"; }).length, className: "kpi good" },
      { label: "Zero Incentive", value: rows.filter(function (item) { return !item.incentive; }).length, className: "kpi warn" },
      {
        label: "Total Incentive",
        value: formatSar(rows.reduce(function (sum, item) { return sum + (item.incentive || 0); }, 0)),
        className: "kpi",
      },
    ].map(function (item) {
      return '<div class="' + item.className + '"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");

    var query = byId("deliverySearch").value.trim();
    var filtered = rows.filter(function (item) {
      return rowMatchesSearch([item.riderId, item.fullName, item.register, item.level], query);
    });
    byId("deliveryBody").innerHTML = filtered.length
      ? filtered.map(function (item) {
          return "<tr>" +
            "<td>" + escapeHtml(item.riderId || "") + "</td>" +
            "<td>" + escapeHtml(item.fullName || "") + "</td>" +
            "<td>" + escapeHtml(item.register || "") + "</td>" +
            "<td>" + escapeHtml(item.level || "") + "</td>" +
            "<td>" + escapeHtml(String(item.rank || 0)) + "</td>" +
            "<td>" + escapeHtml(formatSar(item.incentive || 0)) + "</td>" +
            "<td>" + escapeHtml(item.incentive ? "Eligible" : "Zero / Invalid") + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(7, "لا توجد نتائج تجربة توصيل مطابقة.");
  }

  function renderMonthlyPage() {
    byId("monthlyStatus").textContent = state.monthly.status || "Open";
    var settlementSummary = state.monthly.settlement ? state.monthly.settlement.summary : { total: 0, totalOrders: 0, totalDistance: 0, totalNet: 0, valid: 0, invalid: 0 };
    var comparisonSummary = state.monthly.comparison ? state.monthly.comparison.summary : { matched: 0, different: 0, missingInternal: 0 };
    byId("monthlyKpis").innerHTML = [
      { label: "إجمالي الطلبات", value: formatNumber(settlementSummary.totalOrders || 0, 0), className: "kpi" },
      { label: "إجمالي المسافة", value: formatNumber(settlementSummary.totalDistance || 0, 1), className: "kpi" },
      { label: "إجمالي الاستحقاق", value: formatSar(settlementSummary.totalNet || 0), className: "kpi good" },
      { label: "عدد الصالحين", value: settlementSummary.valid || 0, className: "kpi good" },
      { label: "عدد غير الصالحين", value: settlementSummary.invalid || 0, className: "kpi bad" },
      { label: "عدد المطابق", value: comparisonSummary.matched || 0, className: "kpi" },
      { label: "عدد غير المطابق", value: comparisonSummary.different || 0, className: "kpi warn" },
      { label: "عدد ناقص البيانات", value: comparisonSummary.missingInternal || 0, className: "kpi bad" },
    ].map(function (item) {
      return '<div class="' + item.className + '"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");

    byId("monthlyWarnings").innerHTML = state.monthly.validationWarnings.length
      ? state.monthly.validationWarnings.map(createMessageCard).join("")
      : '<div class="empty">لا توجد تحذيرات شهرية حالياً.</div>';

    byId("monthlyCompanyPartnerBody").innerHTML = state.monthly.companyPartners && state.monthly.companyPartners.length
      ? state.monthly.companyPartners.map(function (item) {
          return "<tr>" +
            "<td>" + escapeHtml(item.partnerId) + "</td>" +
            "<td>" + escapeHtml(item.partnerName) + "</td>" +
            "<td>" + escapeHtml(item.register) + "</td>" +
            "<td>" + escapeHtml(formatSar(item.pricingPerOrder)) + "</td>" +
            "<td>" + escapeHtml(formatSar(item.capacityIncentive + item.deliveryExperienceIncentive)) + "</td>" +
            "<td>" + escapeHtml(formatSar(item.totalDue)) + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(6, "لا توجد بيانات Company Invoice Summary.");

    byId("monthlyCompanyCourierBody").innerHTML = state.monthly.companyCouriers && state.monthly.companyCouriers.length
      ? state.monthly.companyCouriers.slice(0, 120).map(function (item) {
          return "<tr>" +
            "<td>" + escapeHtml(item.riderId) + "</td>" +
            "<td>" + escapeHtml(item.fullName) + "</td>" +
            "<td>" + escapeHtml(item.register) + "</td>" +
            "<td>" + escapeHtml(String(item.deliveredOrders)) + "</td>" +
            "<td>" + escapeHtml(formatNumber(item.deliveryDistance, 1)) + "</td>" +
            "<td>" + escapeHtml(item.isValid ? "صالح" : "غير صالح") + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(6, "لا توجد بيانات Courier Invoice Details.");

    var internalRows = state.monthly.internal ? state.monthly.internal.express.concat(state.monthly.internal.albwaba).slice(0, 120) : [];
    byId("monthlyInternalBody").innerHTML = internalRows.length
      ? internalRows.map(function (item) {
          return "<tr>" +
            "<td>" + escapeHtml(item.riderId) + "</td>" +
            "<td>" + escapeHtml(item.fullName) + "</td>" +
            "<td>" + escapeHtml(item.register) + "</td>" +
            "<td>" + escapeHtml(String(item.deliveredOrders || 0)) + "</td>" +
            "<td>" + escapeHtml(formatSar(item.totalIncentives || 0)) + "</td>" +
            "<td>" + escapeHtml(formatSar(item.grossAmount || 0)) + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(6, "لا توجد بيانات داخلية.");

    var diffQuery = byId("monthlyDiffSearch").value.trim();
    var diffRows = state.monthly.comparison ? state.monthly.comparison.items.filter(function (item) {
      return rowMatchesSearch([item.riderId, item.register, item.matchStatus, item.reasons.join(" ")], diffQuery);
    }) : [];
    byId("monthlyDiffBody").innerHTML = diffRows.length
      ? diffRows.slice(0, 150).map(function (item) {
          return "<tr>" +
            "<td>" + escapeHtml(item.riderId) + "</td>" +
            "<td>" + escapeHtml(item.register) + "</td>" +
            "<td>" + escapeHtml(formatNumber(item.ordersDiff, 0)) + "</td>" +
            "<td>" + escapeHtml(formatNumber(item.distanceDiff, 1)) + "</td>" +
            "<td>" + escapeHtml(formatSar(item.incentivesDiff)) + "</td>" +
            "<td>" + escapeHtml(item.matchStatus) + "</td>" +
            "<td>" + escapeHtml(item.reasons.join(" | ")) + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(7, "لا توجد فروقات مطابقة حالياً.");

    var settlementQuery = byId("monthlySettlementSearch").value.trim();
    var settlementRows = state.monthly.settlement ? state.monthly.settlement.rows.filter(function (row) {
      return rowMatchesSearch([row["المعرف"], row["الاسم بالكامل"], row["السجل"], row["صالح"], row["حالة المطابقة"]], settlementQuery);
    }) : [];
    byId("monthlySettlementBody").innerHTML = settlementRows.length
      ? settlementRows.slice(0, 150).map(function (row, index) {
          return "<tr>" +
            "<td>" + escapeHtml(row["المعرف"]) + "</td>" +
            "<td>" + escapeHtml(row["الاسم بالكامل"]) + "</td>" +
            "<td>" + escapeHtml(row["السجل"]) + "</td>" +
            "<td>" + escapeHtml(String(row["الطلبات المُسلمة"])) + "</td>" +
            "<td>" + escapeHtml(formatSar(row["اجمالي الحوافز"])) + "</td>" +
            "<td>" + escapeHtml(formatSar(row["إجمالي الخصومات"])) + "</td>" +
            "<td>" + escapeHtml(formatSar(row["الصافي"])) + "</td>" +
            "<td>" + escapeHtml(row["حالة المطابقة"]) + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(8, "لا توجد تسوية نهائية مطابقة للبحث.");

    var invalidRows = [];
    if (state.monthly.settlement && state.monthly.settlement.rows) {
      state.monthly.settlement.rows.forEach(function (row) {
        if (row["صالح"] !== "صالح" || row["حالة المطابقة"] !== "matched") {
          invalidRows.push({
            type: row["صالح"] !== "صالح" ? "Invalid Rider" : "Matching Gap",
            riderId: row["المعرف"],
            fullName: row["الاسم بالكامل"],
            note: row["ملاحظات المطابقة"] || row["السبب"] || "",
          });
        }
      });
    }
    byId("monthlyInvalidBody").innerHTML = invalidRows.length
      ? invalidRows.slice(0, 150).map(function (row) {
          return "<tr>" +
            "<td>" + escapeHtml(row.type) + "</td>" +
            "<td>" + escapeHtml(row.riderId) + "</td>" +
            "<td>" + escapeHtml(row.fullName) + "</td>" +
            "<td>" + escapeHtml(row.note) + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(4, "لا توجد حالات نقص أو عدم صلاحية حالياً.");

    var archiveRows = [];
    if (state.monthly.archive) {
      archiveRows.push({ path: state.monthly.archive.root, detail: "Archive root" });
      state.monthly.archive.folders.forEach(function (folder) {
        archiveRows.push({ path: folder, detail: "Folder" });
      });
      state.monthly.archive.logEntries.forEach(function (entry) {
        archiveRows.push({ path: "log", detail: entry });
      });
      state.monthly.reopenLog.forEach(function (entry) {
        archiveRows.push({ path: "reopen", detail: entry.at + " - " + entry.reason });
      });
    }
    byId("monthlyArchiveLogBody").innerHTML = archiveRows.length
      ? archiveRows.map(function (row) {
          return "<tr><td>" + escapeHtml(row.path) + "</td><td>" + escapeHtml(row.detail) + "</td></tr>";
        }).join("")
      : renderEmptyRow(2, "لم يتم إنشاء Monthly Archive بعد.");
  }

  function getSalaryMonthlyMatches() {
    var query = byId("salaryMonthlySearch").value.trim();
    var selectedCity = byId("salaryMonthlyCity").value;
    var selectedMonth = byId("salaryMonthlyMonth").value;
    var rows = state.monthly.settlement && state.monthly.settlement.rows ? state.monthly.settlement.rows : [];
    return rows.filter(function (row) {
      var sameCity = !selectedCity || row["المدينة"] === selectedCity;
      var sameMonth = !selectedMonth || row["الشهر"] === selectedMonth;
      var searchMatch = rowMatchesSearch([row["المعرف"], row["رقم الهوية / الإقامة"], row["الاسم بالكامل"], row["السجل"]], query);
      return sameCity && sameMonth && searchMatch;
    });
  }

  function renderSalaryBridge() {
    var source = byId("salaryDataSource").value;
    var matches = source === "monthly" ? getSalaryMonthlyMatches() : [];
    byId("salaryMonthlyStatus").textContent = source === "monthly"
      ? (matches.length
        ? "تم العثور على " + matches.length + " سجل من نتائج الإقفال الشهري."
        : "لا توجد نتائج مطابقة حالياً. حلّل الإقفال الشهري أو غيّر البحث/المدينة/الشهر.")
      : "أنت تعمل حاليًا على Manual Estimate.";

    byId("salaryMonthlyMatchesBody").innerHTML = matches.length
      ? matches.slice(0, 120).map(function (row, index) {
          return "<tr>" +
            "<td>" + escapeHtml(row["المعرف"]) + "</td>" +
            "<td>" + escapeHtml(row["الاسم بالكامل"]) + "</td>" +
            "<td>" + escapeHtml(row["السجل"]) + "</td>" +
            "<td>" + escapeHtml(String(row["الطلبات المُسلمة"])) + "</td>" +
            "<td>" + escapeHtml(row["صالح"]) + "</td>" +
            "<td>" + escapeHtml(formatSar(row["الصافي"])) + "</td>" +
            '<td><button class="btn light salary-monthly-apply" data-monthly-index="' + index + '">تطبيق</button></td>' +
          "</tr>";
        }).join("")
      : renderEmptyRow(7, "لا توجد سجلات شهرية مطابقة.");
  }

  function applySettlementRowToSalary(row) {
    var orders = Number(row["الطلبات المُسلمة"] || 0);
    var distance = Number(row["مسافة التوصيل"] || 0);
    var averageKm = orders ? distance / Math.max(orders, 1) : 0;
    var vehicleType = normalizeHeader(row["نوع المركبة"] || row["المركبة"]).indexOf("دباب") >= 0 || normalizeHeader(row["نوع المركبة"] || row["المركبة"]).indexOf("bike") >= 0
      ? "bike"
      : "car";
    var daysWorked = Number(row["أيام العمل"] || row["أيام الاتصال-صالحة"] || 0);

    byId("salaryVehicleType").value = vehicleType;
    byId("salaryVehicleSource").value = normalizeHeader(row["نوع المركبة"]).indexOf("خاصة") >= 0 ? "own" : "company";
    byId("salaryMonthDays").value = monthToDateRange(row["الشهر"] || byId("salaryMonthlyMonth").value).end.getDate();
    byId("salaryOrders").value = orders;
    byId("salaryWorkDays").value = daysWorked;
    byId("salaryVehicleDays").value = daysWorked;
    byId("salaryValidDays").value = row["صالح"] === "صالح" ? 7 : 0;
    byId("salaryValidOverride").value = row["صالح"] === "صالح" ? "valid" : "invalid";
    byId("salaryExperienceLevel").value = row["مستوى تجربة التوصيل"] || "NONE";
    byId("salaryBaseFare").value = 6.5;
    byId("salaryKmRate").value = 0.6;
    if (vehicleType === "car") {
      byId("salaryCarKm").value = averageKm.toFixed(2);
      byId("salaryBikeKm").value = "";
    } else {
      byId("salaryBikeKm").value = averageKm.toFixed(2);
      byId("salaryCarKm").value = "";
    }
    byId("salaryCompanyHousing").value = "no";
    byId("salaryHousingDays").value = daysWorked;
    byId("salaryLoans").value = Number(row["السلف"] || 0);
    byId("salaryOtherDeductions").value = Number(row["الخصم"] || 0) + Number(row["المخالفات"] || 0);
    byId("salaryCalculateBtn").click();
    byId("salaryMonthlyStatus").textContent = "تم تطبيق بيانات " + row["المعرف"] + " على الحاسبة الحالية.";
  }

  function renderOprPage() {
    var rows = state.opr.rows || [];
    byId("oprStatus").textContent = rows.length
      ? "تم تحميل " + rows.length + " صف OPR قابل للبحث."
      : "ارفع ملفات OPR الحالية ثم شغّل التحليل.";
    byId("oprKpis").innerHTML = [
      { label: "Rows", value: rows.length },
      { label: "Express", value: rows.filter(function (row) { return row.platform === "express"; }).length },
      { label: "Per Order", value: rows.filter(function (row) { return row.platform === "per_order"; }).length },
      { label: "Search Hits", value: (state.opr.indexes && OprEngine.searchRiders(state.opr.indexes, byId("oprSearch").value.trim()).length) || 0 },
    ].map(function (item) {
      return '<div class="kpi"><b>' + escapeHtml(item.label) + "</b><strong>" + escapeHtml(String(item.value)) + "</strong></div>";
    }).join("");

    var query = byId("oprSearch").value.trim();
    var visibleRows = state.opr.indexes ? OprEngine.searchRiders(state.opr.indexes, query).slice(0, 150) : [];
    byId("oprBody").innerHTML = visibleRows.length
      ? visibleRows.map(function (row) {
          return "<tr>" +
            "<td>" + escapeHtml(row.platform) + "</td>" +
            "<td>" + escapeHtml(row.userId) + "</td>" +
            "<td>" + escapeHtml(row.fullName) + "</td>" +
            "<td>" + escapeHtml(row.iqama) + "</td>" +
            "<td>" + escapeHtml(row.phone) + "</td>" +
            "<td>" + escapeHtml(row.register) + "</td>" +
            "<td>" + escapeHtml(row.status) + "</td>" +
          "</tr>";
        }).join("")
      : renderEmptyRow(7, "لا توجد صفوف OPR مطابقة.");

    byId("oprPreviewBody").innerHTML = state.opr.previewRows.length
      ? state.opr.previewRows.map(function (item) {
          return buildStatusBox(
            "<strong>" + escapeHtml(item.title) + "</strong><br>" + escapeHtml(item.body),
            item.className
          );
        }).join("")
      : '<div class="empty">لا توجد معاينة إجراءات حالياً.</div>';
  }

  async function analyzeOprFiles() {
    var definitions = [
      { id: "oprExpressFile", key: "express" },
      { id: "oprAlbwabaFile", key: "albwaba" },
      { id: "oprTogaryFile", key: "togary" },
      { id: "oprPerOrderFile", key: "perOrder" },
    ];
    var datasets = {};

    for (var index = 0; index < definitions.length; index += 1) {
      var definition = definitions[index];
      var file = byId(definition.id).files[0];
      if (!file) {
        continue;
      }
      var extension = file.name.toLowerCase().split(".").pop();
      if (extension === "csv" || extension === "txt") {
        var text = await readFileAsText(file);
        datasets[definition.key] = Portal.DataEngine.parseCsvRows(text);
      } else {
        var buffer = await readFileAsArrayBuffer(file);
        var workbook = window.XLSX.read(buffer, { type: "array", cellFormula: true });
        var sheetName = workbook.SheetNames[0];
        datasets[definition.key] = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: true });
      }
    }

    state.opr.indexes = OprEngine.buildIndexes(datasets);
    state.opr.rows = state.opr.indexes.rows || [];
    state.opr.previewRows = [];
    renderAll();
  }

  function previewOprStop() {
    var userId = cleanText(byId("oprSelectedUserId").value);
    if (!state.opr.indexes || !userId) {
      return;
    }
    var record = state.opr.indexes.byUserId.get(userId);
    if (!record) {
      state.opr.previewRows = [{
        title: "لم يتم العثور على المعرف",
        body: "تأكد من رفع الملف الصحيح أو كتابة المعرف الحالي بشكل صحيح.",
        className: "warn",
      }];
      renderOprPage();
      return;
    }
    var preview = OprEngine.stopWithoutReplacement(record, "Preview from UI");
    state.opr.previewRows = [{
      title: "Stop Without Replacement",
      body: "سيتم تغيير حالة " + preview.item.userId + " إلى " + preview.item.status + ".",
      className: "warn",
    }];
    renderOprPage();
  }

  function previewOprSwap() {
    var currentId = cleanText(byId("oprSelectedUserId").value);
    var replacementId = cleanText(byId("oprReplacementUserId").value);
    if (!state.opr.indexes || !currentId || !replacementId) {
      return;
    }
    var currentRecord = state.opr.indexes.byUserId.get(currentId);
    var replacementRecord = state.opr.indexes.byUserId.get(replacementId);
    if (!currentRecord || !replacementRecord) {
      state.opr.previewRows = [{
        title: "تعذر تكوين التبديل",
        body: "أحد المعرفين غير موجود في الملفات المرفوعة.",
        className: "warn",
      }];
      renderOprPage();
      return;
    }
    var preview = OprEngine.swapAssignments(currentRecord, replacementRecord, "Preview from UI");
    state.opr.previewRows = [
      {
        title: "Swap Preview",
        body: preview.current.userId + " ↔ " + preview.replacement.userId,
        className: "good",
      },
    ];
    renderOprPage();
  }

  function renderExportHooks() {
    var hasSettlement = Boolean(state.monthly.settlement && state.monthly.settlement.rows && state.monthly.settlement.rows.length);
    var list = byId("exportSummaryList");
    if (list && hasSettlement) {
      list.insertAdjacentHTML("beforeend", '<div class="note">Monthly Closing: ' + escapeHtml(state.monthly.status) + " / " + escapeHtml(String(state.monthly.settlement.summary.total || 0)) + ' rows</div>');
    }
  }

  function renderAll() {
    renderDashboardV9();
    renderImportCenterPrompt3();
    renderVdaPage();
    renderFacePage();
    renderDeliveryPage();
    renderMonthlyPage();
    renderSalaryBridge();
    renderOprPage();
  }

  function bindMonthlyAutoDates() {
    byId("monthlyMonth").addEventListener("change", function () {
      var range = monthToDateRange(byId("monthlyMonth").value);
      if (!range) {
        return;
      }
      var finalDate = new Date(range.end.getTime());
      finalDate.setDate(finalDate.getDate() + 1);
      byId("monthlyStartDate").value = toDateInputValue(range.start);
      byId("monthlyEndDate").value = toDateInputValue(range.end);
      byId("monthlyFinalReportsDate").value = toDateInputValue(finalDate);
      byId("salaryMonthlyMonth").value = byId("monthlyMonth").value;
      safePersist();
    });
  }

  function bindEvents() {
    byId("importAnalyzeBtn").addEventListener("click", handleAnalyzeImportCenter);
    byId("importClearBtn").addEventListener("click", function () {
      state.importItems = [];
      state.selectedImportId = "";
      state.importSummary = summarizeImportItems([]);
      byId("importBatchFiles").value = "";
      safePersist();
      renderAll();
    });
    byId("importSaveBtn").addEventListener("click", saveSelectedImport);
    byId("importRejectBtn").addEventListener("click", rejectSelectedImport);
    byId("importRedetectBtn").addEventListener("click", function () {
      refreshSelectedImportPreview(false);
    });
    byId("importExportDetectionBtn").addEventListener("click", exportSelectedImportDetection);
    byId("importBody").addEventListener("click", function (event) {
      var button = event.target.closest(".import-select-btn");
      if (!button) {
        return;
      }
      state.selectedImportId = button.getAttribute("data-import-select") || "";
      renderAll();
    });
    [
      "importManualType",
      "importManualTargetEntity",
      "importManualCity",
      "importManualRegister",
      "importManualMonth"
    ].forEach(function (id) {
      byId(id).addEventListener("change", function () {
        refreshSelectedImportPreview(true);
      });
    });

    byId("monthlyAnalyzeBtn").addEventListener("click", handleAnalyzeMonthlyClosing);
    byId("monthlyCompareBtn").addEventListener("click", handleCompareMonthly);
    byId("monthlyBuildBtn").addEventListener("click", handleBuildSettlement);
    byId("monthlyArchiveBtn").addEventListener("click", handleCreateArchive);
    byId("monthlyLockBtn").addEventListener("click", handleLockMonth);
    byId("monthlyReopenBtn").addEventListener("click", handleReopenMonth);
    byId("monthlyExportAllBtn").addEventListener("click", function () {
      exportMonthlyBundle("all");
    });

    byId("salaryRefreshMonthlyMatchesBtn").addEventListener("click", function () {
      renderSalaryBridge();
    });
    byId("salaryDataSource").addEventListener("change", function () {
      renderSalaryBridge();
      safePersist();
    });
    byId("salaryMonthlyCity").addEventListener("change", function () {
      renderSalaryBridge();
      safePersist();
    });
    byId("salaryMonthlyMonth").addEventListener("change", function () {
      renderSalaryBridge();
      safePersist();
    });
    byId("salaryMonthlySearch").addEventListener("input", function () {
      renderSalaryBridge();
      safePersist();
    });
    byId("salaryMonthlyMatchesBody").addEventListener("click", function (event) {
      var button = event.target.closest(".salary-monthly-apply");
      if (!button) {
        return;
      }
      var rows = getSalaryMonthlyMatches();
      var row = rows[Number(button.dataset.monthlyIndex)];
      if (row) {
        applySettlementRowToSalary(row);
      }
    });

    byId("vdaSearch").addEventListener("input", renderVdaPage);
    byId("faceSearch").addEventListener("input", renderFacePage);
    byId("deliverySearch").addEventListener("input", renderDeliveryPage);
    byId("monthlyDiffSearch").addEventListener("input", renderMonthlyPage);
    byId("monthlySettlementSearch").addEventListener("input", renderMonthlyPage);

    byId("oprAnalyzeBtn").addEventListener("click", analyzeOprFiles);
    byId("oprSearchBtn").addEventListener("click", renderOprPage);
    byId("oprSearch").addEventListener("input", renderOprPage);
    byId("oprPreviewStopBtn").addEventListener("click", previewOprStop);
    byId("oprPreviewSwapBtn").addEventListener("click", previewOprSwap);

    byId("exportMonthlySettlementBtn").addEventListener("click", function () {
      exportMonthlyBundle("settlement");
    });
    byId("exportMonthlyMatchingBtn").addEventListener("click", function () {
      exportMonthlyBundle("matching");
    });
    byId("exportMonthlySummaryBtn").addEventListener("click", function () {
      exportMonthlyBundle("summary");
    });
    byId("exportMonthlyAllFromCenterBtn").addEventListener("click", function () {
      exportMonthlyBundle("all");
    });

    [
      "monthlyCity",
      "monthlyMonth",
      "monthlyStartDate",
      "monthlyEndDate",
      "monthlyFinalReportsDate",
      "importCity",
    ].forEach(function (id) {
      byId(id).addEventListener("change", safePersist);
    });

    bindMonthlyAutoDates();
  }

  function boot() {
    restoreState();
    bindEvents();
    renderAll();
  }

  boot();
})();
