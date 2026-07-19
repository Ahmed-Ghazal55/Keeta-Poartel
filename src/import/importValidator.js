(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./importTypes.js"),
      require("./headerMapper.js"),
      require("../hr/hrValidator.js"),
      require("../hr/riderNormalizer.js")
    );
    return;
  }
  root.KeetaPortal = root.KeetaPortal || {};
  root.KeetaPortal.ImportValidatorLib = factory(
    root.KeetaPortal.ImportTypes,
    root.KeetaPortal.HeaderMapper,
    root.KeetaPortal.HrValidator,
    root.KeetaPortal.HrRiderNormalizer
  );
})(typeof globalThis !== "undefined" ? globalThis : this, function (ImportTypes, HeaderMapper, HrValidator, HrRiderNormalizer) {
  "use strict";

  var normalizeHeader = ImportTypes.normalizeHeader;
  var normalizeText = ImportTypes.normalizeText;
  var normalizeCity = ImportTypes.normalizeCity;
  var normalizeRegisterCode = ImportTypes.normalizeRegisterCode;

  var KNOWN_FORMULA_FUNCTIONS = [
    "IF", "COUNTIF", "COUNTIFS", "SUMIF", "SUMIFS", "VLOOKUP", "XLOOKUP",
    "INDEX", "MATCH", "FILTER", "UNIQUE", "SORT", "TEXT", "DATE", "TODAY",
    "IFERROR", "ROUND", "ROUNDUP", "ROUNDDOWN", "AVERAGE", "MIN", "MAX"
  ];

  function validateImportRecord(importRecord, options) {
    options = options || {};
    var mode = options.mode || "preview";
    var typeDefinition = ImportTypes.getImportType(importRecord.type || "unknown");
    var analysis = importRecord.analysis || {};
    var rows = analysis.tableSummary
      ? analysis.tableSummary.rows
      : analysis.workbookSummary
        ? analysis.workbookSummary.bestRows
        : (analysis.rows || []);
    var headers = importRecord.headers || analysis.headers || (analysis.tableSummary ? analysis.tableSummary.headers : []) || [];
    var mapping = importRecord.mapping || analysis.mapping || HeaderMapper.mapHeaders(headers, typeDefinition.requiredFields);
    var issues = [];

    if (importRecord.type === "zip_reference") {
      issues.push(issue("zip_reference_only", mode === "save" ? "blocking" : "medium", "ZIP file is tracked as reference only.", "Upload the inner files directly for analysis and save."));
    }

    if (!headers.length && !isWorkbookSpecialCase(typeDefinition.id)) {
      issues.push(issue("headers_missing", "blocking", "No headers were detected in the uploaded file.", "Verify the file structure or map the correct sheet/header row."));
    }

    if (!rows.length && !isWorkbookSpecialCase(typeDefinition.id)) {
      issues.push(issue("empty_file", "blocking", "The import file does not contain readable data rows.", "Check that the selected sheet contains actual records."));
    }

    if (typeDefinition.requiredFields && typeDefinition.requiredFields.length) {
      mapping.missingRequired.forEach(function (fieldName) {
        issues.push(issue(
          "required_header_missing",
          mode === "save" ? "blocking" : "high",
          "Required header is missing: " + fieldName + ".",
          "Map the matching column manually before saving.",
          { fieldName: fieldName }
        ));
      });
    }

    if (!importRecord.targetEntity && mode === "save") {
      issues.push(issue("target_entity_unknown", "blocking", "No target entity is defined for this import batch.", "Choose the correct file type or target entity before saving."));
    }

    if ((importRecord.type === "unknown" || importRecord.confidenceState === "manual_mapping_required") && mode === "save" && !importRecord.manualMappingApplied) {
      issues.push(issue("unknown_save_without_mapping", "blocking", "Unknown or low-confidence files cannot be saved without manual mapping.", "Select the file type, city, register, month, and target entity manually."));
    }

    if (importRecord.reviewRequired === true && mode === "save" && !importRecord.manualMappingApplied) {
      issues.push(issue("review_required_before_save", "blocking", "This file requires manual review before it can be saved.", "Confirm the detected template and apply the reviewed field mapping before saving."));
    }

    if (importRecord.city == null || importRecord.city === "") {
      issues.push(issue("missing_city", "medium", "City was not detected for this file.", "Choose the city manually from the preview panel."));
    }

    if (importRecord.register == null || importRecord.register === "") {
      issues.push(issue("missing_register", "medium", "Register/dashboard was not detected for this file.", "Choose the register manually from the preview panel."));
    }

    if (importRecord.month && !/^\d{4}-\d{2}$/.test(normalizeText(importRecord.month))) {
      issues.push(issue("invalid_month", "medium", "Detected month is not in YYYY-MM format.", "Fix the month manually before saving."));
    }

    if (Number(importRecord.rowCount) < 3 && Number(importRecord.rowCount) > 0) {
      issues.push(issue("suspicious_row_count", "low", "The file has a very small row count.", "Confirm that the uploaded file is complete."));
    }

    if (Number(importRecord.rowCount) > 20000) {
      issues.push(issue("suspicious_row_count", "medium", "The file has an unusually high row count.", "Review the source file for duplicate tabs or unexpected extra rows."));
    }

    inspectDuplicates(rows, mapping, issues);
    inspectMixedScopes(rows, mapping, issues);
    inspectVehicleTypes(rows, mapping, issues);
    inspectDates(rows, mapping, issues);
    inspectLifecycleIdentityRows(importRecord, rows, mapping, issues, mode);
    inspectFormulas(analysis.workbookSummary ? analysis.workbookSummary.formulaFunctions : (analysis.formulaFunctions || []), issues, mode);
    inspectHrWorkbook(importRecord, issues, mode);

    return {
      issues: issues,
      blockingIssues: issues.filter(function (item) { return item.severity === "blocking"; }),
      warnings: issues.filter(function (item) { return item.severity !== "blocking"; }),
      summary: summarizeIssues(issues)
    };
  }

  function inspectDuplicates(rows, mapping, issues) {
    var userIdCounts = {};
    var iqamaCounts = {};
    (rows || []).forEach(function (row) {
      var userId = normalizeText(HeaderMapper.getValue(row, mapping, "userId"));
      var iqama = normalizeText(HeaderMapper.getValue(row, mapping, "iqama"));
      if (userId) {
        userIdCounts[userId] = (userIdCounts[userId] || 0) + 1;
      }
      if (iqama) {
        iqamaCounts[iqama] = (iqamaCounts[iqama] || 0) + 1;
      }
    });
    Object.keys(userIdCounts).forEach(function (value) {
      if (userIdCounts[value] > 1) {
        issues.push(issue("duplicate_user_id", "high", "Duplicate user ID detected inside the same file: " + value + ".", "Review duplicate rows before saving."));
      }
    });
    Object.keys(iqamaCounts).forEach(function (value) {
      if (iqamaCounts[value] > 1) {
        issues.push(issue("duplicate_iqama", "high", "Duplicate iqama detected inside the same file: " + value + ".", "Review duplicate rows before saving."));
      }
    });
  }

  function inspectMixedScopes(rows, mapping, issues) {
    var cities = {};
    var registers = {};
    (rows || []).slice(0, 500).forEach(function (row) {
      var city = normalizeCity(HeaderMapper.getValue(row, mapping, "city"));
      var register = normalizeRegisterCode(HeaderMapper.getValue(row, mapping, "register"));
      if (city) {
        cities[city] = true;
      }
      if (register) {
        registers[register] = true;
      }
    });
    if (Object.keys(cities).length > 1) {
      issues.push(issue("mixed_cities", "medium", "Rows from multiple cities were detected inside the same file.", "Split the file or confirm the correct city scope before saving."));
    }
    if (Object.keys(registers).length > 1) {
      issues.push(issue("mixed_registers", "medium", "Rows from multiple registers were detected inside the same file.", "Split the file or confirm the correct register scope before saving."));
    }
  }

  function inspectVehicleTypes(rows, mapping, issues) {
    var unknownCount = 0;
    (rows || []).slice(0, 500).forEach(function (row) {
      var vehicleType = normalizeHeader(HeaderMapper.getValue(row, mapping, "vehicleType"));
      if (vehicleType && ["car", "bike", "سيارة", "دباب", "motorcycle", "scooter", "دراجة"].every(function (token) {
        return vehicleType.indexOf(token) < 0;
      })) {
        unknownCount += 1;
      }
    });
    if (unknownCount > 0) {
      issues.push(issue("unknown_vehicle_type", "low", "Some rows contain an unknown vehicle type.", "Review the vehicle type column or extend the alias mapping later."));
    }
  }

  function inspectDates(rows, mapping, issues) {
    var invalidDateCount = 0;
    (rows || []).slice(0, 200).forEach(function (row) {
      var value = normalizeText(HeaderMapper.getValue(row, mapping, "date"));
      if (!value) {
        return;
      }
      if (!looksLikeDate(value)) {
        invalidDateCount += 1;
      }
    });
    if (invalidDateCount > 0) {
      issues.push(issue("invalid_date", "medium", "Some date values could not be parsed.", "Review the date column or provide a normalized export."));
    }
  }

  function inspectLifecycleIdentityRows(importRecord, rows, mapping, issues, mode) {
    var typeId = importRecord && importRecord.type ? importRecord.type : "";
    if (typeId !== "external_riders_workbook" &&
        typeId !== "external_riders_csv" &&
        typeId !== "current_assignments_workbook" &&
        typeId !== "current_assignments_csv") {
      return;
    }

    var invalidIqamaRows = [];
    var missingIqamaRows = [];
    var invalidStartDateRows = [];
    (rows || []).slice(0, 500).forEach(function (row, index) {
      var sourceRow = index + 2;
      var iqamaValue = typeId.indexOf("current_assignments") === 0
        ? HeaderMapper.getValue(row, mapping, "actualRiderIqama")
        : HeaderMapper.getValue(row, mapping, "iqama");
      var normalizedIqama = normalizeDigits(iqamaValue);
      if (!normalizedIqama) {
        missingIqamaRows.push(sourceRow);
      } else if (normalizedIqama.length < 10 || normalizedIqama.length > 12) {
        invalidIqamaRows.push(sourceRow);
      }

      if (typeId.indexOf("current_assignments") === 0) {
        var startDate = normalizeText(HeaderMapper.getValue(row, mapping, "assignmentStartDate"));
        if (startDate && !looksLikeDate(startDate)) {
          invalidStartDateRows.push(sourceRow);
        }
      }
    });

    if (missingIqamaRows.length) {
      issues.push(issue(
        "missing_lifecycle_iqama",
        mode === "save" ? "blocking" : "high",
        "Some lifecycle rows are missing rider iqama values.",
        "Complete the iqama column before saving.",
        { rows: missingIqamaRows.slice(0, 20) }
      ));
    }
    if (invalidIqamaRows.length) {
      issues.push(issue(
        "invalid_lifecycle_iqama",
        mode === "save" ? "blocking" : "high",
        "Some lifecycle rows contain invalid iqama lengths.",
        "Use a 10-12 digit iqama value before saving.",
        { rows: invalidIqamaRows.slice(0, 20) }
      ));
    }
    if (invalidStartDateRows.length) {
      issues.push(issue(
        "invalid_assignment_start_date",
        mode === "save" ? "blocking" : "medium",
        "Some current-assignment rows contain invalid assignment start dates.",
        "Normalize assignment dates before saving.",
        { rows: invalidStartDateRows.slice(0, 20) }
      ));
    }
  }

  function inspectFormulas(formulaFunctions, issues, mode) {
    var unsupported = (formulaFunctions || []).filter(function (fnName) {
      return KNOWN_FORMULA_FUNCTIONS.indexOf(String(fnName || "").toUpperCase()) < 0;
    });
    if (unsupported.some(function (fnName) { return String(fnName).toUpperCase() === "DUMMYFUNCTION"; })) {
      issues.push(issue("dummy_function_detected", mode === "save" ? "blocking" : "high", "DUMMYFUNCTION was detected in workbook formulas.", "Review the workbook formulas before saving."));
    }
    if (unsupported.length) {
      issues.push(issue("unsupported_formulas", "low", "Some workbook formulas are not recognized by the current validator.", "Record this as a follow-up if the file requires exact formula parity.", { formulas: unsupported }));
    }
  }

  function inspectHrWorkbook(importRecord, issues, mode) {
    var typeId = importRecord.type || "";
    if ((typeId !== "hr_master_workbook" && typeId !== "rider_master_workbook") || !HrValidator || !HrRiderNormalizer) {
      return;
    }
    var workbook = importRecord.analysis && importRecord.analysis.workbook;
    if (!workbook || typeof HrRiderNormalizer.normalizeHrWorkbook !== "function") {
      return;
    }
    var bundle = HrRiderNormalizer.normalizeHrWorkbook({ workbook: workbook }, {
      fileName: importRecord.sourceFileName || importRecord.fileName || ""
    });
    bundle.hrProfiles = HrRiderNormalizer.buildHrProfiles(bundle, {});
    var validation = HrValidator.validateHrBundle(bundle, { mode: mode });
    issues.push.apply(issues, validation.issues || []);
  }

  function looksLikeDate(value) {
    var text = normalizeText(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ||
      /^\d{8}$/.test(text) ||
      /^\d{4}\/\d{2}\/\d{2}$/.test(text) ||
      /^\d{2}\/\d{2}\/\d{4}$/.test(text);
  }

  function normalizeDigits(value) {
    return normalizeText(value).replace(/[^\d]/g, "");
  }

  function isWorkbookSpecialCase(typeId) {
    return [
      "company_invoice_workbook",
      "internal_settlement_workbook",
      "face_verification_workbook"
    ].indexOf(typeId) >= 0;
  }

  function issue(code, severity, message, suggestion, extra) {
    return {
      code: code,
      severity: severity,
      message: message,
      suggestion: suggestion || "",
      meta: extra || {}
    };
  }

  function summarizeIssues(issues) {
    return (issues || []).reduce(function (memo, item) {
      memo.total += 1;
      memo[item.severity] = (memo[item.severity] || 0) + 1;
      return memo;
    }, { total: 0, blocking: 0, high: 0, medium: 0, low: 0, info: 0 });
  }

  return {
    KNOWN_FORMULA_FUNCTIONS: KNOWN_FORMULA_FUNCTIONS,
    validateImportRecord: validateImportRecord
  };
});
